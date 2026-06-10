import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts'
import './App.css'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' })
const AptivLogo = ({ className = '' }) => (
  <svg viewBox="0 0 320 60" className={className} xmlns="http://www.w3.org/2000/svg">
    <circle cx="20" cy="30" r="8" fill="#ff4b2b" />
    <text
      x="151"
      y="40"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      fontWeight="800"
      fontSize="28"
      letterSpacing="18"
      fill="currentColor"
      textAnchor="middle"
    >
      APTIV
    </text>
    <circle cx="300" cy="30" r="8" fill="#ff4b2b" />
  </svg>
)

const ReclamationIcon = ({ className = '', style }) => (
  <svg viewBox="0 0 52 52" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="rGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ff4b2b" />
        <stop offset="100%" stopColor="#ff8c42" />
      </linearGradient>
    </defs>
    <rect x="2" y="2" width="48" height="48" rx="12" fill="url(#rGrad)" />
    <text x="26" y="37" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="900" fontSize="30" fill="white" textAnchor="middle">R</text>
  </svg>
)

const ReclamationWordmark = ({ className = '', style }) => (
  <svg viewBox="0 0 210 52" className={className} style={style} xmlns="http://www.w3.org/2000/svg">
    <text x="4" y="22" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="800" fontSize="15" fill="currentColor">Recla</text>
    <text x="4" y="40" fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" fontWeight="400" fontSize="13" fill="#ff4b2b" letterSpacing="1">MANAGER</text>
  </svg>
)

const ReclamationLogo = ({ className = '' }) => (
  <div className={className} style={{ display: 'flex', alignItems: 'center', gap: '8px', height: '100%' }}>
    <ReclamationIcon style={{ height: '100%', width: 'auto', flexShrink: 0 }} />
    <ReclamationWordmark style={{ height: '100%', width: 'auto', flexShrink: 0 }} />
  </div>
)

const getFirstApiValidationError = (errors) => {
  if (!errors || typeof errors !== 'object') return ''
  const firstKey = Object.keys(errors)[0]
  return errors[firstKey]?.[0] || ''
}

const getAuthErrorMessage = (err, mode) => {
  const status = err?.response?.status
  const apiMessage = err?.response?.data?.message
  const validation = err?.response?.data?.errors

  if (status === 401) return apiMessage || 'Matricule ou mot de passe incorrect.'

  if (status === 403) return apiMessage || 'Your account has been deactivated. Please contact an administrator.'

  if (status === 422 && validation && typeof validation === 'object') {
    return getFirstApiValidationError(validation) || apiMessage || 'Donnees invalides. Verifiez les champs.'
  }

  if (status >= 500) return 'Erreur serveur. Merci de reessayer dans quelques instants.'

  return mode === 'login'
    ? apiMessage || 'Echec de connexion. Verifiez vos identifiants.'
    : apiMessage || 'Authentication failed. Check your data and try again.'
}

const isNetworkError = (err) => !err?.response
const RETRY_SAFE_METHODS = new Set(['get', 'head', 'options'])

const apiRequestWithRetry = async (config, options = {}) => {
  const { retries = 1, retryDelayMs = 400, retryUnsafe = false } = options
  let attempt = 0
  while (true) {
    try {
      return await api.request(config)
    } catch (err) {
      const method = (config?.method || 'get').toLowerCase()
      const canRetry = (RETRY_SAFE_METHODS.has(method) || retryUnsafe) && isNetworkError(err) && attempt < retries
      if (!canRetry) throw err
      attempt += 1
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
    }
  }
}

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('token'))
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark')
  const [sidebarPinned, setSidebarPinned] = useState(false)
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [items, setItems] = useState([])
  const [departments, setDepartments] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', machine: '', location: '', department: '', priority: 'medium' })
  const [toasts, setToasts] = useState([])
  const [sessionKey, setSessionKey] = useState(0)
  const toastTimersRef = useRef(new Map())

  const dismissToast = (id) => {
    const timers = toastTimersRef.current.get(id)
    if (timers?.auto) clearTimeout(timers.auto)
    if (timers?.remove) return

    setToasts((prev) => prev.map((toast) => (toast.id === id ? { ...toast, closing: true } : toast)))

    const removeTimer = setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id))
      const current = toastTimersRef.current.get(id)
      if (current?.remove) clearTimeout(current.remove)
      toastTimersRef.current.delete(id)
    }, 220)

    toastTimersRef.current.set(id, { auto: null, remove: removeTimer })
  }

  const notify = (type, message) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setToasts((prev) => [...prev, { id, type, message, closing: false }])

    const autoTimer = setTimeout(() => dismissToast(id), 4000)
    toastTimersRef.current.set(id, { auto: autoTimer, remove: null })
  }

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!token) return
    apiRequestWithRetry({ method: 'get', url: '/me', headers: { Authorization: `Bearer ${token}` } })
      .then(({ data }) => {
        if (data?.success === false) throw new Error(data?.message || 'Failed to load profile.')
        const payload = data?.success === true ? (data?.data?.user || data?.user || data?.data) : data
        setUser(payload || null)
      })
      .catch((err) => {
        // If token is invalid/expired (401), clear everything and go to login
        if (err?.response?.status === 401 || !err?.response) {
          sessionStorage.removeItem('token')
          setToken(null)
          setUser(null)
        }
      })
  }, [token])

  useEffect(() => {
    if (!token || !user) return
    const headers = { Authorization: `Bearer ${token}` }
    setLoadingDashboard(true)
    const recUrl = user.role === 'technician' ? '/tasks' : '/reclamations?per_page=10'
    Promise.all([
      apiRequestWithRetry({ method: 'get', url: '/dashboard/stats', headers }),
      apiRequestWithRetry({ method: 'get', url: recUrl, headers }),
    ])
      .then(([statsResponse, reclamationsResponse]) => {
        const statsBody = statsResponse.data
        const reclamationsBody = reclamationsResponse.data

        if (statsBody?.success === false) throw new Error(statsBody?.message || 'Failed to load dashboard stats.')
        if (reclamationsBody?.success === false) throw new Error(reclamationsBody?.message || 'Failed to load data.')

        const statsPayload = statsBody?.success === true ? (statsBody?.data || {}) : statsBody
        const reclamationsPayload = reclamationsBody?.success === true ? (reclamationsBody?.data || []) : reclamationsBody
        const itemsList = Array.isArray(reclamationsPayload) ? reclamationsPayload : (reclamationsPayload?.data || [])

        setStats(statsPayload)
        setItems(itemsList)
      })
      .catch((err) => notify('error', err?.message || 'Network issue while loading dashboard. Please try again.'))
      .finally(() => setLoadingDashboard(false))
  }, [token, user?.role])

  const fetchDepartments = async () => {
    if (!token) return
    try {
      const res = await apiRequestWithRetry({
        method: 'get',
        url: '/departments',
        headers: { Authorization: `Bearer ${token}` }
      })
      setDepartments(res.data || [])
    } catch (err) {
      console.error('Failed to fetch departments:', err)
    }
  }

  useEffect(() => {
    fetchDepartments()
  }, [token])

  useEffect(() => () => {
    toastTimersRef.current.forEach((timers) => {
      if (timers.auto) clearTimeout(timers.auto)
      if (timers.remove) clearTimeout(timers.remove)
    })
    toastTimersRef.current.clear()
  }, [])

  const chartStatus = useMemo(() => Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({ name, value })), [stats])
  const chartMonthly = stats?.monthly_reclamations || []
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // Clear session client-side even if API call fails.
    } finally {
      sessionStorage.removeItem('token')
      setToken(null)
      setUser(null)
      setStats(null)
      setItems([])
      setSessionKey((k) => k + 1)
    }
  }

  if (!token) {
    return (
      <>
        <div className="toast-stack" aria-live="polite" aria-atomic="true" aria-relevant="additions text" style={{ zIndex: 9999 }}>
          {toasts.map((toast) => (
            <ToastAlert key={toast.id} toast={toast} onClose={() => dismissToast(toast.id)} />
          ))}
        </div>
        <div className="app-background">
          <AptivLogo className="bg-watermark" />
        </div>
        <AuthScreen key={sessionKey} onAuth={(t) => setToken(t)} notify={notify} theme={theme} setTheme={setTheme} />
      </>
    )
  }

  return (
    <>
      <div className="app-background">
        <AptivLogo className="bg-watermark" />
      </div>
      <div className="layout">
        <div className="toast-stack" aria-live="polite" aria-atomic="true" aria-relevant="additions text">
          {toasts.map((toast) => (
            <ToastAlert key={toast.id} toast={toast} onClose={() => dismissToast(toast.id)} />
          ))}
        </div>
      <aside className={`sidebar ${sidebarPinned ? 'pinned' : 'collapsed'}`}>
        <div className="sidebar-top">
          <div className="app-logo-container">
            <ReclamationIcon className="sidebar-icon-logo" style={{ height: '32px', width: '32px' }} />
            <ReclamationWordmark className="sidebar-expanded-only" style={{ height: '32px' }} />
          </div>
          <button
            className="sidebar-pin-btn"
            onClick={() => setSidebarPinned(p => !p)}
            title={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
            aria-label={sidebarPinned ? 'Unpin sidebar' : 'Pin sidebar open'}
          >
            {sidebarPinned ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z"/>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="17" x2="12" y2="22"/>
                <path d="M5 17h14v-1.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V6h1a2 2 0 0 0 0-4H8a2 2 0 0 0 0 4h1v4.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V17z"/>
              </svg>
            )}
          </button>
        </div>

        <nav className="nav vertical">
          <NavLink to="/" title="Dashboard">
            <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
            </svg>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          {user?.role === 'operator' && (
            <>
              <NavLink to="/reclamations" title="My Reclamations">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                <span className="nav-label">My Reclamations</span>
              </NavLink>
              <NavLink to="/new" title="New Reclamation">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
                </svg>
                <span className="nav-label">New Reclamation</span>
              </NavLink>
            </>
          )}
          {user?.role === 'department' && (
            <>
              <NavLink to="/reclamations" title="Department Complaints">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
                </svg>
                <span className="nav-label">Department Complaints</span>
              </NavLink>
              <NavLink to="/tasks" title="Technician Assignments">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/>
                  <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/>
                  <line x1="9" y1="12" x2="15" y2="12"/>
                  <line x1="9" y1="16" x2="13" y2="16"/>
                </svg>
                <span className="nav-label">Technician Tasks</span>
              </NavLink>
            </>
          )}
          {user?.role === 'technician' && (
            <NavLink to="/tasks" title="My Tasks">
              <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 11 12 14 22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <span className="nav-label">My Tasks</span>
            </NavLink>
          )}
          {user?.role === 'admin' && (
            <>
              <NavLink to="/users" title="User Management">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
                <span className="nav-label">User Management</span>
              </NavLink>
              <NavLink to="/departments" title="Department Management">
                <svg className="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
                  <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                </svg>
                <span className="nav-label">Departments</span>
              </NavLink>
            </>
          )}
        </nav>

        <div className="user-profile-card">
          <div className="user-avatar">
            {user?.name ? user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'U'}
          </div>
          <div className="user-info sidebar-expanded-only">
            <span className="user-fullname">{user?.name || 'User'}</span>
            <span className="user-role-badge">{user?.role || user?.department || 'Employee'}</span>
          </div>
          <button type="button" className="logout-icon-btn sidebar-expanded-only" onClick={handleLogout} title="Déconnexion" aria-label="Déconnexion">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </aside>
      <div className="content-wrapper">
        <header className="header-horizontal">
          <div className="search-bar">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search..." aria-label="Search" />
          </div>
          <div className="header-right">
            <div className="user-department">
              <span className="dept-badge">{user?.department || 'Department'}</span>
            </div>
            <button
              type="button"
              className="theme-btn icon-only"
              onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
              title={theme === 'dark' ? 'Passer en light mode' : 'Passer en dark mode'}
              aria-label={theme === 'dark' ? 'Passer en light mode' : 'Passer en dark mode'}
            >
              {theme === 'dark' ? '☀' : '🌙'}
            </button>
          </div>
        </header>
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard stats={stats} statusData={chartStatus} monthlyData={chartMonthly} items={items} user={user} />} />
            {user?.role === 'operator' && (
              <>
                <Route path="/reclamations" element={<Reclamations items={items} token={token} loading={loadingDashboard} user={user} />} />
                <Route path="/new" element={<CreateForm form={form} setForm={setForm} token={token} departments={departments} onDone={() => location.assign('/reclamations')} notify={notify} />} />
              </>
            )}
            {user?.role === 'department' && (
              <>
                <Route path="/reclamations" element={<Reclamations items={items} token={token} loading={loadingDashboard} user={user} />} />
                <Route path="/tasks" element={<DepartmentTaskManager token={token} notify={notify} user={user} />} />
              </>
            )}
            {user?.role === 'technician' && (
              <>
                <Route path="/tasks" element={<TechnicianTaskManager token={token} notify={notify} user={user} />} />
              </>
            )}
            {user?.role === 'admin' && (
              <>
                <Route path="/users" element={<UserManagement token={token} notify={notify} currentUser={user} departments={departments} />} />
                <Route path="/departments" element={<DepartmentManagement token={token} notify={notify} departments={departments} onRefreshDepartments={fetchDepartments} />} />
              </>
            )}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </div>
    </>
  )
}

