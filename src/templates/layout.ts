/**
 * Base HTML layout — sync template functions for testing and pre-rendering.
 * These are NOT called from async route handlers (Perry constraint).
 */

export function htmlHead(title: string, description: string, canonicalUrl: string, extra: string): string {
  let h = '<!DOCTYPE html><html lang="en"><head><meta charset="utf-8">';
  h += '<meta name="viewport" content="width=device-width,initial-scale=1">';
  h += '<title>';
  h += escapeAttr(title);
  h += '</title>';
  h += '<meta name="description" content="';
  h += escapeAttr(description);
  h += '">';
  if (canonicalUrl.length > 0) {
    h += '<link rel="canonical" href="';
    h += canonicalUrl;
    h += '">';
  }
  h += '<link rel="stylesheet" href="/static/style.css">';
  if (extra.length > 0) h += extra;
  h += '</head>';
  return h;
}

export function navbar(): string {
  let h = '<nav class="navbar"><div class="nav-inner">';
  h += '<a href="/" class="nav-brand">Hone Marketplace</a>';
  h += '<div class="nav-links">';
  h += '<a href="/search">Browse</a>';
  h += '<a href="/categories/Languages">Categories</a>';
  h += '<a href="https://hone.dev" class="btn-cta">Get Hone</a>';
  h += '</div>';
  h += '</div></nav>';
  return h;
}

export function footer(): string {
  let h = '<footer class="site-footer"><div class="footer-inner">';
  h += '<div class="footer-grid">';
  h += '<div class="footer-col"><h4>Hone IDE</h4><ul>';
  h += '<li><a href="https://hone.dev">Download</a></li>';
  h += '<li><a href="https://hone.dev/docs">Documentation</a></li>';
  h += '</ul></div>';
  h += '<div class="footer-col"><h4>Marketplace</h4><ul>';
  h += '<li><a href="/search">Browse Plugins</a></li>';
  h += '<li><a href="/categories/Languages">Categories</a></li>';
  h += '</ul></div>';
  h += '<div class="footer-col"><h4>Community</h4><ul>';
  h += '<li><a href="https://discord.gg/hone">Discord</a></li>';
  h += '</ul></div>';
  h += '</div>';
  h += '<div class="footer-copy"><p>&copy; 2026 Hone. All rights reserved.</p></div>';
  h += '</div></footer>';
  return h;
}

export function wrapPage(title: string, description: string, canonicalUrl: string, headExtra: string, body: string): string {
  let h = htmlHead(title, description, canonicalUrl, headExtra);
  h += '<body>';
  h += navbar();
  h += '<main>';
  h += body;
  h += '</main>';
  h += footer();
  h += '<script src="/static/search.js"></script>';
  h += '</body></html>';
  return h;
}

export function escapeAttr(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    if (c === 38) out += '&amp;';
    else if (c === 60) out += '&lt;';
    else if (c === 62) out += '&gt;';
    else if (c === 34) out += '&quot;';
    else if (c === 39) out += '&#39;';
    else out += s.charAt(i);
  }
  return out;
}
