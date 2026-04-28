import { useEffect, useMemo, useState } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { PieChart, Pie, Tooltip, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts'
import './App.css'

const api = axios.create({ baseURL: 'http://127.0.0.1:8000/api' })
const APTIV_LOGO = 'data:image/png;base64,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c+2JJHOj2j7Ax0NJ+gD81nPfroUzK7MfH50aOL3XYp1tDmZpMm8D/z9uNrlPtuvdlk9qJcs9KSBx7asHovFb5qdu3xyfOzmnbK6IrMTy5Kyo+9dd7geanWCQEhVHwzCbjQcfe9qbiGwvZhFsTMLKltiycvh8M63ZNxemE5KYR28aQB+udWfTL5eqtaYc6pCoci14ZYmSbaJ5UKxcHmwd9jXn+Xx6zpb1eNpqNWqUbfyiViENc60tgrrv2GYqtloGOSFI9KZvybdu4r2ksh7UNINsthfEk1ZleS+ZM+XmPYt8UfI+a+69dFL+1pDd7ZYy4vyNsnwezxtMsxRS3pavB5xYNW2Sq1+PhYO2S74VLTw/QurMy9rWljrS2Vs8zulSpm5DKMzpP2x2vWBZz1fpIvTyHQi+yOd6nc8x2Ajv/WR3lTSdlwdUqN0/UoggYfExY4sL2jl0aHr4bry4PW0eGHJx4syTIPmZR6jL75majPpfrrzJf2wD1F4Vw6z6EXfAEMtk7mQrVDafop3//aeN0Txz1ntk/HUw9nVmRb3L3bmEZn02JlZvs7c89Sq3UsT7JzihcOghlrUP7LbKy2rb3kC+I7QFumlc3/FokUbHRPv+sATDWsPMOhYdaP+FTf0BlJJunyC9ZyKZGq77Qp4N7Z4bXnDFp58R85ztpfgbZvRLp/5KyaCW0M22Jsp5Iqll1q51u1y4aWhzBB7TlArBjos29WBp1TTfzASCjF36O9P9TGnqTfjS37wepHFPaSFaZ4ngIP3dQnABZcmeKvTySr7zvTi+Ch5nSKXJNjNK416S/mZhtFg/kqpr852QFlXBx5BNHmT5L7rhVmxWvsbllxPPMPcgtKLzWYynRqWtOI/74f/2rWpOs9nEhCZAS/IoRb1laScdler81xvdt5SNRWBxws5P2TIfjTMYdZWdesJL3YUVaJbYLDegCdy5WXf95k96CvZ6iDQt7AXVtf7zP7FURJ4OtLjIeudmIn6oP0a6e35Vk03Lnthblrmm8lw6l2bWKZMurbHs1GvDimi/BDrxqUjaWai2E42poboNpKsg+QHQwHkeeSuryoehGQYOsfnzswQMCy2X5bQhg2iOA9RrlRg7YhgK12sVQLZTdJLUPRLpmsDjybtrNilv2S3swq7yael3kKlUfvH7+veXQO177/pWNqPHg/1u6l++nc1opENHm+soyedzrOuKRGLFzpxRYlojG5WZ8s6GY9vB+2XpoZoVcrWpybndp5zKRR2nbcM+tpgDwRAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAAARAoCsJ/B8iFtma6s2c9gAAAABJRU5ErkJggg=='

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState(null)
  const [items, setItems] = useState([])
  const [loadingDashboard, setLoadingDashboard] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', machine: '', location: '', department: '', priority: 'medium' })

  useEffect(() => {
    document.body.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  useEffect(() => {
    if (!token) return
    api.get('/me', { headers: { Authorization: `Bearer ${token}` } }).then(({ data }) => setUser(data)).catch(() => setToken(null))
  }, [token])

  useEffect(() => {
    if (!token) return
    const headers = { Authorization: `Bearer ${token}` }
    setLoadingDashboard(true)
    Promise.all([
      api.get('/dashboard/stats', { headers }),
      api.get('/reclamations?per_page=10', { headers }),
    ])
      .then(([statsResponse, reclamationsResponse]) => {
        setStats(statsResponse.data)
        setItems(reclamationsResponse.data.data || [])
      })
      .finally(() => setLoadingDashboard(false))
  }, [token])

  const chartStatus = useMemo(() => Object.entries(stats?.status_distribution || {}).map(([name, value]) => ({ name, value })), [stats])
  const chartMonthly = stats?.monthly_reclamations || []
  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } })
    } catch {
      // Clear session client-side even if API call fails.
    } finally {
      localStorage.removeItem('token')
      setToken(null)
      setUser(null)
      setStats(null)
      setItems([])
    }
  }

  if (!token) return <AuthScreen onAuth={(t) => setToken(t)} />

  return (
    <div className="layout">
      <header className="topbar">
        <h1 className="app-name"><span className="accent-dot">•</span> APTIV <span className="accent-dot">•</span></h1>
        <nav className="nav">
          <NavLink to="/">Dashboard</NavLink>
          <NavLink to="/reclamations">My Reclamations</NavLink>
          <NavLink to="/new">New Reclamation</NavLink>
        </nav>
        <div className="user-box">
          <button
            type="button"
            className="theme-btn icon-only"
            onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
            title={theme === 'dark' ? 'Passer en light mode' : 'Passer en dark mode'}
            aria-label={theme === 'dark' ? 'Passer en light mode' : 'Passer en dark mode'}
          >
            {theme === 'dark' ? '☀' : '🌙'}
          </button>
          <span>{user?.name} ({user?.matricule})</span>
          <button type="button" className="logout-btn" onClick={handleLogout} title="Deconnexion" aria-label="Deconnexion">
            ⎋
          </button>
        </div>
      </header>
      <Routes>
        <Route path="/" element={<Dashboard stats={stats} statusData={chartStatus} monthlyData={chartMonthly} />} />
        <Route path="/reclamations" element={<Reclamations items={items} token={token} loading={loadingDashboard} />} />
        <Route path="/new" element={<CreateForm form={form} setForm={setForm} token={token} onDone={() => location.assign('/reclamations')} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </div>
  )
}

