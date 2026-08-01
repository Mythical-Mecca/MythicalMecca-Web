import { Tabs } from "@/components/tabs";

const ITEMS = [
  { href: "/admin/events", label: "Events" },
  { href: "/admin/events/queue", label: "Community queue" },
];

export function EventAdminTabs({ active }: { active: string }) {
  return <Tabs items={ITEMS} active={active} accent="#5cc08c" />;
}
