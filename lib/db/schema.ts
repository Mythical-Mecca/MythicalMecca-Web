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
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------
export const roleEnum = pgEnum("role", ["member", "partner", "admin"]);
export const logLevelEnum = pgEnum("log_level", [
  "debug",
  "info",
  "warn",
  "error",
  "fatal",
]);

// ---------------------------------------------------------------------------
// Auth.js core tables (+ Mythical Mecca pilot columns)
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
  avatarUrl: text("avatar_url"),
  bannerUrl: text("banner_url"),
  role: roleEnum("role").notNull().default("member"),
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
  "event",
  "partner_gallery",
  "hunt_proof",
  "misc",
]);
export const eventStatusEnum = pgEnum("event_status", [
  "draft",
  "published",
  "live",
  "ended",
  "cancelled",
  // Append-only: community submissions awaiting / failing moderation.
  "pending",
  "rejected",
]);
export const eventOriginEnum = pgEnum("event_origin", [
  "hosted", // official Mythical Mecca event
  "partner", // hosted by a partner, endorsed by us
  "external", // reposted from elsewhere — link-out, no RSVP
  "community", // member-submitted, moderated
]);
export const appStatusEnum = pgEnum("app_status", [
  "draft",
  "pending",
  "approved",
  "rejected",
]);
export const galleryKindEnum = pgEnum("gallery_kind", ["art", "product"]);

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
// Events
// ---------------------------------------------------------------------------
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * The public URL, and only public events have one.
     *
     * Nullable because a draft has no public page to address — it was
     * `notNull`, so every event carried a URL whether or not anything answered
     * at it, and the admin form asked for one with the description "the public
     * URL" even on a draft. `status` remains the single source of truth for
     * visibility; the slug follows it. Still unique where present.
     */
    slug: text("slug").unique(),
    title: text("title").notNull(),
    summary: text("summary"),
    bodyMd: text("body_md"),
    coverFileId: uuid("cover_file_id").references(() => files.id, {
      onDelete: "set null",
    }),
    status: eventStatusEnum("status").notNull().default("draft"),
    location: text("location"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    startsAt: timestamp("starts_at", { withTimezone: true }),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    capacity: integer("capacity"),
    origin: eventOriginEnum("origin").notNull().default("hosted"),
    // origin=partner: shows on the partner's public page
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),
    // origin=external: repost metadata — no RSVP, just a link-out
    sourceName: text("source_name"),
    externalUrl: text("external_url"),
    // origin=community moderation (mirrors reviews)
    reviewedBy: text("reviewed_by").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewNote: text("review_note"),
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
  (t) => [
    index("events_starts_ends_idx").on(t.startsAt, t.endsAt),
    index("events_origin_status_idx").on(t.origin, t.status),
    index("events_partner_idx").on(t.partnerId),
  ]
);

// ---------------------------------------------------------------------------
// Chat — scoped by (scopeType, scopeId). Only events are chattable today; the
// enum stays a discriminator so another scope can be added without a new table.
// scopeId has no FK on purpose; clean up orphans if a delete action ever lands.
// ---------------------------------------------------------------------------
export const chatScopeEnum = pgEnum("chat_scope", ["event"]);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scopeType: chatScopeEnum("scope_type").notNull(),
    scopeId: uuid("scope_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    // admin soft delete
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedBy: text("deleted_by").references(() => users.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    index("chat_messages_scope_idx").on(t.scopeType, t.scopeId, t.createdAt),
  ]
);

