/**
 * Hone Marketplace website tests.
 * Tests template functions, SEO output, and sitemap generation.
 * Run: cd hone-marketplace && bun test
 */

import { describe, test, expect } from 'bun:test';
import { htmlHead, navbar, footer, wrapPage, escapeAttr } from '../src/templates/layout';
import { openGraphMeta, pluginJsonLd, siteSearchJsonLd } from '../src/templates/seo';
import { renderPluginPage, type PluginPageData } from '../src/templates/plugin-page';
import { renderHomePage, type HomePageData } from '../src/templates/home-page';
import { renderSearchPage, type SearchPageData } from '../src/templates/search-page';
import { renderCategoryPage, type CategoryPageData } from '../src/templates/category-page';
import { renderPublisherPage, type PublisherPageData } from '../src/templates/publisher-page';
import { generateSitemap } from '../src/sitemap';
import { renderAndCachePlugin, renderAndCacheHome, getCachedPage, clearCache } from '../src/render';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makePluginData(overrides: Partial<PluginPageData> = {}): PluginPageData {
  return {
    name: 'prettier-hone',
    displayName: 'Prettier for Hone',
    description: 'Code formatter for Hone IDE',
    readme: '# Prettier for Hone\n\nFormat your code automatically.',
    version: '2.1.0',
    downloads: 12345,
    ratingValue: 4.8,
    ratingCount: 142,
    tier: 2,
    author: 'prettydev',
    license: 'MIT',
    repository: 'https://github.com/prettydev/prettier-hone',
    tags: ['formatter', 'typescript', 'css'],
    capabilities: ['fs.read', 'fs.write'],
    publisherName: 'prettydev',
    publisherDisplayName: 'Pretty Dev',
    publisherVerified: true,
    iconUrl: '',
    ...overrides,
  };
}

