import { afterEach, describe, expect, it } from 'vitest';
import { setPageMetadata } from './seo';

afterEach(() => {
  document.head.querySelectorAll('meta[name="description"], link[rel="canonical"]').forEach((el) => el.remove());
  document.title = '';
});

describe('setPageMetadata', () => {
  it('sets the document title', () => {
    setPageMetadata('Aptigraph – Problems');
    expect(document.title).toBe('Aptigraph – Problems');
  });

  it('creates the description meta tag when missing, then updates it in place', () => {
    setPageMetadata('A', 'first description');
    setPageMetadata('B', 'second description');
    const tags = document.head.querySelectorAll('meta[name="description"]');
    expect(tags).toHaveLength(1);
    expect(tags[0]).toHaveAttribute('content', 'second description');
  });

  it('creates and updates a single canonical link', () => {
    setPageMetadata('A', undefined, '/one');
    setPageMetadata('B', undefined, '/two');
    const links = document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]');
    expect(links).toHaveLength(1);
    expect(links[0].href).toContain('/two');
  });

  it('leaves optional tags untouched when not provided', () => {
    setPageMetadata('Only a title');
    expect(document.head.querySelector('meta[name="description"]')).toBeNull();
    expect(document.head.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
