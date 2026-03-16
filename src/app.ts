/**
 * Hone Marketplace — Perry-compiled native binary.
 *
 * Perry async constraints (all workarounds applied):
 * - NO function calls that return strings in async context (NaN-boxed pointer issue)
 * - NO decodeURIComponent()
 * - NO new Date() constructor
 * - NO request.header()
 * - All param extraction inlined directly in handlers
 * - HTML built inline with += in async handlers
 * - Auth via ?token= query param (not Authorization header)
 */

import Fastify from 'fastify';
import mysql2 from 'mysql2/promise';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

let dbHost = 'webserver.skelpo.net';
let dbUser = 'hone';
let dbPass = '';
let dbName = 'hone_marketplace';
let httpPort = 8446;
let staticDir = './static';
let dataDir = './data';

try {
  const conf = readFileSync('./marketplace.conf', 'utf-8');
  const lines = conf.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.length < 3) continue;
    if (line.charCodeAt(0) === 35) continue; // skip # comments
    let eqIdx = -1;
    for (let j = 0; j < line.length; j++) {
      if (line.charCodeAt(j) === 61) { eqIdx = j; break; }
    }
    if (eqIdx < 1) continue;
    const key = line.slice(0, eqIdx);
    const val = line.slice(eqIdx + 1);
    if (key === 'DB_HOST') dbHost = val;
    if (key === 'DB_USER') dbUser = val;
    if (key === 'DB_PASS') dbPass = val;
    if (key === 'DB_NAME') dbName = val;
    if (key === 'PORT') httpPort = Number(val);
    if (key === 'STATIC_DIR') staticDir = val;
    if (key === 'DATA_DIR') dataDir = val;
  }
} catch (e: any) { /* no config file — use defaults */ }

// Ensure data directories exist
try { execSync('mkdir -p ' + dataDir + '/pages'); } catch (e: any) { /* ignore */ }

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

const pool = mysql2.createPool({
  host: dbHost,
  user: dbUser,
  password: dbPass,
  database: dbName,
  waitForConnections: true,
  connectionLimit: 10,
});

// ---------------------------------------------------------------------------
// Common HTML fragments (sync, module-level)
// ---------------------------------------------------------------------------

let HEAD_OPEN = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
HEAD_OPEN += '<meta name="viewport" content="width=device-width,initial-scale=1">';

const CSS_LINK = '<link rel="stylesheet" href="/static/style.css">';

let NAV = '<nav class="navbar"><div class="nav-inner">';
NAV += '<a href="/" class="nav-brand"><svg width="20" height="24" viewBox="0 0 48 56"><defs><linearGradient id="mg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#00D4AA"/><stop offset="60%" stop-color="#00B4D8"/><stop offset="100%" stop-color="#0077B6"/></linearGradient></defs><polygon points="24,0 0,28 24,56" fill="#0077B6" opacity="0.65"/><polygon points="24,0 48,28 24,56" fill="url(#mg)"/><line x1="24" y1="0" x2="24" y2="56" stroke="#00FFD0" stroke-width="1.5" opacity="0.9"/><circle cx="24" cy="0" r="2.5" fill="#00FFD0" opacity="0.85"/></svg> Hone Marketplace</a>';
NAV += '<div class="nav-links">';
NAV += '<a href="/search">Browse</a>';
NAV += '<a href="/categories/Languages">Categories</a>';
NAV += '<a href="https://hone.dev" class="btn-cta">Get Hone</a>';
NAV += '</div>';
NAV += '<button class="nav-toggle" aria-label="Menu" onclick="document.querySelector(\'.nav-links\').classList.toggle(\'open\')">&#9776;</button>';
NAV += '</div></nav>';

let FOOTER = '<footer class="site-footer"><div class="footer-inner">';
FOOTER += '<div class="footer-grid">';
FOOTER += '<div class="footer-col"><h4>Hone IDE</h4><ul><li><a href="https://hone.dev">Download</a></li><li><a href="https://hone.dev/docs">Documentation</a></li><li><a href="https://github.com/nicholasgasior/hone">Source Code</a></li></ul></div>';
FOOTER += '<div class="footer-col"><h4>Marketplace</h4><ul><li><a href="/search">Browse Plugins</a></li><li><a href="/categories/Languages">Categories</a></li><li><a href="/api/v1/stats">API</a></li></ul></div>';
FOOTER += '<div class="footer-col"><h4>Community</h4><ul><li><a href="https://discord.gg/hone">Discord</a></li><li><a href="https://twitter.com/honedev">Twitter</a></li></ul></div>';
FOOTER += '</div>';
FOOTER += '<div class="footer-copy"><p>&#169; 2026 Hone. All rights reserved.</p></div>';
FOOTER += '</div></footer>';

// ---------------------------------------------------------------------------
// Helpers — all return void or numbers (Perry safe)
// ---------------------------------------------------------------------------

let _extracted = '';

function extractParam(url: string, paramName: string): void {
  _extracted = '';
  const idx = url.indexOf(paramName);
  if (idx < 0) return;
  const start = idx + paramName.length;
  let end = start;
  while (end < url.length) {
    if (url.charCodeAt(end) === 38) break; // &
    end = end + 1;
  }
  _extracted = url.slice(start, end);
}

function extractParamNum(url: string, paramName: string, defaultVal: number): number {
  const idx = url.indexOf(paramName);
  if (idx < 0) return defaultVal;
  const start = idx + paramName.length;
  let end = start;
  while (end < url.length) {
    if (url.charCodeAt(end) === 38) break;
    end = end + 1;
  }
  return Number(url.slice(start, end));
}

let _escaped = '';

function escapeHtml(s: string): void {
  _escaped = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 38) _escaped += '&amp;';
    else if (c === 60) _escaped += '&lt;';
    else if (c === 62) _escaped += '&gt;';
    else if (c === 34) _escaped += '&quot;';
    else if (c === 39) _escaped += '&#39;';
    else _escaped += s.charAt(i);
  }
}

let _stars = '';

function setStars(rating: number): void {
  _stars = '';
  const full = Math.floor(rating);
  for (let i = 0; i < full; i++) _stars += '&#9733;';
  for (let i = full; i < 5; i++) _stars += '&#9734;';
}

let _tierLabel = '';

function setTierLabel(tier: number): void {
  if (tier === 1) _tierLabel = 'UI Only';
  else if (tier === 2) _tierLabel = 'Standard';
  else if (tier === 3) _tierLabel = 'High Privilege';
  else _tierLabel = 'Unknown';
}

// Format number with commas (void, writes _formatted)
let _formatted = '';

function formatNum(n: number): void {
  _formatted = String(n);
  if (n < 1000) return;
  const s = String(n);
  _formatted = '';
  let cnt = 0;
  for (let i = s.length - 1; i >= 0; i--) {
    if (cnt > 0 && cnt % 3 === 0) _formatted = ',' + _formatted;
    _formatted = s.charAt(i) + _formatted;
    cnt = cnt + 1;
  }
}

// Extract path segment from URL (void, writes _extracted)
function extractPathSegment(url: string, prefix: string): void {
  _extracted = '';
  if (url.length <= prefix.length) return;
  const start = prefix.length;
  let end = start;
  while (end < url.length) {
    const c = url.charCodeAt(end);
    if (c === 63 || c === 47) break; // ? or /
    end = end + 1;
  }
  _extracted = url.slice(start, end);
}

// Extract sub-path after segment (void, writes _extracted)
let _subPath = '';

function extractSubPath(url: string, prefix: string): void {
  _subPath = '';
  if (url.length <= prefix.length) return;
  const start = prefix.length;
  // Skip the name segment
  let nameEnd = start;
  while (nameEnd < url.length) {
    const c = url.charCodeAt(nameEnd);
    if (c === 63 || c === 47) break;
    nameEnd = nameEnd + 1;
  }
  // Check if there's a sub-path
  if (nameEnd < url.length && url.charCodeAt(nameEnd) === 47) {
    let subEnd = nameEnd + 1;
    while (subEnd < url.length) {
      if (url.charCodeAt(subEnd) === 63) break;
      subEnd = subEnd + 1;
    }
    _subPath = url.slice(nameEnd + 1, subEnd);
  }
}

