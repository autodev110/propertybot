import { z } from "zod";
import { geminiJsonModel } from "./gemini";
import { AGENT_SIGNATURE } from "./config";
import { EvaluatedProperty } from "./types";

const emailDraftSchema = z.object({
  subject: z.string().min(5).max(200),
  body: z.string().min(50).max(10000),
});

export type EmailDraft = z.infer<typeof emailDraftSchema>;

const systemPrompt = `
You are a professional real estate agent writing an email to a buyer client.

Your task:
- Write a single coherent email presenting several property options.
- Briefly restate the client's key preferences.
- For each selected property:
  - Give a short heading (address or "Property 1: [address]").
  - Mention the key specs: price, beds, baths, and any standout features or notes.
  - Explain in 2–4 sentences why it might fit the client's needs.
- Keep tone professional, helpful, and concise.
- Do not include internal risk analysis or model uncertainty.
- End the email with the provided agent signature.

Formatting:
- Use short paragraphs and clear section breaks between properties.
- This email is plain text (no HTML tags, no markdown).
- No emojis, no exaggerated marketing language.

You must return a single JSON object with:
{
  "subject": "string",
  "body": "string"
}
No extra fields. No commentary outside JSON.
`.trim();

function stripJsonFence(text: string): string {
  const fenced = text.match(/```json\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1];
  const generic = text.match(/```\s*([\s\S]*?)```/);
  if (generic) return generic[1];
  return text.trim();
}

export async function generateEmailDraftForSelectedProperties(
  client: { name: string; email: string; preferredLocation: string; clientNotes: string },
  selectedProperties: EvaluatedProperty[]
): Promise<EmailDraft> {
  if (!geminiJsonModel) {
    throw new Error("GEMINI_API_KEY missing; cannot compose email.");
  }

  const selectedPropertiesForLLM = selectedProperties.map((p, idx) => ({
    label: `Property ${idx + 1}`,
    address: p.address,
    city: p.city,
    state: p.state,
    zipcode: p.zipcode,
    price: p.price,
    beds: p.beds,
    baths: p.baths,
    sqft: p.sqft,
    rationale: p.aiRationale,
  }));

  const userPrompt = `
Client:
- Name: ${client.name}
- Email: ${client.email}
- Preferred location: ${client.preferredLocation}
- Needs and notes:
${client.clientNotes}

Selected properties:
${JSON.stringify(selectedPropertiesForLLM, null, 2)}

Agent signature to append at the end:
"""
${AGENT_SIGNATURE}
"""
`;

  const result = await geminiJsonModel.generateContent([systemPrompt, userPrompt]);
  const text = result.response.text();
  const parsedText = stripJsonFence(text);

  let parsed: EmailDraft;
  try {
    parsed = emailDraftSchema.parse(JSON.parse(parsedText));
  } catch (err) {
    throw new Error("Email draft generation returned invalid JSON.");
  }

  if (!parsed.body.includes(AGENT_SIGNATURE)) {
    parsed.body = `${parsed.body}\n\n${AGENT_SIGNATURE}`;
  }

  return parsed;
}