// "Interested" marks for external events (count only; unique = idempotent)
export const eventInterests = pgTable(
  "event_interests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("event_interests_unique").on(t.eventId, t.userId)]
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
// Partner categories — admin-managed types (Vendors, Artists, Collaborators)
// with per-category settings that control how partners are created/displayed.
// ---------------------------------------------------------------------------
export const partnerCategories = pgTable("partner_categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description"),
  icon: text("icon"),
  color: text("color"),
  sort: integer("sort").notNull().default(0),
  active: boolean("active").notNull().default(true),
  // creation / management model
  requiresApplication: boolean("requires_application").notNull().default(true),
  allowSelfManage: boolean("allow_self_manage").notNull().default(true),
  allowAdminManage: boolean("allow_admin_manage").notNull().default(true),
  // display toggles for the public partner page
  showProducts: boolean("show_products").notNull().default(false),
  showArt: boolean("show_art").notNull().default(true),
  showReviews: boolean("show_reviews").notNull().default(true),
  showSocials: boolean("show_socials").notNull().default(true),
  showGallery: boolean("show_gallery").notNull().default(true),
  hasPremiumOption: boolean("has_premium_option").notNull().default(false),
  featuredOnHome: boolean("featured_on_home").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Partners — The Armory (vendors, artists, collaborators)
// ---------------------------------------------------------------------------
export const partners = pgTable("partners", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .references(() => users.id, { onDelete: "set null" })
    .unique(),
  categoryId: uuid("category_id").references(() => partnerCategories.id, {
    onDelete: "set null",
  }),
  slug: text("slug").notNull().unique(),
  businessName: text("business_name").notNull(),
  tagline: text("tagline"),
  bio: text("bio"),
  logoFileId: uuid("logo_file_id").references(() => files.id, {
    onDelete: "set null",
  }),
  socials: jsonb("socials"),
  isPremium: boolean("is_premium").notNull().default(false),
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

export const partnerApplications = pgTable("partner_applications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  categoryId: uuid("category_id").references(() => partnerCategories.id, {
    onDelete: "set null",
  }),
  status: appStatusEnum("status").notNull().default("pending"),
  businessName: text("business_name"),
  pitch: text("pitch").notNull(),
  images: jsonb("images"),
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

export const partnerGalleryItems = pgTable("partner_gallery_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  partnerId: uuid("partner_id")
    .notNull()
    .references(() => partners.id, { onDelete: "cascade" }),
  fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),
  kind: galleryKindEnum("kind").notNull().default("art"),
  imageUrl: text("image_url"),
  title: text("title"),
  caption: text("caption"),
  externalUrl: text("external_url"),
  sort: integer("sort").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// ---------------------------------------------------------------------------
// Galleries — global (homepage) + per-event
// ---------------------------------------------------------------------------
export const galleryItems = pgTable(
  "gallery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    uploadedBy: text("uploaded_by").references(() => users.id, {
      onDelete: "set null",
    }),
    published: boolean("published").notNull().default(true),
    sort: integer("sort").notNull().default(0),
    // Running totals kept by recordGalleryView: every open counts towards
    // views, and a viewer only ever adds one to uniqueViews — galleryItemViews
    // below is what decides whether this viewer has been counted already.
    views: integer("views").notNull().default(0),
    uniqueViews: integer("unique_views").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("gallery_items_sort_idx").on(t.sort)]
);

export const eventGalleryItems = pgTable(
  "event_gallery_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    imageUrl: text("image_url").notNull(),
    caption: text("caption"),
    sort: integer("sort").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("event_gallery_event_idx").on(t.eventId, t.sort)]
);

/**
 * One row per (photo, viewer) pair — the ledger behind `unique_views`.
 *
 * A viewer is a signed-in user where we have one, and otherwise the anonymous
 * id we drop in a long-lived cookie (see lib/gallery.ts). Storing the first
 * view rather than every view keeps this table bounded by audience size rather
 * than by traffic, and the unique index is what makes "count this viewer once"
 * a database guarantee instead of a race between two clicks.
 */
export const galleryItemViews = pgTable(
  "gallery_item_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    itemId: uuid("item_id")
      .notNull()
      .references(() => galleryItems.id, { onDelete: "cascade" }),
    viewerKey: text("viewer_key").notNull(),
    userId: text("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("gallery_item_views_viewer_idx").on(t.itemId, t.viewerKey),
  ]
);

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

// How an objective proves the adventurer is physically at the destination.
// The printed/NFC tag only ever *identifies* an objective — it never grants
// completion — so the mode can be switched mid-event without reprinting.
//   live_code  — vendor keeps a station page open; a code rolls every N seconds
//   sealed_tag — NFC tag that emits a fresh MAC per tap (NTAG 424 DNA class)
//   open_tag   — plain static tag; shareable by design, geofenced only
export const claimModeEnum = pgEnum("claim_mode", [
  "live_code",
  "sealed_tag",
  "open_tag",
]);

// Whether the adventurer is told where they're going, or has to work it out.
export const revealModeEnum = pgEnum("reveal_mode", ["direct", "clue"]);

