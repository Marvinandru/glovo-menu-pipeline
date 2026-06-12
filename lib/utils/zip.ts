import JSZip from "jszip";

export interface ZipEntry {
  fileName: string;
  data: Buffer;
}

/**
 * Create a ZIP archive from an array of named file buffers.
 * Returns the ZIP as a Node.js Buffer ready for upload/download.
 */
export async function createZipBuffer(entries: ZipEntry[]): Promise<Buffer> {
  const zip = new JSZip();

  for (const entry of entries) {
    zip.file(entry.fileName, entry.data);
  }

  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}