function AuthScreen({ onAuth }) {
  const [isRegister, setIsRegister] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [payload, setPayload] = useState({ name: '', matricule: '', department: '', role: 'operator', password: '', password_confirmation: '' })
  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)
    try {
      const url = isRegister ? '/auth/register' : '/auth/login'
      const requestBody = isRegister
        ? payload
        : { matricule: payload.matricule, password: payload.password }
      const { data } = await api.post(url, requestBody)
      if (isRegister) {
        setSuccess('Votre compte a bien ete cree. Connectez-vous maintenant.')
        setIsRegister(false)
        setPayload((prev) => ({
          ...prev,
          password: '',
          password_confirmation: '',
        }))
      } else {
        localStorage.setItem('token', data.token)
        onAuth(data.token)
      }
    } catch (err) {
      const apiMessage = err?.response?.data?.message
      const validation = err?.response?.data?.errors
      if (validation) {
        const firstKey = Object.keys(validation)[0]
        setError(validation[firstKey][0])
      } else {
        setError(apiMessage || 'Authentication failed. Check your data and try again.')
      }
    } finally {
      setLoading(false)
    }
  }
  return <form className="card auth" onSubmit={submit}><h2>{isRegister ? 'Register' : 'Login'}</h2><input placeholder="Matricule" value={payload.matricule} onChange={(e) => setPayload({ ...payload, matricule: e.target.value })} />{isRegister && <><input placeholder="Name" value={payload.name} onChange={(e) => setPayload({ ...payload, name: e.target.value })} /><input placeholder="Department" value={payload.department} onChange={(e) => setPayload({ ...payload, department: e.target.value })} /></>}<input type="password" placeholder="Password" value={payload.password} onChange={(e) => setPayload({ ...payload, password: e.target.value })} />{isRegister && <input type="password" placeholder="Confirm password" value={payload.password_confirmation} onChange={(e) => setPayload({ ...payload, password_confirmation: e.target.value })} />}<button disabled={loading}>{loading ? 'Please wait...' : (isRegister ? 'Create account' : 'Login')}</button>{success && <p className="success-msg">{success}</p>}{error && <p className="error-msg">{error}</p>}<button type="button" onClick={() => { setIsRegister(!isRegister); setError(''); setSuccess('') }}>{isRegister ? 'Have account? Login' : 'No account? Register'}</button></form>
}

function Dashboard({ stats, statusData, monthlyData }) {
  return <main className="grid"><section className="card"><h3>Overview</h3><p>Total: {stats?.totals?.all || 0}</p><p>Pending: {stats?.totals?.pending || 0}</p><p>In progress: {stats?.totals?.in_progress || 0}</p><p>Resolved: {stats?.totals?.resolved || 0}</p><p className="hint">Bienvenue sur votre tableau de bord APTIV.</p></section><section className="card chart"><h3>Status distribution</h3><ResponsiveContainer width="100%" height={240}><PieChart><Pie data={statusData} dataKey="value" nameKey="name" outerRadius={90} fill="#ffcc00" /><Tooltip /></PieChart></ResponsiveContainer></section><section className="card chart"><h3>Monthly reclamations</h3><ResponsiveContainer width="100%" height={240}><BarChart data={monthlyData}><XAxis dataKey="month" /><YAxis /><Tooltip /><Bar dataKey="total" fill="#ffcc00" /></BarChart></ResponsiveContainer></section></main>
}

function Reclamations({ items, token, loading }) {
  const [search, setSearch] = useState('')
  const filtered = items.filter((i) => i.title.toLowerCase().includes(search.toLowerCase()) || i.machine.toLowerCase().includes(search.toLowerCase()))
  const remove = async (id) => {
    await api.delete(`/reclamations/${id}`, { headers: { Authorization: `Bearer ${token}` } })
    location.reload()
  }
  return <main className="card"><h3>My Reclamations</h3><input placeholder="Search by title or machine" value={search} onChange={(e) => setSearch(e.target.value)} />{loading && <p className="hint">Chargement en cours...</p>} {!loading && filtered.length === 0 && <p className="hint">Aucune reclamation pour le moment. Creez-en une depuis "New Reclamation".</p>}<div className="cards">{filtered.map((r) => <article key={r.id} className="reclamation"><h4>{r.title}</h4><p>{r.machine}</p><p>{r.status}</p><button onClick={() => remove(r.id)}>Delete</button></article>)}</div></main>
}

function CreateForm({ form, setForm, token, onDone }) {
  const submit = async (e) => {
    e.preventDefault()
    await api.post('/reclamations', form, { headers: { Authorization: `Bearer ${token}` } })
    onDone()
  }
  return <form className="card" onSubmit={submit}><h3>New Reclamation</h3><input placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><input placeholder="Machine" value={form.machine} onChange={(e) => setForm({ ...form, machine: e.target.value })} /><input placeholder="Department" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} /><input placeholder="Location (optional)" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} /><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select><textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /><button>Submit</button></form>
}

export default App
