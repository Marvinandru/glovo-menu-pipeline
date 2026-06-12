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
  
  // Read worksheet as a 2D array of values
  const allRows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
  
  // Find where the headers start (usually row 0, but scan just in case)
  let headerIndex = -1;
  for (let i = 0; i < allRows.length; i++) {
    const row = allRows[i];
    if (row && row.some(cell => {
      const s = String(cell || "").toLowerCase();
      return s.includes("item") || s.includes("name") || s.includes("category") || s.includes("price");
    })) {
      headerIndex = i;
      break;
    }
  }
  
  if (headerIndex === -1) {
    headerIndex = 0;
  }
  
  const headers = allRows[headerIndex] ? allRows[headerIndex].map(h => String(h || "").trim().toLowerCase()) : [];
  
  // Find column indices by header content
  let colCategory = headers.findIndex(h => h.includes("cat") || h.includes("section"));
  let colItem = headers.findIndex(h => h.includes("item") || h.includes("name") || h.includes("product") || h.includes("title"));
  let colDesc = headers.findIndex(h => h.includes("desc") || h.includes("detail"));
  let colPrice = headers.findIndex(h => h.includes("price") || h.includes("cost") || h.includes("ksh"));
  
  // Fallbacks: Column A (0) = Category, Column B (1) = Item, Column C (2) = Description, Column D (3) = Price
  if (colCategory === -1) colCategory = 0;
  if (colItem === -1) colItem = 1;
  if (colDesc === -1) colDesc = 2;
  if (colPrice === -1) colPrice = 3;
  
  const items: MenuItem[] = [];
  
  for (let i = headerIndex + 1; i < allRows.length; i++) {
    const row = allRows[i];
    if (!row || row.length === 0) continue;
    
    const category = String(row[colCategory] ?? "").trim();
    const item_name = String(row[colItem] ?? "").trim();
    const description = String(row[colDesc] ?? "").trim();
    const price = String(row[colPrice] ?? "N/A").trim();
    
    // Skip empty lines or header rows
    if (!item_name || item_name.toLowerCase() === "item" || item_name.toLowerCase() === "item name") {
      continue;
    }
    
    items.push({
      item_name,
      description,
      price: price || "N/A",
      category: category || "General"
    });
  }
  
  return items;
}
