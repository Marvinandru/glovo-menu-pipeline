import { GoogleGenAI } from "@google/genai";
import type { MenuItem } from "./extract";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Valid image-generation model. Override via env if your key has a different tier.
// NOTE: "gemini-2.0-flash-preview-image-generation" is NOT a real model id (404).
const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";

function isRateLimit(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error);
  return raw.includes("429") || raw.toLowerCase().includes("quota") || raw.toLowerCase().includes("rate");
}

export type ImageResult =
  | { buffer: Buffer; mimeType: string }
  | { error: string; rateLimited: boolean };

/**
 * Generate a food product image for a single menu item using Gemini.
 * Single attempt — no retries. On a rate-limit (429) the caller stops the
 * whole batch instead of hammering the API for every remaining item.
 * Returns the image bytes on success, or a structured error describing why
 * it failed (so the UI can surface "rate limit reached", etc.).
 */
export async function generateItemImage(item: MenuItem): Promise<ImageResult> {
  const prompt = `Professional food photography of "${item.item_name}" — ${item.description}.

STYLE REQUIREMENTS:
- Centered plating on a clean, neutral background (white or light marble)
- Professional studio lighting with soft shadows
- Realistic food textures, vibrant natural colors
- Appetizing presentation suitable for a food delivery app storefront
- Top-down or 45-degree angle shot
- No text, watermarks, logos, or overlays
- High resolution, commercial quality
- The food should look fresh, steaming if hot, garnished appropriately`;

  try {
    const response = await ai.models.generateContent({
      model: IMAGE_MODEL,
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      config: {
        responseModalities: ["image", "text"],
        temperature: 1,
      },
    });

    // Extract the image part from the response
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const imageBuffer = Buffer.from(part.inlineData.data!, "base64");
          return {
            buffer: imageBuffer,
            mimeType: part.inlineData.mimeType || "image/png",
          };
        }
      }
    }

    console.warn(`No image returned for: ${item.item_name}`);
    return { error: "Model returned no image data.", rateLimited: false };
  } catch (error) {
    const rateLimited = isRateLimit(error);
    console.error(`Image generation failed for "${item.item_name}":`, error);
    const raw = error instanceof Error ? error.message : String(error);
    return {
      error: rateLimited
        ? "Image generation rate limit / quota reached."
        : raw.slice(0, 200),
      rateLimited,
    };
  }
}

/**
 * Sanitize an item name into a safe filename.
 * "Classic Cheese Burger!" → "classic_cheese_burger"
 */
export function toFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .substring(0, 60);
}
