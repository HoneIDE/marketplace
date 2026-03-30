/**
 * Plugin detail page template — sync function for testing/pre-rendering.
 */

import { t } from 'perry/i18n';
import { wrapPage, escapeAttr } from './layout';
import { openGraphMeta, pluginJsonLd } from './seo';

export interface PluginPageData {
  name: string;
  displayName: string;
  description: string;
  readme: string;
  version: string;
  downloads: number;
  ratingValue: number;
  ratingCount: number;
  tier: number;
  author: string;
  license: string;
  repository: string;
  tags: string[];
  capabilities: string[];
  publisherName: string;
  publisherDisplayName: string;
  publisherVerified: boolean;
  iconUrl: string;
}

function tierLabel(tier: number): string {
  if (tier === 1) return t('UI Only');
  if (tier === 2) return t('Standard');
  if (tier === 3) return t('High Privilege');
  return t('Unknown');
}

function stars(rating: number): string {
  let s = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) s += '&#9733;';
  for (let i = full; i < 5; i++) s += '&#9734;';
  return s;
}

export function renderPluginPage(data: PluginPageData): string {
  const og = openGraphMeta(
    data.displayName,
    data.description,
    'https://marketplace.hone.codes/plugins/' + data.name,
    data.iconUrl
  );
  const jsonLd = pluginJsonLd(
    data.name,
    data.displayName,
    data.author,
    data.version,
    data.ratingValue,
    data.ratingCount
  );
  const headExtra = og + jsonLd;

  let body = '';

  // Header
  body += '<div class="container">';
  body += '<div class="plugin-header">';
  if (data.iconUrl.length > 0) {
    body += '<img src="';
    body += data.iconUrl;
    body += '" alt="" class="plugin-icon" width="96" height="96">';
  } else {
    body += '<div class="plugin-icon-default">&#9881;</div>';
  }
  body += '<div class="plugin-header-info">';
  body += '<h1>';
  body += escapeAttr(data.displayName);
  body += '</h1>';
  body += '<p class="plugin-desc">';
  body += escapeAttr(data.description);
  body += '</p>';
  body += '<div class="plugin-meta">';
  if (data.publisherName.length > 0) {
    body += '<a href="/publishers/';
    body += data.publisherName;
    body += '" class="publisher-link">';
    body += escapeAttr(data.publisherDisplayName.length > 0 ? data.publisherDisplayName : data.publisherName);
    if (data.publisherVerified) {
      body += ' <span class="verified-badge">&#10003;</span>';
    }
    body += '</a>';
  }
  if (data.ratingCount > 0) {
    body += '<span class="stars">';
    body += stars(data.ratingValue);
    body += ' (';
    body += String(data.ratingCount);
    body += ')</span>';
  }
  body += '<span class="version-badge">v';
  body += data.version;
  body += '</span>';
  body += '<span class="tier-badge tier-';
  body += String(data.tier);
  body += '">';
  body += tierLabel(data.tier);
  body += '</span>';
  body += '</div></div>';
  body += '<div class="plugin-actions">';
  body += '<button class="btn-install" onclick="copyInstall(\'';
  body += data.name;
  body += '\')">';
  body += t('Install');
  body += '</button>';
  body += '<div class="install-cmd"><code>hone plugin install ';
  body += data.name;
  body += '</code></div>';
  body += '</div></div>';

  // Tabs
  body += '<div class="plugin-tabs">';
  body += '<a href="/plugins/';
  body += data.name;
  body += '" class="tab active">';
  body += t('README');
  body += '</a>';
  body += '<a href="/plugins/';
  body += data.name;
  body += '/versions" class="tab">';
  body += t('Versions');
  body += '</a>';
  body += '<a href="/plugins/';
  body += data.name;
  body += '/capabilities" class="tab">';
  body += t('Capabilities');
  body += '</a>';
  body += '</div>';

  // Content
  body += '<div class="plugin-content">';
  body += '<div class="plugin-main">';
  if (data.readme.length > 0) {
    body += '<div class="readme"><pre>';
    body += escapeAttr(data.readme);
    body += '</pre></div>';
  } else {
    body += '<p class="no-readme">';
    body += t('No README provided.');
    body += '</p>';
  }
  body += '</div>';

  // Sidebar
  body += '<aside class="plugin-sidebar">';
  body += '<div class="sidebar-section"><h4>';
  body += t('Details');
  body += '</h4><dl>';
  if (data.license.length > 0) {
    body += '<dt>';
    body += t('License');
    body += '</dt><dd>';
    body += escapeAttr(data.license);
    body += '</dd>';
  }
  if (data.repository.length > 0) {
    body += '<dt>';
    body += t('Repository');
    body += '</dt><dd><a href="';
    body += data.repository;
    body += '">';
    body += escapeAttr(data.repository);
    body += '</a></dd>';
  }
  body += '<dt>';
  body += t('Downloads');
  body += '</dt><dd>';
  body += String(data.downloads);
  body += '</dd>';
  body += '<dt>';
  body += t('Version');
  body += '</dt><dd>';
  body += data.version;
  body += '</dd>';
  body += '</dl></div>';

  if (data.tags.length > 0) {
    body += '<div class="sidebar-section"><h4>';
    body += t('Tags');
    body += '</h4><div class="tag-list">';
    for (let i = 0; i < data.tags.length; i++) {
      body += '<a href="/search?q=';
      body += data.tags[i];
      body += '" class="tag">';
      body += data.tags[i];
      body += '</a>';
    }
    body += '</div></div>';
  }

  body += '</aside>';
  body += '</div>'; // plugin-content
  body += '</div>'; // container

  return wrapPage(
    data.displayName + ' | ' + t('Hone Marketplace'),
    data.description,
    'https://marketplace.hone.codes/plugins/' + data.name,
    headExtra,
    body
  );
}
