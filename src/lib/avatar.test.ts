import { describe, expect, it } from 'vitest';
import { generateAvatarUrl, resolveAvatarUrl } from './avatar';

describe('avatar helpers', () => {
  it('generates a deterministic URL for the same seed', () => {
    expect(generateAvatarUrl('user-1')).toBe(generateAvatarUrl('user-1'));
    expect(generateAvatarUrl('user-1')).not.toBe(generateAvatarUrl('user-2'));
  });

  it('URL-encodes the seed so unusual characters cannot break the query string', () => {
    const url = generateAvatarUrl('a b&c=d/é');
    expect(url).toContain('seed=a%20b%26c%3Dd%2F%C3%A9');
    expect(new URL(url).searchParams.get('seed')).toBe('a b&c=d/é');
  });

  it('prefers a custom avatar URL when one is set', () => {
    expect(resolveAvatarUrl('user-1', 'https://cdn.example.com/me.png')).toBe('https://cdn.example.com/me.png');
  });

  it.each([null, undefined, ''])('falls back to the generated avatar when the custom URL is %j', (custom) => {
    expect(resolveAvatarUrl('user-1', custom)).toBe(generateAvatarUrl('user-1'));
  });
});
