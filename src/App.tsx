import { useAuth } from './lib/useAuth'
import AuthForm from './components/AuthForm'
import Dashboard from './pages/Dashboard'
import SharedPiece from './pages/SharedPiece'

function getShareToken(): string | null {
  const match = window.location.pathname.match(/^\/share\/([0-9a-f-]{36})$/i)
  return match ? match[1] : null
}

export default function App() {
  // Check for public share route first (no auth required)
  const shareToken = getShareToken()
  if (shareToken) {
    return <SharedPiece token={shareToken} />
  }

  return <AuthenticatedApp />
}

function AuthenticatedApp() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-neutral-500">Loading...</div>
      </div>
    )
  }

  if (!user) {
    return <AuthForm onSignIn={signIn} onSignUp={signUp} />
  }

  return <Dashboard userId={user.id} onSignOut={signOut} />
}
