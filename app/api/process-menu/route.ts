import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { extractMenuItems } from "@/lib/gemini/extract";
import { generateItemImage, toFileName } from "@/lib/gemini/generate-image";
import { createExcelBuffer } from "@/lib/utils/excel";
import { createZipBuffer, type ZipEntry } from "@/lib/utils/zip";

export const maxDuration = 300; // 5-minute timeout for long processing

/**
 * POST /api/process-menu
 * Accepts a menu file upload, runs the full Gemini pipeline:
 *   1. Extract items → 2. Generate images → 3. Package Excel + ZIP → 4. Upload to Supabase
 */
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  try {
    // ── 0. Parse the uploaded file ──────────────────────────────────
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/msword",
      "image/png",
      "image/jpeg",
      "image/jpg",
      "image/webp",
    ];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, Word (DOCX/DOC), PNG, JPEG, or WebP." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());

    // ── 1. Create the job record ────────────────────────────────────
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
        file_name: file.name,
        status: "extracting",
        progress: 5,
      })
      .select("id")
      .single();

    if (insertError || !job) {
      console.error("Job insert error:", insertError);
      return NextResponse.json({ error: "Failed to create job" }, { status: 500 });
    }

    const jobId = job.id;

    // Upload the original menu file to Supabase Storage
    const uploadPath = `${jobId}/${file.name}`;
    await supabase.storage
      .from("menu-uploads")
      .upload(uploadPath, fileBuffer, { contentType: file.type });

    // ── 2. Extract menu items with Gemini ───────────────────────────
    let items;
    try {
      items = await extractMenuItems(fileBuffer, file.type, file.name);
    } catch (extractErr: unknown) {
      const msg = extractErr instanceof Error ? extractErr.message : "Extraction failed";
      await supabase
        .from("jobs")
        .update({ status: "failed", error_message: msg })
        .eq("id", jobId);
      return NextResponse.json({ error: msg, jobId }, { status: 422 });
    }

    if (!items || items.length === 0) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: "No menu items found in the uploaded file.",
        })
        .eq("id", jobId);
      return NextResponse.json(
        { error: "No menu items could be extracted", jobId },
        { status: 422 }
      );
    }

    // Save extracted JSON and move to generation phase
    await supabase
      .from("jobs")
      .update({
        status: "generating",
        progress: 15,
        total_items: items.length,
        items_done: 0,
        extracted_json: items,
      })
      .eq("id", jobId);

    // ── 3. Generate images for each item ────────────────────────────
    const imageEntries: ZipEntry[] = [];
    const imageFileNames: string[] = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const safeName = toFileName(item.item_name);

      try {
        const result = await generateItemImage(item);

        if (result) {
          const ext = result.mimeType.includes("png") ? "png" : "jpg";
          const fileName = `${safeName}.${ext}`;
          imageEntries.push({ fileName, data: result.buffer });
          imageFileNames.push(fileName);
        } else {
          imageFileNames.push("generation_failed");
        }
      } catch {
        console.error(`Image generation error for "${item.item_name}"`);
        imageFileNames.push("generation_failed");
      }

      // Update progress
      const progress = Math.round(15 + ((i + 1) / items.length) * 70);
      await supabase
        .from("jobs")
        .update({ items_done: i + 1, progress })
        .eq("id", jobId);
    }

    // ── 4. Package Excel + ZIP ──────────────────────────────────────
    await supabase
      .from("jobs")
      .update({ status: "packaging", progress: 90 })
      .eq("id", jobId);

    // Create Excel
    const excelBuffer = createExcelBuffer(items, imageFileNames);
    const excelPath = `${jobId}/menu_items.xlsx`;
    await supabase.storage
      .from("job-outputs")
      .upload(excelPath, excelBuffer, {
        contentType:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

    // Create ZIP of images
    let zipUrl = null;
    if (imageEntries.length > 0) {
      const zipBuffer = await createZipBuffer(imageEntries);
      const zipPath = `${jobId}/images.zip`;
      await supabase.storage
        .from("job-outputs")
        .upload(zipPath, zipBuffer, {
          contentType: "application/zip",
        });

      // Generate signed download URL (valid 1 hour)
      const { data: zipSigned } = await supabase.storage
        .from("job-outputs")
        .createSignedUrl(zipPath, 3600);
      zipUrl = zipSigned?.signedUrl || null;
    }

    // Generate signed Excel URL
    const { data: excelSigned } = await supabase.storage
      .from("job-outputs")
      .createSignedUrl(excelPath, 3600);
    const excelUrl = excelSigned?.signedUrl || null;

    // ── 5. Mark job complete ────────────────────────────────────────
    await supabase
      .from("jobs")
      .update({
        status: "completed",
        progress: 100,
        excel_url: excelUrl,
        zip_url: zipUrl,
      })
      .eq("id", jobId);

    return NextResponse.json({
      jobId,
      status: "completed",
      totalItems: items.length,
      imagesGenerated: imageEntries.length,
      excelUrl,
      zipUrl,
      items,
    });
  } catch (error) {
    console.error("Pipeline error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during processing." },
      { status: 500 }
    );
  }
}
