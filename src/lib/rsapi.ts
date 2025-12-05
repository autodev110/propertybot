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

    return sanitized;
  } catch (error) {
    return { error: "RSAPI request failed" };
  }
}
