import * as XLSX from "xlsx";
import type { MenuItem } from "../gemini/extract";

/**
 * Convert an array of menu items into an Excel (.xlsx) Buffer.
 * Columns: Item Name | Description | Price | Category | Image Filename
 */
export function createExcelBuffer(
  items: MenuItem[],
  imageFileNames: string[]
): Buffer {
  // Build worksheet data
  const headers = ["Item Name", "Description", "Price", "Category", "Image Filename"];

  const rows = items.map((item, i) => [
    item.item_name,
    item.description,
    item.price,
    item.category,
    imageFileNames[i] || "generation_failed",
  ]);

  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Style column widths for readability
  ws["!cols"] = [
    { wch: 30 }, // Item Name
    { wch: 60 }, // Description
    { wch: 15 }, // Price
    { wch: 20 }, // Category
    { wch: 35 }, // Image Filename
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu Items");

  // Write to buffer
  const excelBuffer = XLSX.write(wb, {
    type: "buffer",
    bookType: "xlsx",
  }) as Buffer;

  return excelBuffer;
}

/**
 * Create a downloadable Excel template for manual menu entry.
 */
export function createTemplateBuffer(): Buffer {
  const headers = ["Item Name", "Description", "Price", "Category"];
  const exampleRow = [
    "Classic Cheeseburger",
    "Juicy beef patty with melted cheddar, lettuce, tomato",
    "KES 850",
    "Burgers",
  ];

  const wsData = [headers, exampleRow];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  ws["!cols"] = [
    { wch: 30 },
    { wch: 60 },
    { wch: 15 },
    { wch: 20 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Menu Template");

  return XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer;
}

/**
 * Parse an uploaded Excel (.xlsx/.xls) file buffer into MenuItems.
 */
export function parseExcelMenu(buffer: Buffer): MenuItem[] {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  
  const rawRows = XLSX.utils.sheet_to_json(worksheet) as Record<string, any>[];
  const items: MenuItem[] = [];

  for (const row of rawRows) {
    let item_name = "";
    let description = "";
    let price = "N/A";
    let category = "General";

    // Dynamic field matching based on key names
    for (const key of Object.keys(row)) {
      const normalizedKey = key.trim().toLowerCase();
      const val = String(row[key] ?? "").trim();

      if (normalizedKey.includes("item") && normalizedKey.includes("name")) {
        item_name = val;
      } else if (normalizedKey === "name" && !item_name) {
        item_name = val;
      } else if (normalizedKey.includes("desc")) {
        description = val;
      } else if (normalizedKey.includes("price")) {
        price = val;
      } else if (normalizedKey.includes("cat") || normalizedKey.includes("section")) {
        category = val;
      }
    }

    // Fallbacks
    if (!item_name) {
      item_name = row["Item Name"] || row["item_name"] || row["Name"] || row["name"] || "";
    }
    if (!description) {
      description = row["Description"] || row["description"] || "";
    }
    if (price === "N/A") {
      const p = row["Price"] || row["price"];
      if (p !== undefined && p !== null) {
        price = String(p);
      }
    }
    if (category === "General") {
      category = row["Category"] || row["category"] || "General";
    }

    if (item_name) {
      items.push({
        item_name,
        description,
        price,
        category
      });
    }
  }

  return items;
}
