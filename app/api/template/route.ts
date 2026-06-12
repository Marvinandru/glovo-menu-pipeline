import { NextResponse } from "next/server";
import { createTemplateBuffer } from "@/lib/utils/excel";

/**
 * GET /api/template
 * Download a blank Excel template for manual menu entry.
 */
export async function GET() {
  const buffer = createTemplateBuffer();

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        'attachment; filename="glovo_menu_template.xlsx"',
    },
  });
}
