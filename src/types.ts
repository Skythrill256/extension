export interface ScrapedData {
  url: string;
  title: string;
  description: string;
  content: string;
}

export interface SitemapPayload {
  urls: string[];
  siteName: string;
  originUrl?: string;
}

export type Message =
  | { type: 'START_CRAWL' }
  | { type: 'PAUSE_CRAWL' }
  | { type: 'RESUME_CRAWL' }
  | { type: 'STOP_CRAWL' }
  | { type: 'SITEMAP_URLS', payload: SitemapPayload }
  | { type: 'CRAWL_PROGRESS'; payload: { processed: number; total: number } }
  | { type: 'CRAWL_COMPLETE'; payload: ScrapedData }
  | { type: 'GET_DATA' }
  | { type: 'MCP_URL'; payload: string };