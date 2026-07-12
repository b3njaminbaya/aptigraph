import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { useFriendsData, useFriendMutations, useProfileSearch, FriendProfile } from '@/data/friends';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { resolveAvatarUrl } from '@/lib/avatar';
import { toast } from 'sonner';
import { UserPlus, Users } from 'lucide-react';

function ProfileRow({ profile, action }: { profile: FriendProfile; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 rounded-lg border p-3 bg-card transition-shadow hover:shadow-sm">
      <Avatar className="h-8 w-8">
        <AvatarImage src={resolveAvatarUrl(profile.userId, profile.avatarUrl)} />
        <AvatarFallback>{(profile.displayName ?? '?').slice(0, 1).toUpperCase()}</AvatarFallback>
      </Avatar>
      <span className="flex-1 font-medium">{profile.displayName ?? 'Anonymous'}</span>
      {action}
    </li>
  );
}

export default function Friends() {
  useEffect(() => setPageMetadata('Aptigraph – Friends', 'Add friends and compare progress.', '/friends'), []);
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const { data: friendsData, isLoading } = useFriendsData();
  const { data: searchResults } = useProfileSearch(query);
  const { sendRequest, respondToRequest, removeFriendship } = useFriendMutations();

  const friendIds = useMemo(() => (friendsData?.friends ?? []).map((f) => f.userId), [friendsData]);
  const { data: friendStats } = useLeaderboard({ userIds: friendIds });

  const knownIds = useMemo(() => {
    if (!friendsData) return new Set<string>();
    return new Set([
      ...friendsData.friends.map((f) => f.userId),
      ...friendsData.incomingRequests.map((f) => f.userId),
      ...friendsData.outgoingRequests.map((f) => f.userId),
    ]);
  }, [friendsData]);

  if (!user) {
    return (
      <main className="container py-12">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Friends</h1>
        <div className="rounded-lg border p-6 bg-card">
          <Link to="/auth" className="font-medium story-link">Sign in</Link> to add friends and compare progress.
        </div>
      </main>
    );
  }

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Friends</h1>
      <p className="text-muted-foreground mb-6">Add friends and compare progress.</p>

      <div className="mb-8">
        <Input
          placeholder="Search by display name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="max-w-sm"
        />
        {searchResults && searchResults.length > 0 && (
          <ul className="mt-3 space-y-2 max-w-sm">
            {searchResults.map((profile) => (
              <ProfileRow
                key={profile.userId}
                profile={profile}
                action={
                  knownIds.has(profile.userId) ? (
                    <span className="text-xs text-muted-foreground">Already connected</span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        sendRequest.mutate(profile.userId);
                        toast.success(`Friend request sent to ${profile.displayName ?? 'user'}`);
                      }}
                    >
                      Add
                    </Button>
                  )
                }
              />
            ))}
          </ul>
        )}
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Loading friends…</p>
      ) : (
        <div className="grid gap-8 md:grid-cols-2">
          {friendsData && friendsData.incomingRequests.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-lg font-semibold mb-3">
                <UserPlus className="h-4 w-4 text-primary" /> Requests
              </h2>
              <ul className="space-y-2">
                {friendsData.incomingRequests.map((profile) => (
                  <ProfileRow
                    key={profile.userId}
                    profile={profile}
                    action={
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => respondToRequest.mutate({ requesterId: profile.userId, accept: true })}>
                          Accept
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => respondToRequest.mutate({ requesterId: profile.userId, accept: false })}>
                          Decline
                        </Button>
                      </div>
                    }
                  />
                ))}
              </ul>
            </section>
          )}

          <section>
            <h2 className="text-lg font-semibold mb-3">Your Friends</h2>
            {!friendsData || friendsData.friends.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-12 text-center">
                <Users className="h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No friends yet — search above to connect with someone.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {friendsData.friends.map((profile) => {
                  const stats = friendStats?.find((s) => s.userId === profile.userId);
                  return (
                    <ProfileRow
                      key={profile.userId}
                      profile={profile}
                      action={
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground font-mono">{stats?.totalSolved ?? 0} solved</span>
                          <Button size="sm" variant="ghost" onClick={() => removeFriendship.mutate(profile.userId)}>
                            Remove
                          </Button>
                        </div>
                      }
                    />
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}
    </main>
  );
}