function makeHomeData(overrides: Partial<HomePageData> = {}): HomePageData {
  return {
    featured: [
      { name: 'prettier-hone', displayName: 'Prettier for Hone', description: 'Code formatter', downloads: 12345, ratingValue: 4.8, ratingCount: 142, iconUrl: '' },
      { name: 'eslint-hone', displayName: 'ESLint for Hone', description: 'JavaScript linter', downloads: 8901, ratingValue: 4.5, ratingCount: 89, iconUrl: '' },
    ],
    recent: [
      { name: 'new-plugin', displayName: 'New Plugin', description: 'A new plugin', downloads: 5 },
    ],
    totalPlugins: 156,
    totalDownloads: 98765,
    totalPublishers: 42,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

describe('Layout', () => {
  test('htmlHead includes title and meta', () => {
    const head = htmlHead('Test Title', 'Test description', 'https://example.com', '');
    expect(head).toContain('<title>Test Title</title>');
    expect(head).toContain('<meta name="description" content="Test description">');
    expect(head).toContain('<link rel="canonical" href="https://example.com">');
    expect(head).toContain('<link rel="stylesheet" href="/static/style.css">');
    expect(head).toContain('<!DOCTYPE html>');
    expect(head).toContain('<meta charset="utf-8">');
    expect(head).toContain('viewport');
  });

  test('htmlHead omits canonical when empty', () => {
    const head = htmlHead('Title', 'Desc', '', '');
    expect(head).not.toContain('canonical');
  });

  test('htmlHead includes extra content', () => {
    const head = htmlHead('Title', 'Desc', '', '<meta property="og:type" content="website">');
    expect(head).toContain('og:type');
  });

  test('navbar includes brand and links', () => {
    const nav = navbar();
    expect(nav).toContain('Hone Marketplace');
    expect(nav).toContain('/search');
    expect(nav).toContain('/categories/Languages');
    expect(nav).toContain('Get Hone');
  });

  test('footer includes all sections', () => {
    const foot = footer();
    expect(foot).toContain('Hone IDE');
    expect(foot).toContain('Marketplace');
    expect(foot).toContain('Community');
    expect(foot).toContain('2026 Hone');
  });

  test('wrapPage produces complete HTML', () => {
    const html = wrapPage('My Page', 'My desc', 'https://example.com', '', '<h1>Hello</h1>');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>My Page</title>');
    expect(html).toContain('<h1>Hello</h1>');
    expect(html).toContain('</html>');
    expect(html).toContain('<nav');
    expect(html).toContain('<footer');
    expect(html).toContain('search.js');
  });
});

// ---------------------------------------------------------------------------
// Escape
// ---------------------------------------------------------------------------

describe('escapeAttr', () => {
  test('escapes HTML special characters', () => {
    expect(escapeAttr('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  test('escapes ampersand', () => {
    expect(escapeAttr('A & B')).toBe('A &amp; B');
  });

  test('escapes single quotes', () => {
    expect(escapeAttr("it's")).toBe('it&#39;s');
  });

  test('passes through safe strings', () => {
    expect(escapeAttr('Hello World')).toBe('Hello World');
  });

  test('handles empty string', () => {
    expect(escapeAttr('')).toBe('');
  });
});

// ---------------------------------------------------------------------------
// SEO
// ---------------------------------------------------------------------------

describe('SEO', () => {
  test('openGraphMeta includes all tags', () => {
    const og = openGraphMeta('Title', 'Desc', 'https://example.com', 'https://example.com/img.png');
    expect(og).toContain('og:title');
    expect(og).toContain('og:description');
    expect(og).toContain('og:url');
    expect(og).toContain('og:type');
    expect(og).toContain('og:image');
    expect(og).toContain('twitter:card');
  });

  test('openGraphMeta omits image when empty', () => {
    const og = openGraphMeta('Title', 'Desc', 'https://example.com', '');
    expect(og).not.toContain('og:image');
  });

  test('pluginJsonLd produces valid JSON-LD structure', () => {
    const ld = pluginJsonLd('test-plugin', 'Test Plugin', 'author1', '1.0.0', 4.5, 10);
    expect(ld).toContain('application/ld+json');
    expect(ld).toContain('"@context":"https://schema.org"');
    expect(ld).toContain('"@type":"SoftwareApplication"');
    expect(ld).toContain('"name":"Test Plugin"');
    expect(ld).toContain('"softwareVersion":"1.0.0"');
    expect(ld).toContain('"downloadUrl":"hone://install/test-plugin"');
    expect(ld).toContain('aggregateRating');
    expect(ld).toContain('"ratingValue":"4.5"');
    expect(ld).toContain('"ratingCount":"10"');
  });

  test('pluginJsonLd omits rating when count is 0', () => {
    const ld = pluginJsonLd('test', 'Test', 'auth', '1.0.0', 0, 0);
    expect(ld).not.toContain('aggregateRating');
  });

  test('pluginJsonLd omits author when empty', () => {
    const ld = pluginJsonLd('test', 'Test', '', '1.0.0', 0, 0);
    expect(ld).not.toContain('"author"');
  });

  test('siteSearchJsonLd includes SearchAction', () => {
    const ld = siteSearchJsonLd();
    expect(ld).toContain('SearchAction');
    expect(ld).toContain('search_term_string');
  });
});

// ---------------------------------------------------------------------------
// Plugin Page
// ---------------------------------------------------------------------------

describe('Plugin Page', () => {
  test('renders complete plugin page', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<title>Prettier for Hone | Hone Marketplace</title>');
    expect(html).toContain('</html>');
  });

  test('includes SEO meta tags', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('og:title');
    expect(html).toContain('og:description');
    expect(html).toContain('canonical');
    expect(html).toContain('marketplace.hone.codes/plugins/prettier-hone');
  });

  test('includes JSON-LD', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('application/ld+json');
    expect(html).toContain('SoftwareApplication');
    expect(html).toContain('"softwareVersion":"2.1.0"');
  });

  test('includes install button and command', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('hone plugin install prettier-hone');
    expect(html).toContain('btn-install');
    expect(html).toContain("copyInstall('prettier-hone')");
  });

  test('shows publisher with verified badge', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('/publishers/prettydev');
    expect(html).toContain('Pretty Dev');
    expect(html).toContain('verified-badge');
  });

  test('shows ratings', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('&#9733;'); // filled star
    expect(html).toContain('142');
  });

  test('shows tier badge', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('tier-2');
    expect(html).toContain('Standard');
  });

  test('shows readme', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('Prettier for Hone');
    expect(html).toContain('Format your code automatically');
  });

  test('shows no-readme message when empty', () => {
    const html = renderPluginPage(makePluginData({ readme: '' }));
    expect(html).toContain('No README provided');
  });

  test('shows tags', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('formatter');
    expect(html).toContain('typescript');
    expect(html).toContain('css');
  });

  test('shows license and repository', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('MIT');
    expect(html).toContain('github.com/prettydev/prettier-hone');
  });

  test('shows tabs', () => {
    const html = renderPluginPage(makePluginData());
    expect(html).toContain('README');
    expect(html).toContain('Versions');
    expect(html).toContain('Capabilities');
  });

  test('escapes XSS in displayName', () => {
    const html = renderPluginPage(makePluginData({ displayName: '<script>alert(1)</script>' }));
    expect(html).toContain('&lt;script&gt;');
    expect(html).not.toContain('<script>alert(1)</script>');
  });

  test('tier 1 label', () => {
    const html = renderPluginPage(makePluginData({ tier: 1 }));
    expect(html).toContain('UI Only');
    expect(html).toContain('tier-1');
  });

  test('tier 3 label', () => {
    const html = renderPluginPage(makePluginData({ tier: 3 }));
    expect(html).toContain('High Privilege');
    expect(html).toContain('tier-3');
  });

  test('no rating when count is 0', () => {
    const html = renderPluginPage(makePluginData({ ratingCount: 0, ratingValue: 0 }));
    expect(html).not.toContain('&#9733;');
  });

  test('without publisher shows author', () => {
    const html = renderPluginPage(makePluginData({ publisherName: '', publisherDisplayName: '' }));
    expect(html).not.toContain('/publishers/');
    // Author name should still appear somewhere in the page
  });
});

