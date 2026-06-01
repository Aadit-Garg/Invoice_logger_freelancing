import React, { useState, useEffect } from 'react';
import { Plus, Trash2, ArrowLeft, Briefcase, ChevronRight, Download, FileSpreadsheet, LayoutDashboard, Clock, BarChart3, LogOut, Sun, Moon, Settings } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import { generateWorkLogPDF } from './generatePDF';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db, hasFirebaseConfig } from './firebase';
import Login from './Login';
import defaultData from '../data.json';
import './App.css';

const PLATFORMS = [
  'DataAnnotation.tech',
  'Alignerr',
  'Mecror',
  'Minddrift',
  'Outlier'
];

const PAYOUT_METHODS = [
  'PayPal',
  'Stripe',
  'Direct Deposit'
];

const APPLE_COLORS = ['#0071e3', '#34c759', '#ff9500', '#5856d6', '#ff2d55'];

// Parse "MAY 2026" into year and month (1-12)
const parseMonthYear = (monthYearStr) => {
  const parts = (monthYearStr || '').trim().split(/\s+/);
  const monthNames = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
  let year = new Date().getFullYear();
  let monthIdx = new Date().getMonth(); // 0-11
  
  if (parts.length >= 1) {
    const mStr = parts[0].toUpperCase();
    const idx = monthNames.findIndex(name => name.startsWith(mStr) || mStr.startsWith(name));
    if (idx !== -1) monthIdx = idx;
  }
  if (parts.length >= 2) {
    const y = parseInt(parts[1], 10);
    if (!isNaN(y)) year = y;
  }
  return { year, month: monthIdx + 1 };
};

// Get total days in month
const getDaysInMonth = (year, month) => {
  return new Date(year, month, 0).getDate();
};


const formatTime = (totalMins) => {
  const m = Math.round(totalMins || 0);
  const h = Math.floor(m / 60);
  const mins = m % 60;
  if (h === 0) return `${mins}m`;
  if (mins === 0) return `${h}h`;
  return `${h}h ${mins}m`;
};


const getEarnings = (wl) => {
  if (wl.payType === 'fixed') return Number(wl.fixedPay) || 0;
  return ((Number(wl.minutes) || 0) / 60) * (Number(wl.hourlyRate) || 0);
};

const createNewLog = () => {
  const now = new Date();
  const currentMonth = now.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();
  
  return {
    id: Date.now().toString(),
    userName: 'Aadit Garg',
    taxYear: now.getFullYear().toString(),
    monthYear: currentMonth,
    workLogs: [
      { 
        id: Date.now() + 1,
        platform: 'DataAnnotation.tech',
        dateWorked: now.toISOString().split('T')[0], 
        projectName: 'Coding Assessment / RLHF', 
        minutes: 240, 
        hourlyRate: 25.0, 
        payType: 'hourly', 
        fixedPay: 0, 
        cashOutDate: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], 
        status: 'Pending' 
      }
    ],
    payouts: []
  };
};

