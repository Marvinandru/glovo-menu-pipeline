import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { extractMenuItems, type MenuItem } from "@/lib/gemini/extract";
import { generateItemImage, toFileName } from "@/lib/gemini/generate-image";
import { createExcelBuffer, parseExcelMenu } from "@/lib/utils/excel";
import { createZipBuffer, type ZipEntry } from "@/lib/utils/zip";

export const maxDuration = 300; // 5-minute timeout for long processing

/**
 * POST /api/process-menu
 * Validates the upload, creates a job, and returns its id IMMEDIATELY so the
 * client can poll /api/job-status/[id] and animate the progress bar.
 * The heavy pipeline (extract → generate → package → upload) runs in `after()`,
 * after the response is sent, updating the job row as it goes.
 */
export async function POST(req: NextRequest) {
  const supabase = createAdminClient();

  try {
    // ── 0. Parse + validate the uploaded file ───────────────────────
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
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
    ];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
      return NextResponse.json(
        { error: "Unsupported file type. Please upload PDF, Word (DOCX/DOC), PNG, JPEG, WebP, or Excel (XLSX/XLS)." },
        { status: 400 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileName = file.name;
    const fileType = file.type;
    const isExcel =
      fileType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      fileType === "application/vnd.ms-excel" ||
      fileName.endsWith(".xlsx") ||
      fileName.endsWith(".xls");

    // ── 1. Create the job record ────────────────────────────────────
    const { data: job, error: insertError } = await supabase
      .from("jobs")
      .insert({
        file_name: fileName,
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

    // ── 2. Run the rest of the pipeline AFTER the response is sent ───
    after(async () => {
      try {
        // Upload the original menu file to Supabase Storage
        const uploadPath = `${jobId}/${fileName}`;
        await supabase.storage
          .from("menu-uploads")
          .upload(uploadPath, fileBuffer, { contentType: fileType });

        // ── Extract / parse menu items ──────────────────────────────
        let items: MenuItem[];
        try {
          items = isExcel
            ? parseExcelMenu(fileBuffer)
            : await extractMenuItems(fileBuffer, fileType, fileName);
        } catch (extractErr: unknown) {
          const msg = extractErr instanceof Error ? extractErr.message : "Extraction/Parsing failed";
          await supabase.from("jobs").update({ status: "failed", error_message: msg }).eq("id", jobId);
          return;
        }

        if (!items || items.length === 0) {
          await supabase
            .from("jobs")
            .update({ status: "failed", error_message: "No menu items found in the uploaded file." })
            .eq("id", jobId);
          return;
        }

        // Mark every item "pending" up front so the UI can show placeholders.
        items.forEach((it) => {
          it.image_status = "pending";
          it.image_path = null;
        });

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

        // ── Generate images for each item ───────────────────────────
        const imageEntries: ZipEntry[] = [];
        const imageFileNames: string[] = [];
        let failCount = 0;
        let rateLimited = false;
        let rateLimitStop = false; // once true, skip the remaining items
        let lastError: string | null = null;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const safeName = toFileName(item.item_name);

          if (rateLimitStop) {
            // Rate limit already reached — don't hammer the API for the rest.
            item.image_status = "skipped";
            imageFileNames.push("skipped_rate_limit");
            failCount++;
          } else {
            const result = await generateItemImage(item);

            if ("buffer" in result) {
              const ext = result.mimeType.includes("png") ? "png" : "jpg";
              const fileNameOut = `${safeName}.${ext}`;
              const imgPath = `${jobId}/images/${i}_${fileNameOut}`;
              // Upload immediately so the client can display it during polling.
              await supabase.storage
                .from("job-outputs")
                .upload(imgPath, result.buffer, { contentType: result.mimeType, upsert: true });
              imageEntries.push({ fileName: fileNameOut, data: result.buffer });
              imageFileNames.push(fileNameOut);
              item.image_path = imgPath;
              item.image_status = "done";
            } else {
              failCount++;
              lastError = result.error;
              imageFileNames.push("generation_failed");
              item.image_status = "failed";
              if (result.rateLimited) {
                rateLimited = true;
                rateLimitStop = true; // stop trying the rest of the items
              }
            }
          }

          // Persist progress AND the updated items so polling shows images live.
          const progress = Math.round(15 + ((i + 1) / items.length) * 70);
          await supabase
            .from("jobs")
            .update({ items_done: i + 1, progress, extracted_json: items })
            .eq("id", jobId);

          // Light throttle between successful requests to ease rate limits.
          if (!rateLimitStop && i < items.length - 1) {
            await new Promise((r) => setTimeout(r, 1000));
          }
        }

        // ── Package Excel + ZIP ─────────────────────────────────────
        await supabase.from("jobs").update({ status: "packaging", progress: 90 }).eq("id", jobId);

        const excelBuffer = createExcelBuffer(items, imageFileNames);
        const excelPath = `${jobId}/menu_items.xlsx`;
        await supabase.storage.from("job-outputs").upload(excelPath, excelBuffer, {
          contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        });

        let zipUrl: string | null = null;
        if (imageEntries.length > 0) {
          const zipBuffer = await createZipBuffer(imageEntries);
          const zipPath = `${jobId}/images.zip`;
          await supabase.storage
            .from("job-outputs")
            .upload(zipPath, zipBuffer, { contentType: "application/zip" });

          const { data: zipSigned } = await supabase.storage
            .from("job-outputs")
            .createSignedUrl(zipPath, 3600, { download: "menu_images.zip" });
          zipUrl = zipSigned?.signedUrl || null;
        }

        const { data: excelSigned } = await supabase.storage
          .from("job-outputs")
          .createSignedUrl(excelPath, 3600, { download: "menu_items.xlsx" });
        const excelUrl = excelSigned?.signedUrl || null;

        // ── Mark job complete (with a warning if some images failed) ─
        let warning: string | null = null;
        if (failCount > 0) {
          const detail = rateLimited
            ? "Rate limit / quota reached — remaining items were skipped. Try again later or enable billing on your Gemini API key."
            : lastError || "Some images could not be generated.";
          warning = `${imageEntries.length}/${items.length} images generated. ${detail}`;
        }

        await supabase
          .from("jobs")
          .update({
            status: "completed",
            progress: 100,
            excel_url: excelUrl,
            zip_url: zipUrl,
            extracted_json: items,
            error_message: warning,
          })
          .eq("id", jobId);
      } catch (error) {
        console.error("Pipeline error:", error);
        const msg = error instanceof Error ? error.message : "An unexpected error occurred during processing.";
        await supabase.from("jobs").update({ status: "failed", error_message: msg }).eq("id", jobId);
      }
    });

    // Respond immediately — the client will poll for progress.
    return NextResponse.json({ jobId, status: "extracting" });
  } catch (error) {
    console.error("Request error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred during processing." },
      { status: 500 }
    );
  }
}
