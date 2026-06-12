import { GoogleGenAI } from "@google/genai";
import JSZip from "jszip";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export interface MenuItem {
  item_name: string;
  description: string;
  price: string;
  category: string;
}

/**
 * Extract structured paragraphs from a DOCX file buffer.
 */
async function extractTextFromDocx(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const docXmlFile = zip.file("word/document.xml");
  if (!docXmlFile) {
    throw new Error("Invalid DOCX file: word/document.xml not found");
  }
  const content = await docXmlFile.async("text");
  
  // Extract paragraphs by finding <w:p> blocks
  const paragraphMatches = content.match(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g);
  if (!paragraphMatches) {
    // Fallback: extract all w:t tags
    const tMatches = content.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (!tMatches) return "";
    return tMatches.map(val => val.replace(/<[^>]+>/g, "")).join(" ");
  }
  
  const paragraphs = paragraphMatches.map(pXml => {
    const tMatches = pXml.match(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g);
    if (!tMatches) return "";
    return tMatches.map(val => val.replace(/<[^>]+>/g, "")).join("");
  });
  
  return paragraphs.filter(p => p.trim().length > 0).join("\n");
}

/**
 * Extract printable ASCII/UTF-8 strings from a binary DOC file buffer as a fallback.
 */
function extractTextFromDoc(buffer: Buffer): string {
  let text = "";
  let currentWord = "";
  for (let i = 0; i < buffer.length; i++) {
    const charCode = buffer[i];
    // Printable ASCII characters are between 32 (space) and 126 (~)
    // and we can also include tab (9), line feed (10), carriage return (13)
    if ((charCode >= 32 && charCode <= 126) || charCode === 9 || charCode === 10 || charCode === 13) {
      currentWord += String.fromCharCode(charCode);
    } else {
      if (currentWord.length >= 4) {
        text += currentWord + "\n";
      }
      currentWord = "";
    }
  }
  if (currentWord.length >= 4) {
    text += currentWord + "\n";
  }
  return text
    .replace(/[^\x20-\x7E\t\r\n]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Send a menu file (PDF, PNG, JPEG, DOCX, DOC) to Gemini and extract structured JSON.
 * Returns a clean array of menu items.
 */
export async function extractMenuItems(
  fileBuffer: Buffer,
  mimeType: string,
  fileName: string
): Promise<MenuItem[]> {
  const systemPrompt = `You are a Professional Menu Digitization Specialist working for Glovo.
Your task is to extract ALL text from this menu image/PDF/document and organize it into a clean JSON array.

RULES:
- Each item must have exactly these 4 keys: "item_name", "description", "price", "category"
- If a description is missing, write a brief appetizing description based on the item name
- If a price is missing, set it to "N/A"
- Category should group items logically (e.g., "Appetizers", "Main Course", "Beverages", "Desserts")
- Return ONLY the JSON array, no markdown fences, no explanation
- Make item names clean and title-cased
- Prices should include currency symbol if visible

Example output:
[
  {"item_name": "Classic Cheeseburger", "description": "Juicy beef patty with melted cheddar, lettuce, tomato, and special sauce", "price": "KES 850", "category": "Burgers"},
  {"item_name": "Margherita Pizza", "description": "Fresh mozzarella, basil, and tomato sauce on a thin crust", "price": "KES 1200", "category": "Pizzas"}
]`;

  let contentsPart: any;
  const isWordDocx = mimeType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isWordDoc = mimeType === "application/msword";

  if (isWordDocx) {
    const textContent = await extractTextFromDocx(fileBuffer);
    contentsPart = {
      text: `Here is the menu text content extracted from the Word file:\n\n${textContent}`
    };
  } else if (isWordDoc) {
    const textContent = extractTextFromDoc(fileBuffer);
    contentsPart = {
      text: `Here is the menu text content extracted from the binary Word file:\n\n${textContent}`
    };
  } else {
    // PDF or Image
    const base64Data = fileBuffer.toString("base64");
    contentsPart = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };
  }

  const response = await ai.models.generateContent({
    model: "gemini-3.5-flash",
    contents: [
      {
        role: "user",
        parts: [
          { text: systemPrompt },
          contentsPart,
          {
            text: `Extract all menu items from this file: "${fileName}". Return the JSON array only.`,
          },
        ],
      },
    ],
    config: {
      temperature: 0.1,
      maxOutputTokens: 8192,
    },
  });

  const rawText = response.text?.trim() || "[]";

  // Strip markdown fences if Gemini wraps the response
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const items: MenuItem[] = JSON.parse(cleaned);
    return items;
  } catch {
    console.error("Failed to parse Gemini extraction output:", cleaned);
    throw new Error("Gemini returned invalid JSON. Please retry or use a clearer menu image.");
  }
}

