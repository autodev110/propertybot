import { z } from "zod";
import { geminiJsonModel } from "./gemini";
import { ClientSearchInput } from "./clientSearchSchema";
import { EvaluatedProperty } from "./types";
import { randomUUID } from "crypto";

export const propertyMatchSchema = z.object({
  matches: z
    .array(
      z.object({
        zillowUrl: z.string(),
        score: z.number().min(0).max(100),
        pros: z.array(z.string()).max(10),
        cons: z.array(z.string()).max(10),
        rationale: z.string().max(3000),
      })
    )
    .min(1)
    .max(10),
});

export type PropertyMatchLLMOutput = z.infer<typeof propertyMatchSchema>;

export interface EnrichedPropertyInput {
  zillowUrl: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  photos?: string[];
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  lotSizeSqft?: number;
  daysOnMarket?: number;
  yearBuilt?: number;
  zestimate?: number;
  description?: string;
  nearbySchools?: {
    name?: string;
    rating?: number;
    grades?: string;
  }[];
  rsapiRaw: unknown;
}

const systemPrompt = `
You are a disciplined residential real-estate buyer's agent assistant.

Your job:
- Evaluate each property ONLY based on the provided structured data.
- Compare properties against the client's needs and notes.
- Score each property from 0 to 100 on suitability.
- Identify clear PROS and CONS for each property.
- Select ONLY the best properties ranked by score, with a maximum of 10.
- If fewer than 3 properties are reasonably suitable, return only those that are suitable; otherwise return your top 5-10.

Rules:
- Do NOT invent numbers (beds, baths, price, days on market). Use only the payload.
- Keep analysis concise, analytical, and internal-facing.
- These notes are NOT sent to the client.
- No marketing phrases, no hype, no emojis.

Output:
Return a single JSON object with this exact structure:
{
  "matches": [
    {
      "zillowUrl": "string",
      "score": number,
      "pros": ["string"],
      "cons": ["string"],
      "rationale": "string"
    }
  ]
}
No extra fields. No extra commentary outside the JSON.
`.trim();

function stripJsonFence(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1];
  const generic = text.match(/```\s*([\s\S]*?)```/);
  if (generic) return generic[1];
  return text.trim();
}

export async function runPropertyEvaluator(
  clientInput: ClientSearchInput,
  enrichedProperties: EnrichedPropertyInput[]
): Promise<EvaluatedProperty[]> {
  if (!geminiJsonModel) {
    throw new Error("GEMINI_API_KEY missing; cannot evaluate properties.");
  }

  if (enrichedProperties.length === 0) {
    throw new Error("No properties to evaluate.");
  }

  const propertiesForLLM = enrichedProperties.map((p) => ({
    zillowUrl: p.zillowUrl,
    address: p.address,
    price: p.price,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    daysOnMarket: p.daysOnMarket,
    description: p.description,
  }));

  const userPrompt = `
Client:
- Name: ${clientInput.clientName}
- Email: ${clientInput.clientEmail}
- Preferred location: ${clientInput.preferredLocation}
- Needs and notes:
${clientInput.clientNotes}

Properties:
${JSON.stringify(propertiesForLLM, null, 2)}
`;

  const result = await geminiJsonModel.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();
  const parsedText = stripJsonFence(text);

  let parsed: PropertyMatchLLMOutput;
  try {
    parsed = propertyMatchSchema.parse(JSON.parse(parsedText));
  } catch (err) {
    throw new Error("AI evaluation failed to return valid JSON.");
  }

  const matchMap = new Map(enrichedProperties.map((p) => [p.zillowUrl, p]));
  const limitedMatches = parsed.matches.slice(0, 10);
  const evaluated: EvaluatedProperty[] = [];

  for (const match of limitedMatches) {
    const base = matchMap.get(match.zillowUrl);
    if (!base) continue;
    evaluated.push({
      id: randomUUID(),
      zillowUrl: base.zillowUrl,
      address: base.address,
      city: base.city,
      state: base.state,
      zipcode: base.zipcode,
      photos: base.photos,
      price: base.price,
      beds: base.beds,
      baths: base.baths,
      sqft: base.sqft,
      lotSizeSqft: base.lotSizeSqft,
      daysOnMarket: base.daysOnMarket,
      yearBuilt: base.yearBuilt,
      zestimate: base.zestimate,
      description: base.description,
      nearbySchools: base.nearbySchools,
      aiScore: match.score,
      aiPros: match.pros,
      aiCons: match.cons,
      aiRationale: match.rationale,
      rsapiRaw: base.rsapiRaw,
    });
  }

  if (evaluated.length === 0) {
    throw new Error("AI evaluation returned no usable matches.");
  }

  return evaluated;
}
