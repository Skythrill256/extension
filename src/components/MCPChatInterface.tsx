import { useCallback, useEffect, useRef, useState } from 'react';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { SSEClientTransport } from '@modelcontextprotocol/sdk/client/sse.js';
// Types are in the SDK; we keep lightweight local interfaces for UI state.

interface MCPChatInterfaceProps {
	url: string; // Base MCP HTTP URL e.g. http://127.0.0.1:4093/mcp/site_x
	onClose: () => void;
}

interface MCPTool {
	name: string;
	description?: string;
	title?: string;
	inputSchema?: unknown; // zod schema metadata (serialized)
}

interface ChatMessage {
	role: 'tool' | 'user' | 'system' | 'error';
	content: string;
	tool?: string;
}

// We shift from heuristic raw HTTP probing to real MCP protocol via SDK.
// Fallback heuristics retained ONLY if protocol connection fails.
const FALLBACK_TOOL_ENDPOINT = (base: string) => `${base.replace(/\/$/, '')}/tools`;
const FALLBACK_INVOKE_ENDPOINT = (base: string, tool: string) => `${base.replace(/\/$/, '')}/invoke/${tool}`;

export function MCPChatInterface({ url, onClose }: MCPChatInterfaceProps) {
	const [tools, setTools] = useState<MCPTool[] | null>(null);
	const [loadingTools, setLoadingTools] = useState(false);
	const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);
	const [inputValue, setInputValue] = useState('');
	const [running, setRunning] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [connecting, setConnecting] = useState(false);
	const [connectionMode, setConnectionMode] = useState<'mcp-streamable' | 'mcp-sse' | 'fallback-http' | 'none'>('none');
	const clientRef = useRef<Client | null>(null);
	const scrollRef = useRef<HTMLDivElement | null>(null);

	const appendMessage = (msg: ChatMessage) => {
		setMessages(prev => [...prev, msg]);
	};

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages]);

	const fetchToolsProtocol = useCallback(async () => {
		if (!clientRef.current) return false;
		try {
			setLoadingTools(true);
			const list = await clientRef.current.listTools();
			const normalized: MCPTool[] = list.tools.map(t => ({
				name: t.name,
				description: t.description,
				title: (t as any).title, // display name helper if present
				// Preserve JSON schema so we can build correct argument object.
				inputSchema: (t as any).inputSchema
			}));
			setTools(normalized);
			setLoadingTools(false);
			return true;
		} catch (err) {
			setLoadingTools(false);
			return false;
		}
	}, []);

	const fetchToolsFallback = useCallback(async () => {
		try {
			setLoadingTools(true);
			const res = await fetch(FALLBACK_TOOL_ENDPOINT(url), { headers: { 'Accept': 'application/json' } });
			if (res.ok) {
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				const data: any = await res.json().catch(() => null);
				if (data) {
					let extracted: MCPTool[] = [];
					if (Array.isArray(data.tools)) {
						extracted = data.tools.map((t: any) => ({ name: t.name || t.id, description: t.description || '' }));
					} else if (Array.isArray(data)) {
						extracted = data.map((t: any) => (typeof t === 'string' ? { name: t } : t));
					}
					setTools(extracted);
					return true;
				}
			}
			return false;
		} catch {
			return false;
		} finally {
			setLoadingTools(false);
		}
	}, [url]);

	const establishConnection = useCallback(async () => {
		if (clientRef.current) return; // already connected
		setConnecting(true);
		try {
			// Attempt Streamable HTTP first
			try {
				const streamableClient = new Client({ name: 'extension-mcp-client', version: '0.0.1' });
				const transport = new StreamableHTTPClientTransport(new URL(url));
				await streamableClient.connect(transport);
				clientRef.current = streamableClient;
				setConnectionMode('mcp-streamable');
			} catch (e) {
				// Attempt SSE fallback per SDK docs (older servers)
				try {
					const sseClient = new Client({ name: 'extension-mcp-client-sse', version: '0.0.1' });
					const sseTransport = new SSEClientTransport(new URL(url));
					await sseClient.connect(sseTransport);
					clientRef.current = sseClient;
					setConnectionMode('mcp-sse');
				} catch (e2) {
					setConnectionMode('fallback-http');
				}
			}
			// Fetch tools via protocol if possible; else fallback
			const ok = await fetchToolsProtocol();
			if (!ok && connectionMode === 'fallback-http') {
				await fetchToolsFallback();
			}
		} finally {
			setConnecting(false);
		}
	}, [url, fetchToolsProtocol, fetchToolsFallback, connectionMode]);

	useEffect(() => {
		establishConnection();
	}, [establishConnection]);

	const runTool = useCallback(async () => {
		if (!selectedTool || !inputValue.trim()) return;
		setRunning(true);
		appendMessage({ role: 'user', content: inputValue, tool: selectedTool.name });
		try {
			// Determine primary argument name from schema (common keys: question, query, input, text, message)
			let argKey = 'input';
			// Try to inspect schema (it might be a JSON schema object)
			// eslint-disable-next-line @typescript-eslint/no-explicit-any
			const schema: any = selectedTool.inputSchema;
			if (schema && typeof schema === 'object') {
				const props = schema.properties || schema.argsSchema || schema.params || {};
				const candidateKeys = ['question', 'query', 'input', 'text', 'message'];
				for (const k of candidateKeys) {
					if (props[k]) { argKey = k; break; }
				}
			}
			const argsObject: Record<string, string> = { [argKey]: inputValue };
			if (clientRef.current && (connectionMode === 'mcp-streamable' || connectionMode === 'mcp-sse')) {
				const result = await clientRef.current.callTool({ name: selectedTool.name, arguments: argsObject });
				// Extract only the first answer if structured JSON is present
				let display = '';
				if (Array.isArray(result.content)) {
					// Iterate over textual pieces to find an answer field
					for (const piece of result.content) {
						if (piece.type === 'text') {
							const raw = (piece as any).text as string;
							let answer: string | null = null;
							if (raw?.trim().startsWith('{')) {
								try {
									const parsed = JSON.parse(raw);
									if (parsed && typeof parsed === 'object' && typeof parsed.answer === 'string') {
										answer = parsed.answer;
									}
								} catch { /* ignore parse error */ }
							}
							if (!answer) {
								const match = raw.match(/"answer"\s*:\s*"([\s\S]*?)"\s*(,|})/);
								if (match) answer = match[1];
							}
							if (answer) {
								display = answer;
								break;
							}
							if (!display) display = raw; // fallback to first text block
						}
					}
				} else {
					display = JSON.stringify(result, null, 2);
				}
				appendMessage({ role: 'tool', tool: selectedTool.name, content: display });
			} else {
				// HTTP fallback
				const endpoint = FALLBACK_INVOKE_ENDPOINT(url, selectedTool.name);
				const res = await fetch(endpoint, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
					body: JSON.stringify({ tool: selectedTool.name, args: argsObject })
				});
				if (res.ok) {
					// eslint-disable-next-line @typescript-eslint/no-explicit-any
					const json: any = await res.json().catch(() => null);
					let display = 'No response';
					if (json) {
						if (json.answer) display = json.answer; else display = JSON.stringify(json, null, 2);
					}
					appendMessage({ role: 'tool', tool: selectedTool.name, content: display });
				} else {
					appendMessage({ role: 'error', content: `HTTP fallback failed (${res.status})` });
				}
			}
		} catch (err) {
			appendMessage({ role: 'error', content: `Error: ${(err as Error).message}` });
		} finally {
			setRunning(false);
			setInputValue('');
		}
	}, [selectedTool, inputValue, connectionMode, url]);

	return (
		<div className="mt-3 w-full bg-white/80 backdrop-blur rounded-xl border border-yellow-200 shadow-lg p-3 animate-slide-in">
			<div className="flex items-center justify-between mb-2">
				<div className="flex items-center gap-2">
					<span className="text-yellow-600">💬</span>
					<h3 className="text-sm font-semibold text-black">MCP Chat</h3>
				</div>
				<button onClick={onClose} className="text-xs text-gray-600 hover:text-black">Close</button>
			</div>
			<div className="text-[11px] text-gray-600 mb-2">Server: <span className="font-mono break-all">{url}</span></div>
			<div className="text-[10px] text-gray-500 mb-2">Mode: {connecting ? 'connecting…' : connectionMode}</div>
			<div className="mb-2">
				<h4 className="text-xs font-semibold text-black mb-1 flex items-center gap-2">Tools {loadingTools && <span className="text-[10px] text-gray-500 animate-pulse">loading…</span>}</h4>
				{tools && tools.length === 0 && !loadingTools && (
					<div className="text-[11px] text-gray-500">No tools discovered. Endpoint assumptions may be incorrect.</div>
				)}
				<div className="flex flex-wrap gap-1">
					{tools?.map(t => (
						<button
							key={t.name}
							onClick={() => setSelectedTool(t)}
							className={`px-2 py-0.5 text-[11px] rounded-md border ${selectedTool?.name === t.name ? 'gradient-yellow-light text-black border-yellow-600/40' : 'bg-white text-gray-700 border-gray-300 hover:border-yellow-400'} shadow-sm`}
						>
							{t.title || t.name}
						</button>
					))}
				</div>
				{selectedTool && (
					<div className="mt-2 p-2 bg-white rounded-md border border-yellow-200">
						<div className="text-[11px] text-gray-700 mb-1 font-semibold">{selectedTool.title || selectedTool.name}</div>
						<textarea
							value={inputValue}
							onChange={e => setInputValue(e.target.value)}
							// Try to show which argument is expected
							placeholder={((): string => {
								// eslint-disable-next-line @typescript-eslint/no-explicit-any
								const schema: any = selectedTool.inputSchema;
								if (schema && schema.properties) {
									const keys = Object.keys(schema.properties);
									const primary = ['question','query','input','text','message'].find(k => keys.includes(k)) || keys[0];
									return `Enter ${primary} for ${selectedTool.name}`;
								}
								return `Enter input for ${selectedTool.name}`;
							})()}
							className="w-full text-[11px] rounded border border-yellow-300 focus:outline-none focus:ring-1 focus:ring-yellow-500 p-1 font-mono bg-white h-16 resize-y"
							disabled={running}
						/>
						<div className="flex justify-end mt-1">
							<button
								onClick={runTool}
								disabled={running || !inputValue.trim()}
								className="px-3 py-1 text-[11px] font-semibold gradient-yellow-light rounded-md border border-yellow-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{running ? 'Running…' : 'Run'}
							</button>
						</div>
					</div>
				)}
			</div>
			<div ref={scrollRef} className="mt-2 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white p-2 text-[11px] space-y-2">
				{messages.length === 0 && <div className="text-gray-400">No messages yet.</div>}
				{messages.map((m, i) => (
					<div key={i} className={`rounded p-1 whitespace-pre-wrap break-words ${m.role === 'user' ? 'bg-yellow-50 border border-yellow-200' : m.role === 'tool' ? 'bg-gray-50 border border-gray-200' : m.role === 'error' ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-white border border-gray-100'}`}> 
						<div className="text-[10px] uppercase tracking-wide font-semibold mb-0.5 text-gray-500">{m.role}{m.tool ? `: ${m.tool}` : ''}</div>
						<div className="font-mono leading-relaxed text-[11px]">{m.content}</div>
					</div>
				))}
			</div>

		</div>
	);
}

