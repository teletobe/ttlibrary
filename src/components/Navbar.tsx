import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

export default function Navbar() {
  const { isOwner, profile, signOut } = useAuth()
  const navigate = useNavigate()

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <header className="sticky top-0 z-10 border-b border-stone-200/70 bg-white/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-base font-bold tracking-tight text-stone-900">
          TTLibrary
        </Link>

        <div className="flex items-center gap-4">
          {isOwner ? (
            <>
              <span className="text-xs text-stone-400">{profile?.display_name}</span>
              <button
                onClick={handleSignOut}
                className="text-sm text-stone-500 transition-colors hover:text-stone-900"
              >
                Sign out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="text-sm text-stone-500 transition-colors hover:text-stone-900"
            >
              Owner login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
