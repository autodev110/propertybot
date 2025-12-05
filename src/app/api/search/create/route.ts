import { NextResponse } from "next/server";
import { clientSearchSchema, ClientSearchInput } from "@/lib/clientSearchSchema";
import { getOrCreateClientByEmail, createSearchSession, saveSearchSession, appendSearchToClient } from "@/lib/storage";
import { getPropertyDetailsAPI } from "@/lib/rsapi";
import { runPropertyEvaluator, EnrichedPropertyInput } from "@/lib/propertyEvaluator";
import { SearchSessionSummary } from "@/lib/types";
import { searchPropertiesByLocation } from "@/lib/propertySearchApi";

function splitAddress(address: string) {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const [street = address, city = "", stateZip = ""] = parts;
  const [state, zipcode] = stateZip.split(" ").filter(Boolean);
  return { street, city, state, zipcode };
}

export async function POST(req: Request) {
  let input: ClientSearchInput;
  let stage = "validate_input";
  try {
    const body = await req.json();
    input = clientSearchSchema.parse(body);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? "Invalid payload" }, { status: 400 });
  }

  try {
    stage = "get_or_create_client";
    const client = await getOrCreateClientByEmail(input.clientName, input.clientEmail);
    stage = "search_properties";
    const listings = await searchPropertiesByLocation(input.preferredLocation, 80);
    if (listings.length === 0) {
      return NextResponse.json(
        { error: "No properties returned from search API. Try broadening the location." },
        { status: 400 }
      );
    }

    stage = "create_session";
    const session = await createSearchSession({
      clientId: client.id,
      preferredLocation: input.preferredLocation,
      clientNotes: input.clientNotes,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
      zillowSearchUrl: `https://www.zillow.com/homes/${encodeURIComponent(input.preferredLocation)}_rb/`,
    });

    session.candidateCount = listings.length;

    const enriched: EnrichedPropertyInput[] = [];
    const counts = {
      totalListings: listings.length,
      passedPrice: 0,
      kept: 0,
      skippedMissingFields: 0,
    };
    stage = "enrich_properties";
    for (const listing of listings) {
      const address = listing.address;
      if (!address) continue;

      let details: any = null;
      try {
        details = await getPropertyDetailsAPI(address);
      } catch (err: any) {
        console.error("[search/create] RSAPI request failed", { address, error: err?.message });
      }
      if (details && "error" in details) {
        console.error("[search/create] RSAPI returned error", { address, error: details.error });
        details = null;
      }
      const addressParts = splitAddress(address);
      const price = listing.price ?? details?.price ?? details?.zestimate;
      const beds = listing.bedrooms ?? details?.bedrooms;
      const baths = listing.bathrooms ?? details?.bathrooms;
      if (price === undefined || beds === undefined || baths === undefined) {
        console.warn("[search/create] skipped listing missing price/beds/baths", {
          address,
          listingPrice: listing.price,
          listingBeds: listing.bedrooms,
          listingBaths: listing.bathrooms,
          detailsPrice: details?.price,
          detailsBeds: details?.bedrooms,
          detailsBaths: details?.bathrooms,
        });
        counts.skippedMissingFields++;
        continue;
      }

      if (input.minPrice !== undefined && price < input.minPrice) continue;
      if (input.maxPrice !== undefined && price > input.maxPrice) continue;
      counts.passedPrice++;

      enriched.push({
        zillowUrl: listing.zillowUrl || details?.zillowUrl,
        address: details?.streetAddress || address,
        city: listing.city || details?.city || addressParts.city,
        state: listing.state || details?.state || addressParts.state,
        zipcode: listing.zipcode || details?.zipcode || addressParts.zipcode,
        price,
        beds,
        baths,
        sqft: listing.livingArea ?? details?.livingArea_sqft,
        lotSizeSqft: details?.lotSize_sqft,
        daysOnMarket: listing.daysOnZillow ?? details?.daysOnZillow,
        yearBuilt: details?.yearBuilt,
        zestimate: details?.zestimate,
        description: details?.description,
        nearbySchools: details?.nearbySchools,
        rsapiRaw: details,
      });
      counts.kept++;
    }

    if (enriched.length === 0) {
      return NextResponse.json(
        { error: "No properties found; adjust location/filters." },
        { status: 400 }
      );
    }

    console.info("[search/create] listing stats", {
      totalListings: counts.totalListings,
      passedPrice: counts.passedPrice,
      kept: counts.kept,
      minPrice: input.minPrice,
      maxPrice: input.maxPrice,
    });

    stage = "run_ai_evaluator";
    session.candidateCount = enriched.length;
    const evaluatedProperties = await runPropertyEvaluator(input, enriched);
    session.evaluatedProperties = evaluatedProperties;

    stage = "persist_session";
    await saveSearchSession(session);

    stage = "append_client_summary";
    const summary: SearchSessionSummary = {
      id: session.id,
      createdAt: session.createdAt,
      preferredLocation: session.preferredLocation,
      hasEmailSent: !!session.finalEmail?.sentAt,
      minPrice: session.minPrice,
      maxPrice: session.maxPrice,
    };
    await appendSearchToClient(client, summary);

    stage = "complete";
    return NextResponse.json({ searchId: session.id, clientId: client.id });
  } catch (err: any) {
    console.error("[search/create] failure", { stage, error: err?.message, stack: err?.stack });
    return NextResponse.json(
      { error: err?.message ?? "Unexpected error", stage },
      { status: 500 }
    );
  }
}
