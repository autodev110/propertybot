import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.warn("Warning: GEMINI_API_KEY is not set. AI features will fail until configured.");
}

const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const geminiJsonModel = genAI?.getGenerativeModel({
  model: "gemini-2.0-flash",
  generationConfig: { responseMimeType: "application/json" },
});
