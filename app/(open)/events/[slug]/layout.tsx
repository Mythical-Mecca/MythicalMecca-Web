import { getEvent } from "@/lib/content";
import { OpenChrome } from "@/components/open-chrome";

/**
 * An event page's frame.
 *
 * This is the lowest layout that knows which event is being read, and
 * therefore the first one that can tell whether the site's chrome belongs on
 * screen at all — see <OpenChrome>. The container matches what the member
 * shell gives every other browsing page, so an event looks the same whether
 * it was reached from the nav or from a link in a group chat.
 */
export default async function OpenEventLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getEvent(slug);

  return (
    <>
      <OpenChrome noDataMode={!!event?.noDataMode} />
      <div className="mx-auto w-full max-w-6xl px-6 py-6">{children}</div>
    </>
  );
}
