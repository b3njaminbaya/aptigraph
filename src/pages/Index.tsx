import hero from '@/assets/aptigraph-hero.jpg'
import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import { setPageMetadata } from '@/lib/seo'
import { Link } from 'react-router-dom'
import { Trophy, BarChart3, Users, Zap, Brain, Target } from 'lucide-react'

const Index = () => {
  useEffect(() =>
    setPageMetadata(
      'Aptigraph – LeetCode Tracker & Smart Practice',
      'Track LeetCode progress with smart recommendations, streaks, analytics, and leaderboards. Stay consistent and level up daily with Aptigraph.',
      '/'
    ), [])

  const features = [
    {
      icon: <Brain className="w-8 h-8 text-primary" />,
      title: 'Smart Recommendations',
      desc: 'Get personalized problem suggestions based on your weakest topics and recent activity.'
    },
    {
      icon: <BarChart3 className="w-8 h-8 text-primary" />,
      title: 'Analytics & Insights',
      desc: 'Visualize your journey with difficulty heatmaps, topic breakdowns, and streak tracking.'
    },
    {
      icon: <Trophy className="w-8 h-8 text-primary" />,
      title: 'Streaks & Milestones',
      desc: 'Stay motivated with streak tracking and milestone celebrations as you hit new problem-solving goals.'
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: 'Leaderboards & Friends',
      desc: 'Compete with the global community or challenge friends to sharpen your skills together.'
    },
    {
      icon: <Target className="w-8 h-8 text-primary" />,
      title: 'Spaced Repetition',
      desc: 'Solved problems come back for review on a schedule that adapts to how well you know them.'
    },
    {
      icon: <Zap className="w-8 h-8 text-primary" />,
      title: 'Fast & Intuitive',
      desc: 'A clean, responsive interface that keeps you in the flow of learning.'
    }
  ]

  return (
    <main className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden border-b">
        <div className="absolute inset-0 aurora" aria-hidden="true" />
        <div className="container grid lg:grid-cols-2 gap-8 items-center py-12 md:py-20">

          {/* Text Column */}
          <div className="relative z-10 order-2 lg:order-1 text-center lg:text-left">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight tracking-tight">
              Crack LeetCode with smart tracking & spaced practice
            </h1>
            <p className="text-base sm:text-lg text-muted-foreground mt-4 max-w-xl mx-auto lg:mx-0">
              Stop guessing your next step. Aptigraph helps you solve smarter,
              not harder — with data-driven insights, streak motivation, and
              tailored problem recommendations.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center lg:justify-start items-center gap-3">
              <Link to="/auth">
                <Button variant="hero" size="lg" className="hover-scale w-full sm:w-auto">
                  Get Started Free
                </Button>
              </Link>
              <Link to="/problems">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  Browse Problems
                </Button>
              </Link>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              No spam. Your progress stays yours.
            </p>
          </div>

          {/* Image Column */}
          <div className="relative order-1 lg:order-2 flex justify-center">
            <img
              src={hero}
              alt="Aptigraph dashboard preview with charts and heatmaps"
              className="w-full max-w-md lg:max-w-full h-auto rounded-xl border shadow-xl animate-fade-in object-cover"
            />
          </div>

        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-12">
            Everything you need to level up
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-10">
            {features.map((f, i) => (
              <div
                key={i}
                className="bg-background rounded-lg shadow-sm border p-6 hover:shadow-lg transition"
              >
                {f.icon}
                <h3 className="mt-4 font-semibold text-lg">{f.title}</h3>
                <p className="mt-2 text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community Section */}
      <section className="py-20">
        <div className="container text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold tracking-tight mb-6">
            Join a community of problem-solvers
          </h2>
          <p className="text-muted-foreground mb-8">
            From beginners to seasoned competitive programmers — thousands of
            users are tracking their progress, sharing strategies, and
            celebrating wins together.
          </p>
          <Link to="/leaderboard">
            <Button size="lg" variant="default">
              View Leaderboard
            </Button>
          </Link>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-4">
            Ready to boost your coding skills?
          </h2>
          <p className="mb-8 max-w-2xl mx-auto">
            Start tracking, practicing, and improving with Aptigraph today —
            and let data guide your journey to mastery.
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary">
              Get Started Now
            </Button>
          </Link>
        </div>
      </section>
    </main>
  )
}

export default Index


