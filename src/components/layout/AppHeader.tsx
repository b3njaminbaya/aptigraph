import { Link, NavLink, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'
import {
  LogOut,
  Trophy,
  BarChart3,
  ListChecks,
  Users2,
  MessageSquare,
  Menu,
  Code2,
  Settings as SettingsIcon
} from 'lucide-react'
import { useAuth } from '@/state/auth'
import { ThemeToggle } from '@/components/ThemeToggle'

export default function AppHeader() {
  const { user, loading, signOut } = useAuth()
  const email = user?.email ?? null
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/')
  }

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: <BarChart3 className="inline mr-2 h-4 w-4" /> },
    { to: '/problems', label: 'Problems', icon: <ListChecks className="inline mr-2 h-4 w-4" /> },
    { to: '/leaderboard', label: 'Leaderboard', icon: <Trophy className="inline mr-2 h-4 w-4" /> },
    { to: '/discuss', label: 'Discuss', icon: <MessageSquare className="inline mr-2 h-4 w-4" /> },
    { to: '/friends', label: 'Friends', icon: <Users2 className="inline mr-2 h-4 w-4" /> }
  ]

  const renderLinks = (isMobile = false) =>
    navLinks.map(({ to, label, icon }) => (
      <NavLink
        key={to}
        to={to}
        className={({ isActive }) =>
          `flex items-center px-3 py-2 rounded-md font-medium transition-colors ${isActive ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
          } ${isMobile ? 'text-lg' : 'text-sm'}`
        }
      >
        {icon}
        {label}
      </NavLink>
    ))

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
      <nav className="container flex items-center justify-between h-14">
        {/* Logo / Brand */}
        <Link to="/" className="flex items-center gap-2 font-semibold hover:opacity-80 transition">
          <Code2 className="h-5 w-5 text-primary" />
          <span className="text-lg">Aptigraph</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-1 text-sm">
          {renderLinks()}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          {/* Desktop Auth */}
          {loading ? (
            <div className="h-9 w-24 rounded-md bg-muted animate-pulse" aria-hidden="true" />
          ) : email ? (
            <>
              <span className="hidden sm:block text-sm text-muted-foreground truncate max-w-[150px]">
                {email}
              </span>
              <Button variant="ghost" size="icon" onClick={() => navigate('/settings')} aria-label="Settings">
                <SettingsIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSignOut}
              >
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <Button variant="hero" size="sm" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
          )}

          {/* Mobile Menu */}
          <div className="md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Open menu">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-6">
                <div className="flex flex-col gap-4">
                  {renderLinks(true)}
                  <div className="border-t pt-4">
                    {loading ? null : email ? (
                      <>
                        <span className="block text-sm text-muted-foreground mb-2">
                          {email}
                        </span>
                        <Button variant="outline" className="w-full mb-2" onClick={() => navigate('/settings')}>
                          <SettingsIcon className="mr-2 h-4 w-4" /> Settings
                        </Button>
                        <Button
                          variant="outline"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-4 w-4" /> Sign out
                        </Button>
                      </>
                    ) : (
                      <Button variant="hero" onClick={() => navigate('/auth')}>
                        Get Started
                      </Button>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  )
}