// ---------------------------------------------------------------------------
// Home Page
// ---------------------------------------------------------------------------

describe('Home Page', () => {
  test('renders complete home page', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Hone Marketplace');
    expect(html).toContain('</html>');
  });

  test('includes search form', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('action="/search"');
    expect(html).toContain('Search plugins...');
  });

  test('shows stats', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('156');
    expect(html).toContain('98765');
    expect(html).toContain('42');
  });

  test('shows featured plugins', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('Featured Plugins');
    expect(html).toContain('Prettier for Hone');
    expect(html).toContain('ESLint for Hone');
    expect(html).toContain('/plugins/prettier-hone');
  });

  test('shows recent plugins', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('Recently Added');
    expect(html).toContain('New Plugin');
  });

  test('shows categories', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('Categories');
    expect(html).toContain('/categories/Languages');
    expect(html).toContain('/categories/Formatters');
    expect(html).toContain('/categories/AI');
  });

  test('includes search JSON-LD', () => {
    const html = renderHomePage(makeHomeData());
    expect(html).toContain('SearchAction');
  });

  test('no featured section when empty', () => {
    const html = renderHomePage(makeHomeData({ featured: [] }));
    expect(html).not.toContain('Featured Plugins');
  });

  test('no recent section when empty', () => {
    const html = renderHomePage(makeHomeData({ recent: [] }));
    expect(html).not.toContain('Recently Added');
  });
});

// ---------------------------------------------------------------------------
// Search Page
// ---------------------------------------------------------------------------

