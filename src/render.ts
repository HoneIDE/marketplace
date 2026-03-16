/**
 * Pre-render orchestrator — generates static HTML pages from plugin data.
 *
 * This module provides sync functions that call template functions to generate
 * complete HTML pages. These are designed to be called from sync context only
 * (Perry constraint: can't call string-returning functions from async handlers).
 *
 * Usage:
 * - On publish: call renderAndCachePlugin() to generate HTML and store it
 * - On startup: call renderAllPlugins() to pre-render all existing plugins
 *
 * For v1, the Perry binary builds HTML inline in route handlers.
 * These functions are used by tests and for future pre-rendering support.
 */

import { renderPluginPage, type PluginPageData } from './templates/plugin-page';
import { renderHomePage, type HomePageData } from './templates/home-page';
import { renderSearchPage, type SearchPageData, type SearchResult } from './templates/search-page';
import { renderCategoryPage, type CategoryPageData } from './templates/category-page';
import { renderPublisherPage, type PublisherPageData } from './templates/publisher-page';

// Cache of pre-rendered pages
const pageCache = new Map<string, string>();

export function renderAndCachePlugin(data: PluginPageData): string {
  const html = renderPluginPage(data);
  pageCache.set('plugin:' + data.name, html);
  return html;
}

export function renderAndCacheHome(data: HomePageData): string {
  const html = renderHomePage(data);
  pageCache.set('home', html);
  return html;
}

export function renderAndCacheSearch(data: SearchPageData): string {
  return renderSearchPage(data);
}

export function renderAndCacheCategory(data: CategoryPageData): string {
  const html = renderCategoryPage(data);
  pageCache.set('category:' + data.category, html);
  return html;
}

export function renderAndCachePublisher(data: PublisherPageData): string {
  const html = renderPublisherPage(data);
  pageCache.set('publisher:' + data.username, html);
  return html;
}

export function getCachedPage(key: string): string | undefined {
  return pageCache.get(key);
}

export function clearCache(): void {
  pageCache.clear();
}

// Re-export types for convenience
export type { PluginPageData, HomePageData, SearchPageData, SearchResult, CategoryPageData, PublisherPageData };
