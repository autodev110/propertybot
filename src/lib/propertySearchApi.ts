export interface RapidApiSearchResult {
  zillowUrl?: string;
  address?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  daysOnZillow?: number;
  city?: string;
  state?: string;
  zipcode?: string;
}

type Provider = {
  name: string;
  host: string;
  keyEnv?: string;
  buildUrl: (encodedLocation: string, page: number) => string;
  mapResults: (raw: any) => RapidApiSearchResult[];
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

function joinAddress(parts: { street?: string; city?: string; state?: string; zipcode?: string }) {
  const components = [
    parts.street?.trim(),
    [parts.city?.trim(), parts.state?.trim()].filter(Boolean).join(", "),
    parts.zipcode?.trim(),
  ].filter(Boolean);
  return components.join(", ").trim();
}

function mapSearchResultsArray(raw: any): RapidApiSearchResult[] {
  const collection = raw?.searchResults ?? raw?.results ?? raw?.data ?? [];
  if (!Array.isArray(collection)) return [];
  return collection
    .map((item: any) => item?.property || item)
    .filter(Boolean)
    .map((p: any) => {
      const address = p.address || {};
      const url =
        (p.hdpView?.hdpUrl && `https://www.zillow.com${p.hdpView.hdpUrl}`) ||
        (p.zpid && `https://www.zillow.com/homedetails/${p.zpid}_zpid/`) ||
        p.detailUrl ||
        p.zillowUrl;
      return {
        zillowUrl: url,
        address: joinAddress({
          street: address.streetAddress,
          city: address.city,
          state: address.state,
          zipcode: address.zipcode,
        }),
        price: toNumber(p.price?.value ?? p.price),
        bedrooms: toNumber(p.bedrooms ?? p.beds),
        bathrooms: toNumber(p.bathrooms ?? p.baths),
        livingArea: toNumber(p.livingArea ?? p.livingAreaValue ?? p.sqft),
        daysOnZillow: toNumber(p.daysOnZillow),
        city: address.city,
        state: address.state,
        zipcode: address.zipcode,
      };
    });
}

const providers: Provider[] = [
  {
    name: "zllw-working-api-ai-prompt",
    host: "zllw-working-api.p.rapidapi.com",
    buildUrl: (encoded, page) => {
      const prompt = encodeURIComponent(`homes for sale in ${decodeURIComponent(encoded)}`);
      return `https://zllw-working-api.p.rapidapi.com/search/byaiprompt?ai_search_prompt=${prompt}&page=${page}&sortOrder=Homes_for_you`;
    },
    mapResults: (raw) => mapSearchResultsArray(raw),
  },
  {
    name: "zllw-working-api-byaddress",
    host: "zllw-working-api.p.rapidapi.com",
    buildUrl: (encoded, page) =>
      `https://zllw-working-api.p.rapidapi.com/search/byaddress?address=${encoded}&page=${page}&status=for_sale`,
    mapResults: (raw) => mapSearchResultsArray(raw),
  },
  {
    name: "zillow-working-api",
    host: "zillow-working-api.p.rapidapi.com",
    buildUrl: (encoded, _page) =>
      `https://zillow-working-api.p.rapidapi.com/search?location=${encoded}&status=for_sale`,
    mapResults: (raw) =>
      Array.isArray(raw?.results)
        ? raw.results.map((item: any) => ({
            zillowUrl: item?.detailUrl || item?.zillowUrl,
            address: item?.address,
            price: toNumber(item?.price),
            bedrooms: toNumber(item?.bedrooms),
            bathrooms: toNumber(item?.bathrooms),
            livingArea: toNumber(item?.livingArea),
            daysOnZillow: toNumber(item?.daysOnZillow),
            city: item?.city,
            state: item?.state,
            zipcode: item?.zipcode,
          }))
        : [],
  },
  {
    name: "zillow56",
    host: "zillow56.p.rapidapi.com",
    buildUrl: (encoded, _page) => `https://zillow56.p.rapidapi.com/search?location=${encoded}`,
    mapResults: (raw) =>
      Array.isArray(raw?.results)
        ? raw.results.map((item: any) => ({
            zillowUrl: item?.detailUrl || item?.url,
            address: item?.address || item?.streetAddress,
            price: toNumber(item?.price),
            bedrooms: toNumber(item?.bedrooms ?? item?.beds),
            bathrooms: toNumber(item?.bathrooms ?? item?.baths),
            livingArea: toNumber(item?.livingArea ?? item?.livingAreaValue ?? item?.sqft),
            daysOnZillow: toNumber(item?.daysOnZillow),
            city: item?.city,
            state: item?.state,
            zipcode: item?.zipcode,
          }))
        : [],
  },
];

export async function searchPropertiesByLocation(
  preferredLocation: string,
  limit = 60
): Promise<RapidApiSearchResult[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) throw new Error("RAPIDAPI_KEY missing");

  const encoded = encodeURIComponent(preferredLocation.trim());
  const errors: { provider: string; message: string }[] = [];
  const results: RapidApiSearchResult[] = [];
  const seen = new Set<string>();

  for (const provider of providers) {
    const providerKey = provider.keyEnv ? process.env[provider.keyEnv] : undefined;
    const keyToUse = providerKey || apiKey;
    if (!keyToUse) {
      errors.push({ provider: provider.name, message: "missing API key" });
      continue;
    }
    const aggregated: RapidApiSearchResult[] = [];
    let page = 1;
    const maxPages = 8; // up to ~160 results if available
    let lastError: string | null = null;

    while (aggregated.length < limit && page <= maxPages) {
      const url = provider.buildUrl(encoded, page);
      let res: Response;
      try {
        res = await fetch(url, {
          method: "GET",
          headers: {
            "x-rapidapi-key": keyToUse,
            "x-rapidapi-host": provider.host,
          },
        });
      } catch (err: any) {
        lastError = `network error: ${err?.message || "unknown error"}`;
        console.error("[propertySearchApi] fetch failed", { provider: provider.name, url, error: lastError });
        break;
      }

      if (!res.ok) {
        const text = await res.text();
        lastError = `http ${res.status} ${res.statusText}: ${text}`;
        console.error("[propertySearchApi] non-200 response", { provider: provider.name, url, msg: lastError });
        break;
      }

      let raw: any;
      try {
        raw = await res.json();
      } catch (err: any) {
        lastError = `json parse error: ${err?.message || "invalid json"}`;
        console.error("[propertySearchApi] JSON parse failed", { provider: provider.name, url, msg: lastError });
        break;
      }

      const listings = provider.mapResults(raw).filter(Boolean);
      aggregated.push(...listings);

      if (!Array.isArray(raw?.searchResults) || raw.searchResults.length === 0 || listings.length === 0) {
        break; // no more pages
      }

      page += 1;
    }

    if (aggregated.length > 0 && aggregated.length <= 1 && lastError) {
      errors.push({ provider: provider.name, message: lastError });
      continue;
    }

    if (aggregated.length > 0) {
      for (const listing of aggregated) {
        const key = (listing.address || listing.zillowUrl || JSON.stringify(listing)).toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        results.push(listing);
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
      continue;
    }

    errors.push({ provider: provider.name, message: lastError || "no results returned" });
    console.warn("[propertySearchApi] provider returned no results", {
      provider: provider.name,
      lastError,
    });
  }

  if (results.length > 0) {
    return results.slice(0, limit);
  }

  const combined = errors.map((e) => `${e.provider}: ${e.message}`).join("; ");
  throw new Error(`All search providers failed or returned no results. Attempts: ${combined || "none"}`);
}
