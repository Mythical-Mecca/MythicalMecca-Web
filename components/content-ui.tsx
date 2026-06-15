/** Minimal paragraph renderer — full markdown lands later. */
export function SimpleProse({ text }: { text: string }) {
  return (
    <div className="space-y-4 text-[var(--mm-text-dim)] leading-relaxed">
      {text.split("\n\n").map((para, i) => (
        <p key={i}>{para}</p>
      ))}
    </div>
  );
}