// ---------------------------------------------------------------------------
// Page buffer — module-level string variable that void functions write to.
// Perry async handlers can't build strings (NaN-boxed pointer corruption).
// Instead, void functions append to this buffer, then handler sends it.
// ---------------------------------------------------------------------------

let _page = '';

function pageReset(): void { _page = ''; }
function pageAdd(s: string): void { _page += s; }

// ---------------------------------------------------------------------------
// Page builders — module-level void functions that write to _page buffer.
// Called from async handlers after DB queries. Only take number params
// (numbers survive async; strings don't).
// ---------------------------------------------------------------------------

function buildHomePage(pluginCount: number, dlCount: number, pubCount: number): void {
  _page = HEAD_OPEN;
  _page += '<title>Hone Marketplace — Plugins for Hone IDE</title>';
  _page += '<meta name="description" content="Browse and install plugins for Hone IDE. Formatters, linters, themes, language support, AI tools, and more.">';
  _page += '<meta property="og:title" content="Hone Marketplace">';
  _page += '<meta property="og:description" content="Discover plugins that supercharge your development workflow">';
  _page += '<meta property="og:url" content="https://marketplace.hone.codes/">';
  _page += '<meta property="og:type" content="website">';
  _page += '<link rel="canonical" href="https://marketplace.hone.codes/">';
  _page += CSS_LINK;
  _page += '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Hone Marketplace","url":"https://marketplace.hone.codes/","potentialAction":{"@type":"SearchAction","target":"https://marketplace.hone.codes/search?q={search_term_string}","query-input":"required name=search_term_string"}}</script>';
  _page += '</head><body>';
  _page += NAV;
  _page += '<section class="hero"><div class="hero-inner">';
  _page += '<h1>Hone Marketplace</h1>';
  _page += '<p class="hero-sub">Discover plugins that supercharge your development workflow</p>';
  _page += '<form class="hero-search" action="/search" method="get">';
  _page += '<input type="text" name="q" placeholder="Search plugins..." autocomplete="off" aria-label="Search plugins">';
  _page += '<button type="submit">Search</button>';
  _page += '</form>';
  _page += '<div class="hero-stats">';
  formatNum(pluginCount);
  _page += '<span><strong>';
  _page += _formatted;
  _page += '</strong> plugins</span>';
  formatNum(dlCount);
  _page += '<span><strong>';
  _page += _formatted;
  _page += '</strong> downloads</span>';
  formatNum(pubCount);
  _page += '<span><strong>';
  _page += _formatted;
  _page += '</strong> publishers</span>';
  _page += '</div>';
  _page += '</div></section>';
  _page += '<section class="section"><div class="section-inner">';
  _page += '<h2>Categories</h2><div class="category-grid">';
  _page += '<a href="/categories/Languages" class="category-card"><span class="cat-icon">&#128172;</span>Languages</a>';
  _page += '<a href="/categories/Formatters" class="category-card"><span class="cat-icon">&#9998;</span>Formatters</a>';
  _page += '<a href="/categories/Linters" class="category-card"><span class="cat-icon">&#128270;</span>Linters</a>';
  _page += '<a href="/categories/Themes" class="category-card"><span class="cat-icon">&#127912;</span>Themes</a>';
  _page += '<a href="/categories/Keymaps" class="category-card"><span class="cat-icon">&#9000;</span>Keymaps</a>';
  _page += '<a href="/categories/Snippets" class="category-card"><span class="cat-icon">&#128203;</span>Snippets</a>';
  _page += '<a href="/categories/Debuggers" class="category-card"><span class="cat-icon">&#128027;</span>Debuggers</a>';
  _page += '<a href="/categories/Testing" class="category-card"><span class="cat-icon">&#9989;</span>Testing</a>';
  _page += '<a href="/categories/Git" class="category-card"><span class="cat-icon">&#128200;</span>Git</a>';
  _page += '<a href="/categories/AI" class="category-card"><span class="cat-icon">&#129302;</span>AI</a>';
  _page += '<a href="/categories/Data" class="category-card"><span class="cat-icon">&#128202;</span>Data</a>';
  _page += '<a href="/categories/Visualization" class="category-card"><span class="cat-icon">&#128200;</span>Visualization</a>';
  _page += '<a href="/categories/Other" class="category-card"><span class="cat-icon">&#128230;</span>Other</a>';
  _page += '</div></div></section>';
  _page += '</main>';
  _page += FOOTER;
  _page += '<script src="/static/search.js"></script>';
  _page += '</body></html>';
}

// ---------------------------------------------------------------------------
// Fastify app
// ---------------------------------------------------------------------------

const app = Fastify({ logger: false });

// ===== HEALTH =====

app.get('/health', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  return '{"status":"ok","service":"hone-marketplace"}';
});

// ===== ROBOTS.TXT =====

app.get('/robots.txt', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/plain');
  let r = 'User-agent: *\n';
  r += 'Allow: /\n';
  r += 'Sitemap: https://marketplace.hone.codes/sitemap.xml\n';
  reply.send(r);
});

// ===== HOME PAGE =====

// Pre-render home page at startup (sync — all string ops work)
buildHomePage(0, 0, 0);
try { writeFileSync(dataDir + '/pages/home.html', _page); } catch (e: any) { /* ignore */ }

app.get('/', handleHome);

function handleHome(request: any, reply: any): void {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  let homePath = dataDir;
  homePath += '/pages/home.html';
  reply.send(readFileSync(homePath, 'utf-8'));
}

// ===== PLUGIN DETAIL PAGE =====

