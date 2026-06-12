"use client";

import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, FileImage, FileText, X, AlertCircle } from "lucide-react";

interface DropZoneProps {
  onFileAccepted: (file: File) => void;
  disabled?: boolean;
}

export default function DropZone({ onFileAccepted, disabled }: DropZoneProps) {
  const [preview, setPreview] = useState<{
    file: File;
    url: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      setError(null);
      if (rejectedFiles && (rejectedFiles as Array<unknown>).length > 0) {
        setError("Invalid file type. Please upload PDF, Word (DOCX/DOC), PNG, JPEG, or WebP.");
        return;
      }
      if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        const isImage = file.type.startsWith("image/");
        setPreview({
          file,
          url: isImage ? URL.createObjectURL(file) : null,
        });
      }
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/msword": [".doc"],
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: 20 * 1024 * 1024, // 20MB
    disabled,
  });

  const clearPreview = () => {
    if (preview?.url) URL.revokeObjectURL(preview.url);
    setPreview(null);
    setError(null);
  };

  const handleSubmit = () => {
    if (preview?.file) {
      onFileAccepted(preview.file);
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Drop zone area */}
      <div
        {...getRootProps()}
        className={`
          relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer
          transition-all duration-300 ease-out
          ${
            isDragActive
              ? "border-emerald-400 bg-emerald-500/10 scale-[1.01] shadow-lg shadow-emerald-500/10"
              : disabled
              ? "border-zinc-700 bg-zinc-800/30 cursor-not-allowed opacity-50"
              : "border-zinc-600 bg-zinc-800/50 hover:border-emerald-500/50 hover:bg-zinc-800/80 hover:shadow-md"
          }
        `}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          <div
            className={`
              w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300
              ${
                isDragActive
                  ? "bg-emerald-500/20 text-emerald-400 rotate-6 scale-110"
                  : "bg-zinc-700/50 text-zinc-400"
              }
            `}
          >
            <Upload className="w-7 h-7" />
          </div>

          <div>
            <p className="text-lg font-medium text-zinc-200">
              {isDragActive
                ? "Drop your menu here..."
                : "Drop your menu file here"}
            </p>
            <p className="text-sm text-zinc-500 mt-1">
              PDF, Word (DOCX/DOC), PNG, JPEG, or WebP — up to 20MB
            </p>
          </div>

          {!isDragActive && !disabled && (
            <button
              type="button"
              className="mt-2 px-5 py-2 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg text-sm font-medium transition-colors"
            >
              Browse files
            </button>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="relative bg-zinc-800/60 border border-zinc-700 rounded-xl p-4 flex items-center gap-4">
          {/* Thumbnail */}
          {preview.url ? (
            <img
              src={preview.url}
              alt="Menu preview"
              className="w-16 h-16 rounded-lg object-cover border border-zinc-600"
            />
          ) : (
            <div className="w-16 h-16 rounded-lg bg-zinc-700/50 flex items-center justify-center border border-zinc-600">
              {preview.file.type === "application/pdf" ? (
                <FileText className="w-7 h-7 text-orange-400" />
              ) : preview.file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                preview.file.type === "application/msword" ? (
                <FileText className="w-7 h-7 text-blue-400" />
              ) : (
                <FileImage className="w-7 h-7 text-blue-400" />
              )}
            </div>
          )}

          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-zinc-200 truncate">
              {preview.file.name}
            </p>
            <p className="text-xs text-zinc-500 mt-0.5">
              {(preview.file.size / 1024 / 1024).toFixed(2)} MB •{" "}
              {preview.file.type.split("/")[1].toUpperCase()}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={clearPreview}
              disabled={disabled}
              className="p-2 text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <button
              onClick={handleSubmit}
              disabled={disabled}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 text-white font-medium rounded-xl text-sm transition-all duration-200 shadow-lg shadow-emerald-600/20 hover:shadow-emerald-500/30"
            >
              {disabled ? "Processing..." : "Process Menu"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
