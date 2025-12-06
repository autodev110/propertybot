import { SanitizedPropertyDetails } from "./types";

const RAPIDAPI_HOST = "zillow-working-api.p.rapidapi.com";

function toNumber(value: unknown): number | undefined {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function parseDate(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }
  return undefined;
}

function extractPhotos(base: any): string[] | undefined {
  const urls: string[] = [];

  const collectFromOriginalPhotos = (photos: any) => {
    if (!Array.isArray(photos)) return;
    for (const photo of photos) {
      const jpeg = photo?.mixedSources?.jpeg;
      const webp = photo?.mixedSources?.webp;
      const sources: any[] = [];
      if (Array.isArray(jpeg)) sources.push(...jpeg);
      if (Array.isArray(webp)) sources.push(...webp);
      for (const src of sources) {
        const url = src?.url;
        if (typeof url === "string" && url.startsWith("http")) {
          urls.push(url);
        }
      }
      if (typeof photo?.url === "string" && photo.url.startsWith("http")) {
        urls.push(photo.url);
      }
    }
  };

  collectFromOriginalPhotos(base?.originalPhotos);
  collectFromOriginalPhotos(base?.propertyDetails?.originalPhotos);
  collectFromOriginalPhotos(base?.property?.originalPhotos);

  const propertyPhotoLinks = base?.media?.propertyPhotoLinks || base?.propertyDetails?.propertyPhotoLinks;
  if (propertyPhotoLinks) {
    const candidates = [
      propertyPhotoLinks.highResolutionLink,
      propertyPhotoLinks.mediumSizeLink,
    ];
    for (const url of candidates) {
      if (typeof url === "string" && url.startsWith("http")) urls.push(url);
    }
  }
  const allPropertyPhotos = base?.media?.allPropertyPhotos || base?.propertyDetails?.allPropertyPhotos;
  if (allPropertyPhotos) {
    const buckets = [allPropertyPhotos.medium, allPropertyPhotos.large];
    for (const bucket of buckets) {
      if (Array.isArray(bucket)) {
        for (const u of bucket) {
          if (typeof u === "string" && u.startsWith("http")) urls.push(u);
        }
      }
    }
  }

  const mediaPhotos = base?.media?.photos || base?.propertyDetails?.media?.photos;
  if (Array.isArray(mediaPhotos)) {
    for (const p of mediaPhotos) {
      const url = p?.url || p?.mixedSources?.jpeg?.[0]?.url;
      if (typeof url === "string" && url.startsWith("http")) {
        urls.push(url);
      }
    }
  }

  const hero =
    base?.imgSrc ||
    base?.image ||
    base?.imageUrl ||
    base?.primaryPhoto?.url ||
    base?.photoUrl ||
    base?.propertyDetails?.primaryPhoto?.url;
  if (hero && typeof hero === "string") {
    urls.unshift(hero);
  }

  const unique = Array.from(new Set(urls));
  if (process.env.NODE_ENV !== "production") {
    console.info("[rsapi] extracted photos", {
      total: unique.length,
      sample: unique.slice(0, 5),
      hasOriginalPhotos: Array.isArray(base?.originalPhotos),
      hasPropertyDetailsOriginal: Array.isArray(base?.propertyDetails?.originalPhotos),
      hasMedia: Array.isArray(base?.media?.photos),
      hasPrimary: !!hero,
    });
  }
  return unique.length ? unique : undefined;
}

export async function getPropertyDetailsAPI(
  address: string
): Promise<SanitizedPropertyDetails | { error: string }> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    return { error: "Missing RAPIDAPI_KEY" };
  }

  const url = `https://${RAPIDAPI_HOST}/pro/byaddress?propertyaddress=${encodeURIComponent(address)}`;
  try {
    const res = await fetch(url, {
      headers: {
        "x-rapidapi-host": RAPIDAPI_HOST,
        "x-rapidapi-key": apiKey,
      },
    });
    if (!res.ok) {
      return { error: `RSAPI error ${res.status}` };
    }
    const data = await res.json();
    const base = data?.data || data;

    const sanitized: SanitizedPropertyDetails = {
      streetAddress: base?.address || base?.streetAddress || base?.propertyAddress,
      city: base?.city,
      state: base?.state || base?.stateCode,
      zipcode: base?.zipcode || base?.zip,
      photos: extractPhotos(base),
      county: base?.county,
      yearBuilt: toNumber(base?.yearBuilt),
      bedrooms: toNumber(base?.bedrooms ?? base?.bed),
      bathrooms: toNumber(base?.bathrooms ?? base?.bath),
      livingArea_sqft: toNumber(base?.livingArea ?? base?.livingAreaValue ?? base?.area),
      lotSize_sqft: toNumber(base?.lotSize ?? base?.lotSize_sqft ?? base?.lotAreaValue),
      zestimate: toNumber(base?.zestimate ?? base?.zEstimate ?? base?.priceZestimate),
      annualTaxAmount: toNumber(base?.taxAnnualAmount ?? base?.taxAnnual),
      taxAssessedValue: toNumber(base?.taxAssessedValue ?? base?.assessedValue),
      lastSale:
        base?.lastSoldDate || base?.lastSaleDate || base?.lastSoldPrice
          ? {
              date: parseDate(base?.lastSoldDate ?? base?.lastSaleDate),
              price: toNumber(base?.lastSoldPrice ?? base?.salePrice),
            }
          : undefined,
      pricePerSquareFoot: toNumber(base?.pricePerSqft ?? base?.pricePerSquareFoot),
      daysOnZillow: toNumber(base?.daysOnZillow ?? base?.daysOnMarket),
      nearbySchools: Array.isArray(base?.schools)
        ? base.schools.map((school: any) => ({
            name: school?.name,
            rating: toNumber(school?.rating),
            grades: school?.grades,
          }))
        : undefined,
      description: base?.description || base?.homeDescription,
      heating: base?.heating,
      cooling: base?.cooling,
      parkingCapacity: toNumber(base?.parkingCapacity ?? base?.garageSpaces),
      zillowUrl: base?.zillowUrl || base?.zillowHomeUrl || base?.link,
      price: toNumber(base?.price ?? base?.homeValue ?? base?.listPrice),
    };

    if (process.env.NODE_ENV !== "production") {
      console.info("[rsapi] sanitized details", {
        address: sanitized.streetAddress,
        photos: sanitized.photos?.length || 0,
        zillowUrl: sanitized.zillowUrl,
      });
    }

    return sanitized;
  } catch (error) {
    return { error: "RSAPI request failed" };
  }
}
