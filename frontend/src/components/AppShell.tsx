import { useState } from 'react'
import type { FormEvent } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'

type AppShellProps = {
  backendConnected: boolean
  serviceError: string
  onDismissServiceError: () => void
}

function AppShell({
  backendConnected,
  serviceError,
  onDismissServiceError,
}: AppShellProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isDarkMode, setIsDarkMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const navigate = useNavigate()

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const query = searchQuery.trim()
    if (!query) return
    navigate(`/documents?search=${encodeURIComponent(query)}`)
  }

  return (
    <div className={`app-shell${isCollapsed ? ' sidebar-collapsed' : ''}${isDarkMode ? ' theme-dark' : ''}`}>
      <aside className="sidebar">
        <NavLink className="brand" to="/" aria-label="LearnFlow dashboard">
          <span className="brand-mark" aria-hidden="true">L</span>
          <span className="brand-name">LearnFlow</span>
        </NavLink>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavLink className="nav-link" to="/" end title="Dashboard">
            <span aria-hidden="true">⌂</span>
            <span className="nav-label">Dashboard</span>
          </NavLink>
          <NavLink className="nav-link" to="/documents" title="Documents">
            <span aria-hidden="true">▤</span>
            <span className="nav-label">Documents</span>
          </NavLink>
          <NavLink className="nav-link" to="/conversations" title="Conversations">
            <span aria-hidden="true">◷</span>
            <span className="nav-label">Conversations</span>
          </NavLink>
          <NavLink className="nav-link mobile-settings-link" to="/settings" title="Settings">
            <span aria-hidden="true">⚙</span>
            <span className="nav-label">Settings</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <NavLink className="nav-link" to="/settings" title="Settings">
            <span aria-hidden="true">⚙</span>
            <span className="nav-label">Settings</span>
          </NavLink>
          <div className="profile">
            <span className="avatar" aria-hidden="true">L</span>
            <span className="profile-copy">
              <strong>Learning workspace</strong>
              <small>Local prototype</small>
            </span>
          </div>
        </div>
      </aside>

      <div className="main-content">
        <header className="topbar">
          <div className="topbar-start">
            <button
              className="sidebar-toggle"
              type="button"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-expanded={!isCollapsed}
              onClick={() => setIsCollapsed((collapsed) => !collapsed)}
            >
              <span aria-hidden="true">{isCollapsed ? '›' : '‹'}</span>
            </button>
            <p>Personal workspace</p>
          </div>
          <div className="topbar-actions">
            <form className="topbar-search" role="search" onSubmit={handleSearch}>
              <span aria-hidden="true">⌕</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search documents"
                aria-label="Search documents"
              />
              <button type="submit" aria-label="Submit document search">↵</button>
            </form>
            <button
              className="theme-toggle"
              type="button"
              aria-label={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-pressed={isDarkMode}
              onClick={() => setIsDarkMode((darkMode) => !darkMode)}
            >
              <span aria-hidden="true">{isDarkMode ? '☼' : '☾'}</span>
            </button>
            <span className="local-badge">
              <span aria-hidden="true" />
              {backendConnected ? 'Local API · SQLite' : 'Backend unavailable'}
            </span>
            <NavLink className="topbar-user" to="/settings" aria-label="Open settings">
              L
            </NavLink>
          </div>
        </header>
        {serviceError && (
          <div className="service-error" role="alert">
            <span>{serviceError}</span>
            <button type="button" onClick={onDismissServiceError} aria-label="Dismiss error">
              ×
            </button>
          </div>
        )}
        <Outlet />
      </div>
    </div>
  )
}

export default AppShell