app.get('/plugins/*', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const url = String(request.url);

  // Extract plugin name from /plugins/<name>[/subpath][?query]
  extractPathSegment(url, '/plugins/');
  const pluginName = _extracted;
  if (pluginName.length === 0) {
    reply.status(404);
    return '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Plugin not found</h1></body></html>';
  }

  // Check for sub-path (versions, capabilities)
  extractSubPath(url, '/plugins/');
  const sub = _subPath;

  // Query plugin
  const [rows]: any = await pool.execute(
    'SELECT p.*, pub.username as pubUsername, pub.displayName as pubDisplayName, pub.verificationTier as pubTier FROM plugins p LEFT JOIN publishers pub ON p.publisherId = pub.id WHERE p.name = ?',
    [pluginName]
  );

  if (rows.length === 0) {
    reply.status(404);
    let h = HEAD_OPEN;
    h += '<title>Not Found | Hone Marketplace</title>';
    h += CSS_LINK;
    h += '</head><body>';
    h += NAV;
    h += '<main class="container"><h1>Plugin not found</h1><p>The plugin &quot;';
    escapeHtml(pluginName);
    h += _escaped;
    h += '&quot; does not exist.</p><a href="/" class="btn-primary">Back to Marketplace</a></main>';
    h += FOOTER;
    h += '</body></html>';
    reply.send(h);
  }

  const row = rows[0];
  const displayName = String(row.displayName);
  const description = String(row.description || '');
  const readme = String(row.readme || '');
  const license = String(row.license || '');
  const repository = String(row.repository || '');
  const iconUrl = String(row.iconUrl || '');
  const author = String(row.author || '');
  const tier = Number(row.tier);
  const downloads = Number(row.downloads);
  const ratingSum = Number(row.ratingSum);
  const ratingCount = Number(row.ratingCount);
  const featured = Number(row.featured);
  const pluginId = Number(row.id);
  const pubUsername = String(row.pubUsername || '');
  const pubDisplayName = String(row.pubDisplayName || '');
  const pubTier = String(row.pubTier || 'unverified');

  // Get latest version
  const [versions]: any = await pool.execute(
    'SELECT version, publishedAt, minHoneVersion, platforms, downloadUrl, sizeBytes, sha256, changelog FROM pluginVersions WHERE pluginId = ? ORDER BY publishedAt DESC',
    [pluginId]
  );

  // Get tags
  let tagsStr = '';
  try {
    const tagsRaw = String(row.tags || '[]');
    // Parse JSON tags inline (Perry: no JSON.parse in async)
    // Simple approach: extract strings between quotes
    let inQuote = 0;
    let tagStart = 0;
    let tagCount = 0;
    for (let ti = 0; ti < tagsRaw.length; ti++) {
      if (tagsRaw.charCodeAt(ti) === 34) { // "
        if (inQuote === 0) {
          inQuote = 1;
          tagStart = ti + 1;
        } else {
          if (tagCount > 0) tagsStr += ', ';
          tagsStr += tagsRaw.slice(tagStart, ti);
          tagCount = tagCount + 1;
          inQuote = 0;
        }
      }
    }
  } catch (e: any) { /* ignore tag parse errors */ }

  const latestVersion = versions.length > 0 ? String(versions[0].version) : '0.0.0';

  // Compute rating
  let ratingAvg = 0;
  if (ratingCount > 0) {
    ratingAvg = Math.floor((ratingSum * 10) / ratingCount) / 10;
  }

  // Build page
  let h = HEAD_OPEN;
  h += '<title>';
  escapeHtml(displayName);
  h += _escaped;
  h += ' | Hone Marketplace</title>';
  h += '<meta name="description" content="';
  escapeHtml(description);
  h += _escaped;
  h += '">';
  h += '<meta property="og:title" content="';
  escapeHtml(displayName);
  h += _escaped;
  h += '">';
  h += '<meta property="og:description" content="';
  escapeHtml(description);
  h += _escaped;
  h += '">';
  h += '<meta property="og:url" content="https://marketplace.hone.codes/plugins/';
  h += pluginName;
  h += '">';
  h += '<meta property="og:type" content="website">';
  if (iconUrl.length > 0) {
    h += '<meta property="og:image" content="';
    h += iconUrl;
    h += '">';
  }
  h += '<meta name="twitter:card" content="summary">';
  h += '<link rel="canonical" href="https://marketplace.hone.codes/plugins/';
  h += pluginName;
  h += '">';
  h += CSS_LINK;

  // JSON-LD
  h += '<script type="application/ld+json">{"@context":"https://schema.org","@type":"SoftwareApplication","name":"';
  escapeHtml(displayName);
  h += _escaped;
  h += '","applicationCategory":"DeveloperApplication","operatingSystem":"macOS, Linux, Windows","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}';
  if (author.length > 0) {
    h += ',"author":{"@type":"Person","name":"';
    escapeHtml(author);
    h += _escaped;
    h += '"}';
  }
  h += ',"softwareVersion":"';
  h += latestVersion;
  h += '","downloadUrl":"hone://install/';
  h += pluginName;
  h += '"';
  if (ratingCount > 0) {
    h += ',"aggregateRating":{"@type":"AggregateRating","ratingValue":"';
    h += String(ratingAvg);
    h += '","ratingCount":"';
    h += String(ratingCount);
    h += '"}';
  }
  h += '}</script>';

  h += '</head><body>';
  h += NAV;

  h += '<main class="container">';

  // Plugin header
  h += '<div class="plugin-header">';
  if (iconUrl.length > 0) {
    h += '<img src="';
    h += iconUrl;
    h += '" alt="" class="plugin-icon" width="96" height="96">';
  } else {
    h += '<div class="plugin-icon-default">&#9881;</div>';
  }
  h += '<div class="plugin-header-info">';
  h += '<h1>';
  escapeHtml(displayName);
  h += _escaped;
  h += '</h1>';
  h += '<p class="plugin-desc">';
  escapeHtml(description);
  h += _escaped;
  h += '</p>';
  h += '<div class="plugin-meta">';
  if (pubUsername.length > 0) {
    h += '<a href="/publishers/';
    h += pubUsername;
    h += '" class="publisher-link">';
    escapeHtml(pubDisplayName.length > 0 ? pubDisplayName : pubUsername);
    h += _escaped;
    if (pubTier === 'domain' || pubTier === 'organization') {
      h += ' <span class="verified-badge" title="Verified">&#10003;</span>';
    }
    h += '</a>';
  } else if (author.length > 0) {
    h += '<span>';
    escapeHtml(author);
    h += _escaped;
    h += '</span>';
  }
  if (ratingCount > 0) {
    setStars(ratingAvg);
    h += '<span class="stars">';
    h += _stars;
    h += ' <span class="rating-num">';
    h += String(ratingAvg);
    h += '</span> (';
    h += String(ratingCount);
    h += ')</span>';
  }
  h += '<span class="version-badge">v';
  h += latestVersion;
  h += '</span>';
  setTierLabel(tier);
  h += '<span class="tier-badge tier-';
  h += String(tier);
  h += '">';
  h += _tierLabel;
  h += '</span>';
  h += '</div></div>';
  h += '<div class="plugin-actions">';
  h += '<button class="btn-primary btn-install" onclick="copyInstall(\'';
  h += pluginName;
  h += '\')">Install</button>';
  h += '<div class="install-cmd"><code>hone plugin install ';
  h += pluginName;
  h += '</code></div>';
  h += '</div>';
  h += '</div>';

  // Tabs
  h += '<div class="plugin-tabs">';
  if (sub.length === 0) {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '" class="tab active">README</a>';
  } else {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '" class="tab">README</a>';
  }
  if (sub === 'versions') {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '/versions" class="tab active">Versions</a>';
  } else {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '/versions" class="tab">Versions</a>';
  }
  if (sub === 'capabilities') {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '/capabilities" class="tab active">Capabilities</a>';
  } else {
    h += '<a href="/plugins/';
    h += pluginName;
    h += '/capabilities" class="tab">Capabilities</a>';
  }
  h += '</div>';

  // Tab content
  h += '<div class="plugin-content">';
  h += '<div class="plugin-main">';

  if (sub === 'versions') {
    // Version history
    h += '<h2>Version History</h2>';
    if (versions.length === 0) {
      h += '<p>No versions published yet.</p>';
    } else {
      h += '<div class="version-list">';
      for (let vi = 0; vi < versions.length; vi++) {
        h += '<div class="version-entry">';
        h += '<h3>v';
        h += String(versions[vi].version);
        h += '</h3>';
        const vPlatforms = String(versions[vi].platforms || '[]');
        if (vPlatforms.length > 4) {
          h += '<span class="platforms">';
          h += vPlatforms;
          h += '</span>';
        }
        const vSize = Number(versions[vi].sizeBytes || 0);
        if (vSize > 0) {
          h += '<span class="size">';
          if (vSize > 1048576) {
            h += String(Math.floor(vSize / 1048576));
            h += ' MB';
          } else {
            h += String(Math.floor(vSize / 1024));
            h += ' KB';
          }
          h += '</span>';
        }
        const vChangelog = String(versions[vi].changelog || '');
        if (vChangelog.length > 0) {
          h += '<div class="changelog"><pre>';
          escapeHtml(vChangelog);
          h += _escaped;
          h += '</pre></div>';
        }
        h += '</div>';
      }
      h += '</div>';
    }
  } else if (sub === 'capabilities') {
    // Capabilities
    h += '<h2>Capabilities</h2>';
    setTierLabel(tier);
    h += '<div class="cap-tier"><strong>Security Tier:</strong> ';
    h += _tierLabel;
    h += '</div>';
    h += '<div class="cap-info">';
    if (tier === 1) {
      h += '<p>This plugin runs in UI-only mode. It can modify the editor appearance but cannot access the filesystem, network, or shell.</p>';
    } else if (tier === 2) {
      h += '<p>This plugin has standard permissions. It can read/write files in the workspace, access the network, and use language servers.</p>';
    } else if (tier === 3) {
      h += '<p>This plugin requires elevated permissions. It can execute shell commands, access system APIs, and modify global settings. Review carefully before installing.</p>';
    }
    h += '</div>';
    // Show capabilities from JSON
    const capRaw = String(row.capabilities || '[]');
    if (capRaw.length > 4) {
      h += '<h3>Requested Capabilities</h3><ul class="cap-list">';
      let capInQuote = 0;
      let capStart = 0;
      for (let ci = 0; ci < capRaw.length; ci++) {
        if (capRaw.charCodeAt(ci) === 34) {
          if (capInQuote === 0) {
            capInQuote = 1;
            capStart = ci + 1;
          } else {
            h += '<li><code>';
            h += capRaw.slice(capStart, ci);
            h += '</code></li>';
            capInQuote = 0;
          }
        }
      }
      h += '</ul>';
    }
  } else {
    // README (default)
    if (readme.length > 0) {
      h += '<div class="readme"><pre>';
      escapeHtml(readme);
      h += _escaped;
      h += '</pre></div>';
    } else {
      h += '<p class="no-readme">No README provided.</p>';
    }
  }

  h += '</div>';

  // Sidebar
  h += '<aside class="plugin-sidebar">';
  h += '<div class="sidebar-section"><h4>Details</h4><dl>';
  if (license.length > 0) {
    h += '<dt>License</dt><dd>';
    escapeHtml(license);
    h += _escaped;
    h += '</dd>';
  }
  if (repository.length > 0) {
    h += '<dt>Repository</dt><dd><a href="';
    h += repository;
    h += '" rel="noopener">';
    escapeHtml(repository);
    h += _escaped;
    h += '</a></dd>';
  }
  h += '<dt>Downloads</dt><dd>';
  formatNum(downloads);
  h += _formatted;
  h += '</dd>';
  h += '<dt>Version</dt><dd>';
  h += latestVersion;
  h += '</dd>';
  h += '<dt>Tier</dt><dd>';
  h += _tierLabel;
  h += '</dd>';
  h += '</dl></div>';
  if (tagsStr.length > 0) {
    h += '<div class="sidebar-section"><h4>Tags</h4><div class="tag-list">';
    // Render tags as links
    let tagBuf = '';
    for (let ti = 0; ti < tagsStr.length; ti++) {
      const tc = tagsStr.charCodeAt(ti);
      if (tc === 44) { // comma
        if (tagBuf.length > 0) {
          // trim leading space
          let trimmed = tagBuf;
          if (trimmed.charCodeAt(0) === 32) trimmed = trimmed.slice(1);
          if (trimmed.length > 0) {
            h += '<a href="/search?q=';
            h += trimmed;
            h += '" class="tag">';
            h += trimmed;
            h += '</a>';
          }
        }
        tagBuf = '';
      } else {
        tagBuf += tagsStr.charAt(ti);
      }
    }
    if (tagBuf.length > 0) {
      let trimmed = tagBuf;
      if (trimmed.charCodeAt(0) === 32) trimmed = trimmed.slice(1);
      if (trimmed.length > 0) {
        h += '<a href="/search?q=';
        h += trimmed;
        h += '" class="tag">';
        h += trimmed;
        h += '</a>';
      }
    }
    h += '</div></div>';
  }
  h += '</aside>';

  h += '</div>'; // plugin-content
  h += '</main>';
  h += FOOTER;
  h += '<script src="/static/search.js"></script>';
  h += '</body></html>';
  reply.send(h);
});