function App() {
  const [activeLogId, setActiveLogId] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState('monthly'); // 'monthly' | 'pending' | 'metrics'
  const [pendingTasksSnapshot, setPendingTasksSnapshot] = useState([]);
  const [installPrompt, setInstallPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
  }, []);

  const handleInstallPWA = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    setInstallPrompt(null);
  };
  
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [logs, setLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('freelanceLogsMulti');
      if (saved) {
        let parsed = JSON.parse(saved);
        if (parsed.length > 0) {
          return parsed.map(log => ({
            ...log,
            workLogs: log.workLogs.map(wl => {
              if (wl.hours !== undefined) {
                const newWl = { ...wl, minutes: Math.round(wl.hours * 60) };
                delete newWl.hours;
                return newWl;
              }
              return wl;
            })
          }));
        }
      }
    } catch (e) { console.error('Failed to parse local storage', e); }
    return defaultData || [];
  });

  const availableYears = [...new Set(logs.map(l => l.taxYear))].sort().reverse();
  const [selectedYear, setSelectedYear] = useState(
    availableYears.length > 0 ? availableYears[0] : new Date().getFullYear().toString()
  );

  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');
  
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (!hasFirebaseConfig || !auth) {
      setAuthChecking(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const syncWithDB = async () => {
      if (!hasFirebaseConfig) {
        setHasLoaded(true);
        return;
      }
      if (!user) return; // Wait for user to be logged in

      try {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);

        if (docSnap.exists()) {
          const dbData = docSnap.data().logs || [];
          if (Array.isArray(dbData) && dbData.length > 0) {
            setLogs(dbData);
          }
        } else {
          // Migration: if DB is empty, pull from localStorage and save to DB
          const saved = localStorage.getItem('freelanceLogsMulti');
          if (saved) {
            const parsedSaved = JSON.parse(saved);
            if (parsedSaved.length > 0) {
              await setDoc(userDocRef, { logs: parsedSaved });
              console.log('Migrated localStorage to Firebase for user', user.uid);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to sync with Firebase. Using localStorage.', err);
      } finally {
        setHasLoaded(true);
      }
    };
    syncWithDB();
  }, [user]);

  useEffect(() => {
    localStorage.setItem('freelanceLogsMulti', JSON.stringify(logs));
    if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
      setSelectedYear(availableYears[0]);
    }

    if (hasLoaded && hasFirebaseConfig && user) {
      const saveToFirebase = async () => {
        try {
          const userDocRef = doc(db, 'users', user.uid);
          await setDoc(userDocRef, { logs });
        } catch (err) {
          console.warn('Failed to save to Firebase:', err);
        }
      };
      saveToFirebase();
    }
  }, [logs, hasLoaded, user]);

  useEffect(() => {
    if (activeTab === 'pending') {
      const allPending = [];
      logs.forEach(log => {
        log.workLogs.forEach(wl => {
          if (wl.status === 'Pending') {
            allPending.push({ id: wl.id, logId: log.id, logMonth: log.monthYear });
          }
        });
      });
      setPendingTasksSnapshot(allPending);
    }
  }, [activeTab]);

  const activeLog = logs.find(log => log.id === activeLogId) || null;
  const filteredLogs = logs.filter(l => l.taxYear === selectedYear);

  // Map snapshot IDs to their latest live data from logs so edits reflect instantly
  const displayPendingTasks = pendingTasksSnapshot
    .map(snapshot => {
      const parentLog = logs.find(l => l.id === snapshot.logId);
      if (!parentLog) return null;
      const latestWl = parentLog.workLogs.find(wl => wl.id === snapshot.id);
      if (!latestWl) return null;
      return { ...latestWl, logId: snapshot.logId, logMonth: snapshot.logMonth };
    })
    .filter(Boolean);
  
  displayPendingTasks.sort((a, b) => new Date(a.dateWorked) - new Date(b.dateWorked));

  const handleCreateNew = () => {
    const newLog = createNewLog();
    setLogs([newLog, ...logs]);
    setSelectedYear(newLog.taxYear);
    setActiveLogId(newLog.id);
  };

  const handleDeleteLog = (logId) => {
    if (window.confirm("Are you sure you want to delete this monthly log? All associated work logs and payouts will be permanently deleted.")) {
      setLogs(logs.filter(log => log.id !== logId));
      if (activeLogId === logId) {
        setActiveLogId(null);
      }
    }
  };

  const updateActiveLog = (updates) => {
    setLogs(logs.map(log => 
      log.id === activeLogId ? { ...log, ...updates } : log
    ));
  };

  const updateWorkLogItem = (itemId, updates) => {
    if (!activeLog) return;
    const newItems = activeLog.workLogs.map(item => {
      if (item.id === itemId) {
        if (typeof updates === 'function') {
          return { ...item, ...updates(item) };
        }
        return { ...item, ...updates };
      }
      return item;
    });
    updateActiveLog({ workLogs: newItems });
  };

  const updateGlobalWorkLogItem = (logId, itemId, field, value) => {
    setLogs(logs.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          workLogs: log.workLogs.map(wl => wl.id === itemId ? { ...wl, [field]: value } : wl)
        };
      }
      return log;
    }));
  };

  const removeGlobalWorkLog = (logId, itemId) => {
    setLogs(logs.map(log => {
      if (log.id === logId) {
        return {
          ...log,
          workLogs: log.workLogs.filter(wl => wl.id !== itemId)
        };
      }
      return log;
    }));
  };

  const updatePayoutItem = (itemId, field, value) => {
    if (!activeLog) return;
    const newItems = activeLog.payouts.map(item => 
      item.id === itemId ? { ...item, [field]: value } : item
    );
    updateActiveLog({ payouts: newItems });
  };

  const addWorkLog = () => {
    const newItem = { 
      id: Date.now(), 
      platform: 'DataAnnotation.tech',
      dateWorked: new Date().toISOString().split('T')[0], 
      projectName: '', 
      minutes: 0, 
      hourlyRate: 20, 
      payType: 'hourly', 
      fixedPay: 0, 
      cashOutDate: '', 
      status: 'Pending' 
    };
    updateActiveLog({ workLogs: [...activeLog.workLogs, newItem] });
  };

  const addPayout = () => {
    const newItem = { 
      id: Date.now(), 
      method: 'PayPal',
      date: new Date().toISOString().split('T')[0], 
      amount: 0, 
      transferId: '' 
    };
    updateActiveLog({ payouts: [...activeLog.payouts, newItem] });
  };

  const removeWorkLog = (id) => {
    updateActiveLog({ workLogs: activeLog.workLogs.filter(item => item.id !== id) });
  };

  const removePayout = (id) => {
    updateActiveLog({ payouts: activeLog.payouts.filter(item => item.id !== id) });
  };

  const handleExportPDF = () => {
    if (!activeLog) return;
    setIsExporting(true);
    try {
      generateWorkLogPDF(activeLog);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const downloadCSV = (filename, rows) => {
    const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportWorkLogsCSV = () => {
    const rows = [
      ["Log Month", "Date Worked", "Platform", "Project Name", "Minutes", "Hourly Rate", "Total Earned", "Expected Cash-Out Date", "Status"]
    ];
    filteredLogs.forEach(log => {
      log.workLogs.forEach(wl => {
        rows.push([
          `"${log.monthYear}"`,
          `"${wl.dateWorked}"`,
          `"${wl.platform}"`,
          `"${wl.projectName.replace(/"/g, '""')}"`,
          wl.minutes,
          wl.hourlyRate,
          getEarnings(wl).toFixed(2),
          `"${wl.cashOutDate}"`,
          `"${wl.status}"`
        ]);
      });
    });
    downloadCSV(`Work_Logs_${selectedYear}.csv`, rows);
  };

  const exportPayoutsCSV = () => {
    const rows = [
      ["Log Month", "Method", "Date", "Amount", "Transfer ID"]
    ];
    filteredLogs.forEach(log => {
      log.payouts.forEach(p => {
        rows.push([
          `"${log.monthYear}"`,
          `"${p.method}"`,
          `"${p.date}"`,
          p.amount,
          `"${p.transferId.replace(/"/g, '""')}"`
        ]);
      });
    });
    downloadCSV(`Payouts_${selectedYear}.csv`, rows);
  };

  if (authChecking) {
    return <div style={{ padding: '2rem', fontWeight: 800, fontFamily: 'monospace', fontSize: '1.5rem', textAlign: 'center', marginTop: '20vh' }}>INITIALIZING HQ...</div>;
  }

  if (hasFirebaseConfig && !user) {
    return <Login />;
  }

  if (!activeLogId) {
    // ----------------- DASHBOARD VIEW -----------------
    const ytdMins = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0), 0);
    const ytdEarnings = filteredLogs.reduce((sum, log) => sum + log.workLogs.reduce((s, wl) => s + getEarnings(wl), 0), 0);
    const ytdTransferred = filteredLogs.reduce((sum, log) => sum + log.payouts.reduce((s, p) => s + (Number(p.amount) || 0), 0), 0);
    const ytdOutstanding = Math.max(0, ytdEarnings - ytdTransferred);

    // Prepare Chart Data (Accrual vs Cash for the CA)
    const monthChartData = [...filteredLogs].reverse().map(log => {
      const earned = log.workLogs.reduce((sum, wl) => sum + getEarnings(wl), 0);
      const transferred = log.payouts.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
      return {
        name: log.monthYear.split(' ')[0].substring(0, 3), // "MAY 2026" -> "MAY"
        earned,
        transferred
      };
    });

    const platformTotals = {};
    filteredLogs.forEach(log => {
      log.workLogs.forEach(wl => {
        const plt = wl.platform || 'Unknown';
        platformTotals[plt] = (platformTotals[plt] || 0) + getEarnings(wl);
      });
    });
    const platformChartData = Object.entries(platformTotals).map(([name, value]) => ({ name, value }));

    return (
      <div className="app-container">
        
        {/* Brutalist Header Title */}
        <h1 className="brutalist-title">FREELANCE_HQ</h1>
        
        {/* Tab Navigation */}
        <div className="tabs-container">
          <button 
            className={`tab ${activeTab === 'monthly' ? 'active' : ''}`}
            onClick={() => setActiveTab('monthly')}
          >
            <LayoutDashboard size={18} /> LOGS
          </button>
          <button 
            className={`tab ${activeTab === 'pending' ? 'active' : ''}`}
            onClick={() => setActiveTab('pending')}
          >
            <Clock size={18} /> PENDING
          </button>
          <button 
            className={`tab ${activeTab === 'metrics' ? 'active' : ''}`}
            onClick={() => setActiveTab('metrics')}
          >
            <BarChart3 size={18} /> METRICS
          </button>
          <button 
            className={`tab ${activeTab === 'settings' ? 'active' : ''}`}
            onClick={() => setActiveTab('settings')}
          >
            <Settings size={18} /> SETTINGS
          </button>
          {hasFirebaseConfig && user && (
            <>
              <button 
                className="tab"
                style={{ marginLeft: 'auto' }}
                onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              >
                {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />} THEME
              </button>
              <button 
                className="tab"
                onClick={() => signOut(auth)}
              >
                <LogOut size={18} /> LOGOUT
              </button>
            </>
          )}
        </div>

        {activeTab === 'metrics' && (
          <div className="metrics-view">
            <div className="ytd-banner">
              <div className="ytd-header">
                <h2>[{selectedYear}] YTD_SUMMARY</h2>
                <div className="year-selector">
                  <label>TAX YEAR: </label>
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    {!availableYears.includes(new Date().getFullYear().toString()) && (
                      <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                    )}
                  </select>
                </div>
              </div>
              <div className="ytd-stats-grid">
                <div className="ytd-stat-box">
                  <span className="ytd-stat-label">Total Hours</span>
                  <span className="ytd-stat-value">{formatTime(ytdMins)}</span>
                </div>
                <div className="ytd-stat-box">
                  <span className="ytd-stat-label">Total Earnings</span>
                  <span className="ytd-stat-value">${ytdEarnings.toFixed(2)}</span>
                </div>
                <div className="ytd-stat-box">
                  <span className="ytd-stat-label">Total Transferred</span>
                  <span className="ytd-stat-value">${ytdTransferred.toFixed(2)}</span>
                </div>
                <div className="ytd-stat-box highlight-box" style={{background: 'var(--text-main)'}}>
                  <span className="ytd-stat-label" style={{color: 'var(--surface-color)'}}>Outstanding</span>
                  <span className="ytd-stat-value" style={{color: 'var(--surface-color)'}}>${ytdOutstanding.toFixed(2)}</span>
                </div>
              </div>
              <div className="ytd-actions">
                <button className="btn-secondary" onClick={exportWorkLogsCSV}>
                  <FileSpreadsheet size={16} /> Export Work Logs
                </button>
                <button className="btn-secondary" onClick={exportPayoutsCSV}>
                  <FileSpreadsheet size={16} /> Export Payouts
                </button>
              </div>
            </div>

            <div className="graphs-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', marginTop: '2.5rem'}}>
              
              <div className="graph-card brutalist-card">
                <h3>EARNED VS TRANSFERRED (BY MONTH)</h3>
                <div style={{height: 300, marginTop: '1rem'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthChartData} margin={{top: 20, right: 20, bottom: 20, left: 0}}>
                      <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{fill: '#86868b', fontWeight: '500'}}/>
                      <YAxis tickLine={false} axisLine={false} tick={{fill: '#86868b', fontWeight: '500'}}/>
                      <RechartsTooltip 
                        cursor={{fill: 'rgba(134,134,139,0.08)'}} 
                        contentStyle={{
                          backgroundColor: 'var(--surface-color)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '12px', 
                          boxShadow: 'var(--shadow-md)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)',
                          fontWeight: '500'
                        }}
                        labelStyle={{ color: 'var(--text-main)', fontWeight: '700' }}
                        itemStyle={{ color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                      <Bar dataKey="earned" name="Earned" fill="#d4d4d4" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="transferred" name="Transferred" fill="#0071e3" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="graph-card brutalist-card">
                <h3>INCOME BY PLATFORM</h3>
                <div style={{height: 300, marginTop: '1rem'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={platformChartData}
                        cx="50%" cy="50%"
                        outerRadius={100}
                        dataKey="value"
                        stroke="var(--surface-color)"
                        strokeWidth={2}
                        label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
                        labelLine={{stroke: '#86868b', strokeWidth: 1}}
                      >
                        {platformChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={APPLE_COLORS[index % APPLE_COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{
                          backgroundColor: 'var(--surface-color)', 
                          border: '1px solid var(--glass-border)', 
                          borderRadius: '12px', 
                          boxShadow: 'var(--shadow-md)', 
                          backdropFilter: 'blur(16px)',
                          WebkitBackdropFilter: 'blur(16px)'
                        }}
                        labelStyle={{ color: 'var(--text-main)', fontWeight: '700' }}
                        itemStyle={{ color: 'var(--text-main)', fontSize: '0.85rem' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="settings-view">
            <div className="dashboard-header">
              <h2>APP SETTINGS</h2>
            </div>

            <div className="graphs-grid" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginTop: '1rem'}}>
              
              {/* Bento Card for PWA Capabilities */}
              <div className="graph-card brutalist-card settings-card" style={{padding: '2rem'}}>
                <h3 style={{marginBottom: '1rem'}}>Progressive Web App (PWA)</h3>
                <p style={{color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem', lineHeight: '1.6'}}>
                  This app is fully PWA-enabled! It features advanced offline service worker caching and can be installed as a standalone app on your desktop, iOS, or Android home screen.
                </p>
                <div style={{display: 'flex', flexDirection: 'column', gap: '1rem'}}>
                  <div style={{display: 'flex', alignItems: 'center', gap: '10px'}}>
                    <span style={{width: '10px', height: '10px', borderRadius: '50%', background: '#34c759', display: 'inline-block'}}></span>
                    <span style={{fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em'}}>
                      Offline Mode: Active (SW registered)
                    </span>
                  </div>
                  {installPrompt ? (
                    <button 
                      className="btn-primary" 
                      onClick={handleInstallPWA}
                      style={{width: '100%', marginTop: '0.5rem'}}
                    >
                      INSTALL STANDALONE APP
                    </button>
                  ) : (
                    <div style={{
                      padding: '10px 14px', 
                      background: 'rgba(52, 199, 89, 0.08)', 
                      border: '1px solid #34c759', 
                      borderRadius: '8px', 
                      color: '#34c759', 
                      fontSize: '0.82rem', 
                      fontWeight: 600,
                      textAlign: 'center'
                    }}>
                      ALREADY INSTALLED OR RUNNING STANDALONE
                    </div>
                  )}
                </div>
              </div>

              {/* Bento Card for Brand & Logo Identity */}
              <div className="graph-card brutalist-card settings-card" style={{padding: '2rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center'}}>
                <h3 style={{width: '100%', textAlign: 'left', marginBottom: '1.5rem'}}>App Branding</h3>
                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '24px',
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--glass-border)',
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: '#000'
                }}>
                  <img src="/logo.png" alt="App Logo" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                </div>
                <h4 style={{fontSize: '1rem', fontWeight: 800, marginBottom: '0.25rem'}}>ANTIGRAVITY INVOICE LOGGER</h4>
                <p style={{fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em'}}>
                  Premium Apple-Inspired Edition
                </p>
              </div>

            </div>
          </div>
        )}

        {activeTab === 'monthly' && (
          <>
            <div className="dashboard-header">
              <h2>MONTHLY LOGS</h2>
              <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                <div className="year-selector-mini">
                  <select value={selectedYear} onChange={(e) => setSelectedYear(e.target.value)}>
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                    {!availableYears.includes(new Date().getFullYear().toString()) && (
                      <option value={new Date().getFullYear().toString()}>{new Date().getFullYear()}</option>
                    )}
                  </select>
                </div>
                <button className="btn-primary" onClick={handleCreateNew}>
                  <Plus size={16} /> NEW LOG
                </button>
              </div>
            </div>

            {filteredLogs.length === 0 ? (
              <div className="invoice-list">
                <div className="empty-state">
                  <Briefcase size={48} strokeWidth={1.5} />
                  <h2>NO LOGS FOUND FOR {selectedYear}</h2>
                  <p>CREATE YOUR FIRST MONTHLY LOG.</p>
                </div>
              </div>
            ) : (
              <div className="invoice-list">
                <div className="invoice-list-header">
                  <div>Month</div>
                  <div>Platforms</div>
                  <div>Total Time</div>
                  <div>Earnings</div>
                  <div style={{textAlign: 'right'}}>Actions</div>
                </div>
                {filteredLogs.map(log => {
                  const totalMins = log.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
                  const totalEarnings = log.workLogs.reduce((sum, item) => sum + getEarnings(item), 0);
                  const platformsUsed = [...new Set(log.workLogs.map(wl => wl.platform))].filter(Boolean);
                  const platformsStr = platformsUsed.length > 0 ? platformsUsed.join(', ') : 'None';
                  
                  return (
                    <div 
                      key={log.id} 
                      className="invoice-list-item"
                      onClick={() => setActiveLogId(log.id)}
                    >
                      <div style={{fontWeight: 800, color: 'var(--text-main)'}}>{log.monthYear}</div>
                      <div style={{fontSize: '0.85rem', fontWeight: 600}}>{platformsStr}</div>
                      <div style={{fontWeight: 700}}>{formatTime(totalMins)}</div>
                      <div style={{fontWeight: 800}}>${totalEarnings.toFixed(2)}</div>
                      <div style={{display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'flex-end'}} onClick={(e) => e.stopPropagation()}>
                        <button 
                          className="icon-only delete-log-btn" 
                          onClick={() => handleDeleteLog(log.id)}
                          style={{color: '#ef4444', padding: '4px', background: 'transparent', boxShadow: 'none'}}
                          title="Delete monthly log"
                        >
                          <Trash2 size={18} />
                        </button>
                        <ChevronRight size={20} strokeWidth={3} onClick={() => setActiveLogId(log.id)} style={{cursor: 'pointer'}} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {activeTab === 'pending' && (
          <div className="pending-tracker-view">
            <div className="dashboard-header">
              <h2>GLOBAL PENDING TASKS</h2>
            </div>
            
            <div className="ytd-stats-grid" style={{marginBottom: '2rem'}}>
              <div className="ytd-stat-box" style={{background: 'var(--text-main)'}}>
                <span className="ytd-stat-label" style={{color: 'var(--surface-color)'}}>Pending Income</span>
                <span className="ytd-stat-value" style={{color: 'var(--surface-color)'}}>
                  ${displayPendingTasks.reduce((s, wl) => s + getEarnings(wl), 0).toFixed(2)}
                </span>
              </div>
              <div className="ytd-stat-box">
                <span className="ytd-stat-label">Pending Hours</span>
                <span className="ytd-stat-value">
                  {formatTime(displayPendingTasks.reduce((s, wl) => s + (Number(wl.minutes) || 0), 0))}
                </span>
              </div>
              <div className="ytd-stat-box">
                <span className="ytd-stat-label">Pending Tasks</span>
                <span className="ytd-stat-value">{displayPendingTasks.length}</span>
              </div>
            </div>

            {displayPendingTasks.length === 0 ? (
              <div className="invoice-list">
                <div className="empty-state">
                  <Clock size={48} strokeWidth={1.5} />
                  <h2>ALL CAUGHT UP</h2>
                  <p>NO PENDING TASKS ACROSS ANY LOGS.</p>
                </div>
              </div>
            ) : (
              <div className="document-wrapper">
                <div className="ambient-glow no-print"></div>
                <div className="invoice-document log-document" style={{padding: '2rem 3rem'}}>
                  <div className="work-log-table">
                  <div className="wl-header pending-header">
                    <div>Log</div>
                    <div>Date</div>
                    <div>Platform</div>
                    <div>Project / Amount</div>
                    <div>Status</div>
                    <div></div>
                  </div>
                  
                  {displayPendingTasks.map((item) => (
                    <div key={item.id} className="wl-row pending-row">
                      <div data-label="Log" style={{fontWeight: 800, color: 'var(--text-main)'}}>{item.logMonth.split(' ')[0]}</div>
                      <div data-label="Date" style={{color: 'var(--text-main)', fontWeight: 600}}>{item.dateWorked}</div>
                      <div data-label="Platform" style={{color: 'var(--text-main)', fontWeight: 700}}>{item.platform}</div>
                      
                      <div data-label="Project / Amount" style={{display: 'flex', flexDirection: 'column', gap: '4px'}}>
                        <div style={{color: 'var(--text-main)', fontSize: '0.95rem', fontWeight: 700}}>{item.projectName || 'Unnamed Project'}</div>
                        <div style={{fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600}}>
                          {(!item.minutes || item.minutes === 0) ? 'Fixed Pay' : `${formatTime(item.minutes)} @ $${Number(item.hourlyRate || 0).toFixed(2)}/h`} = ${getEarnings(item).toFixed(2)}
                        </div>
                      </div>
                      <div data-label="Status">
                        <select 
                          className={`status-select status-${item.status.toLowerCase().replace(' ', '-')}`}
                          value={item.status}
                          onChange={(e) => updateGlobalWorkLogItem(item.logId, item.id, 'status', e.target.value)}
                        >
                          <option value="Pending">Pending</option>
                          <option value="Cleared">Cleared</option>
                          <option value="Rejected">Rejected</option>
                          <option value="Quality Issue">Quality Issue</option>
                        </select>
                      </div>
                      <div className="no-print" style={{textAlign: 'right'}}>
                        <button className="icon-only" onClick={() => removeGlobalWorkLog(item.logId, item.id)}>
                          <Trash2 size={18} strokeWidth={2.5} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ----------------- EDITOR VIEW -----------------
  if (!activeLog) return null;
  
  const totalMins = activeLog.workLogs.reduce((sum, item) => sum + (Number(item.minutes) || 0), 0);
  const totalEarnings = activeLog.workLogs.reduce((sum, item) => sum + getEarnings(item), 0);
  const totalTransferred = activeLog.payouts.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="app-container">
      {/* Action Bar */}
      <div className="editor-top-bar no-print">
        <button className="btn-secondary back-btn" onClick={() => setActiveLogId(null)}>
          <ArrowLeft size={16} /> DASHBOARD
        </button>
        <div className="editor-actions" style={{display: 'flex', gap: '8px'}}>
          <button 
            className="btn-secondary delete-btn" 
            onClick={() => handleDeleteLog(activeLog.id)}
            style={{color: '#ef4444'}}
          >
            <Trash2 size={16} /> DELETE LOG
          </button>
          <button className="btn-secondary" onClick={handleExportPDF} disabled={isExporting}>
            {isExporting ? 'EXPORTING...' : <><Download size={16} /> DOWNLOAD PDF</>}
          </button>
        </div>
      </div>

      {/* Log Document */}
      <div className="document-wrapper">
        <div className="ambient-glow no-print"></div>
        <div id="log-document-capture" className={`invoice-document log-document ${isExporting ? 'exporting' : ''}`}>
        
        {/* Header Section */}
        <h1 className="doc-title">INVOICE</h1>
        
        <div className="metadata-container">
          <div className="meta-left-col">
            <div className="meta-item">
              <label>Name</label>
              <input 
                value={activeLog.userName || ''}
                onChange={(e) => updateActiveLog({ userName: e.target.value })}
              />
            </div>
            <div className="meta-item">
              <label>Email</label>
              <input 
                value={activeLog.userEmail || ''}
                onChange={(e) => updateActiveLog({ userEmail: e.target.value })}
              />
            </div>
            <div className="meta-item">
              <label>Phone</label>
              <input 
                value={activeLog.userPhone || ''}
                onChange={(e) => updateActiveLog({ userPhone: e.target.value })}
              />
            </div>
            <div className="meta-item">
              <label>Tax Year</label>
              <input 
                value={activeLog.taxYear || ''}
                onChange={(e) => updateActiveLog({ taxYear: e.target.value })}
              />
            </div>
          </div>
          
          <div className="meta-right-col">
            <div className="meta-item address-item">
              <label>Billing & Correspondence Address</label>
              <textarea 
                value={activeLog.userAddress || ''}
                onChange={(e) => updateActiveLog({ userAddress: e.target.value })}
                placeholder="Enter complete billing/mailing address..."
                rows={4}
              />
            </div>
          </div>
        </div>

        {/* Monthly Summary */}
        <div className="summary-section">
          <h2>SUMMARY <input 
            className="inline-input summary-month"
            value={activeLog.monthYear}
            onChange={(e) => {
              const newMonthYear = e.target.value.toUpperCase();
              const { year: newY, month: newM } = parseMonthYear(newMonthYear);
              
              // Automatically sync all work item dates to the new month/year
              const updatedWorkLogs = activeLog.workLogs.map(wl => {
                if (wl.dateWorked) {
                  const day = wl.dateWorked.split('-')[2] || '01';
                  return {
                    ...wl,
                    dateWorked: `${newY}-${String(newM).padStart(2, '0')}-${day}`
                  };
                }
                return wl;
              });
              
              updateActiveLog({ 
                monthYear: newMonthYear,
                workLogs: updatedWorkLogs
              });
            }}
            placeholder="MAY 2026"
          /></h2>
          <div className="summary-stats">
            <div className="stat-row">
              <span>Total Time:</span>
              <span className="stat-val">{formatTime(totalMins)}</span>
            </div>
            <div className="stat-row">
              <span>Project Earnings:</span>
              <span className="stat-val">${totalEarnings.toFixed(2)}</span>
            </div>
            <div className="stat-row">
              <span>Transferred:</span>
              <span className="stat-val">${totalTransferred.toFixed(2)}</span>
            </div>
            <div className="stat-row" style={{borderTop: '2px solid var(--text-main)', paddingTop: '0.5rem', marginTop: '0.25rem'}}>
              <span>Outstanding:</span>
              <span className="stat-val">
                ${Math.max(0, totalEarnings - totalTransferred).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Work Log Breakdown */}
        <div className="section-block">
          <h3>WORK BREAKDOWN</h3>
          <div className="work-log-table">
            <div className="wl-header">
              <div>Date</div>
              <div>Platform</div>
              <div>Project Name / ID</div>
              <div>Time</div>
              <div>Rate</div>
              <div>Total</div>
              <div>Status</div>
              <div className="no-print"></div>
            </div>
            
            {activeLog.workLogs.map((item) => (
              <div key={item.id} className="wl-row">
                <div data-label="Date">
                  {(() => {
                    const { year, month } = parseMonthYear(activeLog.monthYear);
                    const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    return (
                      <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>
                          {monthNamesShort[month - 1] || 'Date'}
                        </span>
                        <input 
                          type="number"
                          value={item.dateWorked ? parseInt(item.dateWorked.split('-')[2], 10) : ''}
                          onChange={(e) => {
                            const valStr = e.target.value;
                            if (valStr === '') {
                              updateWorkLogItem(item.id, { dateWorked: '' });
                              return;
                            }
                            let dayVal = parseInt(valStr, 10);
                            if (isNaN(dayVal)) return;
                            
                            const maxDays = getDaysInMonth(year, month);
                            if (dayVal < 1) dayVal = 1;
                            if (dayVal > maxDays) dayVal = maxDays;
                            
                            const newDateStr = `${year}-${String(month).padStart(2, '0')}-${String(dayVal).padStart(2, '0')}`;
                            updateWorkLogItem(item.id, { dateWorked: newDateStr });
                          }}
                          min="1"
                          max={getDaysInMonth(year, month)}
                          style={{ width: '38px', padding: '2px', fontSize: '0.82rem', textAlign: 'center' }}
                          placeholder="DD"
                        />
                      </div>
                    );
                  })()}
                </div>
                <div data-label="Platform">
                  <select 
                    value={item.platform || 'DataAnnotation.tech'}
                    onChange={(e) => updateWorkLogItem(item.id, { platform: e.target.value })}
                  >
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div data-label="Task Description">
                  <textarea 
                    value={item.projectName}
                    onChange={(e) => updateWorkLogItem(item.id, { projectName: e.target.value })}
                    placeholder="Project name"
                    className="task-name-input"
                    rows={2}
                  />
                </div>
                <div data-label="Time">
                  <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
                    <input 
                      type="number" 
                      value={Math.floor((item.minutes || 0) / 60) === 0 ? '' : Math.floor((item.minutes || 0) / 60)}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        const newMins = ((val === '' ? 0 : parseInt(val, 10)) * 60) + ((prev.minutes || 0) % 60);
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (parseFloat(prev.fixedPay) || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (parseFloat(prev.hourlyRate) || 0) };
                      })}
                      min="0" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    /><span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>h</span>
                    <input 
                      type="number" 
                      value={(item.minutes || 0) % 60 === 0 ? '' : (item.minutes || 0) % 60}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        const newMins = (Math.floor((prev.minutes || 0) / 60) * 60) + (val === '' ? 0 : parseInt(val, 10));
                        if (prev.payType === 'fixed') {
                          return { minutes: newMins, hourlyRate: newMins > 0 ? (parseFloat(prev.fixedPay) || 0) / (newMins / 60) : 0 };
                        }
                        return { minutes: newMins, fixedPay: (newMins / 60) * (parseFloat(prev.hourlyRate) || 0) };
                      })}
                      min="0" max="59" style={{width: '35px', padding: '2px', fontSize: '0.75rem'}}
                    /><span style={{fontSize: '0.7rem', fontWeight: 'bold'}}>m</span>
                  </div>
                </div>
                <div data-label="Rate">
                  <div className="input-with-prefix">
                    <span style={{fontSize: '0.75rem'}}>$</span>
                    <input 
                      type="number" 
                      value={item.hourlyRate === 0 ? '' : item.hourlyRate}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        return { 
                          hourlyRate: val, 
                          fixedPay: ((prev.minutes || 0) / 60) * (parseFloat(val) || 0),
                          payType: 'hourly'
                        };
                      })}
                      min="0" step="any" style={{padding: '2px', fontSize: '0.75rem', width: '50px'}}
                    /><span style={{fontSize:'0.7rem', fontWeight:'bold'}}>/h</span>
                  </div>
                </div>
                <div data-label="Total">
                  <div className="input-with-prefix">
                    <span style={{fontSize: '0.75rem'}}>$</span>
                    <input 
                      type="number" 
                      value={item.fixedPay === 0 ? '' : item.fixedPay}
                      onChange={(e) => updateWorkLogItem(item.id, (prev) => {
                        const val = e.target.value;
                        return {
                          fixedPay: val,
                          hourlyRate: (prev.minutes || 0) > 0 ? (parseFloat(val) || 0) / ((prev.minutes || 0) / 60) : 0,
                          payType: 'fixed'
                        };
                      })}
                      min="0" step="any" style={{padding: '2px', fontSize: '0.75rem', width: '60px'}}
                    />
                  </div>
                </div>
                <div data-label="Status">
                  <select 
                    className={`status-select status-${item.status.toLowerCase().replace(' ', '-')}`}
                    value={item.status}
                    onChange={(e) => updateWorkLogItem(item.id, { status: e.target.value })}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Cleared">Cleared</option>
                    <option value="Rejected">Rejected</option>
                    <option value="Quality Issue">Quality Issue</option>
                  </select>
                </div>
                {!isExporting ? (
                  <div className="no-print" style={{textAlign: 'right'}}>
                    <button className="icon-only" onClick={() => removeWorkLog(item.id)}>
                      <Trash2 size={16} strokeWidth={2.5}/>
                    </button>
                  </div>
                ) : (
                  <div></div>
                )}
              </div>
            ))}
          </div>
          
          {!isExporting && (
            <div className="add-item-row no-print" style={{marginTop: '1rem'}}>
              <button className="btn-secondary" onClick={addWorkLog}>
                <Plus size={16} /> ADD LOG
              </button>
            </div>
          )}
        </div>

        {/* Payout History */}
        <div className="section-block">
          <h3>PAYOUT HISTORY</h3>
          
          <div className="payout-table">
            <div className="payout-header">
              <div>Method</div>
              <div>Date</div>
              <div>Amount</div>
              <div>Transfer ID</div>
              <div className="no-print"></div>
            </div>
            
            {activeLog.payouts.length === 0 ? (
              <p className="empty-payouts" style={{paddingTop: '1rem', fontWeight: 600}}>No transfers logged.</p>
            ) : (
              <div className="payout-list">
                {activeLog.payouts.map((item) => (
                  <div key={item.id} className="payout-row">
                    <div data-label="Method">
                      <select 
                        value={item.method || 'PayPal'}
                        onChange={(e) => updatePayoutItem(item.id, 'method', e.target.value)}
                      >
                        {PAYOUT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div data-label="Date">
                      <input 
                        type="date"
                        value={item.date}
                        onChange={(e) => updatePayoutItem(item.id, 'date', e.target.value)}
                      />
                    </div>
                    <div data-label="Amount">
                      <div className="input-with-prefix">
                        <span>$</span>
                        <input 
                          type="number" 
                          value={item.amount}
                          onChange={(e) => updatePayoutItem(item.id, 'amount', parseFloat(e.target.value) || 0)}
                          min="0"
                        />
                      </div>
                    </div>
                    <div data-label="Transfer ID">
                      <input 
                        value={item.transferId}
                        onChange={(e) => updatePayoutItem(item.id, 'transferId', e.target.value)}
                        placeholder="e.g. XYZ123"
                      />
                    </div>
                    {!isExporting ? (
                      <div className="no-print" style={{textAlign: 'right'}}>
                        <button className="icon-only" onClick={() => removePayout(item.id)}>
                          <Trash2 size={16} strokeWidth={2.5} />
                        </button>
                      </div>
                    ) : (
                      <div></div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {!isExporting && (
            <div className="add-item-row no-print" style={{marginTop: '1rem'}}>
              <button className="btn-secondary" onClick={addPayout}>
                <Plus size={16} /> ADD TRANSFER
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  </div>
  );
}

export default App;