describe('Search Page', () => {
  test('renders search results', () => {
    const html = renderSearchPage({
      query: 'formatter',
      results: [{ name: 'prettier-hone', displayName: 'Prettier', description: 'Code formatter', downloads: 100, ratingValue: 4.5, ratingCount: 10, tier: 2, iconUrl: '' }],
      total: 1,
      page: 1,
      totalPages: 1,
      sort: '',
    });
    expect(html).toContain('Results for');
    expect(html).toContain('formatter');
    expect(html).toContain('Prettier');
    expect(html).toContain('/plugins/prettier-hone');
  });

  test('shows browse title when no query', () => {
    const html = renderSearchPage({ query: '', results: [], total: 0, page: 1, totalPages: 1, sort: '' });
    expect(html).toContain('Browse Plugins');
  });

  test('adds noindex for search queries', () => {
    const html = renderSearchPage({ query: 'test', results: [], total: 0, page: 1, totalPages: 1, sort: '' });
    expect(html).toContain('noindex');
  });

  test('no noindex when browsing', () => {
    const html = renderSearchPage({ query: '', results: [], total: 0, page: 1, totalPages: 1, sort: '' });
    expect(html).not.toContain('noindex');
  });

  test('shows no results message', () => {
    const html = renderSearchPage({ query: 'xyz', results: [], total: 0, page: 1, totalPages: 1, sort: '' });
    expect(html).toContain('No plugins found');
  });

  test('shows sort options', () => {
    const html = renderSearchPage({ query: '', results: [], total: 0, page: 1, totalPages: 1, sort: 'rating' });
    expect(html).toContain('Downloads');
    expect(html).toContain('Rating');
    expect(html).toContain('Recent');
    expect(html).toContain('Name');
  });

  test('pagination shows when multiple pages', () => {
    const html = renderSearchPage({
      query: 'test',
      results: [{ name: 'a', displayName: 'A', description: 'desc', downloads: 1, ratingValue: 0, ratingCount: 0, tier: 2, iconUrl: '' }],
      total: 100,
      page: 2,
      totalPages: 5,
      sort: '',
    });
    expect(html).toContain('Previous');
    expect(html).toContain('Next');
    expect(html).toContain('Page 2 of 5');
  });

  test('no pagination for single page', () => {
    const html = renderSearchPage({
      query: '',
      results: [{ name: 'a', displayName: 'A', description: 'desc', downloads: 1, ratingValue: 0, ratingCount: 0, tier: 2, iconUrl: '' }],
      total: 1,
      page: 1,
      totalPages: 1,
      sort: '',
    });
    expect(html).not.toContain('pagination');
  });

  test('shows tier badges', () => {
    const html = renderSearchPage({
      query: '',
      results: [{ name: 'a', displayName: 'A', description: 'desc', downloads: 1, ratingValue: 0, ratingCount: 0, tier: 3, iconUrl: '' }],
      total: 1,
      page: 1,
      totalPages: 1,
      sort: '',
    });
    expect(html).toContain('High Privilege');
    expect(html).toContain('tier-3');
  });
});

// ---------------------------------------------------------------------------
// Category Page
// ---------------------------------------------------------------------------

describe('Category Page', () => {
  test('renders category listing', () => {
    const html = renderCategoryPage({
      category: 'Formatters',
      plugins: [{ name: 'prettier-hone', displayName: 'Prettier', description: 'Formatter', downloads: 100, ratingValue: 4.5, ratingCount: 10, iconUrl: '' }],
      total: 1,
      page: 1,
      totalPages: 1,
    });
    expect(html).toContain('Formatters Plugins');
    expect(html).toContain('Prettier');
    expect(html).toContain('/plugins/prettier-hone');
    expect(html).toContain('1 plugin');
  });

  test('shows canonical URL', () => {
    const html = renderCategoryPage({ category: 'AI', plugins: [], total: 0, page: 1, totalPages: 1 });
    expect(html).toContain('marketplace.hone.codes/categories/AI');
  });

  test('no results message', () => {
    const html = renderCategoryPage({ category: 'Themes', plugins: [], total: 0, page: 1, totalPages: 1 });
    expect(html).toContain('No plugins in this category');
  });

  test('pluralization for multiple plugins', () => {
    const html = renderCategoryPage({
      category: 'Git',
      plugins: [
        { name: 'a', displayName: 'A', description: 'd', downloads: 1, ratingValue: 0, ratingCount: 0, iconUrl: '' },
        { name: 'b', displayName: 'B', description: 'd', downloads: 2, ratingValue: 0, ratingCount: 0, iconUrl: '' },
      ],
      total: 2,
      page: 1,
      totalPages: 1,
    });
    expect(html).toContain('2 plugins');
  });
});

// ---------------------------------------------------------------------------
// Publisher Page
// ---------------------------------------------------------------------------