function AuthScreen({ onAuth, notify, theme, setTheme }) {
  const [mode, setMode] = useState('login')
  const [loading, setLoading] = useState(false)
  const [loadingAction, setLoadingAction] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [payload, setPayload] = useState({
    matricule: '',
    password: '',
    password_confirmation: '',
    identifier: '',
    code: '',
  })

  const setAuthMode = (nextMode) => {
    setMode(nextMode)
  }

  const showSuccess = (message) => notify?.('success', message)
  const showError = (message) => notify?.('error', message)

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLoadingAction(mode)
    try {
      if (mode === 'login') {
        const { data } = await apiRequestWithRetry({
          method: 'post',
          url: '/auth/login',
          data: { matricule: payload.matricule, password: payload.password },
        })
        const apiSuccess = data?.success === true
        if (!apiSuccess || !data?.token) {
          showError(data?.message || 'Echec de connexion. Verifiez vos identifiants.')
          return
        }
        showSuccess(data?.message || 'Connexion reussie.')
        sessionStorage.setItem('token', data.token)
        onAuth(data.token)

      } else if (mode === 'forgot') {
        const { data } = await apiRequestWithRetry({
          method: 'post',
          url: '/auth/forgot-password',
          data: { identifier: payload.identifier },
        })
        const apiSuccess = data?.success === true
        const validationError = getFirstApiValidationError(data?.errors)
        if (!apiSuccess) {
          showError(validationError || data?.message || 'Echec de demande de reinitialisation.')
          return
        }
        showSuccess(data?.message || 'Code envoyé à votre adresse email.')
        setPayload((prev) => ({
          ...prev,
          code: '',
          identifier: prev.identifier.trim(),
        }))
        setMode('verify')

      } else if (mode === 'verify') {
        const { data } = await apiRequestWithRetry({
          method: 'post',
          url: '/auth/verify-reset-code',
          data: { identifier: payload.identifier, code: payload.code },
        })
        const apiSuccess = data?.success === true
        const validationError = getFirstApiValidationError(data?.errors)
        if (!apiSuccess) {
          showError(validationError || data?.message || 'Code invalide ou expiré.')
          return
        }
        showSuccess(data?.message || 'Code vérifié. Définissez votre nouveau mot de passe.')
        setPayload((prev) => ({ ...prev, password: '', password_confirmation: '' }))
        setMode('reset')

      } else if (mode === 'reset') {
        const { data } = await apiRequestWithRetry({
          method: 'post',
          url: '/auth/reset-password',
          data: {
            identifier: payload.identifier,
            code: payload.code,
            password: payload.password,
            password_confirmation: payload.password_confirmation,
          },
        })
        const apiSuccess = data?.success === true
        const validationError = getFirstApiValidationError(data?.errors)
        if (!apiSuccess) {
          showError(validationError || data?.message || 'Echec de reinitialisation du mot de passe.')
          return
        }
        showSuccess(data?.message || 'Mot de passe mis à jour avec succès.')
        setMode('login')
        setPayload({ matricule: '', password: '', password_confirmation: '', identifier: '', code: '' })
      }
    } catch (err) {
      showError(getAuthErrorMessage(err, mode))
    } finally {
      setLoading(false)
      setLoadingAction('')
    }
  }

  // Step indicator labels
  const stepTitle = {
    login: 'Connexion',
    forgot: 'Mot de passe oublié',
    verify: 'Vérification du code',
    reset: 'Nouveau mot de passe',
  }
  const stepSubtitle = {
    login: 'Bienvenue sur ReclaManager',
    forgot: 'Saisissez votre email pour recevoir un code',
    verify: 'Entrez le code à 6 chiffres reçu par email',
    reset: 'Choisissez votre nouveau mot de passe',
  }
  const submitLabel = {
    login: 'Se connecter',
    forgot: 'Envoyer le code',
    verify: 'Vérifier le code',
    reset: 'Enregistrer le mot de passe',
  }
  const loadingLabel = {
    login: 'Connexion...',
    forgot: 'Envoi...',
    verify: 'Vérification...',
    reset: 'Mise à jour...',
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card" aria-busy={loading}>
        <button
          type="button"
          className="theme-btn icon-only"
          style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 100 }}
          onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
          title={theme === 'dark' ? 'Passer en light mode' : 'Passer en dark mode'}
        >
          {theme === 'dark' ? '☀' : '🌙'}
        </button>
        <div className="auth-cover-logo">
          <ReclamationIcon className="auth-icon" />
          <ReclamationWordmark className="auth-wordmark" />
        </div>

        {/* Step dots for multi-step flow */}
        {(mode === 'forgot' || mode === 'verify' || mode === 'reset') && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', marginTop: '8px', marginBottom: '4px' }}>
            {['forgot', 'verify', 'reset'].map((step, idx) => {
              const stepOrder = { forgot: 0, verify: 1, reset: 2 }
              const currentOrder = stepOrder[mode]
              const isCompleted = stepOrder[step] < currentOrder
              const isActive = step === mode
              return (
                <div key={step} style={{
                  width: isActive ? '28px' : '10px',
                  height: '10px',
                  borderRadius: '5px',
                  background: isActive ? 'var(--brand-accent, #6366f1)' : isCompleted ? 'var(--brand-accent, #6366f1)' : 'var(--line, #333)',
                  opacity: isCompleted ? 0.5 : 1,
                  transition: 'all 0.3s ease',
                }} />
              )
            })}
          </div>
        )}

        <div className="auth-header text-center">
          <h2>{stepTitle[mode]}</h2>
          <p className="auth-subtitle">{stepSubtitle[mode]}</p>
        </div>

        <form onSubmit={submit} className="auth-form-grid" autoComplete="off">

          {/* ── LOGIN ── */}
          {mode === 'login' && (
            <div className="form-group full-width">
              <label htmlFor="auth-matricule">Matricule <span className="req">*</span></label>
              <input id="auth-matricule" aria-label="Matricule" required placeholder="1234" autoComplete="off" value={payload.matricule} onChange={(e) => setPayload({ ...payload, matricule: e.target.value })} />
            </div>
          )}

          {/* ── FORGOT ── */}
          {mode === 'forgot' && (
            <div className="form-group full-width">
              <label htmlFor="auth-identifier-forgot">Email <span className="req">*</span></label>
              <input id="auth-identifier-forgot" type="email" aria-label="Email" required placeholder="votre@email.com" value={payload.identifier} onChange={(e) => setPayload({ ...payload, identifier: e.target.value })} />
            </div>
          )}

          {/* ── VERIFY CODE ── */}
          {mode === 'verify' && (
            <div className="form-group full-width">
              <label htmlFor="auth-reset-code">Code de vérification <span className="req">*</span></label>
              <input
                id="auth-reset-code"
                aria-label="Code de vérification"
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                placeholder="● ● ● ● ● ●"
                value={payload.code}
                onChange={(e) => setPayload({ ...payload, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                style={{ letterSpacing: '0.5em', fontSize: '1.6rem', textAlign: 'center', fontWeight: '700' }}
                autoFocus
              />
              <p style={{ fontSize: '12px', color: 'var(--brand-muted)', marginTop: '6px', textAlign: 'center' }}>
                Code envoyé à <strong>{payload.identifier}</strong>
              </p>
            </div>
          )}

          {/* ── RESET PASSWORD ── */}
          {mode === 'reset' && (
            <>
              <div className="form-group full-width">
                <label htmlFor="auth-new-password">Nouveau mot de passe <span className="req">*</span></label>
                <div className="password-input-wrapper">
                  <input
                    id="auth-new-password"
                    aria-label="Nouveau mot de passe"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Minimum 8 caractères"
                    value={payload.password}
                    onChange={(e) => setPayload({ ...payload, password: e.target.value })}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    )}
                  </button>
                </div>
              </div>
              <div className="form-group full-width">
                <label htmlFor="auth-confirm-password">Confirmer le mot de passe <span className="req">*</span></label>
                <div className="password-input-wrapper">
                  <input
                    id="auth-confirm-password"
                    aria-label="Confirmer le mot de passe"
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    placeholder="Répétez le mot de passe"
                    value={payload.password_confirmation}
                    onChange={(e) => setPayload({ ...payload, password_confirmation: e.target.value })}
                  />
                  <button type="button" className="password-toggle" onClick={() => setShowConfirmPassword(!showConfirmPassword)} aria-label="Toggle confirm password visibility">
                    {showConfirmPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ── LOGIN password field ── */}
          {mode === 'login' && (
            <div className="form-group full-width">
              <label htmlFor="auth-password">Mot de passe <span className="req">*</span></label>
              <div className="password-input-wrapper">
                <input id="auth-password" aria-label="Password" type={showPassword ? 'text' : 'password'} required autoComplete="current-password" placeholder="Votre mot de passe" value={payload.password} onChange={(e) => setPayload({ ...payload, password: e.target.value })} />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  )}
                </button>
              </div>
            </div>
          )}

          <div className="form-group full-width auth-actions">
            {mode === 'login' && (
              <button type="button" className="text-link forgot-link" disabled={loading} onClick={() => setAuthMode('forgot')}>
                Mot de passe oublié ?
              </button>
            )}
            <button type="submit" className="btn-primary full-width" disabled={loading}>
              {loading ? loadingLabel[mode] : submitLabel[mode]}
            </button>
          </div>
        </form>

        <div className="auth-footer">
          {mode === 'login' && <p>Contactez votre administrateur pour obtenir un compte.</p>}
          {mode === 'forgot' && <p>Retourner à la <button type="button" className="text-link" disabled={loading} onClick={() => setAuthMode('login')}>Connexion</button></p>}
          {mode === 'verify' && (
            <p>
              Pas reçu le code ?{' '}
              <button type="button" className="text-link" disabled={loading} onClick={() => setAuthMode('forgot')}>Renvoyer</button>
              {' · '}
              <button type="button" className="text-link" disabled={loading} onClick={() => setAuthMode('login')}>Annuler</button>
            </p>
          )}
          {mode === 'reset' && <p>Retourner à la <button type="button" className="text-link" disabled={loading} onClick={() => setAuthMode('login')}>Connexion</button></p>}
        </div>
      </div>
    </div>
  )
}


