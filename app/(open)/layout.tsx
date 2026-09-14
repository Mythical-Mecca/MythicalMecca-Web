import { AppBackdrop } from "@/components/app-backdrop";

/**
 * Publicly readable event, quest, and tag pages.
 *
 * These used to sit under `(app)`, whose layout calls `requireRole`, so a link
 * sent to a friend bounced to /login and every share preview in WhatsApp and
 * Discord unfurled as "Sign in — Mythical Mecca" no matter which quest it
 * pointed at. The pages themselves decide what a visitor may see.
 *
 * The header is NOT here, deliberately. A no-data event's pages carry no site
 * chrome at all, and which pages those are can't be known from this layout —
 * it has no dynamic segment of its own to read. So each route below builds its
 * own header once it has looked up the event it belongs to.
 */
export default function OpenLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <AppBackdrop />
      <div className="flex min-h-full flex-col">
        <a href="#main-content" className="mm-skip">
          Skip to content
        </a>
        <main id="main-content" tabIndex={-1} className="flex-1">
          {children}
        </main>
      </div>
    </>
  );
}
