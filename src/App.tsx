import { useAuth } from './lib/useAuth'
import AuthForm from './components/AuthForm'
import Dashboard from './pages/Dashboard'

export default function App() {
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
