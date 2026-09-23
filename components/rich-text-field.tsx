"use client";

import { useEffect, useId, useRef } from "react";
import { Field } from "@/components/form";
import { Icon } from "@/components/icon";

/**
 * Small contentEditable editor for Easy-mode copy.
 *
 * Bold / italic / lists / links only — enough to write a vendor directory,
 * not a page builder. The live HTML is mirrored into a hidden input so a
 * normal form submit carries it.
 */
export function RichTextField({
  label,
  name,
  defaultValue = "",
  description,
  hint,
  icon,
  error,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  description?: string;
  hint?: string;
  icon?: string;
  error?: string;
}) {
  const id = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = editorRef.current;
    if (!el || el.innerHTML) return;
    el.innerHTML = defaultValue || "";
    sync();
    // Intentionally once on mount — uncontrolled after that, like other fields.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sync = () => {
    if (inputRef.current && editorRef.current) {
      inputRef.current.value = editorRef.current.innerHTML;
    }
  };

  const run = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    sync();
  };

  const link = () => {
    const url = window.prompt("Link URL", "https://");
    if (!url) return;
    run("createLink", url);
  };

  const tools: {
    label: string;
    icon: string;
    onClick: () => void;
  }[] = [
    { label: "Bold", icon: "mdi:format-bold", onClick: () => run("bold") },
    { label: "Italic", icon: "mdi:format-italic", onClick: () => run("italic") },
    {
      label: "Bullet list",
      icon: "mdi:format-list-bulleted",
      onClick: () => run("insertUnorderedList"),
    },
    {
      label: "Numbered list",
      icon: "mdi:format-list-numbered",
      onClick: () => run("insertOrderedList"),
    },
    { label: "Link", icon: "mdi:link-variant", onClick: link },
  ];

  return (
    <Field
      label={label}
      hint={hint}
      icon={icon}
      description={description}
      error={error}
      errorId={`${id}-error`}
      descriptionId={`${id}-description`}
    >
      <input ref={inputRef} type="hidden" name={name} defaultValue={defaultValue} />
      <div
        className={`overflow-hidden rounded-2xl border bg-[color-mix(in_srgb,var(--mm-surface)_60%,transparent)] ${
          error
            ? "border-[var(--mm-danger)]"
            : "border-[var(--mm-border)] focus-within:border-[var(--mm-violet)] focus-within:ring-2 focus-within:ring-[color-mix(in_srgb,var(--mm-violet)_35%,transparent)]"
        }`}
      >
        <div
          role="toolbar"
          aria-label="Formatting"
          className="flex flex-wrap gap-0.5 border-b border-[var(--mm-divider)] px-2 py-1.5"
        >
          {tools.map((t) => (
            <button
              key={t.label}
              type="button"
              aria-label={t.label}
              title={t.label}
              onMouseDown={(e) => {
                // Keep selection in the editor — a normal click would steal it.
                e.preventDefault();
                t.onClick();
              }}
              className="grid h-8 w-8 place-items-center rounded-lg text-[var(--mm-text-dim)] transition-colors hover:bg-[var(--mm-elevated)] hover:text-[var(--mm-text)]"
            >
              <Icon icon={t.icon} width={16} />
            </button>
          ))}
        </div>
        <div
          ref={editorRef}
          id={id}
          role="textbox"
          aria-multiline
          aria-labelledby={undefined}
          aria-label={label}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [error ? `${id}-error` : null, description ? `${id}-description` : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
          contentEditable
          suppressContentEditableWarning
          onInput={sync}
          onBlur={sync}
          className="min-h-[10rem] px-4 py-3 text-sm text-[var(--mm-text)] outline-none [&_a]:text-[var(--mm-gold)] [&_a]:underline [&_li]:my-0.5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5"
        />
      </div>
    </Field>
  );
}
