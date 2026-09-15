import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  useEffect(() => setPageMetadata('Aptigraph – Sign In', 'Sign in or create your Aptigraph account.', '/auth'), []);
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) navigate('/dashboard');
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Signed in.');
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signUp(email, password);
    setLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success('Account created. Check your email to confirm before signing in.');
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      toast.error('Enter your email above first');
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Check your email for a password reset link.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background flex items-center">
      <section className="container max-w-md py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to Aptigraph</h1>
          <p className="text-muted-foreground mt-2">Track, analyze, and level up your coding skills.</p>
        </div>
        <div className="rounded-lg border bg-card p-6">
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            <TabsContent value="signin" className="mt-6 space-y-4">
              <form onSubmit={handleSignIn} className="space-y-4">
                <Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                <Input type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} />
                <Button type="submit" className="w-full" disabled={loading}>{loading ? 'Signing in…' : 'Sign In'}</Button>
              </form>
              <button
                type="button"
                className="text-xs text-muted-foreground underline block mx-auto"
                onClick={handleForgotPassword}
                disabled={resetLoading}
              >
                {resetLoading ? 'Sending…' : 'Forgot password?'}
              </button>
            </TabsContent>
            <TabsContent value="signup" className="mt-6 space-y-4">
              <form onSubmit={handleSignUp} className="space-y-4">
                <Input type="email" autoComplete="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
                <Input type="password" autoComplete="new-password" placeholder="Password (min 6 chars)" value={password} onChange={e=>setPassword(e.target.value)} />
                <Button type="submit" variant="hero" className="w-full" disabled={loading}>{loading ? 'Creating…' : 'Create Account'}</Button>
              </form>
              <p className="text-xs text-muted-foreground text-center">We'll send a confirmation link to your email.</p>
            </TabsContent>
          </Tabs>
        </div>
      </section>
    </main>
  );
}
