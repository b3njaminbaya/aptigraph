import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatar';
import { AlertTriangle, KeyRound, User } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

export default function Settings() {
  useEffect(() => setPageMetadata('Aptigraph – Settings', 'Manage your account.', '/settings'), []);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  useEffect(() => {
    if (!user) navigate('/auth');
  }, [user, navigate]);

  const [displayName, setDisplayName] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName ?? '');
    }
  }, [profile]);

  const handleProfileUpdate = async () => {
    if (!user) return;
    setProfileLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName.trim() || null })
      .eq('id', user.id);
    setProfileLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    toast.success('Profile updated');
  };

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    setPasswordLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPasswordLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNewPassword('');
    toast.success('Password updated');
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    const { error } = await supabase.functions.invoke('delete-account', { method: 'POST' });
    setDeleteLoading(false);
    if (error) {
      toast.error(error.message ?? 'Failed to delete account');
      return;
    }
    await signOut();
    toast.success('Account deleted');
    navigate('/');
  };

  if (!user) return null;

  return (
    <main className="container max-w-2xl py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-1">Manage your account and security.</p>
      </header>

      <section className="mb-6 rounded-lg border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <User className="h-4 w-4 text-primary" /> Profile
        </h2>
        <div className="flex items-center gap-4 mb-5">
          <Avatar className="h-14 w-14">
            <AvatarImage src={resolveAvatarUrl(user.id, profile?.avatarUrl)} />
            <AvatarFallback className="text-lg">{(displayName || user.email || '?').slice(0, 1).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <div className="font-medium truncate">{displayName || 'No display name set'}</div>
            <div className="text-sm text-muted-foreground truncate">{user.email}</div>
            <p className="text-xs text-muted-foreground mt-1">Avatar generated automatically from your account.</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display-name">Display name</Label>
            <Input
              id="display-name"
              placeholder="How you appear on the leaderboard and to friends"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <Button onClick={handleProfileUpdate} disabled={profileLoading}>
            {profileLoading ? 'Saving…' : 'Save profile'}
          </Button>
        </div>
      </section>

      <section className="mb-6 rounded-lg border bg-card p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-4">
          <KeyRound className="h-4 w-4 text-primary" /> Change password
        </h2>
        <div className="space-y-2">
          <Label htmlFor="new-password">New password</Label>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              id="new-password"
              type="password"
              placeholder="Min 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button onClick={handlePasswordChange} disabled={passwordLoading} className="sm:shrink-0">
              {passwordLoading ? 'Updating…' : 'Update password'}
            </Button>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-status-critical/40 bg-status-critical/5 p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold mb-2 text-status-critical">
          <AlertTriangle className="h-4 w-4" /> Danger zone
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive">Delete account</Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete your account?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes your profile, solved problems, friends, and discussion posts. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAccount} disabled={deleteLoading}>
                {deleteLoading ? 'Deleting…' : 'Delete account'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </main>
  );
}