// ===== SEARCH PAGE =====

app.get('/search', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const url = String(request.url);

  extractParam(url, 'q=');
  const query = _extracted;
  const page = extractParamNum(url, 'page=', 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  extractParam(url, 'sort=');
  const sort = _extracted;

  let rows: any = [];
  let totalRows: any = [];

  if (query.length > 0) {
    [rows] = await pool.execute(
      'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier, tags FROM plugins WHERE MATCH(name, displayName, description) AGAINST(? IN NATURAL LANGUAGE MODE) ORDER BY downloads DESC LIMIT ? OFFSET ?',
      [query, pageSize, offset]
    );
    [totalRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM plugins WHERE MATCH(name, displayName, description) AGAINST(? IN NATURAL LANGUAGE MODE)',
      [query]
    );
  } else {
    let orderBy = 'downloads DESC';
    if (sort === 'updated') orderBy = 'updatedAt DESC';
    else if (sort === 'name') orderBy = 'name ASC';
    else if (sort === 'rating') orderBy = 'ratingSum DESC';
    // Perry: can't use template literals, build SQL with if/else
    if (sort === 'updated') {
      [rows] = await pool.execute(
        'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier, tags FROM plugins ORDER BY updatedAt DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else if (sort === 'name') {
      [rows] = await pool.execute(
        'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier, tags FROM plugins ORDER BY name ASC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else if (sort === 'rating') {
      [rows] = await pool.execute(
        'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier, tags FROM plugins ORDER BY ratingSum DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else {
      [rows] = await pool.execute(
        'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier, tags FROM plugins ORDER BY downloads DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    }
    [totalRows] = await pool.execute('SELECT COUNT(*) as cnt FROM plugins');
  }

  const total = Number(totalRows[0].cnt);
  const totalPages = Math.ceil(total / pageSize);

  let h = HEAD_OPEN;
  h += '<title>';
  if (query.length > 0) {
    h += 'Search: ';
    escapeHtml(query);
    h += _escaped;
    h += ' | ';
  } else {
    h += 'Browse Plugins | ';
  }
  h += 'Hone Marketplace</title>';
  h += '<meta name="description" content="Search Hone IDE plugins';
  if (query.length > 0) {
    h += ' for ';
    escapeHtml(query);
    h += _escaped;
  }
  h += '">';
  if (query.length > 0) {
    h += '<meta name="robots" content="noindex">';
  }
  h += '<link rel="canonical" href="https://marketplace.hone.codes/search">';
  h += CSS_LINK;
  h += '</head><body>';
  h += NAV;

  h += '<main class="container">';
  h += '<div class="search-header">';
  h += '<h1>';
  if (query.length > 0) {
    h += 'Results for &quot;';
    escapeHtml(query);
    h += _escaped;
    h += '&quot;';
  } else {
    h += 'Browse Plugins';
  }
  h += '</h1>';
  h += '<form class="search-form" action="/search" method="get">';
  h += '<input type="text" name="q" value="';
  escapeHtml(query);
  h += _escaped;
  h += '" placeholder="Search plugins..." autocomplete="off">';
  h += '<button type="submit">Search</button>';
  h += '</form>';
  h += '<div class="search-sort">';
  h += '<span>Sort: </span>';
  h += '<a href="/search?q=';
  h += query;
  h += '&sort=downloads"';
  if (sort.length === 0 || sort === 'downloads') h += ' class="active"';
  h += '>Downloads</a>';
  h += '<a href="/search?q=';
  h += query;
  h += '&sort=rating"';
  if (sort === 'rating') h += ' class="active"';
  h += '>Rating</a>';
  h += '<a href="/search?q=';
  h += query;
  h += '&sort=updated"';
  if (sort === 'updated') h += ' class="active"';
  h += '>Recent</a>';
  h += '<a href="/search?q=';
  h += query;
  h += '&sort=name"';
  if (sort === 'name') h += ' class="active"';
  h += '>Name</a>';
  h += '</div>';
  h += '<p class="search-count">';
  h += String(total);
  h += ' plugin';
  if (total !== 1) h += 's';
  h += ' found</p>';
  h += '</div>';

  if (rows.length === 0) {
    h += '<div class="no-results"><p>No plugins found.</p>';
    if (query.length > 0) {
      h += '<p>Try a different search term or <a href="/search">browse all plugins</a>.</p>';
    }
    h += '</div>';
  } else {
    h += '<div class="search-results">';
    for (let i = 0; i < rows.length; i++) {
      escapeHtml(String(rows[i].displayName));
      const dn = _escaped;
      escapeHtml(String(rows[i].description || ''));
      const desc = _escaped;
      const dl = Number(rows[i].downloads);
      const rc = Number(rows[i].ratingCount);
      const rs = Number(rows[i].ratingSum);

      h += '<a href="/plugins/';
      h += String(rows[i].name);
      h += '" class="search-result">';
      const sIcon = rows[i].iconUrl;
      if (sIcon !== null && String(sIcon).length > 0) {
        h += '<img src="';
        h += String(sIcon);
        h += '" alt="" class="result-icon" width="40" height="40" loading="lazy">';
      } else {
        h += '<div class="result-icon-default">&#9881;</div>';
      }
      h += '<div class="result-info"><h3>';
      h += dn;
      h += '</h3><p>';
      h += desc;
      h += '</p><div class="result-meta">';
      formatNum(dl);
      h += '<span>';
      h += _formatted;
      h += ' downloads</span>';
      if (rc > 0) {
        const avg = Math.floor((rs * 10) / rc) / 10;
        setStars(avg);
        h += '<span class="stars">';
        h += _stars;
        h += '</span>';
      }
      setTierLabel(Number(rows[i].tier));
      h += '<span class="tier-badge tier-';
      h += String(Number(rows[i].tier));
      h += '">';
      h += _tierLabel;
      h += '</span>';
      h += '</div></div></a>';
    }
    h += '</div>';

    // Pagination
    if (totalPages > 1) {
      h += '<div class="pagination">';
      if (page > 1) {
        h += '<a href="/search?q=';
        h += query;
        h += '&page=';
        h += String(page - 1);
        if (sort.length > 0) {
          h += '&sort=';
          h += sort;
        }
        h += '" class="page-link">&laquo; Previous</a>';
      }
      h += '<span class="page-info">Page ';
      h += String(page);
      h += ' of ';
      h += String(totalPages);
      h += '</span>';
      if (page < totalPages) {
        h += '<a href="/search?q=';
        h += query;
        h += '&page=';
        h += String(page + 1);
        if (sort.length > 0) {
          h += '&sort=';
          h += sort;
        }
        h += '" class="page-link">Next &raquo;</a>';
      }
      h += '</div>';
    }
  }

  h += '</main>';
  h += FOOTER;
  h += '<script src="/static/search.js"></script>';
  h += '</body></html>';
  reply.send(h);
});

// ===== CATEGORY PAGE =====

app.get('/categories/*', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const url = String(request.url);

  extractPathSegment(url, '/categories/');
  const category = _extracted;
  if (category.length === 0) {
    reply.status(404);
    return '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Category not found</h1></body></html>';
  }

  const page = extractParamNum(url, 'page=', 1);
  const pageSize = 20;
  const offset = (page - 1) * pageSize;

  // Search for plugins with this category in tags JSON
  let jsonTag = '["';
  jsonTag += category;
  jsonTag += '"]';

  const [rows]: any = await pool.execute(
    'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl, tier FROM plugins WHERE JSON_CONTAINS(tags, ?) ORDER BY downloads DESC LIMIT ? OFFSET ?',
    [jsonTag, pageSize, offset]
  );
  const [totalRows]: any = await pool.execute(
    'SELECT COUNT(*) as cnt FROM plugins WHERE JSON_CONTAINS(tags, ?)',
    [jsonTag]
  );

  const total = Number(totalRows[0].cnt);
  const totalPages = Math.ceil(total / pageSize);

  let h = HEAD_OPEN;
  h += '<title>';
  escapeHtml(category);
  h += _escaped;
  h += ' Plugins | Hone Marketplace</title>';
  h += '<meta name="description" content="Browse ';
  h += _escaped;
  h += ' plugins for Hone IDE.">';
  h += '<link rel="canonical" href="https://marketplace.hone.codes/categories/';
  h += category;
  h += '">';
  h += CSS_LINK;
  h += '</head><body>';
  h += NAV;

  h += '<main class="container">';
  h += '<h1>';
  escapeHtml(category);
  h += _escaped;
  h += ' Plugins</h1>';
  h += '<p class="search-count">';
  h += String(total);
  h += ' plugin';
  if (total !== 1) h += 's';
  h += '</p>';

  if (rows.length === 0) {
    h += '<div class="no-results"><p>No plugins in this category yet.</p>';
    h += '<a href="/search" class="btn-primary">Browse All Plugins</a></div>';
  } else {
    h += '<div class="search-results">';
    for (let i = 0; i < rows.length; i++) {
      escapeHtml(String(rows[i].displayName));
      const dn = _escaped;
      escapeHtml(String(rows[i].description || ''));
      const desc = _escaped;
      h += '<a href="/plugins/';
      h += String(rows[i].name);
      h += '" class="search-result">';
      const cIcon = rows[i].iconUrl;
      if (cIcon !== null && String(cIcon).length > 0) {
        h += '<img src="';
        h += String(cIcon);
        h += '" alt="" class="result-icon" width="40" height="40" loading="lazy">';
      } else {
        h += '<div class="result-icon-default">&#9881;</div>';
      }
      h += '<div class="result-info"><h3>';
      h += dn;
      h += '</h3><p>';
      h += desc;
      h += '</p><div class="result-meta">';
      formatNum(Number(rows[i].downloads));
      h += '<span>';
      h += _formatted;
      h += ' downloads</span>';
      const cRc = Number(rows[i].ratingCount);
      if (cRc > 0) {
        const cRs = Number(rows[i].ratingSum);
        const cAvg = Math.floor((cRs * 10) / cRc) / 10;
        setStars(cAvg);
        h += '<span class="stars">';
        h += _stars;
        h += '</span>';
      }
      h += '</div></div></a>';
    }
    h += '</div>';

    if (totalPages > 1) {
      h += '<div class="pagination">';
      if (page > 1) {
        h += '<a href="/categories/';
        h += category;
        h += '?page=';
        h += String(page - 1);
        h += '" class="page-link">&laquo; Previous</a>';
      }
      h += '<span class="page-info">Page ';
      h += String(page);
      h += ' of ';
      h += String(totalPages);
      h += '</span>';
      if (page < totalPages) {
        h += '<a href="/categories/';
        h += category;
        h += '?page=';
        h += String(page + 1);
        h += '" class="page-link">Next &raquo;</a>';
      }
      h += '</div>';
    }
  }

  h += '</main>';
  h += FOOTER;
  h += '</body></html>';
  reply.send(h);
});

// ===== PUBLISHER PAGE =====

app.get('/publishers/*', async (request: any, reply: any) => {
  reply.header('Content-Type', 'text/html; charset=utf-8');
  const url = String(request.url);

  extractPathSegment(url, '/publishers/');
  const username = _extracted;
  if (username.length === 0) {
    reply.status(404);
    return '<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Publisher not found</h1></body></html>';
  }

  const [pubRows]: any = await pool.execute(
    'SELECT * FROM publishers WHERE username = ?',
    [username]
  );

  if (pubRows.length === 0) {
    reply.status(404);
    let h = HEAD_OPEN;
    h += '<title>Publisher Not Found | Hone Marketplace</title>';
    h += CSS_LINK;
    h += '</head><body>';
    h += NAV;
    h += '<main class="container"><h1>Publisher not found</h1>';
    h += '<a href="/" class="btn-primary">Back to Marketplace</a></main>';
    h += FOOTER;
    h += '</body></html>';
    reply.send(h);
  }

  const pub = pubRows[0];
  const pubDisplay = String(pub.displayName || pub.username);
  const pubBio = String(pub.bio || '');
  const pubWebsite = String(pub.website || '');
  const pubAvatar = String(pub.avatarUrl || '');
  const pubVTier = String(pub.verificationTier || 'unverified');
  const pubId = Number(pub.id);

  const [plugins]: any = await pool.execute(
    'SELECT name, displayName, description, downloads, ratingSum, ratingCount, iconUrl FROM plugins WHERE publisherId = ? ORDER BY downloads DESC',
    [pubId]
  );

  let h = HEAD_OPEN;
  h += '<title>';
  escapeHtml(pubDisplay);
  h += _escaped;
  h += ' | Hone Marketplace</title>';
  h += '<meta name="description" content="Plugins by ';
  h += _escaped;
  h += ' on Hone Marketplace.">';
  h += '<link rel="canonical" href="https://marketplace.hone.codes/publishers/';
  h += username;
  h += '">';
  h += CSS_LINK;
  h += '</head><body>';
  h += NAV;

  h += '<main class="container">';
  h += '<div class="publisher-header">';
  if (pubAvatar.length > 0) {
    h += '<img src="';
    h += pubAvatar;
    h += '" alt="" class="publisher-avatar" width="80" height="80">';
  }
  h += '<div class="publisher-info">';
  h += '<h1>';
  escapeHtml(pubDisplay);
  h += _escaped;
  if (pubVTier === 'domain' || pubVTier === 'organization') {
    h += ' <span class="verified-badge" title="Verified Publisher">&#10003;</span>';
  }
  h += '</h1>';
  if (pubBio.length > 0) {
    h += '<p class="publisher-bio">';
    escapeHtml(pubBio);
    h += _escaped;
    h += '</p>';
  }
  if (pubWebsite.length > 0) {
    h += '<a href="';
    h += pubWebsite;
    h += '" rel="noopener" class="publisher-website">';
    escapeHtml(pubWebsite);
    h += _escaped;
    h += '</a>';
  }
  h += '</div></div>';

  h += '<h2>';
  h += String(plugins.length);
  h += ' Plugin';
  if (plugins.length !== 1) h += 's';
  h += '</h2>';

  if (plugins.length > 0) {
    h += '<div class="search-results">';
    for (let i = 0; i < plugins.length; i++) {
      escapeHtml(String(plugins[i].displayName));
      const dn = _escaped;
      escapeHtml(String(plugins[i].description || ''));
      const desc = _escaped;
      h += '<a href="/plugins/';
      h += String(plugins[i].name);
      h += '" class="search-result">';
      const pIcon = plugins[i].iconUrl;
      if (pIcon !== null && String(pIcon).length > 0) {
        h += '<img src="';
        h += String(pIcon);
        h += '" alt="" class="result-icon" width="40" height="40" loading="lazy">';
      } else {
        h += '<div class="result-icon-default">&#9881;</div>';
      }
      h += '<div class="result-info"><h3>';
      h += dn;
      h += '</h3><p>';
      h += desc;
      h += '</p><div class="result-meta">';
      formatNum(Number(plugins[i].downloads));
      h += '<span>';
      h += _formatted;
      h += ' downloads</span>';
      const pRc = Number(plugins[i].ratingCount);
      if (pRc > 0) {
        const pRs = Number(plugins[i].ratingSum);
        const pAvg = Math.floor((pRs * 10) / pRc) / 10;
        setStars(pAvg);
        h += '<span class="stars">';
        h += _stars;
        h += '</span>';
      }
      h += '</div></div></a>';
    }
    h += '</div>';
  }

  h += '</main>';
  h += FOOTER;
  h += '</body></html>';
  reply.send(h);
});

// ===== SITEMAP =====

app.get('/sitemap.xml', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/xml; charset=utf-8');

  const [plugins]: any = await pool.execute('SELECT name, updatedAt FROM plugins ORDER BY updatedAt DESC');
  const [publishers]: any = await pool.execute('SELECT username FROM publishers');

  let x = '<?xml version="1.0" encoding="UTF-8"?>';
  x += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  // Home
  x += '<url><loc>https://marketplace.hone.codes/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>';

  // Search
  x += '<url><loc>https://marketplace.hone.codes/search</loc><changefreq>daily</changefreq><priority>0.8</priority></url>';

  // Categories
  x += '<url><loc>https://marketplace.hone.codes/categories/Languages</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Formatters</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Linters</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Themes</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Keymaps</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Snippets</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Debuggers</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Testing</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Git</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/AI</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Data</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Visualization</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  x += '<url><loc>https://marketplace.hone.codes/categories/Other</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';

  // Plugins
  for (let i = 0; i < plugins.length; i++) {
    x += '<url><loc>https://marketplace.hone.codes/plugins/';
    x += String(plugins[i].name);
    x += '</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>';
  }

  // Publishers
  for (let i = 0; i < publishers.length; i++) {
    x += '<url><loc>https://marketplace.hone.codes/publishers/';
    x += String(publishers[i].username);
    x += '</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>';
  }

  x += '</urlset>';
  reply.send(x);
});

// ===== REST API =====

// GET /api/v1/plugins — search/list
app.get('/api/v1/plugins', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  const url = String(request.url);

  extractParam(url, 'query=');
  const query = _extracted;
  const page = extractParamNum(url, 'page=', 1);
  const pageSize = extractParamNum(url, 'pageSize=', 20);
  const offset = (page - 1) * pageSize;

  extractParam(url, 'sort=');
  const sort = _extracted;

  extractParam(url, 'category=');
  const category = _extracted;

  extractParam(url, 'tag=');
  const tag = _extracted;

  const tierFilter = extractParamNum(url, 'tier=', 0);
  const featuredFilter = extractParamNum(url, 'featured=', -1);

  let rows: any = [];
  let totalRows: any = [];

  if (query.length > 0) {
    [rows] = await pool.execute(
      'SELECT * FROM plugins WHERE MATCH(name, displayName, description) AGAINST(? IN NATURAL LANGUAGE MODE) ORDER BY downloads DESC LIMIT ? OFFSET ?',
      [query, pageSize, offset]
    );
    [totalRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM plugins WHERE MATCH(name, displayName, description) AGAINST(? IN NATURAL LANGUAGE MODE)',
      [query]
    );
  } else if (category.length > 0) {
    let jsonCat = '["';
    jsonCat += category;
    jsonCat += '"]';
    [rows] = await pool.execute(
      'SELECT * FROM plugins WHERE JSON_CONTAINS(tags, ?) ORDER BY downloads DESC LIMIT ? OFFSET ?',
      [jsonCat, pageSize, offset]
    );
    [totalRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM plugins WHERE JSON_CONTAINS(tags, ?)',
      [jsonCat]
    );
  } else if (tag.length > 0) {
    let jsonTag = '["';
    jsonTag += tag;
    jsonTag += '"]';
    [rows] = await pool.execute(
      'SELECT * FROM plugins WHERE JSON_CONTAINS(tags, ?) ORDER BY downloads DESC LIMIT ? OFFSET ?',
      [jsonTag, pageSize, offset]
    );
    [totalRows] = await pool.execute(
      'SELECT COUNT(*) as cnt FROM plugins WHERE JSON_CONTAINS(tags, ?)',
      [jsonTag]
    );
  } else if (featuredFilter === 1) {
    [rows] = await pool.execute(
      'SELECT * FROM plugins WHERE featured = 1 ORDER BY downloads DESC LIMIT ? OFFSET ?',
      [pageSize, offset]
    );
    [totalRows] = await pool.execute('SELECT COUNT(*) as cnt FROM plugins WHERE featured = 1');
  } else {
    if (sort === 'updated') {
      [rows] = await pool.execute(
        'SELECT * FROM plugins ORDER BY updatedAt DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else if (sort === 'name') {
      [rows] = await pool.execute(
        'SELECT * FROM plugins ORDER BY name ASC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else if (sort === 'rating') {
      [rows] = await pool.execute(
        'SELECT * FROM plugins ORDER BY ratingSum DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    } else {
      [rows] = await pool.execute(
        'SELECT * FROM plugins ORDER BY downloads DESC LIMIT ? OFFSET ?',
        [pageSize, offset]
      );
    }
    [totalRows] = await pool.execute('SELECT COUNT(*) as cnt FROM plugins');
  }

  const total = Number(totalRows[0].cnt);

  // Build JSON response inline
  let j = '{"results":[';
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) j += ',';
    j += '{"name":"';
    j += String(rows[i].name);
    j += '","displayName":"';
    escapeHtml(String(rows[i].displayName));
    j += _escaped;
    j += '","description":"';
    escapeHtml(String(rows[i].description || ''));
    j += _escaped;
    j += '","version":"';
    j += '0.0.0'; // Would need join with pluginVersions for latest
    j += '","author":"';
    escapeHtml(String(rows[i].author || ''));
    j += _escaped;
    j += '","license":"';
    j += String(rows[i].license || '');
    j += '","icon":';
    const apiIcon = rows[i].iconUrl;
    if (apiIcon !== null && String(apiIcon).length > 0) {
      j += '"';
      j += String(apiIcon);
      j += '"';
    } else {
      j += 'null';
    }
    j += ',"repository":';
    const apiRepo = rows[i].repository;
    if (apiRepo !== null && String(apiRepo).length > 0) {
      j += '"';
      j += String(apiRepo);
      j += '"';
    } else {
      j += 'null';
    }
    j += ',"downloads":';
    j += String(Number(rows[i].downloads));
    j += ',"rating":';
    const apiRc = Number(rows[i].ratingCount);
    if (apiRc > 0) {
      const apiRs = Number(rows[i].ratingSum);
      j += String(Math.floor((apiRs * 10) / apiRc) / 10);
    } else {
      j += '0';
    }
    j += ',"ratingCount":';
    j += String(apiRc);
    j += ',"tier":';
    j += String(Number(rows[i].tier));
    j += ',"tags":';
    j += String(rows[i].tags || '[]');
    j += ',"capabilities":';
    j += String(rows[i].capabilities || '[]');
    j += ',"featured":';
    j += Number(rows[i].featured) === 1 ? 'true' : 'false';
    j += ',"verified":false}';
  }
  j += '],"total":';
  j += String(total);
  j += ',"page":';
  j += String(page);
  j += ',"pageSize":';
  j += String(pageSize);
  j += '}';
  reply.send(j);
});

// GET /api/v1/plugins/* — plugin detail or sub-resources
app.get('/api/v1/plugins/*', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  const url = String(request.url);

  extractPathSegment(url, '/api/v1/plugins/');
  const pluginName = _extracted;
  if (pluginName.length === 0) {
    reply.status(400);
    return '{"error":"plugin name required"}';
  }

  extractSubPath(url, '/api/v1/plugins/');
  const sub = _subPath;

  const [rows]: any = await pool.execute('SELECT * FROM plugins WHERE name = ?', [pluginName]);
  if (rows.length === 0) {
    reply.status(404);
    return '{"error":"plugin not found"}';
  }

  const row = rows[0];
  const pluginId = Number(row.id);

  if (sub === 'versions') {
    // Version history
    const [versions]: any = await pool.execute(
      'SELECT * FROM pluginVersions WHERE pluginId = ? ORDER BY publishedAt DESC',
      [pluginId]
    );

    let j = '[';
    for (let i = 0; i < versions.length; i++) {
      if (i > 0) j += ',';
      j += '{"version":"';
      j += String(versions[i].version);
      j += '","publishedAt":"';
      j += String(Number(versions[i].publishedAt));
      j += '","minHoneVersion":"';
      j += String(versions[i].minHoneVersion || '');
      j += '","perryVersion":"';
      j += String(versions[i].perryVersion || '');
      j += '","platforms":';
      j += String(versions[i].platforms || '[]');
      j += ',"downloadUrl":"';
      j += String(versions[i].downloadUrl || '');
      j += '","size":';
      j += String(Number(versions[i].sizeBytes || 0));
      j += ',"sha256":"';
      j += String(versions[i].sha256 || '');
      j += '"}';
    }
    j += ']';
    reply.send(j);
  }

  // Full plugin detail
  const [versions]: any = await pool.execute(
    'SELECT version FROM pluginVersions WHERE pluginId = ? ORDER BY publishedAt DESC LIMIT 1',
    [pluginId]
  );

  const [pubRows]: any = await pool.execute(
    'SELECT username, displayName, email, website, verificationTier FROM publishers WHERE id = ?',
    [Number(row.publisherId || 0)]
  );

  let j = '{"name":"';
  j += String(row.name);
  j += '","displayName":"';
  escapeHtml(String(row.displayName));
  j += _escaped;
  j += '","description":"';
  escapeHtml(String(row.description || ''));
  j += _escaped;
  j += '","version":"';
  j += versions.length > 0 ? String(versions[0].version) : '0.0.0';
  j += '","author":"';
  escapeHtml(String(row.author || ''));
  j += _escaped;
  j += '","license":"';
  j += String(row.license || '');
  j += '","downloads":';
  j += String(Number(row.downloads));
  j += ',"rating":';
  const dRc = Number(row.ratingCount);
  if (dRc > 0) {
    j += String(Math.floor((Number(row.ratingSum) * 10) / dRc) / 10);
  } else {
    j += '0';
  }
  j += ',"ratingCount":';
  j += String(dRc);
  j += ',"tier":';
  j += String(Number(row.tier));
  j += ',"tags":';
  j += String(row.tags || '[]');
  j += ',"capabilities":';
  j += String(row.capabilities || '[]');
  j += ',"featured":';
  j += Number(row.featured) === 1 ? 'true' : 'false';
  j += ',"readme":"';
  escapeHtml(String(row.readme || ''));
  j += _escaped;
  j += '"';

  // Publisher
  if (pubRows.length > 0) {
    j += ',"publisher":{"name":"';
    j += String(pubRows[0].username);
    j += '","displayName":"';
    escapeHtml(String(pubRows[0].displayName || ''));
    j += _escaped;
    j += '","email":';
    const pEmail = pubRows[0].email;
    if (pEmail !== null && String(pEmail).length > 0) {
      j += '"';
      j += String(pEmail);
      j += '"';
    } else {
      j += 'null';
    }
    j += ',"url":';
    const pUrl = pubRows[0].website;
    if (pUrl !== null && String(pUrl).length > 0) {
      j += '"';
      j += String(pUrl);
      j += '"';
    } else {
      j += 'null';
    }
    j += ',"verificationTier":"';
    j += String(pubRows[0].verificationTier || 'unverified');
    j += '","verified":';
    const pTier = String(pubRows[0].verificationTier || '');
    j += (pTier === 'domain' || pTier === 'organization') ? 'true' : 'false';
    j += '}';
  }

  j += '}';
  reply.send(j);
});

// POST /api/v1/plugins — publish a plugin
app.post('/api/v1/plugins', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  const url = String(request.url);

  // Extract token for auth
  extractParam(url, 'token=');
  const token = _extracted;
  if (token.length < 5) {
    reply.status(401);
    return '{"error":"authentication required"}';
  }

  // For now, parse basic plugin info from query params
  // Full implementation would parse multipart body
  extractParam(url, 'name=');
  const name = _extracted;
  extractParam(url, 'displayName=');
  const displayName = _extracted;
  extractParam(url, 'description=');
  const description = _extracted;
  extractParam(url, 'version=');
  const version = _extracted;

  if (name.length === 0) {
    reply.status(400);
    return '{"error":"plugin name required"}';
  }

  const now = Math.floor(Date.now() / 1000);

  // Check if plugin exists
  const [existing]: any = await pool.execute('SELECT id FROM plugins WHERE name = ?', [name]);

  if (existing.length > 0) {
    // Update existing
    const pluginId = Number(existing[0].id);
    await pool.execute(
      'UPDATE plugins SET displayName = ?, description = ?, updatedAt = ? WHERE id = ?',
      [displayName.length > 0 ? displayName : name, description, now, pluginId]
    );

    if (version.length > 0) {
      await pool.execute(
        'INSERT INTO pluginVersions (pluginId, version, publishedAt) VALUES (?, ?, ?)',
        [pluginId, version, now]
      );
    }

    let r = '{"success":true,"version":"';
    r += version.length > 0 ? version : '0.0.0';
    r += '","buildId":"build-';
    r += String(now);
    r += '","message":"Plugin updated"}';
    reply.send(r);
  }

  // Create new
  const [result]: any = await pool.execute(
    'INSERT INTO plugins (name, displayName, description, publishedAt, updatedAt) VALUES (?, ?, ?, ?, ?)',
    [name, displayName.length > 0 ? displayName : name, description, now, now]
  );

  const newId = Number(result.insertId);

  if (version.length > 0) {
    await pool.execute(
      'INSERT INTO pluginVersions (pluginId, version, publishedAt) VALUES (?, ?, ?)',
      [newId, version, now]
    );
  }

  let r = '{"success":true,"version":"';
  r += version.length > 0 ? version : '0.0.0';
  r += '","buildId":"build-';
  r += String(now);
  r += '","message":"Plugin published"}';
  reply.send(r);
});

// POST /api/v1/plugins/report — report a plugin (via query params)
app.post('/api/v1/plugins/report', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  const url = String(request.url);

  extractParam(url, 'pluginName=');
  const pluginName = _extracted;
  extractParam(url, 'reason=');
  const reason = _extracted;
  extractParam(url, 'description=');
  const reportDesc = _extracted;
  extractParam(url, 'email=');
  const reportEmail = _extracted;

  if (pluginName.length === 0) {
    reply.status(400);
    return '{"error":"pluginName required"}';
  }
  if (reason.length === 0) {
    reply.status(400);
    return '{"error":"reason required"}';
  }

  const [pRows]: any = await pool.execute('SELECT id FROM plugins WHERE name = ?', [pluginName]);
  if (pRows.length === 0) {
    reply.status(404);
    return '{"error":"plugin not found"}';
  }

  const now = Math.floor(Date.now() / 1000);
  await pool.execute(
    'INSERT INTO reports (pluginId, reason, description, reporterEmail, createdAt) VALUES (?, ?, ?, ?, ?)',
    [Number(pRows[0].id), reason, reportDesc, reportEmail, now]
  );

  return '{"success":true}';
});

