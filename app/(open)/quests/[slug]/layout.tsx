/**
 * A quest page's frame — deliberately empty.
 *
 * A quest is a focus route: it carries its own header, its own way back and a
 * fixed action bar, and it is the page someone keeps open while walking a hall
 * on a phone. Signed-in members never had the app nav here for that reason,
 * and the public header that a signed-out reader used to get is gone for the
 * same one: the page is a single task, and a row of section links above it is
 * an invitation to leave in the middle of doing it.
 *
 * No container either: the page sizes itself.
 */
export default function OpenQuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
