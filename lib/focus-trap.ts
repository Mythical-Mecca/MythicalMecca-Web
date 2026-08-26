/**
 * Keep Tab inside `panel` while it is open. Shared by every modal surface so
 * the dialog, the alert dialog and the side sheet all behave the same way.
 */
export function trapTab(panel: HTMLElement, e: KeyboardEvent) {
  if (e.key !== "Tab") return;
  const items = panel.querySelectorAll<HTMLElement>(
    'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'
  );
  if (items.length === 0) return;
  const first = items[0];
  const last = items[items.length - 1];
  const inside = panel.contains(document.activeElement);
  if (e.shiftKey && (document.activeElement === first || !inside)) {
    e.preventDefault();
    last.focus();
  } else if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}