// POST /api/v1/updates/check — batch update check
app.post('/api/v1/updates/check', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');

  // For batch updates, client sends plugin names+versions as query params
  // Format: ?plugins=name1:v1,name2:v2,...
  const url = String(request.url);
  extractParam(url, 'plugins=');
  const pluginsParam = _extracted;

  let j = '{"updates":[';
  let updateCount = 0;

  if (pluginsParam.length > 0) {
    // Parse comma-separated name:version pairs
    let pairStart = 0;
    for (let pi = 0; pi <= pluginsParam.length; pi++) {
      if (pi === pluginsParam.length || pluginsParam.charCodeAt(pi) === 44) { // comma or end
        const pair = pluginsParam.slice(pairStart, pi);
        // Find colon separator
        let colonIdx = -1;
        for (let ci = 0; ci < pair.length; ci++) {
          if (pair.charCodeAt(ci) === 58) { colonIdx = ci; break; } // :
        }
        if (colonIdx > 0) {
          const pName = pair.slice(0, colonIdx);
          const pVer = pair.slice(colonIdx + 1);

          const [pRows]: any = await pool.execute(
            'SELECT p.id, pv.version FROM plugins p JOIN pluginVersions pv ON p.id = pv.pluginId WHERE p.name = ? ORDER BY pv.publishedAt DESC LIMIT 1',
            [pName]
          );

          if (pRows.length > 0) {
            const latestVer = String(pRows[0].version);
            if (latestVer !== pVer) {
              if (updateCount > 0) j += ',';
              j += '{"name":"';
              j += pName;
              j += '","currentVersion":"';
              j += pVer;
              j += '","latestVersion":"';
              j += latestVer;
              j += '","downloadUrl":"https://marketplace.hone.codes/api/v1/plugins/';
              j += pName;
              j += '/';
              j += latestVer;
              j += '/pkg","newCapabilities":[]}';
              updateCount = updateCount + 1;
            }
          }
        }
        pairStart = pi + 1;
      }
    }
  }

  j += ']}';
  reply.send(j);
});

