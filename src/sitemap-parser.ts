(async () => {
  try {
    const sitemapUrl = `${window.location.origin}/sitemap.xml`;
    const urls = await parseSitemap(sitemapUrl);
    // Extract site name from the current tab's URL
    const siteName = new URL(window.location.href).hostname.replace('www.', '');
    chrome.runtime.sendMessage({ type: 'SITEMAP_URLS', payload: { urls, siteName, originUrl: window.location.href } });
  } catch (error) {
    console.error('Error fetching or parsing sitemap:', error);
    chrome.runtime.sendMessage({ type: 'SITEMAP_URLS', payload: { urls: [], siteName: 'unknown', originUrl: window.location.href } });
  }
})();

async function parseSitemap(sitemapUrl: string): Promise<string[]> {
  const response = await fetch(sitemapUrl);
  const sitemapText = await response.text();
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(sitemapText, 'text/xml');

  const sitemapIndex = xmlDoc.getElementsByTagName('sitemapindex');
  if (sitemapIndex.length > 0) {
    const sitemapUrls = Array.from(xmlDoc.getElementsByTagName('loc')).map((loc) => loc.textContent || '');
    const allUrls = await Promise.all(sitemapUrls.map(url => parseSitemap(url)));
    return allUrls.flat();
  } else {
    const locs = Array.from(xmlDoc.getElementsByTagName('loc')).map((loc) => loc.textContent || '');
    return locs.filter(loc => loc);
  }
}