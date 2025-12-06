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
  imageUrl?: string;
  photos?: string[];
  media?: {
    propertyPhotoLinks?: {
      highResolutionLink?: string;
      mediumSizeLink?: string;
    };
    allPropertyPhotos?: {
      medium?: string[];
      large?: string[];
    };
    photos?: { url?: string; href?: string; link?: string; originalUrl?: string; mixedSources?: any }[];
    images?: { url?: string; href?: string; link?: string; originalUrl?: string; mixedSources?: any }[];
  };
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
      const collectUrls = (photos: any) =>
        Array.isArray(photos)
          ? photos
              .map(
                (ph: any) =>
                  ph?.url ||
                  ph?.href ||
                  ph?.link ||
                  ph?.originalUrl ||
                  ph?.mixedSources?.jpeg?.[0]?.url ||
                  ph?.mixedSources?.webp?.[0]?.url
              )
              .filter((u: any) => typeof u === "string" && u.startsWith("http"))
          : [];

      const propertyPhotoLinks = p.media?.propertyPhotoLinks || {};
      const allPropertyPhotos = p.media?.allPropertyPhotos || {};
      const mediaPhotos = [
        propertyPhotoLinks.highResolutionLink,
        propertyPhotoLinks.mediumSizeLink,
        ...(Array.isArray(allPropertyPhotos.medium) ? allPropertyPhotos.medium : []),
        ...(Array.isArray(allPropertyPhotos.large) ? allPropertyPhotos.large : []),
        ...(collectUrls(p.media?.photos || p.media?.images || [])),
      ].filter((u: any) => typeof u === "string" && u.startsWith("http"));

      const hdpPhotos = collectUrls(p.hdpView?.photos);
      const richMediaPhotos = collectUrls(p.richMedia?.photos);
      const url =
        (p.hdpView?.hdpUrl && `https://www.zillow.com${p.hdpView.hdpUrl}`) ||
        (p.zpid && `https://www.zillow.com/homedetails/${p.zpid}_zpid/`) ||
        p.detailUrl ||
        p.zillowUrl;
      const hdpImage =
        p.hdpView?.image?.uri ||
        p.hdpView?.image?.url ||
        p.hdpView?.mainImageUrl ||
        p.hdpView?.photoUrl;
      const imageUrl =
        p.imgSrc ||
        p.image ||
        p.homeImage ||
        p?.miniCardPhotos?.[0]?.url ||
        p?.primaryPhoto?.url ||
        p?.photos?.[0]?.url ||
        hdpImage ||
        mediaPhotos[0] ||
        hdpPhotos[0] ||
        richMediaPhotos[0];
      if (process.env.NODE_ENV !== "production") {
        console.info("[searchApi] mapped listing", {
          providerItemKeys: Object.keys(p || {}),
          imageUrl,
          mediaPhotosCount: mediaPhotos.length,
          hdpPhotosCount: hdpPhotos.length,
          richMediaPhotosCount: richMediaPhotos.length,
          mediaKeys: p.media ? Object.keys(p.media) : [],
          hdpViewKeys: p.hdpView ? Object.keys(p.hdpView) : [],
          richMediaKeys: p.richMedia ? Object.keys(p.richMedia) : [],
          zillowUrl: url,
          address: address.streetAddress,
        });
        if (!imageUrl && mediaPhotos.length === 0 && hdpPhotos.length === 0 && richMediaPhotos.length === 0) {
          console.info("[searchApi] no photo sources", {
            zpid: p.zpid,
            sampleMedia: Array.isArray(p.media?.photos) ? p.media.photos.slice(0, 1) : null,
            sampleHdpPhotos: Array.isArray(p.hdpView?.photos) ? p.hdpView.photos.slice(0, 1) : null,
            sampleRich: Array.isArray(p.richMedia?.photos) ? p.richMedia.photos.slice(0, 1) : null,
            mediaSnippet: p.media ? JSON.stringify(p.media).slice(0, 500) : null,
            hdpSnippet: p.hdpView ? JSON.stringify(p.hdpView).slice(0, 500) : null,
            richSnippet: p.richMedia ? JSON.stringify(p.richMedia).slice(0, 500) : null,
            propertyPhotoLinks: p.media?.propertyPhotoLinks || null,
            allPropertyPhotos: p.media?.allPropertyPhotos
              ? {
                  mediumCount: Array.isArray(p.media.allPropertyPhotos.medium)
                    ? p.media.allPropertyPhotos.medium.length
                    : 0,
                  largeCount: Array.isArray(p.media.allPropertyPhotos.large)
                    ? p.media.allPropertyPhotos.large.length
                    : 0,
                }
              : null,
          });
        }
      }
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
        imageUrl,
        photos:
          mediaPhotos.length || hdpPhotos.length || richMediaPhotos.length
            ? [...mediaPhotos, ...hdpPhotos, ...richMediaPhotos]
            : undefined,
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
        ? raw.results.map((item: any) => {
            const collectUrls = (photos: any) =>
              Array.isArray(photos)
                ? photos
                    .map(
                      (ph: any) =>
                        ph?.url ||
                        ph?.href ||
                        ph?.link ||
                        ph?.originalUrl ||
                        ph?.mixedSources?.jpeg?.[0]?.url ||
                        ph?.mixedSources?.webp?.[0]?.url
                    )
                    .filter((u: any) => typeof u === "string" && u.startsWith("http"))
                : [];
            const propertyPhotoLinks = item?.media?.propertyPhotoLinks || {};
            const allPropertyPhotos = item?.media?.allPropertyPhotos || {};
            const mediaPhotos = [
              propertyPhotoLinks.highResolutionLink,
              propertyPhotoLinks.mediumSizeLink,
              ...(Array.isArray(allPropertyPhotos.medium) ? allPropertyPhotos.medium : []),
              ...(Array.isArray(allPropertyPhotos.large) ? allPropertyPhotos.large : []),
              ...collectUrls(item?.media?.photos || item?.media?.images || []),
            ].filter((u: any) => typeof u === "string" && u.startsWith("http"));
            return {
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
              imageUrl:
                item?.imgSrc ||
                item?.image ||
                item?.homeImage ||
                item?.miniCardPhotos?.[0]?.url ||
                item?.primaryPhoto?.url ||
                item?.photos?.[0]?.url ||
                mediaPhotos[0],
              photos: mediaPhotos.length ? mediaPhotos : undefined,
            };
          })
        : [],
  },
  {
    name: "zillow56",
    host: "zillow56.p.rapidapi.com",
    buildUrl: (encoded, _page) => `https://zillow56.p.rapidapi.com/search?location=${encoded}`,
    mapResults: (raw) =>
      Array.isArray(raw?.results)
        ? raw.results.map((item: any) => {
            const collectUrls = (photos: any) =>
              Array.isArray(photos)
                ? photos
                    .map(
                      (ph: any) =>
                        ph?.url ||
                        ph?.href ||
                        ph?.link ||
                        ph?.originalUrl ||
                        ph?.mixedSources?.jpeg?.[0]?.url ||
                        ph?.mixedSources?.webp?.[0]?.url
                    )
                    .filter((u: any) => typeof u === "string" && u.startsWith("http"))
                : [];
            const propertyPhotoLinks = item?.media?.propertyPhotoLinks || {};
            const allPropertyPhotos = item?.media?.allPropertyPhotos || {};
            const mediaPhotos = [
              propertyPhotoLinks.highResolutionLink,
              propertyPhotoLinks.mediumSizeLink,
              ...(Array.isArray(allPropertyPhotos.medium) ? allPropertyPhotos.medium : []),
              ...(Array.isArray(allPropertyPhotos.large) ? allPropertyPhotos.large : []),
              ...collectUrls(item?.media?.photos || item?.media?.images || []),
            ].filter((u: any) => typeof u === "string" && u.startsWith("http"));
            return {
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
              imageUrl:
                item?.imgSrc ||
                item?.image ||
                item?.homeImage ||
                item?.miniCardPhotos?.[0]?.url ||
                item?.primaryPhoto?.url ||
                item?.photos?.[0]?.url ||
                mediaPhotos[0],
              photos: mediaPhotos.length ? mediaPhotos : undefined,
            };
          })
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
