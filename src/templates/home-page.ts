/**
 * Homepage template — sync function for testing/pre-rendering.
 */

import { wrapPage, escapeAttr } from './layout';
import { siteSearchJsonLd } from './seo';

export interface HomePageData {
  featured: { name: string; displayName: string; description: string; downloads: number; ratingValue: number; ratingCount: number; iconUrl: string }[];
  recent: { name: string; displayName: string; description: string; downloads: number }[];
  totalPlugins: number;
  totalDownloads: number;
  totalPublishers: number;
}

const CATEGORIES = [
  'Languages', 'Formatters', 'Linters', 'Themes', 'Keymaps', 'Snippets',
  'Debuggers', 'Testing', 'Git', 'AI', 'Data', 'Visualization', 'Other',
];

function stars(rating: number): string {
  let s = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) s += '&#9733;';
  for (let i = full; i < 5; i++) s += '&#9734;';
  return s;
}

export function renderHomePage(data: HomePageData): string {
  const headExtra = siteSearchJsonLd();

  let body = '';

  // Hero
  body += '<section class="hero"><div class="hero-inner">';
  body += '<h1>Hone Marketplace</h1>';
  body += '<p class="hero-sub">Discover plugins that supercharge your development workflow</p>';
  body += '<form class="hero-search" action="/search" method="get">';
  body += '<input type="text" name="q" placeholder="Search plugins..." autocomplete="off" aria-label="Search plugins">';
  body += '<button type="submit">Search</button>';
  body += '</form>';
  body += '<div class="hero-stats">';
  body += '<span><strong>';
  body += String(data.totalPlugins);
  body += '</strong> plugins</span>';
  body += '<span><strong>';
  body += String(data.totalDownloads);
  body += '</strong> downloads</span>';
  body += '<span><strong>';
  body += String(data.totalPublishers);
  body += '</strong> publishers</span>';
  body += '</div>';
  body += '</div></section>';

  // Featured
  if (data.featured.length > 0) {
    body += '<section class="section"><div class="section-inner">';
    body += '<h2>Featured Plugins</h2><div class="plugin-grid">';
    for (let i = 0; i < data.featured.length; i++) {
      const f = data.featured[i];
      body += '<a href="/plugins/';
      body += f.name;
      body += '" class="plugin-card">';
      body += '<div class="card-icon">';
      if (f.iconUrl.length > 0) {
        body += '<img src="';
        body += f.iconUrl;
        body += '" alt="" width="48" height="48">';
      } else {
        body += '<div class="card-icon-default">&#9881;</div>';
      }
      body += '</div>';
      body += '<h3>';
      body += escapeAttr(f.displayName);
      body += '</h3><p>';
      body += escapeAttr(f.description);
      body += '</p><div class="card-meta">';
      body += '<span>';
      body += String(f.downloads);
      body += ' downloads</span>';
      if (f.ratingCount > 0) {
        body += '<span class="stars">';
        body += stars(f.ratingValue);
        body += '</span>';
      }
      body += '</div></a>';
    }
    body += '</div></div></section>';
  }

  // Recent
  if (data.recent.length > 0) {
    body += '<section class="section section-alt"><div class="section-inner">';
    body += '<h2>Recently Added</h2><div class="plugin-grid">';
    for (let i = 0; i < data.recent.length; i++) {
      const r = data.recent[i];
      body += '<a href="/plugins/';
      body += r.name;
      body += '" class="plugin-card"><h3>';
      body += escapeAttr(r.displayName);
      body += '</h3><p>';
      body += escapeAttr(r.description);
      body += '</p><div class="card-meta"><span>';
      body += String(r.downloads);
      body += ' downloads</span></div></a>';
    }
    body += '</div></div></section>';
  }

  // Categories
  body += '<section class="section"><div class="section-inner">';
  body += '<h2>Categories</h2><div class="category-grid">';
  for (let i = 0; i < CATEGORIES.length; i++) {
    body += '<a href="/categories/';
    body += CATEGORIES[i];
    body += '" class="category-card">';
    body += CATEGORIES[i];
    body += '</a>';
  }
  body += '</div></div></section>';

  return wrapPage(
    'Hone Marketplace — Plugins for Hone IDE',
    'Browse and install plugins for Hone IDE. Formatters, linters, themes, language support, AI tools, and more.',
    'https://marketplace.hone.codes/',
    headExtra,
    body
  );
}
