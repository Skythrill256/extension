/**
 * Client-side sitemap discovery and parsing utilities.
 * - Tries robots.txt for Sitemap entries
 * - Falls back to /sitemap.xml
 * - Supports sitemap index and urlset
 */

export async function discoverCrawlUrlsForPage(pageUrl: string): Promise<string[]> {
	const u = new URL(pageUrl);
	const origin = u.origin;
	const sitemapCandidates = new Set<string>();

	// 1) robots.txt discovery
	try {
		const robotsUrl = `${origin}/robots.txt`;
		const res = await fetch(robotsUrl, { credentials: 'omit' });
		if (res.ok) {
			const text = await res.text();
			for (const line of text.split(/\r?\n/)) {
				const m = line.match(/^\s*Sitemap:\s*(\S+)/i);
				if (m && m[1]) sitemapCandidates.add(m[1].trim());
			}
		}
	} catch {}

	// 2) common defaults
	sitemapCandidates.add(`${origin}/sitemap.xml`);
	sitemapCandidates.add(`${origin}/sitemap_index.xml`);

		// collect urls from any working sitemap
		const discovered: string[] = [];
	for (const sm of sitemapCandidates) {
		try {
			const urls = await parseSitemap(sm);
				if (urls.length) discovered.push(...urls);
		} catch {
			// ignore
		}
	}

		// de-dup and same-host filter
		const sameHost = discovered.filter((x) => {
			try { return new URL(x).hostname === u.hostname; } catch { return false; }
		});
			const unique = Array.from(new Set(sameHost));
			if (unique.length > 0) return unique;

			// Fallback: fetch homepage and collect internal links (depth 0)
			try {
				const fallback = await discoverFromHomepage(origin, u.hostname);
				if (fallback.length) return fallback;
			} catch {}
			return unique;
}

		function isProbablyHtmlPath(path: string): boolean {
			// Exclude common binary/static extensions
			return !/(\.(png|jpe?g|gif|webp|svg|ico|css|js|pdf|zip|gz|rar|7z|mp4|mp3|wav|avi|woff2?|ttf|eot|wasm))(\?|$)/i.test(path);
		}

		async function discoverFromHomepage(origin: string, host: string): Promise<string[]> {
			const res = await fetch(origin, { credentials: 'omit' });
			if (!res.ok) return [];
			const html = await res.text();
			const parser = new DOMParser();
			const doc = parser.parseFromString(html, 'text/html');
			const urls = new Set<string>();
			doc.querySelectorAll('a[href]').forEach((a) => {
				const href = (a as HTMLAnchorElement).getAttribute('href') || '';
				if (!href || href.startsWith('#')) return;
				if (href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) return;
				try {
					const abs = new URL(href, origin);
					if (abs.hostname === host && isProbablyHtmlPath(abs.pathname)) {
						urls.add(abs.toString());
					}
				} catch {}
			});
			return Array.from(urls).slice(0, 500);
		}

export async function parseSitemap(sitemapUrl: string): Promise<string[]> {
	const res = await fetch(sitemapUrl, { credentials: 'omit' });
	if (!res.ok) throw new Error(`Failed to fetch sitemap: ${sitemapUrl}`);
	// Browsers auto-decompress gzip; text() should work even for .xml.gz
	const xml = await res.text();
	const parser = new DOMParser();
	const doc = parser.parseFromString(xml, 'text/xml');

	// Check for parsererror
	if (doc.getElementsByTagName('parsererror').length) return [];

	// sitemapindex
	if (doc.getElementsByTagName('sitemapindex').length) {
		const locs = Array.from(doc.getElementsByTagName('loc')).map((n) => n.textContent?.trim() || '').filter(Boolean);
		const chunks = await Promise.all(locs.map((u) => parseSitemap(u)));
		return chunks.flat();
	}

	// urlset
		const locs = Array.from(doc.getElementsByTagName('loc')).map((n) => n.textContent?.trim() || '').filter(Boolean);
	return locs;
}

