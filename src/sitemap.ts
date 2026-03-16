/**
 * XML Sitemap generator — sync function for testing.
 * The Perry binary generates sitemaps inline in the route handler.
 */

const CATEGORIES = [
  'Languages', 'Formatters', 'Linters', 'Themes', 'Keymaps', 'Snippets',
  'Debuggers', 'Testing', 'Git', 'AI', 'Data', 'Visualization', 'Other',
];

export function generateSitemap(
  pluginNames: string[],
  publisherUsernames: string[]
): string {
  let x = '<?xml version="1.0" encoding="UTF-8"?>';
  x += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">';

  // Home
  x += '<url><loc>https://marketplace.hone.codes/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>';

  // Search
  x += '<url><loc>https://marketplace.hone.codes/search</loc><changefreq>daily</changefreq><priority>0.8</priority></url>';

  // Categories
  for (let i = 0; i < CATEGORIES.length; i++) {
    x += '<url><loc>https://marketplace.hone.codes/categories/';
    x += CATEGORIES[i];
    x += '</loc><changefreq>weekly</changefreq><priority>0.7</priority></url>';
  }

  // Plugins
  for (let i = 0; i < pluginNames.length; i++) {
    x += '<url><loc>https://marketplace.hone.codes/plugins/';
    x += pluginNames[i];
    x += '</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>';
  }

  // Publishers
  for (let i = 0; i < publisherUsernames.length; i++) {
    x += '<url><loc>https://marketplace.hone.codes/publishers/';
    x += publisherUsernames[i];
    x += '</loc><changefreq>weekly</changefreq><priority>0.6</priority></url>';
  }

  x += '</urlset>';
  return x;
}
