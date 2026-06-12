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
