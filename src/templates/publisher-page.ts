/**
 * Publisher profile page template — sync function for testing/pre-rendering.
 */

import { t } from 'perry/i18n';
import { wrapPage, escapeAttr } from './layout';

export interface PublisherPageData {
  username: string;
  displayName: string;
  bio: string;
  website: string;
  avatarUrl: string;
  verified: boolean;
  plugins: { name: string; displayName: string; description: string; downloads: number; ratingValue: number; ratingCount: number; iconUrl: string }[];
}

function stars(rating: number): string {
  let s = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) s += '&#9733;';
  for (let i = full; i < 5; i++) s += '&#9734;';
  return s;
}

export function renderPublisherPage(data: PublisherPageData): string {
  let body = '';
  body += '<div class="container">';

  // Header
  body += '<div class="publisher-header">';
  if (data.avatarUrl.length > 0) {
    body += '<img src="';
    body += data.avatarUrl;
    body += '" alt="" class="publisher-avatar" width="80" height="80">';
  }
  body += '<div class="publisher-info">';
  body += '<h1>';
  body += escapeAttr(data.displayName.length > 0 ? data.displayName : data.username);
  if (data.verified) {
    body += ' <span class="verified-badge" title="';
    body += t('Verified Publisher');
    body += '">&#10003;</span>';
  }
  body += '</h1>';
  if (data.bio.length > 0) {
    body += '<p class="publisher-bio">';
    body += escapeAttr(data.bio);
    body += '</p>';
  }
  if (data.website.length > 0) {
    body += '<a href="';
    body += data.website;
    body += '" rel="noopener" class="publisher-website">';
    body += escapeAttr(data.website);
    body += '</a>';
  }
  body += '</div></div>';

  // Plugin list
  body += '<h2>';
  body += String(data.plugins.length);
  body += ' ';
  body += t('Plugins');
  body += '</h2>';

  if (data.plugins.length > 0) {
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
  }

  body += '</div>';

  return wrapPage(
    data.displayName + ' | ' + t('Hone Marketplace'),
    t('Plugins by') + ' ' + data.displayName + ' ' + t('on Hone Marketplace.'),
    'https://marketplace.hone.codes/publishers/' + data.username,
    '',
    body
  );
}
