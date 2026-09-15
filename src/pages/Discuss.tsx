import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ArrowBigUp, MessageSquare } from 'lucide-react';
import { setPageMetadata } from '@/lib/seo';
import { useAuth } from '@/state/auth';
import { useProblems } from '@/data/problems';
import { usePosts, useComments, useDiscussMutations, DiscussionPost } from '@/data/discuss';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

function PostCard({ post }: { post: DiscussionPost }) {
  const { user } = useAuth();
  const { toggleVote, createComment } = useDiscussMutations();
  const [showComments, setShowComments] = useState(false);
  const [commentBody, setCommentBody] = useState('');
  const { data: comments, isLoading: commentsLoading } = useComments(post.id, showComments);

  return (
    <li className="rounded-lg border p-4 bg-card">
      <div className="flex items-start gap-3">
        <button
          className={`flex flex-col items-center gap-0.5 shrink-0 ${post.hasVoted ? 'text-primary' : 'text-muted-foreground'}`}
          disabled={!user}
          onClick={() => toggleVote.mutate({ postId: post.id, currentlyVoted: post.hasVoted })}
          aria-label={post.hasVoted ? 'Remove upvote' : 'Upvote'}
        >
          <ArrowBigUp className="h-5 w-5" fill={post.hasVoted ? 'currentColor' : 'none'} />
          <span className="text-xs font-mono">{post.upvoteCount}</span>
        </button>
        <div className="flex-1">
          <div className="text-xs text-muted-foreground mb-1">
            <Link to="/problems" className="story-link">{post.problemTitle}</Link>
            {' · '}
            {post.authorDisplayName ?? 'Anonymous'}
            {' · '}
            {formatDistanceToNow(new Date(post.createdAt), { addSuffix: true })}
          </div>
          <p className="text-sm whitespace-pre-wrap">{post.body}</p>
          <button className="text-xs text-muted-foreground mt-2 underline" onClick={() => setShowComments((s) => !s)}>
            {showComments ? 'Hide comments' : 'Comments'}
          </button>

          {showComments && (
            <div className="mt-3 space-y-3 border-t pt-3">
              {commentsLoading ? (
                <p className="text-xs text-muted-foreground">Loading comments…</p>
              ) : (
                (comments ?? []).map((c) => (
                  <div key={c.id} className="text-sm">
                    <span className="font-medium">{c.authorDisplayName ?? 'Anonymous'}</span>{' '}
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                    </span>
                    <p className="whitespace-pre-wrap">{c.body}</p>
                  </div>
                ))
              )}
              {user && (
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Add a comment…"
                    value={commentBody}
                    onChange={(e) => setCommentBody(e.target.value)}
                    className="min-h-[60px] text-sm"
                  />
                  <Button
                    size="sm"
                    disabled={!commentBody.trim() || createComment.isPending}
                    onClick={() => {
                      const body = commentBody.trim();
                      createComment.mutate(
                        { postId: post.id, body },
                        { onSuccess: () => setCommentBody('') }
                      );
                    }}
                  >
                    Post
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Discuss() {
  useEffect(() => setPageMetadata('Aptigraph – Discuss', 'Share solutions and strategies with the community.', '/discuss'), []);
  const { user } = useAuth();
  const { data: problems } = useProblems();
  const [selectedProblemId, setSelectedProblemId] = useState<string>('all');
  const { data: posts, isLoading } = usePosts(selectedProblemId === 'all' ? undefined : Number(selectedProblemId));
  const { createPost } = useDiscussMutations();
  const [postBody, setPostBody] = useState('');

  return (
    <main className="container py-12">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Discuss</h1>
      <p className="text-muted-foreground mb-6">Share solutions and strategies with the community.</p>

      <div className="mb-6 max-w-sm">
        <Select value={selectedProblemId} onValueChange={setSelectedProblemId}>
          <SelectTrigger><SelectValue placeholder="Filter by problem" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All problems (recent)</SelectItem>
            {(problems ?? []).map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>{p.title}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedProblemId !== 'all' && (
        user ? (
          <div className="mb-8 flex gap-2 max-w-2xl">
            <Textarea
              placeholder="Share your approach or ask a question…"
              value={postBody}
              onChange={(e) => setPostBody(e.target.value)}
            />
            <Button
              disabled={!postBody.trim() || createPost.isPending}
              onClick={() => {
                const body = postBody.trim();
                createPost.mutate(
                  { problemId: Number(selectedProblemId), body },
                  {
                    onSuccess: () => {
                      setPostBody('');
                      toast.success('Posted');
                    },
                  }
                );
              }}
            >
              Post
            </Button>
          </div>
        ) : (
          <div className="mb-8 rounded-lg border p-4 bg-card text-sm">
            <Link to="/auth" className="font-medium story-link">Sign in</Link> to post in the discussion.
          </div>
        )
      )}

      {isLoading ? (
        <p className="text-muted-foreground">Loading discussions…</p>
      ) : !posts || posts.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed py-16 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {selectedProblemId === 'all'
              ? 'No discussions yet — pick a problem above to start one.'
              : 'No discussions on this problem yet — be the first to post.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-3 max-w-2xl">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      )}
    </main>
  );
}
