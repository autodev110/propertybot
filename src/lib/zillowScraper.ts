import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_5_2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export function buildZillowSearchUrl(preferredLocation: string): string {
  const encoded = encodeURIComponent(preferredLocation.trim());
  // Zillow accepts this canonical pattern for location searches.
  return `https://www.zillow.com/homes/${encoded}_rb/`;
}

export async function scrapeZillowSearch(
  url: string,
  limit = 25
): Promise<{ address: string; zillowUrl: string }[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": USER_AGENT,
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
      "Referer": "https://www.zillow.com/",
    },
  });
  if (!res.ok) {
    if (res.status === 403) {
      throw new Error("Zillow blocked the request (403). Try a different network or VPN.");
    }
    throw new Error(`Failed to load Zillow page (${res.status})`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const results: { address: string; zillowUrl: string }[] = [];

  $("[data-testid='property-card']").each((_, elem) => {
    if (results.length >= limit) return false;
    const link = $(elem).find("a").attr("href");
    const address = $(elem).find("[data-test='property-card-addr']").text().trim() ||
      $(elem).find("address").text().trim();
    if (!link || !address) return;
    const absoluteUrl = link.startsWith("http") ? link : `https://www.zillow.com${link}`;
    results.push({ address, zillowUrl: absoluteUrl });
  });

  if (results.length === 0) {
    // fallback selectors
    $("a.property-card-link").each((_, el) => {
      if (results.length >= limit) return false;
      const href = $(el).attr("href");
      const text = $(el).text().trim();
      if (href && text) {
        const absoluteUrl = href.startsWith("http") ? href : `https://www.zillow.com${href}`;
        results.push({ address: text, zillowUrl: absoluteUrl });
      }
    });
  }

  return results.slice(0, limit);
}
