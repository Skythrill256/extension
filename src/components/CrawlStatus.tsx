import { useState, useEffect } from 'react';

// icons removed per user request; use simple indicators instead

interface CrawlStatusProps {
  status: {
    status: 'idle' | 'crawling' | 'paused' | 'completed' | 'error';
    pagesScanned: number;
    totalPages: number;
    currentUrl: string;
  estimatedMs?: number | null;
  };
  // optional latest scraped item to display a small text preview in the status panel
  latest?: {
    url: string;
    title?: string;
    description?: string;
    content?: string;
  } | null;
}

export function CrawlStatus({ status }: CrawlStatusProps) {
  const [quoteIndex, setQuoteIndex] = useState(0);
  const quotes = [
    '"Data is the new soil — cultivate it."',
    '"Crawling the web, one pebble at a time."',
    '"AI helps find patterns humans miss."',
    '"Collect. Embed. Query. Repeat."',
    '"Turn pages into insights with small steps."'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((i: number) => (i + 1) % quotes.length);
    }, 11000 + Math.floor(Math.random() * 2000)); // 11-13s randomized
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = () => {
    switch (status.status) {
      case 'idle':
        return <span className="text-yellow-600 font-semibold">●</span>;
      case 'crawling':
  return <div className="w-4 h-4 rounded-full border-2 border-gray-200 border-t-yellow-600 animate-spin" />;
      case 'paused':
  return <span className="text-orange-500 font-semibold">⏸</span>;
      case 'completed':
  return <span className="text-yellow-600 font-semibold">✓</span>;
      case 'error':
  return <span className="text-red-500 font-semibold">!</span>;
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'idle':
        return '';
      case 'crawling':
        return 'Crawling in progress...';
      case 'paused':
        return 'Crawling paused';
      case 'completed':
        return 'Crawling completed';
      case 'error':
        return 'Error during crawling';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (status.status) {
      case 'idle':
        return 'border-yellow-200 bg-yellow-50';
      case 'crawling':
  return 'border-yellow-200 bg-yellow-50';
      case 'paused':
        return 'border-orange-200 bg-orange-50';
      case 'completed':
  return 'border-yellow-200 bg-yellow-50';
      case 'error':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const pct = status.totalPages > 0 ? (status.pagesScanned / status.totalPages) * 100 : 0;

  const fmtMs = (ms?: number | null) => {
    if (ms == null) return null;
    if (ms <= 0) return '0s';
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs === 0 ? `${m}m` : `${m}m ${rs}s`;
  };

  return (
    <div className={`${getStatusColor()} rounded-xl p-3 border animate-slide-in shadow-lg`}>
      <div className="flex items-center space-x-2 mb-2">
        <div className="p-1 bg-white rounded-lg shadow-sm">
          {getStatusIcon()}
        </div>
        <div>
          <h2 className="font-semibold text-black text-sm">{getStatusText()}</h2>
          {status.status === 'crawling' && (
            <p className="text-xs text-gray-700">Discovering new pages...{status.estimatedMs ? ` • est ${fmtMs(status.estimatedMs)} remaining` : ''}</p>
          )}
          {status.status === 'idle' && (
            <p className="text-xs text-gray-700 italic">{quotes[quoteIndex]}</p>
          )}
        </div>
      </div>

      {(status.status === 'crawling' || status.status === 'paused') && (
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs text-black font-medium mb-1">
              <span>Progress</span>
              <span>{Math.round(pct)}%</span>
            </div>
            <div className="w-full bg-white rounded-full h-2 shadow-inner">
              <div 
                className="gradient-yellow-deep h-2 rounded-full transition-all duration-500 ease-out shadow-sm" 
                style={{ width: `${pct}%` }} 
              />
            </div>
          </div>
          <div className="bg-white rounded-lg p-2 shadow-sm">
            <div className="text-xs text-black font-medium mb-1">
              Current URL:
            </div>
            <div className="text-xs text-gray-700 truncate font-mono bg-gray-50 px-1.5 py-0.5 rounded">
              {status.currentUrl || 'Preparing...'}
            </div>
          </div>
          {/* latest scraped preview removed per UX request */}
          <div className="flex justify-between text-xs">
            <span className="text-black font-medium">Pages:</span>
            <span className="text-black font-bold">{status.pagesScanned} / {status.totalPages}</span>
          </div>
        </div>
      )}

      {status.status === 'completed' && (
        <div className="bg-white rounded-lg p-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-black font-medium text-xs">Total pages crawled:</span>
            <span className="text-black font-bold text-base">{status.pagesScanned}</span>
          </div>
        </div>
      )}
    </div>
  );
}
