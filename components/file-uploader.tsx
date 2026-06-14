"use client";

import { useRef, useState } from "react";
import { upload } from "@vercel/blob/client";

type Status = "queued" | "uploading" | "done" | "error";
type Item = {
  id: string;
  name: string;
  size: number;
  pct: number;
  speed: number;
  status: Status;
  url?: string;
  error?: string;
};

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

export function FileUploader({
  entityType = "misc",
  accept = "image/*",
  multiple = true,
  onUploaded,
}: {
  entityType?: string;
  accept?: string;
  multiple?: boolean;
  onUploaded?: (url: string) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const patch = (id: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    for (const file of Array.from(fileList)) {
      const id = crypto.randomUUID();
      setItems((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          size: file.size,
          pct: 0,
          speed: 0,
          status: "queued",
        },
      ]);

      // Obscured pathname — original filename is never used in the blob key.
      const key = `uploads/${entityType}/${crypto.randomUUID()}${extOf(file.name)}`;
      let lastLoaded = 0;
      let lastTime = performance.now();

      try {
        patch(id, { status: "uploading" });
        const result = await upload(key, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          clientPayload: entityType,
          onUploadProgress: ({ loaded, total }) => {
            const now = performance.now();
            const dt = (now - lastTime) / 1000;
            const speed = dt > 0 ? (loaded - lastLoaded) / dt : 0;
            lastLoaded = loaded;
            lastTime = now;
            patch(id, {
              pct: Math.round((loaded / total) * 100),
              speed,
            });
          },
        });
        patch(id, { status: "done", pct: 100, url: result.url });
        onUploaded?.(result.url);
      } catch (err) {
        patch(id, { status: "error", error: (err as Error).message });
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFiles(e.dataTransfer.files);
        }}
        className="mm-glass flex cursor-pointer flex-col items-center justify-center gap-2 border-dashed py-10 text-center transition hover:border-[var(--mm-violet)]"
      >
        <p className="text-sm">
          Drop files or{" "}
          <span className="text-[var(--mm-gold)]">browse</span>
        </p>
        <p className="text-xs text-[var(--mm-text-dim)]">
          Images up to 10 MB · stored with obscured keys
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {items.length > 0 && (
        <ul className="space-y-3">
          {items.map((it) => (
            <li key={it.id} className="mm-glass p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="truncate pr-3">{it.name}</span>
                <span className="shrink-0 text-xs text-[var(--mm-text-dim)]">
                  {it.status === "uploading"
                    ? `${it.pct}% · ${fmtBytes(it.speed)}/s`
                    : it.status === "done"
                      ? "Uploaded"
                      : it.status === "error"
                        ? "Failed"
                        : "Queued"}
                </span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--mm-elevated)]">
                <div
                  className="h-full rounded-full transition-[width] duration-200"
                  style={{
                    width: `${it.status === "done" ? 100 : it.pct}%`,
                    background:
                      it.status === "error"
                        ? "var(--mm-danger)"
                        : "var(--mm-grad)",
                  }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-[var(--mm-text-dim)]">
                <span>{fmtBytes(it.size)}</span>
                {it.error && (
                  <span className="text-[var(--mm-danger)]">{it.error}</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
