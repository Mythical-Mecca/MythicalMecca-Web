import { Tabs } from "@/components/tabs";

const ITEMS = [
  { href: "/admin/partners", label: "Partners" },
  { href: "/admin/partners/applications", label: "Applications" },
  { href: "/admin/partners/categories", label: "Categories" },
];

export function PartnerTabs({ active }: { active: string }) {
  return <Tabs items={ITEMS} active={active} accent="#E18D01" />;
}
