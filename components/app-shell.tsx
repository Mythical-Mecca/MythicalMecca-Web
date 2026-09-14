import { Breadcrumbs } from "@/components/breadcrumbs";

/**
 * The signed-in frame for `/apply`. Takes the header as a prop rather than
 * rendering it, so the server can build it (it closes over a sign-out server
 * action).
 */
export function AppShell({
  nav,
  children,
}: {
  nav: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-full flex-col">
      <a href="#main-content" className="mm-skip">
        Skip to content
      </a>
      {nav}
      <main
        id="main-content"
        tabIndex={-1}
        className="mx-auto w-full max-w-6xl flex-1 px-6 py-6"
      >
        <div className="mb-5 empty:hidden">
          <Breadcrumbs />
        </div>
        {children}
      </main>
    </div>
  );
}