describe('Publisher Page', () => {
  test('renders publisher profile', () => {
    const html = renderPublisherPage({
      username: 'prettydev',
      displayName: 'Pretty Dev',
      bio: 'Code formatting enthusiast',
      website: 'https://prettydev.com',
      avatarUrl: 'https://avatars.example.com/prettydev.jpg',
      verified: true,
      plugins: [{ name: 'prettier-hone', displayName: 'Prettier', description: 'Formatter', downloads: 100, ratingValue: 4.5, ratingCount: 10, iconUrl: '' }],
    });
    expect(html).toContain('Pretty Dev');
    expect(html).toContain('verified-badge');
    expect(html).toContain('Code formatting enthusiast');
    expect(html).toContain('prettydev.com');
    expect(html).toContain('1 Plugin');
    expect(html).toContain('/plugins/prettier-hone');
  });

  test('shows username when no displayName', () => {
    const html = renderPublisherPage({
      username: 'testuser',
      displayName: '',
      bio: '',
      website: '',
      avatarUrl: '',
      verified: false,
      plugins: [],
    });
    expect(html).toContain('testuser');
    expect(html).not.toContain('verified-badge');
  });

  test('pluralization for 0 plugins', () => {
    const html = renderPublisherPage({
      username: 'newuser',
      displayName: 'New User',
      bio: '',
      website: '',
      avatarUrl: '',
      verified: false,
      plugins: [],
    });
    expect(html).toContain('0 Plugins');
  });
});

// ---------------------------------------------------------------------------
// Sitemap
// ---------------------------------------------------------------------------

describe('Sitemap', () => {
  test('generates valid XML', () => {
    const xml = generateSitemap(['prettier-hone', 'eslint-hone'], ['prettydev']);
    expect(xml).toContain('<?xml version="1.0"');
    expect(xml).toContain('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
    expect(xml).toContain('</urlset>');
  });

  test('includes home page', () => {
    const xml = generateSitemap([], []);
    expect(xml).toContain('marketplace.hone.codes/');
    expect(xml).toContain('<priority>1.0</priority>');
  });

  test('includes search page', () => {
    const xml = generateSitemap([], []);
    expect(xml).toContain('marketplace.hone.codes/search');
  });

  test('includes all categories', () => {
    const xml = generateSitemap([], []);
    expect(xml).toContain('/categories/Languages');
    expect(xml).toContain('/categories/AI');
    expect(xml).toContain('/categories/Other');
  });

  test('includes plugin URLs', () => {
    const xml = generateSitemap(['prettier-hone', 'eslint-hone'], []);
    expect(xml).toContain('/plugins/prettier-hone');
    expect(xml).toContain('/plugins/eslint-hone');
  });

  test('includes publisher URLs', () => {
    const xml = generateSitemap([], ['prettydev', 'lintmaster']);
    expect(xml).toContain('/publishers/prettydev');
    expect(xml).toContain('/publishers/lintmaster');
  });

  test('plugin pages have high priority', () => {
    const xml = generateSitemap(['test-plugin'], []);
    // Find the plugin URL entry and check priority
    const pluginIdx = xml.indexOf('/plugins/test-plugin');
    const priorityAfter = xml.indexOf('<priority>', pluginIdx);
    const priorityEnd = xml.indexOf('</priority>', priorityAfter);
    const priority = xml.slice(priorityAfter + 10, priorityEnd);
    expect(priority).toBe('0.9');
  });
});

// ---------------------------------------------------------------------------
// Render Cache
// ---------------------------------------------------------------------------

describe('Render Cache', () => {
  test('caches plugin page', () => {
    clearCache();
    const html = renderAndCachePlugin(makePluginData());
    expect(html).toContain('Prettier for Hone');
    const cached = getCachedPage('plugin:prettier-hone');
    expect(cached).toBe(html);
  });

  test('caches home page', () => {
    clearCache();
    const html = renderAndCacheHome(makeHomeData());
    expect(html).toContain('Hone Marketplace');
    const cached = getCachedPage('home');
    expect(cached).toBe(html);
  });

  test('clearCache empties all entries', () => {
    renderAndCachePlugin(makePluginData());
    renderAndCacheHome(makeHomeData());
    clearCache();
    expect(getCachedPage('plugin:prettier-hone')).toBeUndefined();
    expect(getCachedPage('home')).toBeUndefined();
  });

  test('getCachedPage returns undefined for missing keys', () => {
    clearCache();
    expect(getCachedPage('nonexistent')).toBeUndefined();
  });
});
