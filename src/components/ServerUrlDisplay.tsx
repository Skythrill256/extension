import { useState } from 'react';
import { MCPChatInterface } from './MCPChatInterface';

interface ServerUrlDisplayProps {
  url: string;
  siteMeta?: {
    siteUrl: string;
    title: string;
    description: string;
    favicon: string; // computed favicon url
  };
}

export function ServerUrlDisplay({ url, siteMeta }: ServerUrlDisplayProps) {
  const [deploying, setDeploying] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [deployMessage, setDeployMessage] = useState<string | null>(null);

  const deployToHibiscus = async () => {
    if (deploying) return;
    setDeployMessage(null);
    try {
      setDeploying(true);
      const hostname = (() => {
        try { return new URL(siteMeta?.siteUrl || url).hostname.split(':')[0]; } catch { return 'site'; }
      })();
      // construct payload per user instructions
      const payload = {
        name: siteMeta?.title || hostname,
        description: siteMeta?.description || '',
        documentation: null,
        version: '1.0.0',
        image_url: siteMeta?.favicon || null,
        website_url: siteMeta?.siteUrl || null,
        contact_email: null,
        license_info: 'MIT',
        penguin_type: 'mcp_server',
        mcp_server_data: {
          server_name: hostname,
          mcp_version: '2024-11-05',
          transport_protocols: ['streamable-http'],
          package_info: {
            type: null,
            name: null,
            repository: null
          },
          installation_info: {
            npm: null,
            requirements: null,
            binary_path: null
          },
          source_type: 'community',
          hosting_config: { type: 'local' },
          auth_config: { required: false },
          capabilities: {
            resources: true,
            tools: true,
            prompts: true,
            logging: true
          },
          documentation_url: null,
          client_compatibility: {
            claude_desktop: '✅',
            cline: '✅',
            continue: '✅'
          }
        }
      } as const;
      const resp = await fetch('http://localhost:19191/penguins', {
        method: 'POST',
        headers: { 'accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const json = await resp.json().catch(() => ({}));
      if (json && json.id) {
        setDeployMessage('Deployed successfully');
      } else {
        setDeployMessage('Deployment response received');
      }
    } catch (err) {
      console.error('Deploy failed:', err);
      setDeployMessage('Deployment failed');
    } finally {
      setDeploying(false);
    }
  };

  return (
    <div className="card-modern rounded-xl p-3 animate-slide-in shadow-lg border border-yellow-200/50">
  <div className="flex items-center space-x-2 mb-3">
  <div className="p-1 bg-yellow-100 rounded-lg shadow-sm" />
        <div className="flex items-center space-x-1">
          <h2 className="font-bold text-black text-sm">MCP Server Created!</h2>
        </div>
      </div>
      
  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-2 mb-2 shadow-sm">
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
              className="flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold bg-yellow-100 text-black rounded-md shadow-sm border border-yellow-500/20 hover:bg-yellow-200 transition-colors"
              title="Deploy to Hibiscus"
            >
              <span aria-hidden className="text-xs">🌺</span>
              <span>{deploying ? 'Deploying…' : 'Deploy'}</span>
            </button>
            <button
              onClick={() => setShowChat(s => !s)}
              className={`flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-md shadow-sm border transition-colors ${showChat ? 'bg-yellow-100 text-black border-yellow-500/40' : 'bg-white text-gray-700 border-yellow-400/40 hover:border-yellow-500/60'}`}
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
      {deployMessage && (
        <div className="mt-2 text-center text-[11px] font-medium text-black bg-blue-50 border border-blue-200 rounded px-2 py-1">{deployMessage}</div>
      )}
      {showChat && <MCPChatInterface url={url} onClose={() => setShowChat(false)} />}
    </div>
  );
}
