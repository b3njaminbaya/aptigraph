/**
 * Deterministic, generated avatar for users without a custom one — same
 * seed always produces the same image, no account/API key needed.
 * https://www.dicebear.com/how-to-use/http-api/
 */
export function generateAvatarUrl(seed: string): string {
  return `https://api.dicebear.com/10.x/identicon/svg?seed=${encodeURIComponent(seed)}`;
}

export function resolveAvatarUrl(seed: string, customUrl?: string | null): string {
  return customUrl || generateAvatarUrl(seed);
}
