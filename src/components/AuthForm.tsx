import { useState } from 'react'
import { Lock, Mail } from 'lucide-react'

interface Props {
  onSignIn: (email: string, password: string) => Promise<{ error: unknown }>
  onSignUp: (email: string, password: string) => Promise<{ error: unknown }>
}

export default function AuthForm({ onSignIn, onSignUp }: Props) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [signUpSuccess, setSignUpSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error } = isSignUp
      ? await onSignUp(email, password)
      : await onSignIn(email, password)

    if (error) {
      setError((error as { message?: string }).message ?? 'Authentication failed')
    } else if (isSignUp) {
      setSignUpSuccess(true)
    }
    setLoading(false)
  }

  if (signUpSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black px-4">
        <div className="w-full max-w-sm bg-neutral-900 rounded-2xl shadow-lg p-8 text-center border border-neutral-800">
          <h2 className="text-xl font-semibold text-white mb-2">Check your email</h2>
          <p className="text-neutral-400">We sent a confirmation link to <strong className="text-gold-400">{email}</strong>.</p>
          <button
            className="mt-6 text-gold-400 hover:text-gold-300 font-medium"
            onClick={() => { setSignUpSuccess(false); setIsSignUp(false) }}
          >
            Back to sign in
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-black px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <img src="/logo.jpg" alt="Trove" className="w-32 h-32 mx-auto rounded-xl mb-4" />
          <p className="text-neutral-500 mt-1">Tracking Your Treasures</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-neutral-900 rounded-2xl shadow-lg p-8 space-y-5 border border-neutral-800">
          <h2 className="text-lg font-semibold text-white">
            {isSignUp ? 'Create account' : 'Sign in'}
          </h2>

          {error && (
            <div className="bg-red-900/30 text-red-400 text-sm rounded-lg p-3 border border-red-900/50">{error}</div>
          )}

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-white placeholder-neutral-500"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-400 mb-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-neutral-800 border border-neutral-700 rounded-lg focus:ring-2 focus:ring-gold-400 focus:border-gold-400 outline-none transition text-white placeholder-neutral-500"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-gold-400 hover:bg-gold-300 text-black font-medium rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
          </button>

          <p className="text-center text-sm text-neutral-500">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button
              type="button"
              className="text-gold-400 hover:text-gold-300 font-medium"
              onClick={() => { setIsSignUp(!isSignUp); setError(null) }}
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
        </form>
      </div>
    </div>
  )
}
