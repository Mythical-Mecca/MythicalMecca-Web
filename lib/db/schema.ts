import {
  pgTable,
  pgEnum,
  text,
  integer,
  timestamp,
  jsonb,
  uuid,
  primaryKey,
  index,
  uniqueIndex,
  boolean,
  doublePrecision,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["member", "vendor", "admin"]);
export const divisionEnum = pgEnum("division", [
  "tabletop",
  "arcade",
  "otaku",
  "maker",
]);
export const logLevelEnum = pgEnum("log_level", [
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

// ---------------------------------------------------------------------------
// Auth.js core tables (+ Mythic Mecha pilot columns)
// ---------------------------------------------------------------------------
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  // pilot profile
  role: roleEnum("role").notNull().default("member"),
  division: divisionEnum("division"),
  xp: integer("xp").notNull().default(0),
  syncRate: integer("sync_rate").notNull().default(0),
  rank: text("rank"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (account) => [
    primaryKey({ columns: [account.provider, account.providerAccountId] }),
  ]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (vt) => [primaryKey({ columns: [vt.identifier, vt.token] })]
);

// ---------------------------------------------------------------------------
// Deep logging — "Command telemetry"
// ---------------------------------------------------------------------------
export const activityLog = pgTable(
  "activity_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    action: text("action").notNull(),
    entityType: text("entity_type"),
    entityId: text("entity_id"),
    metadata: jsonb("metadata"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("activity_log_created_at_idx").on(t.createdAt),
    index("activity_log_actor_idx").on(t.actorId),
  ]
);

export const errorLog = pgTable(
  "error_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    level: logLevelEnum("level").notNull().default("error"),
    message: text("message").notNull(),
    stack: text("stack"),
    route: text("route"),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    metadata: jsonb("metadata"),
    requestId: text("request_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("error_log_created_at_idx").on(t.createdAt)]
);

export const pageHits = pgTable(
  "page_hits",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    path: text("path").notNull(),
    actorId: text("actor_id").references(() => users.id, {
      onDelete: "set null",
    }),
    referrer: text("referrer"),
    sessionId: text("session_id"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("page_hits_path_created_idx").on(t.path, t.createdAt)]
);

// ---------------------------------------------------------------------------
// Content domain enums
// ---------------------------------------------------------------------------
export const fileEntityEnum = pgEnum("file_entity", [
  "avatar",
  "post",
  "event",
  "vendor_gallery",
  "hunt_proof",
  "misc",
]);
export const postStatusEnum = pgEnum("post_status", [
  "draft",
  "published",
  "archived",
]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "live",
  "ended",
  "cancelled",
]);
export const appStatusEnum = pgEnum("app_status", [
  "pending",
  "approved",
  "rejected",
]);

// ---------------------------------------------------------------------------
// Files — central registry (uploader UI lands in Phase 2)
// ---------------------------------------------------------------------------
export const files = pgTable("files", {
  id: uuid("id").primaryKey().defaultRandom(),
  ownerId: text("owner_id").references(() => users.id, {
    onDelete: "set null",
  }),
  blobUrl: text("blob_url").notNull(),
  obscuredKey: text("obscured_key").notNull().unique(),
  originalName: text("original_name"),
  mime: text("mime"),
  sizeBytes: integer("size_bytes"),
  entityType: fileEntityEnum("entity_type"),
  entityId: text("entity_id"),
  width: integer("width"),
  height: integer("height"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Posts & news
// ---------------------------------------------------------------------------
export const posts = pgTable(
  "posts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    authorId: text("author_id").references(() => users.id, {
      onDelete: "set null",
    }),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    excerpt: text("excerpt"),
    bodyMd: text("body_md").notNull(),
    coverFileId: uuid("cover_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    division: divisionEnum("division"),
    status: postStatusEnum("status").notNull().default("draft"),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("posts_status_published_idx").on(t.status, t.publishedAt)]
);

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    bodyMd: text("body_md"),
    coverFileId: uuid("cover_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    division: divisionEnum("division"),
    status: eventStatusEnum("status").notNull().default("draft"),
    location: text("location"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity"),
    createdBy: text("created_by").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("events_starts_ends_idx").on(t.startsAt, t.endsAt)]
);

// ---------------------------------------------------------------------------
// Collab / distress beacon submissions
// ---------------------------------------------------------------------------
export const collabSubmissions = pgTable("collab_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  org: text("org"),
  message: text("message").notNull(),
  payload: jsonb("payload"),
  handled: boolean("handled").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Vendors — The Armory (approval flow in Phase 3; seeded for the gallery now)
// ---------------------------------------------------------------------------
export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" })
    .unique(),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  logoFileId: uuid("logo_file_id").references(() => files.id, {
    onDelete: "set null",
  }),
  socials: jsonb("socials"),
  division: divisionEnum("division"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const eventComments = pgTable(
  "event_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (t) => [index("event_comments_event_idx").on(t.eventId, t.createdAt)]
);

export const eventReviews = pgTable(
  "event_reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("event_reviews_unique").on(t.eventId, t.userId)]
);

export const vendorApplications = pgTable("vendor_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  status: appStatusEnum("status").notNull().default("pending"),
  businessName: text("business_name").notNull(),
  pitch: text("pitch").notNull(),
  socials: jsonb("socials"),
  payload: jsonb("payload"),
  reviewedBy: text("reviewed_by").references(() => users.id, {
    onDelete: "set null",
  }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const vendorGalleryItems = pgTable("vendor_gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorId: uuid("vendor_id")
    .notNull()
    .references(() => vendors.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  title: text("title"),
  caption: text("caption"),
  externalUrl: text("external_url"),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Scavenger hunts ("Ops")
// ---------------------------------------------------------------------------
export const stepTypeEnum = pgEnum("step_type", [
  "qr_scan",
  "riddle",
  "crossword",
  "cipher",
  "geo_checkpoint",
  "photo_proof",
  "trivia_gate",
  "unlock_code",
]);
export const huntModeEnum = pgEnum("hunt_mode", [
  "in_person",
  "remote",
  "hybrid",
]);
export const badgeTierEnum = pgEnum("badge_tier", [
  "bronze",
  "silver",
  "gold",
  "legendary",
]);

export const scavengerHunts = pgTable("scavenger_hunts", {
  id: uuid("id").primaryKey().defaultRandom(),
  eventId: uuid("event_id").references(() => events.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  mode: huntModeEnum("mode").notNull().default("hybrid"),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
  createdBy: text("created_by").references(() => users.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const huntSteps = pgTable(
  "hunt_steps",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    huntId: uuid("hunt_id")
      .notNull()
      .references(() => scavengerHunts.id, { onDelete: "cascade" }),
    sort: integer("sort").notNull().default(0),
    type: stepTypeEnum("type").notNull(),
    title: text("title").notNull(),
    prompt: text("prompt"),
    points: integer("points").notNull().default(10),
    config: jsonb("config"),
    requiresPrev: boolean("requires_prev").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("hunt_steps_hunt_idx").on(t.huntId, t.sort)]
);

export const huntProgress = pgTable(
  "hunt_progress",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    huntId: uuid("hunt_id")
      .notNull()
      .references(() => scavengerHunts.id, { onDelete: "cascade" }),
    stepId: uuid("step_id")
      .notNull()
      .references(() => huntSteps.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    payload: jsonb("payload"),
    pointsAwarded: integer("points_awarded").notNull().default(0),
  },
  (t) => [
    uniqueIndex("hunt_progress_unique").on(t.stepId, t.userId),
    index("hunt_progress_hunt_user_idx").on(t.huntId, t.userId),
  ]
);

// ---------------------------------------------------------------------------
// Gamification — XP, ranks, badges, squadrons
// ---------------------------------------------------------------------------
export const xpLedger = pgTable(
  "xp_ledger",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    delta: integer("delta").notNull(),
    reason: text("reason").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("xp_ledger_user_idx").on(t.userId)]
);

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  tier: badgeTierEnum("tier").notNull().default("bronze"),
  criteria: jsonb("criteria"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const userBadges = pgTable(
  "user_badges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id")
      .notNull()
      .references(() => badges.id, { onDelete: "cascade" }),
    awardedAt: timestamp("awarded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("user_badges_unique").on(t.userId, t.badgeId)]
);

export const seasons = pgTable("seasons", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  active: boolean("active").notNull().default(true),
});

export const squadronScores = pgTable(
  "squadron_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    seasonId: uuid("season_id")
      .notNull()
      .references(() => seasons.id, { onDelete: "cascade" }),
    division: divisionEnum("division").notNull(),
    points: integer("points").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("squadron_scores_unique").on(t.seasonId, t.division)]
);

// ---------------------------------------------------------------------------
// Arcade — training simulators
// ---------------------------------------------------------------------------
export const games = pgTable("games", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  division: divisionEnum("division"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const gameScores = pgTable(
  "game_scores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    score: integer("score").notNull(),
    meta: jsonb("meta"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("game_scores_game_idx").on(t.gameId, t.score)]
);
