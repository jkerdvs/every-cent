import { useEffect, useState } from 'react'
import BalanceSheetPage from './pages/BalanceSheetPage'
import CurrentMonthPage from './pages/CurrentMonthPage'
import OwnershipPage from './pages/OwnershipPage'
import StoragePage from './pages/StoragePage'
import SystemPage from './pages/SystemPage'
import SummaryPage from './pages/TotalsPage'

const routes = [
  { path: '/', label: 'September 2026' },
  { path: '/ownership', label: 'Ownership' },
  { path: '/system', label: 'System' },
  { path: '/summary', label: 'Summary' },
  { path: '/storage', label: 'Storage' },
]

function getCurrentPath() {
  if (window.location.pathname === '/balance-sheet') return '/balance-sheet'
  if (window.location.pathname === '/ownership') return '/ownership'
  if (window.location.pathname === '/storage') return '/storage'
  if (window.location.pathname === '/system') return '/system'
  if (window.location.pathname === '/summary') return '/summary'
  if (window.location.pathname === '/totals') return '/summary'

  return '/'
}

function App() {
  const [currentPath, setCurrentPath] = useState(getCurrentPath)

  useEffect(() => {
    function handlePopState() {
      setCurrentPath(getCurrentPath())
    }

    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [])

  function navigate(path: string) {
    if (path === currentPath) return

    window.history.pushState(null, '', path)
    setCurrentPath(path)
  }

  return (
    <div className="app-shell">
      {currentPath === '/balance-sheet' ? (
        <BalanceSheetPage />
      ) : currentPath === '/ownership' ? (
        <OwnershipPage />
      ) : currentPath === '/storage' ? (
        <StoragePage />
      ) : currentPath === '/system' ? (
        <SystemPage />
      ) : currentPath === '/summary' ? (
        <SummaryPage />
      ) : (
        <CurrentMonthPage />
      )}

      <nav className="sheet-tabs" aria-label="Workbook pages">
        {routes.map((route) => (
          <a
            aria-current={currentPath === route.path ? 'page' : undefined}
            className={currentPath === route.path ? 'active' : ''}
            href={route.path}
            key={route.path}
            onClick={(event) => {
              event.preventDefault()
              navigate(route.path)
            }}
          >
            {route.label}
          </a>
        ))}
      </nav>
    </div>
  )
}

export default App
