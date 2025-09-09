import { useState } from 'react';

interface CrawlResultsProps {
  results: {
    urls: string[];
    textSnippets: string[];
    totalCharacters: number;
  };
}

export function CrawlResults({ results }: CrawlResultsProps) {
  const [expandedUrls, setExpandedUrls] = useState(false);
  const [expandedSnippets, setExpandedSnippets] = useState(false);
  const toggleUrls = () => setExpandedUrls(!expandedUrls);
  const toggleSnippets = () => setExpandedSnippets(!expandedSnippets);

  return (
    <div className="card-modern rounded-xl p-3 animate-slide-in shadow-lg border border-gray-200/50">
      <div className="flex items-center space-x-2 mb-3">
  <div className="p-1 bg-yellow-100 rounded-lg shadow-sm" />
        <h2 className="font-bold text-black text-sm">Crawl Results</h2>
      </div>
      
      <div className="space-y-2">
        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-blue-50 border border-blue-200 p-2 rounded-lg shadow-sm">
            <div className="text-xs text-black font-medium mb-0.5">Total URLs</div>
            <div className="text-lg font-bold text-black">{results.urls.length}</div>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 p-2 rounded-lg shadow-sm">
            <div className="text-xs text-black font-medium mb-0.5">Characters</div>
            <div className="text-lg font-bold text-black">{results.totalCharacters.toLocaleString()}</div>
          </div>
        </div>

        {/* URLs Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <button
            className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
            onClick={toggleUrls}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full font-medium">URLs</span>
              <span className="font-semibold text-black text-xs">URLs Crawled</span>
              <span className="text-xs bg-blue-100 text-blue-800 px-1 py-0.5 rounded-full font-medium">
                {results.urls.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">{expandedUrls ? 'Hide' : 'Show'}</span>
            </div>
          </button>
          
          {expandedUrls && (
            <div className="mt-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded-lg border">
              <ul className="space-y-1">
                {results.urls.map((url, index) => (
                  <li key={index} className="flex items-start space-x-1">
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded font-mono min-w-fit">
                      {index + 1}
                    </span>
                    <span className="text-xs text-black font-mono break-all">{url}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Text Snippets Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm">
          <button
            className="flex items-center justify-between w-full text-left hover:bg-gray-50 p-1.5 rounded-lg transition-colors"
            onClick={toggleSnippets}
          >
            <div className="flex items-center space-x-2">
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded-full font-medium">TXT</span>
              <span className="font-semibold text-black text-xs">Text Snippets</span>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-1 py-0.5 rounded-full font-medium">
                {results.textSnippets.length}
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">{expandedSnippets ? 'Hide' : 'Show'}</span>
            </div>
          </button>
          
          {expandedSnippets && (
            <div className="mt-1 max-h-24 overflow-y-auto bg-gray-50 p-2 rounded-lg border">
              <ul className="space-y-1">
                {results.textSnippets.map((snippet, index) => (
                  <li key={index} className="border-l-2 border-yellow-400 pl-2">
                    <div className="text-xs text-yellow-700 font-medium mb-0.5">Snippet {index + 1}</div>
                    <div className="text-xs text-black leading-relaxed">"{snippet}"</div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
