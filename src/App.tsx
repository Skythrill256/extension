import { useState } from 'react';
import { CrawlStatus } from './components/CrawlStatus';
import { CrawlResults } from './components/CrawlResults';
import { ActionButton } from './components/ActionButton';
import { ServerUrlDisplay } from './components/ServerUrlDisplay';
import { discoverCrawlUrlsForPage } from './utils/sitemap';
import { scrapeMany, ScrapedDoc } from './utils/scraper';
export default function App() {
  const [crawlStatus, setCrawlStatus] = useState<{ status: 'idle' | 'crawling' | 'paused' | 'completed' | 'error'; pagesScanned: number; totalPages: number; currentUrl: string; estimatedMs?: number | null }>({
    status: 'idle',
    pagesScanned: 0,
    totalPages: 0,
    currentUrl: '',
    estimatedMs: null
  });
  const [crawlResults, setCrawlResults] = useState({
    urls: [] as string[],
    textSnippets: [] as string[],
    totalCharacters: 0
  });
  // latest state removed: CrawlStatus no longer displays a latest preview
  const [serverUrl, setServerUrl] = useState('');
  const [docs, setDocs] = useState<ScrapedDoc[]>([]);
  const [sending, setSending] = useState(false);

  function getActiveTabUrl(): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs: Array<{ url?: string }>) => {
          const url = tabs[0]?.url;
          if (url) resolve(url);
          else reject(new Error('No active tab URL'));
        });
      } catch (e) {
        reject(e as Error);
      }
    });
  }
  async function startCrawling() {
    try {
      // Discover sitemap URLs for the current active tab's origin
      const currentUrl = await getActiveTabUrl();
  setCrawlStatus({ status: 'crawling', pagesScanned: 0, totalPages: 0, currentUrl: '', estimatedMs: null });
  const crawlStart = Date.now();
      const urls = await discoverCrawlUrlsForPage(currentUrl);
      if (!urls.length) {
        setCrawlStatus({ status: 'error', pagesScanned: 0, totalPages: 0, currentUrl: '' });
        return;
      }
      setCrawlStatus(prev => ({ ...prev, totalPages: urls.length }));

      // Run client-side scraping with live progress
      const hostname = new URL(currentUrl).hostname;
      const tmpDocs: ScrapedDoc[] = [];
    const docs: ScrapedDoc[] = await scrapeMany(
        urls,
        hostname,
      (u, done, total) => {
          // estimate remaining time based on average time per completed page
          const elapsed = Date.now() - crawlStart;
          const avg = done > 0 ? (elapsed / done) : 0;
          const remaining = Math.max(0, total - done);
          const estMs = remaining > 0 ? Math.round(remaining * avg) : 0;
          setCrawlStatus({ status: 'crawling', pagesScanned: done, totalPages: total, currentUrl: u, estimatedMs: estMs });
        },
        (doc) => {
          tmpDocs.push(doc);
          // update results incrementally so counters are visible during crawl
      const totalChars = tmpDocs.reduce((s, d) => s + ((d.content || d.description || d.title || '').length), 0);
          const incSnippets = tmpDocs
            .map(d => (d.content || d.description || d.title || '').trim())
            .filter(Boolean)
            .slice(0, 50)
            .map(s => s.slice(0, 300));
          setCrawlResults({ urls: tmpDocs.map(d => d.url), textSnippets: incSnippets, totalCharacters: totalChars });
          // latest tracking removed; avoid storing per-doc preview in UI
        }
      );

  const totalCharacters = docs.reduce((s, d) => s + ((d.content || d.description || d.title || '').length), 0);
  const snippets = docs
        .map(d => (d.content || d.description || d.title || '').trim())
        .filter(Boolean)
        .slice(0, 50)
        .map(s => s.slice(0, 300));
      setCrawlResults({
        urls: docs.map(d => d.url),
        textSnippets: snippets,
        totalCharacters,
      });
  setDocs(docs);
  setCrawlStatus(s => ({ ...s, status: 'completed', currentUrl: '', estimatedMs: 0 }));
  // latest state removed
    } catch (e) {
  setCrawlStatus(s => ({ ...s, status: 'error' as const, estimatedMs: null }));
    }
  }
  // Send scraped docs to local MCP server
  const sendToServer = async () => {
    if (!docs.length) return;
    try {
  setSending(true);
      const collection_name = `site_${new URL(docs[0].url).hostname.replace(/[:.]/g, '_')}`;
      const payload = {
        data: docs.map(d => ({
          url: d.url,
          title: d.title || '',
          description: d.description || '',
          content: d.content || ''
        })),
        collection_name
      };
      const resp = await fetch('http://127.0.0.1:8000/embedding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const json = await resp.json();
          const url = json?.mcp?.http_url || '';
          if (url) setServerUrl(url);
    } catch (e) {
      // swallow and keep UI unchanged; could add console log for diagnostics
      console.error('Failed to send to MCP server', e);
    } finally {
      setSending(false);
    }
  };
  return <div className="w-full h-auto bg-slate-50 text-slate-800">
      <div className="max-w-md mx-auto p-4 bg-white rounded-lg shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-2">
        <img src="/pebbling_logo.png" alt="Pebbling Logo" className="w-6 h-6 mr-2" />
          <div className="flex flex-col">
          <h1 className="text-xl font-bold text-black">Pebbling</h1>
        </div>
          </div>
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
            v1.0.0
          </span>
        </div>
        {/* Main content */}
        <div className="space-y-4">
          <CrawlStatus status={crawlStatus} />
          {crawlStatus.status === 'completed' && <CrawlResults results={crawlResults} />}
          <div className="pt-2">
            {crawlStatus.status === 'idle' && <ActionButton label="Start Crawling" onClick={startCrawling} color="primary" />}
            {crawlStatus.status === 'completed' && !serverUrl && <ActionButton label="Send to MCP Server" loading={sending} loadingLabel="Sending…" onClick={sendToServer} color="secondary" />}
          </div>
          {serverUrl && (
            <ServerUrlDisplay
              url={serverUrl}
              siteMeta={{
                siteUrl: docs[0]?.url || '',
                title: docs[0]?.title || (docs[0]?.url ? new URL(docs[0].url).hostname : 'site'),
                description: docs[0]?.description || '',
                favicon: (() => {
                  try {
                    if (!docs[0]?.url) return '';
                    const u = new URL(docs[0].url);
                    return `${u.origin}/favicon.ico`;
                  } catch { return ''; }
                })()
              }}
            />
          )}
        </div>
      </div>
    </div>;
}