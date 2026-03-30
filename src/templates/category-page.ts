/**
 * Category listing page template — sync function for testing/pre-rendering.
 */

import { t } from 'perry/i18n';
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
  body += escapeAttr(t(data.category));
  body += ' ';
  body += t('Plugins');
  body += '</h1>';
  body += '<p class="search-count">';
  body += String(data.total);
  body += ' ';
  body += t('plugins');
  body += '</p>';

  if (data.plugins.length === 0) {
    body += '<div class="no-results"><p>';
    body += t('No plugins in this category yet.');
    body += '</p></div>';
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
      body += ' ';
      body += t('downloads');
      body += '</span>';
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
        body += '" class="page-link">';
        body += t('Previous');
        body += '</a>';
      }
      body += '<span class="page-info">';
      body += t('Page');
      body += ' ';
      body += String(data.page);
      body += ' ';
      body += t('of');
      body += ' ';
      body += String(data.totalPages);
      body += '</span>';
      if (data.page < data.totalPages) {
        body += '<a href="/categories/';
        body += data.category;
        body += '?page=';
        body += String(data.page + 1);
        body += '" class="page-link">';
        body += t('Next');
        body += '</a>';
      }
      body += '</div>';
    }
  }

  body += '</div>';

  return wrapPage(
    t(data.category) + ' ' + t('Plugins') + ' | ' + t('Hone Marketplace'),
    t('Browse') + ' ' + t(data.category) + ' ' + t('plugins for Hone IDE.'),
    'https://marketplace.hone.codes/categories/' + data.category,
    '',
    body
  );
}
