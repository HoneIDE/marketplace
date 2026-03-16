/**
 * Search results page template — sync function for testing/pre-rendering.
 */

import { wrapPage, escapeAttr } from './layout';

export interface SearchResult {
  name: string;
  displayName: string;
  description: string;
  downloads: number;
  ratingValue: number;
  ratingCount: number;
  tier: number;
  iconUrl: string;
}

export interface SearchPageData {
  query: string;
  results: SearchResult[];
  total: number;
  page: number;
  totalPages: number;
  sort: string;
}

function tierLabel(tier: number): string {
  if (tier === 1) return 'UI Only';
  if (tier === 2) return 'Standard';
  if (tier === 3) return 'High Privilege';
  return 'Unknown';
}

function stars(rating: number): string {
  let s = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) s += '&#9733;';
  for (let i = full; i < 5; i++) s += '&#9734;';
  return s;
}

export function renderSearchPage(data: SearchPageData): string {
  let title = '';
  if (data.query.length > 0) {
    title = 'Search: ' + data.query + ' | Hone Marketplace';
  } else {
    title = 'Browse Plugins | Hone Marketplace';
  }

  let headExtra = '';
  if (data.query.length > 0) {
    headExtra = '<meta name="robots" content="noindex">';
  }

  let body = '';
  body += '<div class="container">';
  body += '<div class="search-header">';
  body += '<h1>';
  if (data.query.length > 0) {
    body += 'Results for &quot;';
    body += escapeAttr(data.query);
    body += '&quot;';
  } else {
    body += 'Browse Plugins';
  }
  body += '</h1>';

  body += '<form class="search-form" action="/search" method="get">';
  body += '<input type="text" name="q" value="';
  body += escapeAttr(data.query);
  body += '" placeholder="Search plugins...">';
  body += '<button type="submit">Search</button>';
  body += '</form>';

  body += '<div class="search-sort">';
  body += '<span>Sort: </span>';
  const sorts = ['downloads', 'rating', 'updated', 'name'];
  const sortLabels = ['Downloads', 'Rating', 'Recent', 'Name'];
  for (let i = 0; i < sorts.length; i++) {
    body += '<a href="/search?q=';
    body += data.query;
    body += '&sort=';
    body += sorts[i];
    body += '"';
    if (data.sort === sorts[i] || (data.sort.length === 0 && sorts[i] === 'downloads')) {
      body += ' class="active"';
    }
    body += '>';
    body += sortLabels[i];
    body += '</a>';
  }
  body += '</div>';

  body += '<p class="search-count">';
  body += String(data.total);
  body += ' plugin';
  if (data.total !== 1) body += 's';
  body += ' found</p></div>';

  if (data.results.length === 0) {
    body += '<div class="no-results"><p>No plugins found.</p></div>';
  } else {
    body += '<div class="search-results">';
    for (let i = 0; i < data.results.length; i++) {
      const r = data.results[i];
      body += '<a href="/plugins/';
      body += r.name;
      body += '" class="search-result">';
      if (r.iconUrl.length > 0) {
        body += '<img src="';
        body += r.iconUrl;
        body += '" alt="" class="result-icon" width="40" height="40">';
      } else {
        body += '<div class="result-icon-default">&#9881;</div>';
      }
      body += '<div class="result-info"><h3>';
      body += escapeAttr(r.displayName);
      body += '</h3><p>';
      body += escapeAttr(r.description);
      body += '</p><div class="result-meta">';
      body += '<span>';
      body += String(r.downloads);
      body += ' downloads</span>';
      if (r.ratingCount > 0) {
        body += '<span class="stars">';
        body += stars(r.ratingValue);
        body += '</span>';
      }
      body += '<span class="tier-badge tier-';
      body += String(r.tier);
      body += '">';
      body += tierLabel(r.tier);
      body += '</span>';
      body += '</div></div></a>';
    }
    body += '</div>';

    // Pagination
    if (data.totalPages > 1) {
      body += '<div class="pagination">';
      if (data.page > 1) {
        body += '<a href="/search?q=';
        body += data.query;
        body += '&page=';
        body += String(data.page - 1);
        body += '" class="page-link">&laquo; Previous</a>';
      }
      body += '<span class="page-info">Page ';
      body += String(data.page);
      body += ' of ';
      body += String(data.totalPages);
      body += '</span>';
      if (data.page < data.totalPages) {
        body += '<a href="/search?q=';
        body += data.query;
        body += '&page=';
        body += String(data.page + 1);
        body += '" class="page-link">Next &raquo;</a>';
      }
      body += '</div>';
    }
  }

  body += '</div>'; // container

  return wrapPage(
    title,
    'Search Hone IDE plugins' + (data.query.length > 0 ? ' for ' + data.query : ''),
    'https://marketplace.hone.codes/search',
    headExtra,
    body
  );
}
