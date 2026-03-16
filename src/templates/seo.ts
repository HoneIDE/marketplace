/**
 * SEO helpers — meta tags, Open Graph, JSON-LD structured data.
 * Sync functions — safe for testing and pre-rendering.
 */

import { escapeAttr } from './layout';

export function openGraphMeta(title: string, description: string, url: string, image: string): string {
  let h = '<meta property="og:title" content="';
  h += escapeAttr(title);
  h += '">';
  h += '<meta property="og:description" content="';
  h += escapeAttr(description);
  h += '">';
  h += '<meta property="og:url" content="';
  h += url;
  h += '">';
  h += '<meta property="og:type" content="website">';
  if (image.length > 0) {
    h += '<meta property="og:image" content="';
    h += image;
    h += '">';
  }
  h += '<meta name="twitter:card" content="summary">';
  return h;
}

export function pluginJsonLd(
  name: string,
  displayName: string,
  author: string,
  version: string,
  ratingValue: number,
  ratingCount: number
): string {
  let j = '<script type="application/ld+json">{';
  j += '"@context":"https://schema.org"';
  j += ',"@type":"SoftwareApplication"';
  j += ',"name":"';
  j += escapeAttr(displayName);
  j += '"';
  j += ',"applicationCategory":"DeveloperApplication"';
  j += ',"operatingSystem":"macOS, Linux, Windows"';
  j += ',"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"}';
  if (author.length > 0) {
    j += ',"author":{"@type":"Person","name":"';
    j += escapeAttr(author);
    j += '"}';
  }
  j += ',"softwareVersion":"';
  j += version;
  j += '"';
  j += ',"downloadUrl":"hone://install/';
  j += name;
  j += '"';
  if (ratingCount > 0) {
    j += ',"aggregateRating":{"@type":"AggregateRating","ratingValue":"';
    j += String(ratingValue);
    j += '","ratingCount":"';
    j += String(ratingCount);
    j += '"}';
  }
  j += '}</script>';
  return j;
}

export function siteSearchJsonLd(): string {
  return '<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Hone Marketplace","url":"https://marketplace.hone.codes/","potentialAction":{"@type":"SearchAction","target":"https://marketplace.hone.codes/search?q={search_term_string}","query-input":"required name=search_term_string"}}</script>';
}