// GET /api/v1/categories
app.get('/api/v1/categories', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');
  return '["Languages","Formatters","Linters","Themes","Keymaps","Snippets","Debuggers","Testing","Git","AI","Data","Visualization","Other"]';
});

// GET /api/v1/featured
app.get('/api/v1/featured', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');

  const [rows]: any = await pool.execute(
    'SELECT name, displayName, description, downloads, ratingSum, ratingCount, tier, tags, iconUrl FROM plugins WHERE featured = 1 ORDER BY downloads DESC LIMIT 10'
  );

  let j = '[';
  for (let i = 0; i < rows.length; i++) {
    if (i > 0) j += ',';
    j += '{"name":"';
    j += String(rows[i].name);
    j += '","displayName":"';
    escapeHtml(String(rows[i].displayName));
    j += _escaped;
    j += '","description":"';
    escapeHtml(String(rows[i].description || ''));
    j += _escaped;
    j += '","downloads":';
    j += String(Number(rows[i].downloads));
    j += ',"tier":';
    j += String(Number(rows[i].tier));
    j += ',"tags":';
    j += String(rows[i].tags || '[]');
    j += '}';
  }
  j += ']';
  reply.send(j);
});

// GET /api/v1/stats
app.get('/api/v1/stats', async (request: any, reply: any) => {
  reply.header('Content-Type', 'application/json');

  const [pRows]: any = await pool.execute('SELECT COUNT(*) as cnt FROM plugins');
  const [dRows]: any = await pool.execute('SELECT COALESCE(SUM(downloads), 0) as total FROM plugins');
  const [pubRows]: any = await pool.execute('SELECT COUNT(*) as cnt FROM publishers');

  let j = '{"totalPlugins":';
  j += String(Number(pRows[0].cnt));
  j += ',"totalDownloads":';
  j += String(Number(dRows[0].total));
  j += ',"totalPublishers":';
  j += String(Number(pubRows[0].cnt));
  j += ',"updatedAt":"';
  j += String(Math.floor(Date.now() / 1000));
  j += '"}';
  reply.send(j);
});

