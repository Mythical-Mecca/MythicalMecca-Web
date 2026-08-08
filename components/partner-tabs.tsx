import { Tabs } from "@/components/tabs";

const ITEMS = [
  { href: "/admin/partners", label: "Partners" },
  // Self-serve stalls awaiting approval — distinct from first-time applications.
  { href: "/admin/partners/queue", label: "Review queue" },
  { href: "/admin/partners/applications", label: "Applications" },
  { href: "/admin/partners/categories", label: "Categories" },
];

export function PartnerTabs({ active }: { active: string }) {
  return <Tabs items={ITEMS} active={active} accent="#E18D01" />;
}
