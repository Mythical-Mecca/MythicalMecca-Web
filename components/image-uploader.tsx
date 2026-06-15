"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { upload } from "@vercel/blob/client";
import { Icon } from "./icon";
import { ParticleField } from "./particle-field";

type Status = "uploading" | "done" | "error";
type Item = {
  id: string;
  preview: string;
  pct: number;
  status: Status;
  url?: string;
};

function extOf(name: string): string {
  const i = name.lastIndexOf(".");
  return i >= 0 ? name.slice(i) : "";
}

export function ImageUploader({
  name,
  entityType = "misc",
  maxFiles = 6,
  label = "Upload images",
  description = "Drop images or click to browse · up to 10 MB each",
  accent = "#4aa8ff",
  onCountChange,
}: {
  name: string;
  entityType?: string;
  maxFiles?: number;
  label?: string;
  description?: string;
  accent?: string;
  onCountChange?: (n: number) => void;
}) {
  const [items, setItems] = useState<Item[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const single = maxFiles === 1;
  const doneCount = items.filter((i) => i.status === "done").length;

  const cbRef = useRef(onCountChange);
  useEffect(() => {
    cbRef.current = onCountChange;
  });
  useEffect(() => {
    cbRef.current?.(doneCount);
  }, [doneCount]);

  const patch = (id: string, p: Partial<Item>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...p } : it)));

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files) return;
      let list = Array.from(files).filter((f) => f.type.startsWith("image/"));

      if (single) {
        setItems([]);
        list = list.slice(0, 1);
      } else {
        const room = Math.max(0, maxFiles - items.length);
        list = list.slice(0, room);
      }

      for (const file of list) {
        const id = crypto.randomUUID();
        const preview = URL.createObjectURL(file);
        setItems((prev) => [...prev, { id, preview, pct: 0, status: "uploading" }]);
        const key = `uploads/${entityType}/${crypto.randomUUID()}${extOf(file.name)}`;
        try {
          const res = await upload(key, file, {
            access: "public",
            handleUploadUrl: "/api/upload",
            clientPayload: entityType,
            onUploadProgress: ({ percentage }) =>
              patch(id, { pct: Math.round(percentage) }),
          });
          patch(id, { status: "done", pct: 100, url: res.url });
        } catch {
          patch(id, { status: "error" });
        }
      }
    },
    [entityType, items.length, maxFiles, single]
  );

  function remove(it: Item) {
    URL.revokeObjectURL(it.preview);
    setItems((prev) => prev.filter((x) => x.id !== it.id));
    if (it.url) {
      fetch("/api/upload/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: it.url }),
      }).catch(() => {});
    }
  }

  const canAdd = items.length < maxFiles;

  return (
    <div className="space-y-3">
      {canAdd && (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDrag(true);
          }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDrag(false);
            handleFiles(e.dataTransfer.files);
          }}
          className={`relative cursor-pointer overflow-hidden rounded-2xl border border-dashed p-8 text-center transition ${
            drag ? "border-[var(--mm-gold)]" : "border-[var(--mm-border)]"
          } bg-[color-mix(in_srgb,var(--mm-surface)_55%,transparent)]`}
        >
          <div className="pointer-events-none absolute inset-0 opacity-50">
            <ParticleField color="74, 168, 255" />
          </div>
          <div className="relative">
            <span
              className="mx-auto grid h-12 w-12 place-items-center rounded-xl"
              style={{ background: `${accent}22`, color: accent }}
            >
              <Icon icon="mdi:cloud-upload-outline" width={26} />
            </span>
            <p className="mt-3 text-sm font-medium text-[var(--mm-text)]">{label}</p>
            <p className="mt-1 text-xs text-[var(--mm-text-dim)]">{description}</p>
            {!single && (
              <p className="mt-1 text-[11px] uppercase tracking-widest text-[var(--mm-text-dim)]">
                {doneCount}/{maxFiles} added
              </p>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple={!single}
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

      {items.length > 0 && (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
          {items.map((it) => (
            <div
              key={it.id}
              className="group relative aspect-square overflow-hidden rounded-xl border border-[var(--mm-border)]"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={it.url ?? it.preview}
                alt=""
                className="h-full w-full object-cover"
              />
              {it.status === "uploading" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/55">
                  <span className="text-xs font-medium text-white">{it.pct}%</span>
                  <div className="h-1 w-3/4 overflow-hidden rounded-full bg-white/25">
                    <div
                      className="h-full rounded-full transition-[width]"
                      style={{ width: `${it.pct}%`, background: "var(--mm-grad)" }}
                    />
                  </div>
                </div>
              )}
              {it.status === "error" && (
                <div className="absolute inset-0 grid place-items-center bg-[color-mix(in_srgb,var(--mm-danger)_70%,transparent)] p-1 text-center text-[10px] text-white">
                  Upload failed
                </div>
              )}
              {it.status === "done" && (
                <span className="absolute left-1.5 top-1.5 grid h-5 w-5 place-items-center rounded-full bg-[var(--mm-live)] text-[#06301e]">
                  <Icon icon="mdi:check" width={13} />
                </span>
              )}
              <button
                type="button"
                onClick={() => remove(it)}
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/60 text-white opacity-0 transition group-hover:opacity-100"
                aria-label="Remove image"
              >
                <Icon icon="mdi:close" width={14} />
              </button>
              {it.status === "done" && it.url && (
                <input type="hidden" name={name} value={it.url} />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
