import { Link } from 'react-router-dom'
import { Code2 } from 'lucide-react'

const productLinks = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/problems', label: 'Problems' },
    { to: '/leaderboard', label: 'Leaderboard' },
    { to: '/discuss', label: 'Discuss' },
    { to: '/friends', label: 'Friends' },
]

const accountLinks = [
    { to: '/auth', label: 'Sign In' },
    { to: '/settings', label: 'Settings' },
]

const AppFooter = () => {
    return (
        <footer className="border-t bg-background text-muted-foreground">
            <div className="container py-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-4">

                {/* Brand & Tagline */}
                <div className="lg:col-span-2">
                    <Link to="/" className="flex items-center gap-2 w-fit font-semibold text-foreground hover:text-primary transition">
                        <Code2 className="h-5 w-5 text-primary" />
                        <span className="text-lg">Aptigraph</span>
                    </Link>
                    <p className="mt-3 text-sm max-w-xs">
                        Crack LeetCode with smart tracking &amp; spaced practice. Stay consistent, solve smarter.
                    </p>
                </div>

                {/* Product */}
                <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
                    <ul className="space-y-2 text-sm">
                        {productLinks.map((link) => (
                            <li key={link.to}>
                                <Link to={link.to} className="hover:text-primary transition">{link.label}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Account */}
                <div>
                    <h4 className="text-sm font-semibold text-foreground mb-3">Account</h4>
                    <ul className="space-y-2 text-sm">
                        {accountLinks.map((link) => (
                            <li key={link.to}>
                                <Link to={link.to} className="hover:text-primary transition">{link.label}</Link>
                            </li>
                        ))}
                    </ul>
                </div>

            </div>

            {/* Bottom bar */}
            <div className="border-t py-4">
                <div className="container flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>© {new Date().getFullYear()} Aptigraph. All rights reserved.</span>
                    <span>Built for developers who like data.</span>
                </div>
            </div>
        </footer>
    )
}

export default AppFooter
