import { GoogleGenAI } from "@google/genai";
import type { MenuItem } from "./extract";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Generate a food product image for a single menu item using Gemini Imagen.
 * Returns the raw image bytes as a Buffer, or null if generation fails.
 */
export async function generateItemImage(
  item: MenuItem
): Promise<{ buffer: Buffer; mimeType: string } | null> {
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
      model: "gemini-2.0-flash-preview-image-generation",
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

    console.warn(`No image generated for: ${item.item_name}`);
    return null;
  } catch (error) {
    console.error(`Image generation failed for "${item.item_name}":`, error);
    return null;
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