// ===== PACKAGE DOWNLOADS =====

// GET /api/v1/plugins/:name/:version/pkg?platform=darwin-arm64
// Serves compiled plugin binaries from data/packages/
app.get('/api/v1/pkg/*', async (request: any, reply: any) => {
  const url = String(request.url);

  // Extract: /api/v1/pkg/<name>/<version>
  extractPathSegment(url, '/api/v1/pkg/');
  const pkgName = _extracted;
  extractSubPath(url, '/api/v1/pkg/');
  const pkgVersion = _subPath;

  if (pkgName.length === 0 || pkgVersion.length === 0) {
    reply.status(400);
    reply.header('Content-Type', 'application/json');
    return '{"error":"format: /api/v1/pkg/:name/:version?platform=darwin-arm64"}';
  }

  extractParam(url, 'platform=');
  let platform = _extracted;
  if (platform.length === 0) platform = 'darwin-arm64';

  // Build file path: data/packages/<name>/<version>/<platform>.bin
  let filePath = dataDir;
  filePath += '/packages/';
  filePath += pkgName;
  filePath += '/';
  filePath += pkgVersion;
  filePath += '/';
  filePath += platform;
  filePath += '.bin';

  try {
    const content = readFileSync(filePath);
    reply.header('Content-Type', 'application/octet-stream');
    reply.header('Content-Disposition', 'attachment; filename="');
    // Note: Content-Disposition filename built inline (Perry string constraint)
    reply.header('Cache-Control', 'public, max-age=604800');

    // Track download
    const [pRows]: any = await pool.execute('SELECT id FROM plugins WHERE name = ?', [pkgName]);
    if (pRows.length > 0) {
      const pId = Number(pRows[0].id);
      const dlNow = Math.floor(Date.now() / 1000);
      await pool.execute(
        'INSERT INTO pluginDownloads (pluginId, version, platform, downloadedAt) VALUES (?, ?, ?, ?)',
        [pId, pkgVersion, platform, dlNow]
      );
      await pool.execute('UPDATE plugins SET downloads = downloads + 1 WHERE id = ?', [pId]);
    }

    return content;
  } catch (e: any) {
    reply.status(404);
    reply.header('Content-Type', 'application/json');
    return '{"error":"package not found for this platform"}';
  }
});

