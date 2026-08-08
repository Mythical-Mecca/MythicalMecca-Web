import "server-only";
import { db } from "@/lib/db";
import { partnerCategories } from "@/lib/db/schema";
import { asc, eq } from "drizzle-orm";

const useDb = !!process.env.DATABASE_URL;

export interface PartnerCategory {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string | null;
  color: string | null;
  sort: number;
  active: boolean;
  requiresApplication: boolean;
  allowSelfManage: boolean;
  allowAdminManage: boolean;
  showProducts: boolean;
  showArt: boolean;
  showReviews: boolean;
  showSocials: boolean;
  showGallery: boolean;
  hasPremiumOption: boolean;
  featuredOnHome: boolean;
}

// Mirrors the seed in 0008 so the UI still renders before a DB is connected.
const sampleCategories: PartnerCategory[] = [
  {
    id: "sample-vendors",
    slug: "vendors",
    name: "Vendors",
    description: "Makers & merchants who sell their wares.",
    icon: "game-icons:anvil",
    color: "#E18D01",
    sort: 0,
    active: true,
    requiresApplication: true,
    allowSelfManage: true,
    allowAdminManage: true,
    showProducts: true,
    showArt: true,
    showReviews: true,
    showSocials: true,
    showGallery: true,
    hasPremiumOption: true,
    featuredOnHome: true,
  },
  {
    id: "sample-artists",
    slug: "artists",
    name: "Artists",
    description: "Creators showing off their art.",
    icon: "game-icons:paint-brush",
    color: "#9a6cff",
    sort: 1,
    active: true,
    requiresApplication: true,
    allowSelfManage: true,
    allowAdminManage: true,
    showProducts: false,
    showArt: true,
    showReviews: true,
    showSocials: true,
    showGallery: true,
    hasPremiumOption: false,
    featuredOnHome: true,
  },
  {
    id: "sample-collaborators",
    slug: "collaborators",
    name: "Collaborators",
    description: "People we work with from time to time.",
    icon: "mdi:handshake-outline",
    color: "#48c8d6",
    sort: 2,
    active: true,
    requiresApplication: true,
    allowSelfManage: true,
    allowAdminManage: true,
    showProducts: false,
    showArt: false,
    showReviews: false,
    showSocials: true,
    showGallery: false,
    hasPremiumOption: false,
    featuredOnHome: false,
  },
];

function rowToCategory(r: typeof partnerCategories.$inferSelect): PartnerCategory {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    icon: r.icon,
    color: r.color,
    sort: r.sort,
    active: r.active,
    requiresApplication: r.requiresApplication,
    allowSelfManage: r.allowSelfManage,
    allowAdminManage: r.allowAdminManage,
    showProducts: r.showProducts,
    showArt: r.showArt,
    showReviews: r.showReviews,
    showSocials: r.showSocials,
    showGallery: r.showGallery,
    hasPremiumOption: r.hasPremiumOption,
    featuredOnHome: r.featuredOnHome,
  };
}

/** All categories (admin view), ordered by sort. */
export async function listCategories(): Promise<PartnerCategory[]> {
  if (!useDb) return sampleCategories;
  try {
    const rows = await db
      .select()
      .from(partnerCategories)
      .orderBy(asc(partnerCategories.sort), asc(partnerCategories.name));
    return rows.map(rowToCategory);
  } catch {
    return sampleCategories;
  }
}

/** Active categories only — for public listings and application selectors. */
export async function listActiveCategories(): Promise<PartnerCategory[]> {
  return (await listCategories()).filter((c) => c.active);
}

/** Categories an applicant may apply to (active + requiresApplication). */
export async function listApplicableCategories(): Promise<PartnerCategory[]> {
  return (await listActiveCategories()).filter((c) => c.requiresApplication);
}

/**
 * Categories an existing partner may open another stall in.
 *
 * `requiresApplication` is deliberately ignored: it gates first-time entry to
 * the programme, which this user has already cleared. `allowSelfManage` is the
 * flag that says a partner may run their own page in this category.
 */
export async function listSelfManageCategories(): Promise<PartnerCategory[]> {
  return (await listActiveCategories()).filter((c) => c.allowSelfManage);
}

export async function getCategoryById(
  id: string
): Promise<PartnerCategory | null> {
  if (!useDb) return sampleCategories.find((c) => c.id === id) ?? null;
  try {
    const [r] = await db
      .select()
      .from(partnerCategories)
      .where(eq(partnerCategories.id, id))
      .limit(1);
    return r ? rowToCategory(r) : null;
  } catch {
    return null;
  }
}
