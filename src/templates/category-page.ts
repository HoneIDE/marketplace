/**
 * Category listing page template — sync function for testing/pre-rendering.
 */

import { wrapPage, escapeAttr } from './layout';

export interface CategoryPageData {
  category: string;
  plugins: { name: string; displayName: string; description: string; downloads: number; ratingValue: number; ratingCount: number; iconUrl: string }[];
  total: number;
  page: number;
  totalPages: number;
}

function stars(rating: number): string {
  let s = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) s += '&#9733;';
  for (let i = full; i < 5; i++) s += '&#9734;';
  return s;
}

export function renderCategoryPage(data: CategoryPageData): string {
  let body = '';
  body += '<div class="container">';
  body += '<h1>';
  body += escapeAttr(data.category);
  body += ' Plugins</h1>';
  body += '<p class="search-count">';
  body += String(data.total);
  body += ' plugin';
  if (data.total !== 1) body += 's';
  body += '</p>';

  if (data.plugins.length === 0) {
    body += '<div class="no-results"><p>No plugins in this category yet.</p></div>';
  } else {
    body += '<div class="search-results">';
    for (let i = 0; i < data.plugins.length; i++) {
      const p = data.plugins[i];
      body += '<a href="/plugins/';
      body += p.name;
      body += '" class="search-result">';
      if (p.iconUrl.length > 0) {
        body += '<img src="';
        body += p.iconUrl;
        body += '" alt="" class="result-icon" width="40" height="40">';
      } else {
        body += '<div class="result-icon-default">&#9881;</div>';
      }
      body += '<div class="result-info"><h3>';
      body += escapeAttr(p.displayName);
      body += '</h3><p>';
      body += escapeAttr(p.description);
      body += '</p><div class="result-meta"><span>';
      body += String(p.downloads);
      body += ' downloads</span>';
      if (p.ratingCount > 0) {
        body += '<span class="stars">';
        body += stars(p.ratingValue);
        body += '</span>';
      }
      body += '</div></div></a>';
    }
    body += '</div>';

    if (data.totalPages > 1) {
      body += '<div class="pagination">';
      if (data.page > 1) {
        body += '<a href="/categories/';
        body += data.category;
        body += '?page=';
        body += String(data.page - 1);
        body += '" class="page-link">&laquo; Previous</a>';
      }
      body += '<span class="page-info">Page ';
      body += String(data.page);
      body += ' of ';
      body += String(data.totalPages);
      body += '</span>';
      if (data.page < data.totalPages) {
        body += '<a href="/categories/';
        body += data.category;
        body += '?page=';
        body += String(data.page + 1);
        body += '" class="page-link">Next &raquo;</a>';
      }
      body += '</div>';
    }
  }

  body += '</div>';

  return wrapPage(
    data.category + ' Plugins | Hone Marketplace',
    'Browse ' + data.category + ' plugins for Hone IDE.',
    'https://marketplace.hone.codes/categories/' + data.category,
    '',
    body
  );
}