// Every claim attempt is logged, whatever the outcome — this is what makes
// sharing visible on the admin monitor even in `open_tag` mode.
export const claimOutcomeEnum = pgEnum("claim_outcome", [
  "ok",
  "duplicate",
  "bad_code",
  "out_of_range",
  "not_open",
  "unknown_step",
  // Too many wrong codes in a short window — see tooManyBadAttempts().
  "rate_limited",
  // A prerequisite objective hasn't been cleared yet — see prerequisiteFor().
  "locked",
]);
export const scavengerHunts = pgTable("scavenger_hunts", {
  id: uuid("id").primaryKey().defaultRandom(),
  /**
   * Quests are strictly event-bound: there is nowhere on the site a quest
   * appears without one, and venue checks measure from the event's
   * coordinates. Cascade rather than the old `set null`, which manufactured
   * exactly the orphan this column now forbids.
   */
  eventId: uuid("event_id")
    .notNull()
    .references(() => events.id, { onDelete: "cascade" }),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  description: text("description"),
  mode: huntModeEnum("mode").notNull().default("hybrid"),
  /**
   * How the trail may be walked.
   *
   * `true` — strictly in order: an objective opens only once everything before
   * it (by `sort`) is cleared.
   * `false` — free, except where an objective names a `parentId`; that one
   * waits for its parent and the rest can be done whenever.
   */
  sequential: boolean("sequential").notNull().default(false),
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
    // The destination. A quest is primarily a route between partners, so most
    // objectives point at one; free-form points of interest leave it null and
    // use `title` + `locationHint` instead.
    partnerId: uuid("partner_id").references(() => partners.id, {
      onDelete: "set null",
    }),
    /** Where to find it on the floor — "Hall B, stand 14". */
    locationHint: text("location_hint"),
    /**
     * Optional prerequisite, used only when the quest is not `sequential`.
     *
     * Self-referential, so it is declared with an explicit type annotation and
     * a callback — Drizzle can't infer a table that mentions itself. Set null
     * on delete: removing a prerequisite unlocks its dependants rather than
     * deleting them with it.
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => huntSteps.id, {
      onDelete: "set null",
    }),
    revealMode: revealModeEnum("reveal_mode").notNull().default("direct"),
    claimMode: claimModeEnum("claim_mode").notNull().default("live_code"),
    /** Geofence for `open_tag`, in metres. Null falls back to the event radius. */
    claimRadiusM: integer("claim_radius_m"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("hunt_steps_hunt_idx").on(t.huntId, t.sort)]
);

/**
 * One row per objective that a vendor staffs. Holds the rotating-code secret.
 * Separate from the step so the key can be rotated (or the station handed to a
 * different device) without touching quest content.
 */
export const huntStations = pgTable("hunt_stations", {
  id: uuid("id").primaryKey().defaultRandom(),
  stepId: uuid("step_id")
    .notNull()
    .unique()
    .references(() => huntSteps.id, { onDelete: "cascade" }),
  /** base64 secret; codes are HMAC(key, timeWindow). Never sent to the client. */
  stationKey: text("station_key").notNull(),
  rotationSeconds: integer("rotation_seconds").notNull().default(60),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const huntClaimAttempts = pgTable(
  "hunt_claim_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    stepId: uuid("step_id").references(() => huntSteps.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    outcome: claimOutcomeEnum("outcome").notNull(),
    claimMode: claimModeEnum("claim_mode"),
    /** Coarse source address, for spotting one device claiming for a crowd. */
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("hunt_claim_attempts_step_idx").on(t.stepId, t.createdAt),
    index("hunt_claim_attempts_user_idx").on(t.userId, t.createdAt),
  ]
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
// Reviews — unified, approvable. Site-wide testimonials (target_type="site")
// and per-partner reviews (target_type="partner", target_id=partner.id).
// Always tied to a logged-in user; `is_anonymous` only hides the name publicly.
// ---------------------------------------------------------------------------
export const reviewTargetEnum = pgEnum("review_target", ["site", "partner"]);

export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    targetType: reviewTargetEnum("target_type").notNull(),
    // partner id for partner reviews; null for site-wide testimonials
    targetId: text("target_id"),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rating: integer("rating").notNull(),
    body: text("body"),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    status: appStatusEnum("status").notNull().default("pending"),
    featured: boolean("featured").notNull().default(false),
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
  },
  (t) => [
    index("reviews_target_idx").on(t.targetType, t.targetId, t.status),
    index("reviews_status_idx").on(t.status),
  ]
);
