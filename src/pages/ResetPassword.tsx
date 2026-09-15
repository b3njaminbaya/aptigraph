import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { supabase } from '@/integrations/supabase/client';

export default function ResetPassword() {
  useEffect(
    () => setPageMetadata('Aptigraph – Reset Password', 'Set a new password for your account.', '/reset-password'),
    []
  );
  const { session, loading } = useAuth();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success('Password updated.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen bg-background flex items-center">
        <section className="container max-w-md py-16 text-center">
          <h1 className="text-2xl font-bold mb-2">Link expired</h1>
          <p className="text-muted-foreground mb-6">
            This password reset link is invalid or has expired. Request a new one from the sign-in page.
          </p>
          <Button onClick={() => navigate('/auth')}>Back to sign in</Button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background flex items-center">
      <section className="container max-w-md py-16">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Set a new password</h1>
          <p className="text-muted-foreground mt-2">Choose a new password for your account.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-lg border bg-card p-6 space-y-4">
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="New password (min 6 chars)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Input
            type="password"
            autoComplete="new-password"
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
          />
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Updating…' : 'Update password'}
          </Button>
        </form>
      </section>
    </main>
  );
}