// ===== STATIC FILE SERVING =====

app.get('/static/*', async (request: any, reply: any) => {
  const url = String(request.url);

  // Extract file path after /static/
  let filePath = url.slice(8); // len('/static/') = 8
  // Remove query string if present
  let qIdx = -1;
  for (let i = 0; i < filePath.length; i++) {
    if (filePath.charCodeAt(i) === 63) { qIdx = i; break; }
  }
  if (qIdx >= 0) filePath = filePath.slice(0, qIdx);

  // Security: prevent directory traversal
  let hasDotDot = 0;
  for (let i = 0; i < filePath.length - 1; i++) {
    if (filePath.charCodeAt(i) === 46 && filePath.charCodeAt(i + 1) === 46) {
      hasDotDot = 1;
      break;
    }
  }
  if (hasDotDot === 1) {
    reply.status(403);
    return 'Forbidden';
  }

  // Determine content type from extension
  let contentType = 'application/octet-stream';
  if (filePath.indexOf('.css') >= 0) contentType = 'text/css; charset=utf-8';
  else if (filePath.indexOf('.js') >= 0) contentType = 'application/javascript; charset=utf-8';
  else if (filePath.indexOf('.svg') >= 0) contentType = 'image/svg+xml';
  else if (filePath.indexOf('.png') >= 0) contentType = 'image/png';
  else if (filePath.indexOf('.jpg') >= 0) contentType = 'image/jpeg';
  else if (filePath.indexOf('.ico') >= 0) contentType = 'image/x-icon';
  else if (filePath.indexOf('.woff2') >= 0) contentType = 'font/woff2';
  else if (filePath.indexOf('.json') >= 0) contentType = 'application/json';
  else if (filePath.indexOf('.html') >= 0) contentType = 'text/html; charset=utf-8';
  else if (filePath.indexOf('.txt') >= 0) contentType = 'text/plain; charset=utf-8';

  try {
    let fullPath = staticDir;
    fullPath += '/';
    fullPath += filePath;
    const content = readFileSync(fullPath, 'utf-8');
    reply.header('Content-Type', contentType);
    reply.header('Cache-Control', 'public, max-age=86400');
    return content;
  } catch (e: any) {
    reply.status(404);
    return 'Not found';
  }
});

// ---------------------------------------------------------------------------
// Startup
// ---------------------------------------------------------------------------

app.listen({ host: '0.0.0.0', port: httpPort }, onListen);

function onListen(err: any): void {
  if (err) {
    console.log('Marketplace server error');
  } else {
    console.log('Hone Marketplace on port ' + String(httpPort));
  }
}