function Dashboard({ stats, statusData, monthlyData, items = [], user }) {
  const COLORS = ['#f59e0b', '#8b5cf6', '#10b981', '#ef4444', '#6b7280', '#3b82f6'];
  const isTech = user?.role === 'technician';

  return (
    <main className="dashboard-layout">
      {isTech ? (
        <section className="overview-container">
          <div className="stat-card stat-total">
            <div className="stat-icon">📋</div>
            <div className="stat-details">
              <span className="stat-label">Total Tasks</span>
              <span className="stat-value">{stats?.totals?.all || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-details">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{stats?.totals?.pending || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-progress">
            <div className="stat-icon">🔄</div>
            <div className="stat-details">
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{stats?.totals?.in_progress || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-resolved">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <span className="stat-label">Completed</span>
              <span className="stat-value">{stats?.totals?.completed || 0}</span>
            </div>
          </div>
        </section>
      ) : (
        <section className="overview-container">
          <div className="stat-card stat-total">
            <div className="stat-icon">📊</div>
            <div className="stat-details">
              <span className="stat-label">Total</span>
              <span className="stat-value">{stats?.totals?.all || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-pending">
            <div className="stat-icon">⏳</div>
            <div className="stat-details">
              <span className="stat-label">Pending</span>
              <span className="stat-value">{stats?.totals?.pending || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-progress">
            <div className="stat-icon">🔄</div>
            <div className="stat-details">
              <span className="stat-label">In Progress</span>
              <span className="stat-value">{stats?.totals?.in_progress || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-resolved">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <span className="stat-label">Resolved</span>
              <span className="stat-value">{stats?.totals?.resolved || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-rejected" style={{ borderLeft: '3px solid #ef4444' }}>
            <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }}>✕</div>
            <div className="stat-details">
              <span className="stat-label">Rejected</span>
              <span className="stat-value">{stats?.totals?.rejected || 0}</span>
            </div>
          </div>
          <div className="stat-card stat-closed" style={{ borderLeft: '3px solid #6b7280' }}>
            <div className="stat-icon" style={{ background: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' }}>🔒</div>
            <div className="stat-details">
              <span className="stat-label">Closed</span>
              <span className="stat-value">{stats?.totals?.closed || 0}</span>
            </div>
          </div>
        </section>
      )}

      <div className="charts-grid">
        <section className="card chart prof-chart-card">
          <div className="chart-header">
            <h3>Status Distribution</h3>
            <span className="chart-subtitle">Breakdown by current state</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="none">
                {statusData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: 'var(--card-bg-1)', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--brand-text)'}} itemStyle={{color: 'var(--brand-text)'}} />
            </PieChart>
          </ResponsiveContainer>
        </section>
        <section className="card chart prof-chart-card">
          <div className="chart-header">
            <h3>Monthly Trend</h3>
            <span className="chart-subtitle">{isTech ? 'Tasks completed over 6 months' : 'Reclamations over the last 6 months'}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={monthlyData} margin={{ top: 20, right: 20, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--line)" />
              <XAxis dataKey="month" stroke="var(--brand-muted)" fontSize={12} tickLine={false} axisLine={false} dy={10} />
              <YAxis stroke="var(--brand-muted)" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
              <Tooltip cursor={{fill: 'var(--brand-surface)'}} contentStyle={{backgroundColor: 'var(--card-bg-1)', border: '1px solid var(--line)', borderRadius: '8px', color: 'var(--brand-text)'}} itemStyle={{color: 'var(--brand-text)'}} />
              <Bar dataKey="total" fill="var(--brand-accent)" radius={[6, 6, 0, 0]} maxBarSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </section>
      </div>

      <section className="card recent-table-card">
        <h3>{isTech ? 'Recent Tasks' : 'Recent Reclamations'}</h3>
        <div className="table-responsive">
          <table className="recent-table">
            <thead>
              {isTech ? (
                <tr>
                  <th>Complaint</th>
                  <th>Machine</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date Assigned</th>
                </tr>
              ) : (
                <tr>
                  <th>Title</th>
                  <th>Machine</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                </tr>
              )}
            </thead>
            <tbody>
              {isTech ? (
                items?.slice(0, 5).map(item => (
                  <tr key={item.id}>
                    <td>{item.reclamation?.title || '—'}</td>
                    <td>{item.reclamation?.machine || '—'}</td>
                    <td><span className={`priority-badge priority-${item.reclamation?.priority || 'medium'}`}>{item.reclamation?.priority || 'Medium'}</span></td>
                    <td><span className={`status-badge status-${item.status?.toLowerCase() || 'pending'}`}>{item.status || 'Pending'}</span></td>
                    <td>{item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                  </tr>
                ))
              ) : (
                items?.slice(0, 5).map(item => (
                  <tr key={item.id}>
                    <td>{item.title}</td>
                    <td>{item.machine}</td>
                    <td>{item.department || '-'}</td>
                    <td><span className={`priority-badge priority-${item.priority || 'medium'}`}>{item.priority || 'Medium'}</span></td>
                    <td><span className={`status-badge status-${item.status?.toLowerCase().replace(' ', '_') || 'pending'}`}>{item.status || 'Pending'}</span></td>
                  </tr>
                ))
              )}
              {(!items || items.length === 0) && (
                <tr>
                  <td colSpan="5" className="text-center">{isTech ? 'No recent tasks assigned.' : 'No recent reclamations found.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  )
}

function Reclamations({ items, token, loading, user }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [viewingDetails, setViewingDetails] = useState(null)
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')
  const [postingComment, setPostingComment] = useState(false)
  const [commentFiles, setCommentFiles] = useState([])

  const [technicians, setTechnicians] = useState([])
  const [selectedTech, setSelectedTech] = useState('')
  const [taskDesc, setTaskDesc] = useState('')
  const [assigningTech, setAssigningTech] = useState(false)

  const openDetails = async (rec) => {
    setViewingDetails(rec)
    setComments(rec.comments || [])
    try {
      const res = await apiRequestWithRetry({ method: 'get', url: `/reclamations/${rec.id}`, headers: { Authorization: `Bearer ${token}` } })
      setViewingDetails(res.data.data)
      setComments(res.data.data.comments || [])
      
      if (user?.role === 'department') {
        // Fetch department technicians
        const techRes = await apiRequestWithRetry({
          method: 'get',
          url: '/users',
          headers: { Authorization: `Bearer ${token}` }
        })
        setTechnicians(techRes.data.data || [])
      }
    } catch (e) {
      console.error(e)
    }
  }

  const postComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim() && commentFiles.length === 0) return
    setPostingComment(true)
    try {
      const formData = new FormData()
      formData.append('comment', newComment)
      for (let i = 0; i < commentFiles.length; i++) {
        formData.append('attachments[]', commentFiles[i])
      }

      const res = await apiRequestWithRetry({
        method: 'post',
        url: `/reclamations/${viewingDetails.id}/comments`,
        data: formData,
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      setComments([...comments, res.data])
      setNewComment('')
      setCommentFiles([])
    } catch (err) {
      alert(err?.response?.data?.message || 'Failed to post comment')
    } finally {
      setPostingComment(false)
    }
  }

  const filtered = items.filter((i) => {
    const matchSearch = i.title?.toLowerCase().includes(search.toLowerCase()) || i.machine?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'all' || i.status?.toLowerCase().replace(' ', '_') === statusFilter
    return matchSearch && matchStatus
  })

  const remove = async (id) => {
    try {
      await api.delete(`/reclamations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      location.reload()
    } catch { location.reload() }
  }

  const statuses = ['all', 'pending', 'in_progress', 'resolved', 'rejected', 'closed']

  return (
    <main className="reclamations-page">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h2 className="page-title">{user?.role === 'department' ? 'Department Complaints' : 'My Reclamations'}</h2>
          <p className="page-subtitle">Track and manage complaints workflow</p>
        </div>
        <div className="page-header-stats">
          <span className="header-stat"><strong>{items.length}</strong> Total</span>
          <span className="header-stat pending"><strong>{items.filter(i => i.status?.toLowerCase() === 'pending').length}</strong> Pending</span>
          <span className="header-stat progress"><strong>{items.filter(i => i.status?.toLowerCase().includes('progress')).length}</strong> In Progress</span>
          <span className="header-stat resolved"><strong>{items.filter(i => i.status?.toLowerCase() === 'resolved').length}</strong> Resolved</span>
        </div>
      </div>

      <div className="card reclamations-card">
        {/* Toolbar */}
        <div className="reclamations-toolbar">
          <div className="search-bar toolbar-search">
            <span className="search-icon">🔍</span>
            <input type="text" placeholder="Search by title or machine..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search reclamations" />
          </div>
          <div className="status-filters">
            {statuses.map(s => (
              <button key={s} className={`filter-chip ${statusFilter === s ? 'active' : ''}`} onClick={() => setStatusFilter(s)}>
                {s === 'all' ? 'All' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="reclamations-loading">
            <div className="loading-spinner" />
            <p>Loading reclamations...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="reclamations-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Title</th>
                  <th>Machine</th>
                  <th>Department</th>
                  <th>Priority</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-row">
                      <div className="empty-state">
                        <span className="empty-icon">📋</span>
                        <p>No reclamations found</p>
                        <span>Try adjusting your search or filter</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.map((r, idx) => (
                  <tr key={r.id} className="reclamation-row">
                    <td className="row-index">{idx + 1}</td>
                    <td className="row-title">{r.title}</td>
                    <td>{r.machine || '—'}</td>
                    <td>{r.department || '—'}</td>
                    <td><span className={`priority-badge priority-${r.priority?.toLowerCase() || 'medium'}`}>{r.priority || 'Medium'}</span></td>
                    <td><span className={`status-badge status-${r.status?.toLowerCase().replace(' ', '_') || 'pending'}`}>{r.status || 'Pending'}</span></td>
                    <td className="row-date">{r.created_at ? new Date(r.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                    <td>
                      {confirmDelete === r.id ? (
                        <div className="confirm-delete">
                          <button className="confirm-yes" onClick={() => remove(r.id)}>✓</button>
                          <button className="confirm-no" onClick={() => setConfirmDelete(null)}>✕</button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                          <button className="view-row-btn btn-icon" onClick={() => openDetails(r)} title="View Details & Chat" aria-label="View reclamation details">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                            </svg>
                          </button>
                          {user?.role === 'admin' && (
                            <button className="delete-row-btn btn-icon danger" onClick={() => setConfirmDelete(r.id)} title="Delete" aria-label="Delete reclamation">
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered.length > 0 && (
          <div className="table-footer">
            Showing <strong>{filtered.length}</strong> of <strong>{items.length}</strong> reclamations
          </div>
        )}
      </div>

      {viewingDetails && (
        <div className="modal-overlay" onClick={() => setViewingDetails(null)}>
          <div className="modal-content detail-modal" onClick={(e) => e.stopPropagation()}>

            {/* ── Professional Modal Header ── */}
            <div className="detail-modal-header">
              <div className="detail-modal-header-left">
                <div className="detail-modal-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>
                  </svg>
                </div>
                <div>
                  <div className="detail-modal-ref">#{viewingDetails.id} · {viewingDetails.created_at ? new Date(viewingDetails.created_at).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</div>
                  <h3 className="detail-modal-title">{viewingDetails.title}</h3>
                </div>
              </div>
              <div className="detail-modal-header-right">
                <span className={`status-badge status-${viewingDetails.status?.toLowerCase().replace(' ', '_') || 'pending'}`}>{viewingDetails.status || 'Pending'}</span>
                <button className="detail-close-btn" onClick={() => setViewingDetails(null)} aria-label="Close">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>

            {/* ── Modal Body: Sidebar + Chat ── */}
            <div className="detail-modal-body">

              {/* LEFT PANEL */}
              <div className="detail-panel">

                {/* Meta info cards grid */}
                <div className="detail-meta-grid">
                  <div className="detail-meta-card">
                    <span className="detail-meta-label">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>
                      Department
                    </span>
                    <span className="detail-meta-value">{viewingDetails.department || '—'}</span>
                  </div>
                  <div className="detail-meta-card">
                    <span className="detail-meta-label">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>
                      Machine
                    </span>
                    <span className="detail-meta-value">{viewingDetails.machine || '—'}</span>
                  </div>
                  <div className="detail-meta-card">
                    <span className="detail-meta-label">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
                      Priority
                    </span>
                    <span className={`priority-badge priority-${viewingDetails.priority?.toLowerCase() || 'medium'}`}>{viewingDetails.priority || 'Medium'}</span>
                  </div>
                  <div className="detail-meta-card">
                    <span className="detail-meta-label">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      Submitted
                    </span>
                    <span className="detail-meta-value">{viewingDetails.created_at ? new Date(viewingDetails.created_at).toLocaleDateString('fr-FR') : '—'}</span>
                  </div>
                  {viewingDetails.location && (
                    <div className="detail-meta-card detail-meta-card--wide">
                      <span className="detail-meta-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                        Location
                      </span>
                      <span className="detail-meta-value">{viewingDetails.location}</span>
                    </div>
                  )}
                  {viewingDetails.user?.name && (
                    <div className="detail-meta-card detail-meta-card--wide">
                      <span className="detail-meta-label">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                        Submitted by
                      </span>
                      <span className="detail-meta-value">{viewingDetails.user.name}</span>
                    </div>
                  )}
                </div>

                {/* Description */}
                <div className="detail-desc-block">
                  <div className="detail-section-title">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
                    Description
                  </div>
                  <p className="detail-desc-text">{viewingDetails.description || 'No description provided.'}</p>
                </div>

                {/* Attachments */}
                {viewingDetails.attachments && viewingDetails.attachments.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                      Attachments
                    </div>
                    <div className="detail-attachments">
                      {viewingDetails.attachments.map(att => (
                        <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" className="detail-attachment-pill" title={att.file_name}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>
                          <span>{att.file_name}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status change — department only */}
                {user?.role === 'department' && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>
                      Update Status
                    </div>
                    <select
                      value={viewingDetails.status}
                      onChange={async (e) => {
                        const newStatus = e.target.value;
                        try {
                          const res = await apiRequestWithRetry({
                            method: 'put',
                            url: `/reclamations/${viewingDetails.id}`,
                            data: { status: newStatus },
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          setViewingDetails(res.data.data);
                          location.reload();
                        } catch {
                          alert('Failed to update status');
                        }
                      }}
                      className="detail-status-select"
                    >
                      <option value="pending">Pending</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="rejected">Rejected</option>
                      <option value="closed">Closed</option>
                    </select>
                  </div>
                )}

                {/* Technician Assignment — department only */}
                {user?.role === 'department' && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                      Technician Assignment
                    </div>
                    {viewingDetails.tasks && viewingDetails.tasks.length > 0 ? (
                      <div className="detail-tasks-list">
                        {viewingDetails.tasks.map(t => (
                          <div key={t.id} className="detail-task-card">
                            <div className="detail-task-card-row">
                              <div className="detail-task-avatar">
                                {t.technician?.name ? t.technician.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'T'}
                              </div>
                              <div className="detail-task-info">
                                <span className="detail-task-name">{t.technician?.name || 'Unknown Technician'}</span>
                                <span className={`status-badge status-${t.status}`}>{t.status}</span>
                              </div>
                            </div>
                            {t.description && <p className="detail-task-desc"><strong>Instructions:</strong> {t.description}</p>}
                            {t.intervention_notes && <p className="detail-task-desc"><strong>Notes:</strong> {t.intervention_notes}</p>}
                            {t.attachments && t.attachments.length > 0 && (
                              <div className="detail-task-evidence">
                                <span className="detail-meta-label">Evidence:</span>
                                {t.attachments.map(att => (
                                  <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" className="detail-attachment-pill">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/></svg>
                                    <span>{att.file_name}</span>
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="detail-assign-form">
                        <select value={selectedTech} onChange={(e) => setSelectedTech(e.target.value)} className="detail-status-select">
                          <option value="">— Select Technician —</option>
                          {technicians.map(t => (
                            <option key={t.id} value={t.id}>{t.name} ({t.matricule})</option>
                          ))}
                        </select>
                        <textarea
                          placeholder="Work instructions / description..."
                          value={taskDesc}
                          onChange={(e) => setTaskDesc(e.target.value)}
                          rows="3"
                          className="detail-assign-textarea"
                        />
                        <button
                          type="button"
                          className="btn-primary detail-assign-btn"
                          disabled={assigningTech || !selectedTech}
                          onClick={async () => {
                            setAssigningTech(true)
                            try {
                              await apiRequestWithRetry({
                                method: 'post',
                                url: '/tasks',
                                data: { reclamation_id: viewingDetails.id, technician_id: selectedTech, description: taskDesc },
                                headers: { Authorization: `Bearer ${token}` }
                              })
                              const res = await apiRequestWithRetry({ method: 'get', url: `/reclamations/${viewingDetails.id}`, headers: { Authorization: `Bearer ${token}` } })
                              setViewingDetails(res.data.data)
                              setSelectedTech('')
                              setTaskDesc('')
                            } catch (err) {
                              alert(err?.response?.data?.message || 'Failed to assign technician')
                            } finally {
                              setAssigningTech(false)
                            }
                          }}
                        >
                          {assigningTech ? 'Assigning…' : 'Assign Task'}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Status History Timeline */}
                {viewingDetails.status_history && viewingDetails.status_history.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-section-title">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                      Activity Timeline
                    </div>
                    <div className="detail-timeline">
                      {viewingDetails.status_history.map((h, idx) => (
                        <div key={h.id} className="detail-timeline-item">
                          <div className="detail-timeline-dot"></div>
                          {idx < viewingDetails.status_history.length - 1 && <div className="detail-timeline-line"></div>}
                          <div className="detail-timeline-content">
                            <span className={`status-badge status-${h.to_status?.toLowerCase().replace(' ', '_')}`}>{h.to_status}</span>
                            <div className="detail-timeline-meta">
                              by <strong>{h.changer?.name || 'System'}</strong> · {new Date(h.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT PANEL — Chat */}
              <div className="detail-chat-panel">
                <div className="detail-chat-header">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                  <span>Discussion</span>
                  <span className="detail-chat-count">{comments.length}</span>
                </div>
                <div className="detail-chat-messages">
                  {comments.length === 0 ? (
                    <div className="detail-chat-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.3, marginBottom: '10px' }}><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <p>No messages yet</p>
                      <span>Start the conversation below</span>
                    </div>
                  ) : (
                    comments.map(c => {
                      const isCreator = c.user_id === viewingDetails.user?.id;
                      return (
                        <div key={c.id} className={`detail-message ${isCreator ? 'detail-message--right' : 'detail-message--left'}`}>
                          <div className="detail-message-avatar">
                            {c.user?.name ? c.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                          </div>
                          <div className="detail-message-bubble">
                            <div className="detail-message-meta">
                              <span className="detail-message-sender">{c.user?.name || 'Unknown'}{isCreator && <span className="detail-author-tag">Author</span>}</span>
                              <span className="detail-message-time">{new Date(c.created_at).toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="detail-message-text">{c.comment}</div>
                            {c.attachments && c.attachments.length > 0 && (
                              <div className="detail-message-files">
                                {c.attachments.map(att => (
                                  <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" className="detail-message-file-link">
                                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                    {att.file_name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
                {commentFiles.length > 0 && (
                  <div className="detail-pending-files">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    {commentFiles.map(f => f.name).join(', ')}
                    <button type="button" className="detail-clear-files" onClick={() => setCommentFiles([])}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                  </div>
                )}
                <form onSubmit={postComment} className="detail-chat-form">
                  <label className="detail-attach-label" title="Attach files">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    <input type="file" multiple style={{ display: 'none' }} onChange={(e) => setCommentFiles(Array.from(e.target.files || []))} />
                  </label>
                  <input
                    type="text"
                    className="detail-chat-input"
                    placeholder="Type your message…"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                  />
                  <button type="submit" className="detail-send-btn" disabled={postingComment || (!newComment.trim() && commentFiles.length === 0)}>
                    {postingComment ? (
                      <div className="btn-spinner"></div>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    )}
                  </button>
                </form>
              </div>

            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function CreateForm({ form, setForm, token, departments = [], onDone, notify }) {
  const [submitting, setSubmitting] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('title', form.title)
      formData.append('description', form.description)
      formData.append('machine', form.machine)
      if (form.location) formData.append('location', form.location)
      formData.append('department', form.department)
      formData.append('priority', form.priority)

      for (let i = 0; i < selectedFiles.length; i++) {
        formData.append('attachments[]', selectedFiles[i])
      }

      const res = await apiRequestWithRetry({
        method: 'post',
        url: '/reclamations',
        data: formData,
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })
      if (res.data?.success === false) throw new Error(res.data?.message || 'Failed to submit reclamation.')
      notify?.('success', 'Reclamation submitted successfully!')
      setForm({ title: '', description: '', machine: '', location: '', department: '', priority: 'medium' })
      setSelectedFiles([])
      onDone()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || err?.message || 'Failed to submit reclamation.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="reclamations-page">
      <div className="reclamations-header">
        <div className="header-titles">
          <h2>New Reclamation</h2>
          <p>Please provide detailed information about the issue to help us resolve it quickly.</p>
        </div>
      </div>
      <form className="card prof-form" onSubmit={submit} aria-busy={submitting}>
        
        <div className="form-section">
          <h4>General Information</h4>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reclamation-title">Incident Title <span className="req">*</span></label>
              <input id="reclamation-title" aria-label="Title" required placeholder="e.g., Conveyor belt jammed" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="reclamation-priority">Priority Level <span className="req">*</span></label>
              <select id="reclamation-priority" aria-label="Priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option value="low">Low - Routine</option>
                <option value="medium">Medium - Needs Attention</option>
                <option value="high">High - Urgent / Blocked</option>
              </select>
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Location & Equipment</h4>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="reclamation-machine">Machine / Asset ID <span className="req">*</span></label>
              <input id="reclamation-machine" aria-label="Machine" required placeholder="e.g., MCH-409" value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} />
            </div>
            <div className="form-group">
              <label htmlFor="reclamation-department">Department <span className="req">*</span></label>
              <select id="reclamation-department" aria-label="Department" required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                <option value="" disabled>Select a department</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.name}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="form-group full-width">
              <label htmlFor="reclamation-location">Exact Location (Optional)</label>
              <input id="reclamation-location" aria-label="Location" placeholder="e.g., Sector 4, near main entrance" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <h4>Issue Details</h4>
          <div className="form-group full-width">
            <label htmlFor="reclamation-description">Description <span className="req">*</span></label>
            <textarea id="reclamation-description" aria-label="Description" required minLength={10} rows="4" placeholder="Describe the issue in detail, including steps leading up to the failure..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
        </div>

        <div className="form-section">
          <h4>Attachments</h4>
          <div className="form-group full-width">
            <label htmlFor="reclamation-files">Upload Files / Images (Optional)</label>
            <input 
              id="reclamation-files" 
              type="file" 
              multiple 
              onChange={(e) => setSelectedFiles(Array.from(e.target.files || []))} 
              style={{ background: 'var(--input-bg)', color: 'var(--brand-text)', border: '1px solid var(--input-border)', borderRadius: '8px', padding: '10px' }}
            />
            {selectedFiles.length > 0 && (
              <div className="file-preview-strip">
                {selectedFiles.map((f, i) => (
                  <span key={i} className="file-preview-tag">{f.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="form-actions">
          <button type="button" className="btn-secondary" onClick={() => onDone()} disabled={submitting}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={submitting}>
            {submitting ? 'Submitting...' : 'Submit Reclamation'}
          </button>
        </div>
      </form>
    </div>
  )
}

function ToastAlert({ toast, onClose }) {
  const isSuccess = toast.type === 'success'
  return (
    <div
      className={`toast-alert global-toast ${toast.closing ? 'toast-leaving' : 'toast-entering'} ${isSuccess ? 'toast-success' : 'toast-error'}`}
      role={isSuccess ? 'status' : 'alert'}
    >
      <span className="toast-icon">{isSuccess ? '✓' : '✕'}</span>
      <div className="toast-body">
        <span className="toast-title">{isSuccess ? 'Success' : 'Error'}</span>
        <span className="toast-message">{toast.message}</span>
      </div>
      <button type="button" className="toast-close" onClick={onClose} aria-label="Close notification">✕</button>
    </div>
  )
}

function UserManagement({ token, notify, currentUser, departments = [] }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    name: '',
    matricule: '',
    department: '',
    email: '',
    phone: '',
    role: 'operator',
    password: '',
  })

  const fetchUsers = async () => {
    try {
      const res = await apiRequestWithRetry({
        method: 'get',
        url: '/users',
        headers: { Authorization: `Bearer ${token}` }
      })
      setUsers(res.data.data)
    } catch (err) {
      notify?.('error', 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreating(true)
    try {
      await apiRequestWithRetry({
        method: 'post',
        url: '/users',
        data: {
          name: newUser.name,
          matricule: newUser.matricule,
          department: newUser.department,
          email: newUser.email || null,
          phone: newUser.phone || null,
          role: newUser.role,
          password: newUser.password,
        },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'User created successfully. Account is inactive by default.')
      setNewUser({ name: '', matricule: '', department: '', email: '', phone: '', role: 'operator', password: '' })
      setShowCreateForm(false)
      fetchUsers()
    } catch (err) {
      const validation = err?.response?.data?.errors
      if (validation && typeof validation === 'object') {
        const firstKey = Object.keys(validation)[0]
        notify?.('error', validation[firstKey]?.[0] || err?.response?.data?.message || 'Failed to create user.')
      } else {
        notify?.('error', err?.response?.data?.message || 'Failed to create user.')
      }
    } finally {
      setCreating(false)
    }
  }

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiRequestWithRetry({
        method: 'put',
        url: `/users/${userId}`,
        data: { role: newRole },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'User role updated successfully.')
      fetchUsers()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to update user role.')
    }
  }

  const handleDepartmentChange = async (userId, newDepartment) => {
    try {
      await apiRequestWithRetry({
        method: 'put',
        url: `/users/${userId}`,
        data: { department: newDepartment },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'User department updated successfully.')
      fetchUsers()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to update user department.')
    }
  }

  const handleStatusToggle = async (user) => {
    try {
      await apiRequestWithRetry({
        method: 'put',
        url: `/users/${user.id}`,
        data: { is_active: !user.is_active },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', `User account ${!user.is_active ? 'activated' : 'deactivated'}.`)
      fetchUsers()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to update account status.')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return
    try {
      await apiRequestWithRetry({
        method: 'delete',
        url: `/users/${userId}`,
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'User deleted successfully.')
      fetchUsers()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to delete user.')
    }
  }

  return (
    <div className="reclamations-page">
      <div className="reclamations-header">
        <div className="header-titles">
          <h2>User Management</h2>
          <p>Manage system access, roles, and employee records.</p>
        </div>
        <button
          type="button"
          className="btn-primary"
          onClick={() => setShowCreateForm(!showCreateForm)}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 18px', fontSize: '13px' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
          </svg>
          {showCreateForm ? 'Cancel' : 'New User'}
        </button>
      </div>

      {showCreateForm && (
        <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
          <h3 style={{ marginBottom: '4px', fontSize: '16px' }}>Create New User</h3>
          <p style={{ fontSize: '13px', color: 'var(--brand-muted)', marginBottom: '16px' }}>New accounts are <strong>inactive</strong> by default. Activate them after creation.</p>
          <form onSubmit={handleCreateUser}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px', marginBottom: '16px' }}>
              <div className="form-group">
                <label htmlFor="new-user-name">Nom complet <span className="req">*</span></label>
                <input id="new-user-name" required placeholder="Nom complet" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-matricule">Matricule <span className="req">*</span></label>
                <input id="new-user-matricule" required placeholder="1234" value={newUser.matricule} onChange={(e) => setNewUser({ ...newUser, matricule: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-department">Département <span className="req">*</span></label>
                <select id="new-user-department" required value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })}>
                  <option value="" disabled>Sélectionner</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.name}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="new-user-role">Rôle <span className="req">*</span></label>
                <select id="new-user-role" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="operator">Operator</option>
                  <option value="department">Department</option>
                  <option value="technician">Technician</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="new-user-email">Email (Optionnel)</label>
                <input id="new-user-email" type="email" placeholder="nom@aptiv.com" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-phone">Téléphone (Optionnel)</label>
                <input id="new-user-phone" placeholder="+212 600000000" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
              </div>
              <div className="form-group">
                <label htmlFor="new-user-password">Mot de passe <span className="req">*</span></label>
                <div className="password-input-wrapper">
                  <input id="new-user-password" type={showPassword ? 'text' : 'password'} required minLength={6} placeholder="Min 6 caractères" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                  <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label="Toggle password visibility">
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                    )}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button type="button" className="btn-secondary" onClick={() => setShowCreateForm(false)} disabled={creating}>Annuler</button>
              <button type="submit" className="btn-primary" disabled={creating}>
                {creating ? 'Création...' : 'Créer l\'utilisateur'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="reclamations-content">
        <div className="table-card">
          <div className="table-responsive">
            <table className="reclamations-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>#</th>
                  <th>EMPLOYEE</th>
                  <th>MATRICULE</th>
                  <th>DEPARTMENT</th>
                  <th>ROLE</th>
                  <th style={{ width: '100px', textAlign: 'center' }}>STATUS</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <div className="loading-spinner" style={{ margin: '0 auto' }}></div>
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty-row">
                      <p>No users found.</p>
                    </td>
                  </tr>
                ) : (
                  users.map((u, i) => (
                    <tr key={u.id} className="reclamation-row">
                      <td className="row-index">{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <div className="row-title">{u.name}</div>
                        <div className="row-date">{u.email}</div>
                      </td>
                      <td>
                        <span className="badge priority-medium">{u.matricule || 'N/A'}</span>
                      </td>
                      <td>
                        <select
                          value={u.department || ''}
                          onChange={(e) => handleDepartmentChange(u.id, e.target.value)}
                          className="role-select"
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'You cannot change your own department' : ''}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--input-bg)', color: u.id === currentUser?.id ? 'var(--brand-muted)' : 'var(--brand-text)', border: '1px solid var(--input-border)', cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer', opacity: u.id === currentUser?.id ? 0.5 : 1 }}
                        >
                          <option value="" disabled>Select Department</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.name}>{dept.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="role-select"
                          disabled={u.id === currentUser?.id}
                          title={u.id === currentUser?.id ? 'You cannot change your own role' : ''}
                          style={{ padding: '4px 8px', borderRadius: '4px', background: 'var(--input-bg)', color: u.id === currentUser?.id ? 'var(--brand-muted)' : 'var(--brand-text)', border: '1px solid var(--input-border)', cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer', opacity: u.id === currentUser?.id ? 0.5 : 1 }}
                        >
                          <option value="admin">Admin</option>
                          <option value="operator">Operator</option>
                          <option value="department">Department</option>
                          <option value="technician">Technician</option>
                        </select>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => u.id !== currentUser?.id && handleStatusToggle(u)}
                          disabled={u.id === currentUser?.id}
                          className="btn-icon"
                          title={u.id === currentUser?.id ? 'You cannot change your own status' : ''}
                          style={{
                            background: u.is_active ? 'rgba(46, 213, 115, 0.1)' : 'rgba(255, 71, 87, 0.1)',
                            color: u.is_active ? '#2ed573' : '#ff4757',
                            border: `1px solid ${u.is_active ? '#2ed573' : '#ff4757'}`,
                            padding: '4px 8px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            width: '80px',
                            opacity: u.id === currentUser?.id ? 0.5 : 1,
                            cursor: u.id === currentUser?.id ? 'not-allowed' : 'pointer'
                          }}
                        >
                          {u.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        {u.id !== currentUser?.id ? (
                          <button
                            type="button"
                            className="btn-icon danger"
                            onClick={() => handleDeleteUser(u.id)}
                            title="Delete user"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="3 6 5 6 21 6" />
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            </svg>
                          </button>
                        ) : (
                          <span style={{ fontSize: '11px', color: 'var(--brand-muted)', fontStyle: 'italic' }}>You</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {users.length} users</span>
          </div>
        </div>
      </div>
    </div>
  )
}

function DepartmentManagement({ token, notify, departments = [], onRefreshDepartments }) {
  const [newDeptName, setNewDeptName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreateDept = async (e) => {
    e.preventDefault()
    if (!newDeptName.trim()) return
    setCreating(true)
    try {
      await apiRequestWithRetry({
        method: 'post',
        url: '/departments',
        data: { name: newDeptName.trim() },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'Department created successfully.')
      setNewDeptName('')
      onRefreshDepartments?.()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to create department.')
    } finally {
      setCreating(false)
    }
  }

  const handleDeleteDept = async (dept) => {
    if (!window.confirm(`Are you sure you want to delete the "${dept.name}" department?`)) return
    try {
      await apiRequestWithRetry({
        method: 'delete',
        url: `/departments/${dept.id}`,
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'Department deleted successfully.')
      onRefreshDepartments?.()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to delete department.')
    }
  }

  return (
    <div className="reclamations-page">
      <div className="reclamations-header">
        <div className="header-titles">
          <h2>Department Management</h2>
          <p>Create and delete organization departments.</p>
        </div>
      </div>

      <div className="card" style={{ marginBottom: '20px', padding: '24px' }}>
        <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Create New Department</h3>
        <form onSubmit={handleCreateDept} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '1', minWidth: '250px', marginBottom: 0 }}>
            <label htmlFor="new-dept-name">Department Name <span className="req">*</span></label>
            <input
              id="new-dept-name"
              required
              placeholder="e.g., Quality Control"
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={creating} style={{ height: '42px', padding: '0 24px' }}>
            {creating ? 'Creating...' : 'Add Department'}
          </button>
        </form>
      </div>

      <div className="reclamations-content">
        <div className="table-card">
          <div className="table-responsive">
            <table className="reclamations-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>#</th>
                  <th>DEPARTMENT NAME</th>
                  <th style={{ width: '150px' }}>CREATED AT</th>
                  <th style={{ width: '80px', textAlign: 'center' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {departments.length === 0 ? (
                  <tr>
                    <td colSpan="4" className="empty-row">
                      <p>No departments found.</p>
                    </td>
                  </tr>
                ) : (
                  departments.map((dept, i) => (
                    <tr key={dept.id} className="reclamation-row">
                      <td className="row-index">{String(i + 1).padStart(2, '0')}</td>
                      <td>
                        <div className="row-title">{dept.name}</div>
                      </td>
                      <td>
                        <div className="row-date">
                          {dept.created_at ? new Date(dept.created_at).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          type="button"
                          className="btn-icon danger"
                          onClick={() => handleDeleteDept(dept)}
                          title="Delete department"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="table-footer">
            <span>Showing {departments.length} departments</span>
          </div>
        </div>
      </div>
    </div>
  )
}

// New Components: DepartmentTaskManager and TechnicianTaskManager

function TaskChatModal({ task, token, currentUser, onClose, notify }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef(null)

  const fetchMessages = async () => {
    try {
      const res = await apiRequestWithRetry({
        method: 'get',
        url: `/tasks/${task.id}/messages`,
        headers: { Authorization: `Bearer ${token}` }
      })
      setMessages(res.data.data || [])
    } catch (err) {
      notify?.('error', 'Failed to load messages.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMessages()
    const interval = setInterval(fetchMessages, 10000)
    return () => clearInterval(interval)
  }, [task.id])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!newMessage.trim()) return
    setSending(true)
    try {
      await apiRequestWithRetry({
        method: 'post',
        url: `/tasks/${task.id}/messages`,
        data: { message: newMessage.trim() },
        headers: { Authorization: `Bearer ${token}` }
      })
      setNewMessage('')
      fetchMessages()
    } catch (err) {
      notify?.('error', 'Failed to send message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose} style={{ backdropFilter: 'blur(4px)', backgroundColor: 'rgba(15, 23, 42, 0.4)' }}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px', width: '100%', height: '80vh', display: 'flex', flexDirection: 'column', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 40px -10px rgba(0,0,0,0.2)', background: 'var(--brand-surface)' }}>
        <div className="modal-header" style={{ padding: '16px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: 'var(--brand-text)' }}>Chat: {task.reclamation?.title}</h3>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--brand-muted)' }}>Technician: {task.technician?.name}</p>
          </div>
          <button className="close-btn btn-icon" onClick={onClose}>✕</button>
        </div>
        
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--brand-surface-2)' }}>
          {loading && messages.length === 0 ? (
            <div className="loading-spinner" style={{ margin: 'auto' }} />
          ) : messages.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--brand-muted)', fontSize: '13px', margin: 'auto' }}>No messages yet. Start the conversation!</p>
          ) : (
            messages.map((m, i) => {
              const isMe = m.user_id === currentUser.id
              return (
                <div key={m.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                  <div style={{ fontSize: '11px', color: 'var(--brand-muted)', marginBottom: '4px', padding: '0 4px' }}>
                    {isMe ? 'You' : m.user?.name} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div style={{ 
                    background: isMe ? '#10b981' : 'var(--input-bg)', 
                    color: isMe ? '#fff' : 'var(--brand-text)', 
                    padding: '10px 14px', 
                    borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    maxWidth: '85%',
                    fontSize: '13px',
                    lineHeight: '1.4',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.05)'
                  }}>
                    {m.message}
                  </div>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '8px', background: 'var(--brand-surface)' }}>
          <input 
            type="text" 
            placeholder="Type a message..." 
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid var(--input-border)', background: 'var(--input-bg)', color: 'var(--brand-text)', fontSize: '13px' }}
          />
          <button type="submit" disabled={sending || !newMessage.trim()} style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '50%', width: '38px', height: '38px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: (sending || !newMessage.trim()) ? 'not-allowed' : 'pointer', opacity: (sending || !newMessage.trim()) ? 0.6 : 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </form>
      </div>
    </div>
  )
}

function DepartmentTaskManager({ token, notify, user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatTask, setChatTask] = useState(null)

  const fetchTasks = async () => {
    try {
      const res = await apiRequestWithRetry({
        method: 'get',
        url: '/tasks',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTasks(res.data.data || [])
    } catch (err) {
      notify?.('error', 'Failed to fetch tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleRemoveTask = async (id) => {
    if (!window.confirm('Are you sure you want to cancel/remove this task assignment?')) return
    try {
      await apiRequestWithRetry({
        method: 'delete',
        url: `/tasks/${id}`,
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'Task assignment removed.')
      fetchTasks()
    } catch (err) {
      notify?.('error', 'Failed to remove task assignment.')
    }
  }

  return (
    <div className="reclamations-page">
      <div className="reclamations-header" style={{ marginBottom: '20px' }}>
        <div className="header-titles">
          <h2 className="page-title">Technician Tasks</h2>
          <p className="page-subtitle">Monitor status of interventions assigned to technicians in your department ({user?.department}).</p>
        </div>
      </div>

      <div className="card reclamations-card">
        {loading ? (
          <div className="reclamations-loading">
            <div className="loading-spinner" />
            <p>Loading tasks...</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="reclamations-table">
              <thead>
                <tr>
                  <th>Complaint</th>
                  <th>Technician</th>
                  <th>Status</th>
                  <th>Instructions</th>
                  <th>Intervention Notes</th>
                  <th>Evidence / Photos</th>
                  <th>Assigned Date</th>
                  <th style={{ width: '100px', textAlign: 'center' }}></th>
                </tr>
              </thead>
              <tbody>
                {tasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="empty-row" style={{ textAlign: 'center', padding: '36px' }}>
                      <div className="empty-state">
                        <span className="empty-icon" style={{ fontSize: '32px' }}>📋</span>
                        <p style={{ margin: '8px 0', fontWeight: 'bold' }}>No tasks assigned yet.</p>
                        <span style={{ color: 'var(--brand-muted)', fontSize: '13px' }}>Assign tasks from the complaints detail dialog.</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  tasks.map(t => (
                    <tr key={t.id} className="reclamation-row">
                      <td className="row-title">{t.reclamation?.title || 'Unknown'}</td>
                      <td>{t.technician?.name || 'Unknown'}</td>
                      <td>
                        <span className={`status-badge status-${t.status}`}>
                          {t.status === 'in_progress' ? 'In Progress' : t.status}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.description || '—'}</td>
                      <td style={{ fontSize: '13px' }}>{t.intervention_notes || '—'}</td>
                      <td>
                        {t.attachments && t.attachments.length > 0 ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            {t.attachments.map(att => (
                              <a key={att.id} href={att.file_path} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', fontSize: '11px', fontWeight: 'bold' }}>
                                📎 {att.file_name}
                              </a>
                            ))}
                          </div>
                        ) : '—'}
                      </td>
                      <td className="row-date">{t.created_at ? new Date(t.created_at).toLocaleDateString('fr-FR') : '—'}</td>
                      <td style={{ textAlign: 'center', display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button className="btn-icon" onClick={() => setChatTask(t)} title="Chat with Technician" style={{ color: '#3b82f6' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                        <button className="btn-icon danger" onClick={() => handleRemoveTask(t.id)} title="Remove Task">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {chatTask && (
        <TaskChatModal
          task={chatTask}
          token={token}
          currentUser={user}
          notify={notify}
          onClose={() => setChatTask(null)}
        />
      )}
    </div>
  )
}

function TechnicianTaskManager({ token, notify, user }) {
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [chatTask, setChatTask] = useState(null)
  const [updatingTask, setUpdatingTask] = useState(null)
  const [notes, setNotes] = useState('')
  const [evidenceFiles, setEvidenceFiles] = useState([])
  const [submitting, setSubmitting] = useState(false)

  const fetchTasks = async () => {
    try {
      const res = await apiRequestWithRetry({
        method: 'get',
        url: '/tasks',
        headers: { Authorization: `Bearer ${token}` }
      })
      setTasks(res.data.data || [])
    } catch (err) {
      notify?.('error', 'Failed to load assigned tasks.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTasks()
  }, [])

  const handleStart = async (task) => {
    try {
      await apiRequestWithRetry({
        method: 'put',
        url: `/tasks/${task.id}`,
        data: { status: 'in_progress' },
        headers: { Authorization: `Bearer ${token}` }
      })
      notify?.('success', 'Task is now In Progress!')
      fetchTasks()
    } catch (err) {
      notify?.('error', 'Failed to start task.')
    }
  }

  const handleCompleteSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      const formData = new FormData()
      formData.append('_method', 'PUT')
      formData.append('status', 'completed')
      formData.append('intervention_notes', notes)
      for (let i = 0; i < evidenceFiles.length; i++) {
        formData.append('attachments[]', evidenceFiles[i])
      }

      await apiRequestWithRetry({
        method: 'post',
        url: `/tasks/${updatingTask.id}`,
        data: formData,
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      })

      notify?.('success', 'Task marked as completed!')
      setUpdatingTask(null)
      setNotes('')
      setEvidenceFiles([])
      fetchTasks()
    } catch (err) {
      notify?.('error', err?.response?.data?.message || 'Failed to complete task.')
    } finally {
      setSubmitting(false)
    }
  }

  const pendingTasks = tasks.filter(t => t.status === 'pending')
  const progressTasks = tasks.filter(t => t.status === 'in_progress')
  const completedTasks = tasks.filter(t => t.status === 'completed')

  return (
    <div className="reclamations-page">
      <div className="reclamations-header" style={{ marginBottom: '20px' }}>
        <div className="header-titles">
          <h2 className="page-title">Technician Workspace</h2>
          <p className="page-subtitle">Manage and report progress on your assigned maintenance activities.</p>
        </div>
      </div>

      {loading ? (
        <div className="reclamations-loading">
          <div className="loading-spinner" />
          <p>Loading your tasks...</p>
        </div>
      ) : (
        <div className="task-board">
          {/* Pending Column */}
          <div className="task-column">
            <div className="task-column-header">Pending Interventions ({pendingTasks.length})</div>
            {pendingTasks.map(t => (
              <div key={t.id} className="task-card">
                <div className="task-card-header">
                  <span className="task-card-title">{t.reclamation?.title}</span>
                  <span className={`priority-badge priority-${t.reclamation?.priority}`}>{t.reclamation?.priority}</span>
                </div>
                <p className="task-card-desc"><strong>Machine:</strong> {t.reclamation?.machine}</p>
                {t.description && <p className="task-card-desc" style={{ background: 'var(--brand-surface-2)', padding: '6px', borderRadius: '4px', fontSize: '12px' }}><strong>Instructions:</strong> {t.description}</p>}
                <div className="task-card-meta">Assigned: {new Date(t.created_at).toLocaleString('fr-FR')}</div>
                <div className="task-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-primary" style={{ flex: 1, padding: '6px 12px', fontSize: '12px' }} onClick={() => handleStart(t)}>
                    Start Work
                  </button>
                  <button type="button" className="btn-secondary" style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} onClick={() => setChatTask(t)} title="Chat with Department">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {pendingTasks.length === 0 && <p className="text-center" style={{ fontSize: '13px' }}>No pending tasks.</p>}
          </div>

          {/* In Progress Column */}
          <div className="task-column">
            <div className="task-column-header">In Progress ({progressTasks.length})</div>
            {progressTasks.map(t => (
              <div key={t.id} className="task-card" style={{ borderLeft: '3px solid var(--brand-accent)' }}>
                <div className="task-card-header">
                  <span className="task-card-title">{t.reclamation?.title}</span>
                  <span className={`priority-badge priority-${t.reclamation?.priority}`}>{t.reclamation?.priority}</span>
                </div>
                <p className="task-card-desc"><strong>Machine:</strong> {t.reclamation?.machine}</p>
                {t.description && <p className="task-card-desc" style={{ background: 'var(--brand-surface-2)', padding: '6px', borderRadius: '4px', fontSize: '12px' }}><strong>Instructions:</strong> {t.description}</p>}
                <div className="task-card-meta">Started: {new Date(t.updated_at).toLocaleString('fr-FR')}</div>
                <div className="task-card-actions" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button type="button" className="btn-primary" style={{ flex: 1, padding: '6px 12px', fontSize: '12px', background: '#10b981', borderColor: '#10b981' }} onClick={() => { setUpdatingTask(t); setNotes('') }}>
                    Report & Complete
                  </button>
                  <button type="button" className="btn-secondary" style={{ padding: '6px', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }} onClick={() => setChatTask(t)} title="Chat with Department">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {progressTasks.length === 0 && <p className="text-center" style={{ fontSize: '13px' }}>No work in progress.</p>}
          </div>

          {/* Completed Column */}
          <div className="task-column">
            <div className="task-column-header">Completed Interventions ({completedTasks.length})</div>
            {completedTasks.map(t => (
              <div key={t.id} className="task-card" style={{ opacity: 0.85 }}>
                <div className="task-card-header">
                  <span className="task-card-title">{t.reclamation?.title}</span>
                  <span className="status-badge status-resolved">Completed</span>
                </div>
                <p className="task-card-desc"><strong>Machine:</strong> {t.reclamation?.machine}</p>
                {t.intervention_notes && <p className="task-card-desc" style={{ fontStyle: 'italic', background: 'var(--brand-surface-2)', padding: '6px', borderRadius: '4px', fontSize: '12px' }}><strong>Notes:</strong> {t.intervention_notes}</p>}
                {t.attachments && t.attachments.length > 0 && (
                  <div style={{ fontSize: '11px', marginTop: '6px' }}>
                    <strong>Evidence:</strong>
                    {t.attachments.map(att => (
                      <div key={att.id} style={{ marginTop: '2px' }}>
                        🖼️ <a href={att.file_path} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--brand-accent)', fontWeight: 'bold' }}>{att.file_name}</a>
                      </div>
                    ))}
                  </div>
                )}
                <div className="task-card-meta" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>Completed: {t.completed_at ? new Date(t.completed_at).toLocaleString('fr-FR') : '—'}</span>
                  <button type="button" className="btn-secondary" style={{ padding: '4px', width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '4px', background: 'transparent', border: '1px solid var(--input-border)' }} onClick={() => setChatTask(t)} title="Chat with Department">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {completedTasks.length === 0 && <p className="text-center" style={{ fontSize: '13px' }}>No completed tasks.</p>}
          </div>
        </div>
      )}

      {/* Task Chat Modal */}
      {chatTask && (
        <TaskChatModal
          task={chatTask}
          token={token}
          currentUser={user}
          notify={notify}
          onClose={() => setChatTask(null)}
        />
      )}

      {/* Intervention Modal */}
      {updatingTask && (
        <div className="modal-overlay" onClick={() => setUpdatingTask(null)} style={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(15, 23, 42, 0.6)' }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', maxHeight: '90vh', display: 'flex', flexDirection: 'column', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)', border: '1px solid rgba(255, 255, 255, 0.1)', background: 'var(--brand-surface)' }}>
            <div className="modal-header" style={{ padding: '16px 24px', background: 'linear-gradient(to right, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.02))', borderBottom: '1px solid rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '8px', borderRadius: '12px', color: '#10b981', display: 'flex' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '700', color: 'var(--brand-text)' }}>Complete Intervention</h3>
                  <p style={{ margin: 0, fontSize: '12px', color: 'var(--brand-muted)', marginTop: '2px' }}>Finalize task and submit evidence</p>
                </div>
              </div>
              <button className="close-btn btn-icon" onClick={() => setUpdatingTask(null)} style={{ background: 'transparent', border: 'none', color: 'var(--brand-muted)', cursor: 'pointer', padding: '8px', borderRadius: '50%', transition: 'all 0.2s' }} onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'} onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>
            <div style={{ overflowY: 'auto', padding: '20px 24px' }}>
              <form onSubmit={handleCompleteSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group" style={{ background: 'var(--brand-surface-2)', padding: '12px 16px', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.05)', marginBottom: 0 }}>
                  <label style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px', color: 'var(--brand-muted)', marginBottom: '4px', display: 'block' }}>Complaint Title</label>
                  <p style={{ margin: 0, fontWeight: '600', fontSize: '15px', color: 'var(--brand-text)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--brand-accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    {updatingTask.reclamation?.title}
                  </p>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Intervention Notes <span className="req" style={{ color: '#ef4444' }}>*</span></label>
                  <textarea 
                    required 
                    rows="3" 
                    placeholder="Describe the diagnostics, work executed, and solution..." 
                    value={notes} 
                    onChange={(e) => setNotes(e.target.value)}
                    style={{ background: 'var(--input-bg)', color: 'var(--brand-text)', border: '2px solid transparent', borderRadius: '10px', padding: '12px', width: '100%', boxSizing: 'border-box', transition: 'all 0.2s', resize: 'vertical', fontSize: '13px', lineHeight: '1.4', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                    onFocus={(e) => { e.target.style.borderColor = '#10b981'; e.target.style.outline = 'none'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.2)' }}
                    onBlur={(e) => { e.target.style.borderColor = 'transparent'; e.target.style.boxShadow = 'inset 0 2px 4px rgba(0,0,0,0.05)' }}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label style={{ fontSize: '13px', fontWeight: '600', marginBottom: '6px', display: 'block' }}>Proof / Photos (Evidence)</label>
                  <div style={{ position: 'relative', background: 'var(--input-bg)', border: '2px dashed var(--input-border)', borderRadius: '10px', padding: '16px', textAlign: 'center', transition: 'all 0.2s', cursor: 'pointer' }} onMouseOver={(e) => e.currentTarget.style.borderColor = '#10b981'} onMouseOut={(e) => e.currentTarget.style.borderColor = 'var(--input-border)'}>
                    <input 
                      type="file" 
                      multiple 
                      onChange={(e) => setEvidenceFiles(Array.from(e.target.files || []))}
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', opacity: 0, cursor: 'pointer' }}
                    />
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--brand-muted)', margin: '0 auto 8px' }}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                    <p style={{ margin: '0 0 2px', fontWeight: '500', fontSize: '13px', color: 'var(--brand-text)' }}>Click or drag files to upload</p>
                    <p style={{ margin: 0, fontSize: '11px', color: 'var(--brand-muted)' }}>{evidenceFiles.length > 0 ? `${evidenceFiles.length} file(s) selected` : 'SVG, PNG, JPG or PDF (max. 5MB)'}</p>
                  </div>
                </div>
                <div className="form-actions" style={{ padding: '16px 0 0', borderTop: '1px solid rgba(255, 255, 255, 0.05)', margin: 0, display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
                  <button type="button" className="btn-secondary" onClick={() => setUpdatingTask(null)} style={{ padding: '10px 20px', borderRadius: '8px', fontWeight: '600', background: 'transparent', border: '1px solid var(--input-border)', color: 'var(--brand-text)', fontSize: '13px' }}>Cancel</button>
                  <button type="submit" className="btn-primary" disabled={submitting || !notes.trim()} style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: '600', background: 'linear-gradient(135deg, #10b981, #059669)', border: 'none', color: 'white', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)', transition: 'all 0.2s', opacity: (submitting || !notes.trim()) ? 0.6 : 1, cursor: (submitting || !notes.trim()) ? 'not-allowed' : 'pointer', fontSize: '13px' }}>
                    {submitting ? (
                      <>
                        <div className="loading-spinner" style={{ width: '14px', height: '14px', borderTopColor: 'white', borderWidth: '2px', margin: 0 }} />
                        Submitting...
                      </>
                    ) : (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        Mark Completed
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default App

