import { Readability } from '@mozilla/readability';

export type ScrapedDoc = {
	url: string;
	title: string;
	description: string;
	content: string;
};

function normalizeText(s: string | null | undefined): string {
	if (!s) return '';
	// collapse whitespace and trim
	const t = s.replace(/\s+/g, ' ').trim();
	return t;
}

function removeBoilerplate(doc: Document) {
	const selectors = [
		'script', 'style', 'noscript', 'svg', 'canvas', 'iframe',
		'header', 'footer', 'nav', 'form', 'aside',
		'[aria-hidden="true"]', '[hidden]', '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]'
	];
	selectors.forEach((sel) => doc.querySelectorAll(sel).forEach((el) => el.remove()));
}

function aggregateText(root: Element | null): string {
	if (!root) return '';
	const parts: string[] = [];
	const keep = 'p,li,blockquote,h1,h2,h3,h4';
	root.querySelectorAll(keep).forEach((el) => {
		const raw = (el.textContent || '').replace(/\s+/g, ' ').trim();
		if (raw.length >= 30) parts.push(raw);
	});
	// fallback: if still small, take the whole root text
	if (parts.length < 3) {
		const raw = (root.textContent || '').replace(/\s+/g, ' ').trim();
		if (raw.length > 0) parts.push(raw);
	}
	// de-dup neighboring repeats
	const seen = new Set<string>();
	const uniq = parts.filter((p) => {
		const k = p.slice(0, 120);
		if (seen.has(k)) return false;
		seen.add(k);
		return true;
	});
	return uniq.join('\n\n');
}

// Fetch an HTML page and run Readability in an off-DOM Document
export async function scrapeUrl(url: string): Promise<ScrapedDoc> {
	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), 15000);
	let res: Response;
	let attempts = 0;
	for (;;) {
		attempts += 1;
		try {
			res = await fetch(url, { credentials: 'omit', signal: controller.signal });
			break;
		} catch (e) {
			if (attempts < 2) continue;
			clearTimeout(timeout);
			return { url, title: '', description: '', content: '' };
		}
	}
	clearTimeout(timeout);
		const ct = (res.headers.get('content-type') || '').toLowerCase();
		// Skip obvious binaries; otherwise attempt parse
		if (ct.startsWith('image/') || ct.includes('pdf') || ct.includes('zip') || ct.includes('octet-stream')) {
			return { url, title: '', description: '', content: '' };
		}
		const html = await res.text();

	// Create a detached DOM for parsing
		const parser = new DOMParser();
		const doc = parser.parseFromString(html, 'text/html');
		// Ensure URL context for Readability and relative links
		try {
			const base = doc.createElement('base');
			base.setAttribute('href', url);
			// insert at head start if not already present
			if (!doc.querySelector('base')) {
				doc.head?.insertBefore(base, doc.head.firstChild);
			}
		} catch {}

			// First try Readability on a cloned doc (it mutates)
			const rd = new Readability(doc.cloneNode(true) as Document).parse();
			const title = normalizeText(rd?.title || doc.title || '');
			const description = normalizeText(
				(doc.querySelector('meta[name="description"]') as HTMLMetaElement)?.content
					|| (doc.querySelector('meta[property="og:description"]') as HTMLMetaElement)?.content
					|| (doc.querySelector('meta[name="twitter:description"]') as HTMLMetaElement)?.content
					|| ''
			);
			let content = normalizeText(rd?.textContent);
			if (!content) {
				// Remove boilerplate sections and aggregate meaningful text from main/article
				removeBoilerplate(doc);
				const mainLike = doc.querySelector('main, article') || doc.body;
				content = normalizeText(aggregateText(mainLike));
			}

	return { url, title, description, content };
}

export async function scrapeMany(
	urls: string[],
	hostname: string,
	onProgress?: (currentUrl: string, done: number, total: number) => void,
	onItem?: (doc: ScrapedDoc) => void,
): Promise<ScrapedDoc[]> {
	const total = urls.length;
	const results: ScrapedDoc[] = [];
	let done = 0;

	if (total === 0) return results;

	// Limit concurrency to avoid hammering sites
		const CONCURRENCY = Math.min(8, Math.max(4, Math.ceil(total / 50))); // scale a bit with size
	const queue = urls.slice();

	async function worker() {
		while (queue.length) {
			const next = queue.shift()!;
			try {
				onProgress?.(next, done, total);
						const doc = await scrapeUrl(next);
				// basic host guard
				try { if (new URL(doc.url).hostname !== hostname) continue; } catch {}
					// Always include the URL in results; content may be empty for JS-heavy pages
					results.push(doc);
					onItem?.(doc);
			} catch {
				// ignore errors per page
			} finally {
				done += 1;
				onProgress?.(next, done, total);
			}
		}
	}

		onProgress?.('', 0, total);
		const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, () => worker());
	await Promise.all(workers);
	return results;
}

