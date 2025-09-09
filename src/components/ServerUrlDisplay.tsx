import { useState } from 'react';
import { MCPChatInterface } from './MCPChatInterface';

interface ServerUrlDisplayProps {
  url: string;
}

export function ServerUrlDisplay({ url }: ServerUrlDisplayProps) {
  const [deploying, setDeploying] = useState(false);
  const [showChat, setShowChat] = useState(false);

  const deployToHibiscus = () => {
    try {
      setDeploying(true);
      // notify background or other parts of the extension to handle deployment
      chrome.runtime.sendMessage({ type: 'DEPLOY_TO_HIBISCUS', payload: url });
    } catch (err) {
      console.error('Deploy message failed:', err);
    } finally {
      // keep the UI feedback brief
      setTimeout(() => setDeploying(false), 1200);
    }
  };

  return (
    <div className="card-modern rounded-xl p-3 animate-slide-in shadow-lg border border-yellow-200/50">
      <div className="flex items-center space-x-2 mb-3">
        <div className="p-1 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-lg shadow-sm" />
        <div className="flex items-center space-x-1">
          <h2 className="font-bold text-black text-sm">MCP Server Created!</h2>
        </div>
      </div>
      
  <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 border border-yellow-200 rounded-lg p-2 mb-2 shadow-sm">
        <div className="text-xs text-black font-semibold mb-1">Server URL:</div>
        <div className="flex items-center gap-1 w-full flex-wrap">
          <input
            type="text"
            value={url}
            readOnly
            className="flex-1 min-w-0 bg-white border border-yellow-300 rounded px-2 py-1 text-xs text-black font-mono shadow-sm focus:outline-none focus:ring-1 focus:ring-yellow-500 truncate"
          />
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={deployToHibiscus}
              disabled={deploying}
              className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold gradient-yellow-light text-black rounded-md shadow-sm border border-yellow-500/20 hover:border-yellow-500/40 transition-colors"
              title="Deploy to Hibiscus"
            >
              <span aria-hidden className="text-xs">🌺</span>
              <span>{deploying ? 'Deploying…' : 'Deploy'}</span>
            </button>
            <button
              onClick={() => setShowChat(s => !s)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md shadow-sm border transition-colors ${showChat ? 'gradient-yellow-light text-black border-yellow-500/40' : 'bg-white text-gray-700 border-yellow-400/40 hover:border-yellow-500/60'}`}
              title="Open MCP Chat"
            >
              <span aria-hidden className="text-xs">💬</span>
              <span>{showChat ? 'Close' : 'Chat'}</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg p-2 shadow-sm border border-gray-200">
        <p className="text-xs text-black text-center leading-relaxed">
          🎉 <strong>Success!</strong> Your MCP server is ready to use!
        </p>
      </div>
      {showChat && <MCPChatInterface url={url} onClose={() => setShowChat(false)} />}
    </div>
  );
}
