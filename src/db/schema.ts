/**
 * Vyhel database schema (PostgreSQL / Neon).
 *
 * Conventions
 * - UUID primary keys for content, bigserial for high-volume event tables.
 * - `status` drives visibility. Only `published` rows are ever served publicly.
 * - `is_demo` marks development seed data so it can be labelled and removed.
 * - Affiliate destinations live in `affiliate_links` (one product → many merchants),
 *   with exactly one `is_primary` link per product used by the public CTA.
 */
import { sql } from "drizzle-orm";
import {
  bigserial,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: "date" });

/* ------------------------------------------------------------------ enums */

export const userRole = pgEnum("user_role", ["admin", "editor"]);
export const productStatus = pgEnum("product_status", ["draft", "published", "archived"]);
export const guideStatus = pgEnum("guide_status", ["draft", "review", "published", "archived"]);
export const collectionStatus = pgEnum("collection_status", ["draft", "published", "archived"]);
export const linkStatus = pgEnum("link_status", ["unverified", "verified", "broken"]);
export const guideType = pgEnum("guide_type", [
  "buying_guide",
  "comparison",
  "review",
  "problem_solver",
]);
export const productBadge = pgEnum("product_badge", [
  "editors_pick",
  "best_for_students",
  "best_for_cars",
  "worth_considering",
]);

/* ------------------------------------------------------------------ auth */

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  name: text("name").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  role: userRole("role").notNull().default("editor"),
  disabled: boolean("disabled").notNull().default(false),
  lastLoginAt: ts("last_login_at"),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

/** Public-facing author profile, kept separate from credentials. */
export const profiles = pgTable("profiles", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  displayName: text("display_name").notNull().default(""),
  bio: text("bio"),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const sessions = pgTable(
  "sessions",
  {
    /** SHA-256 of the opaque session token. The raw token only ever lives in the cookie. */
    id: text("id").primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: ts("expires_at").notNull(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    email: text("email").notNull(),
    success: boolean("success").notNull(),
    attemptedAt: ts("attempted_at").notNull().defaultNow(),
  },
  (t) => [index("login_attempts_email_idx").on(t.email, t.attemptedAt)],
);

/* --------------------------------------------------------------- content */

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description").notNull().default(""),
  image: text("image"),
  imageAlt: text("image_alt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export type FaqItem = { question: string; answer: string };

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    brand: text("brand"),
    asin: text("asin"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    subcategory: text("subcategory"),
    shortDescription: text("short_description").notNull().default(""),
    /** One-line editorial statement shown under the title. */
    editorialStatement: text("editorial_statement"),
    /** "The quick take" — 2–4 sentences. */
    description: text("description").notNull().default(""),
    whyPicked: text("why_picked"),
    bestFor: text("best_for").array().notNull().default(sql`'{}'::text[]`),
    notFor: text("not_for").array().notNull().default(sql`'{}'::text[]`),
    thingsToKnow: text("things_to_know"),
    pros: text("pros").array().notNull().default(sql`'{}'::text[]`),
    cons: text("cons").array().notNull().default(sql`'{}'::text[]`),
    whoShouldBuy: text("who_should_buy"),
    whoShouldSkip: text("who_should_skip"),
    faq: jsonb("faq").$type<FaqItem[]>().notNull().default([]),
    vyhelScore: numeric("vyhel_score", { precision: 3, scale: 1, mode: "number" }),
    usefulnessScore: numeric("usefulness_score", { precision: 3, scale: 1, mode: "number" }),
    easeScore: numeric("ease_score", { precision: 3, scale: 1, mode: "number" }),
    versatilityScore: numeric("versatility_score", { precision: 3, scale: 1, mode: "number" }),
    valueScore: numeric("value_score", { precision: 3, scale: 1, mode: "number" }),
    designScore: numeric("design_score", { precision: 3, scale: 1, mode: "number" }),
    badge: productBadge("badge"),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    /** Where the image came from / why Vyhel may use it. Required when an image is set. */
    imageSource: text("image_source"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    ogTitle: text("og_title"),
    ogDescription: text("og_description"),
    ogImage: text("og_image"),
    canonicalUrl: text("canonical_url"),
    status: productStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    editorsPick: boolean("editors_pick").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
    publishedAt: ts("published_at"),
  },
  (t) => [
    index("products_status_idx").on(t.status, t.publishedAt),
    index("products_category_idx").on(t.categoryId),
  ],
);

/** Manually curated relationships ("alternatives", "budget pick", …). Future-ready for recommendations. */
export const productRelations = pgTable(
  "product_relations",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relatedProductId: uuid("related_product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    relationType: text("relation_type").notNull().default("alternative"),
    sortOrder: integer("sort_order").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.productId, t.relatedProductId] })],
);

export const collections = pgTable("collections", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tagline: text("tagline"),
  description: text("description").notNull().default(""),
  /** "Why this collection exists" — markdown. */
  intro: text("intro"),
  heroImage: text("hero_image"),
  heroImageAlt: text("hero_image_alt"),
  seoTitle: text("seo_title"),
  seoDescription: text("seo_description"),
  featured: boolean("featured").notNull().default(false),
  sortOrder: integer("sort_order").notNull().default(0),
  status: collectionStatus("status").notNull().default("draft"),
  isDemo: boolean("is_demo").notNull().default(false),
  createdAt: ts("created_at").notNull().defaultNow(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const collectionProducts = pgTable(
  "collection_products",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"),
  },
  (t) => [
    primaryKey({ columns: [t.collectionId, t.productId] }),
    index("collection_products_product_idx").on(t.productId),
  ],
);

export const guides = pgTable(
  "guides",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    title: text("title").notNull(),
    slug: text("slug").notNull().unique(),
    subtitle: text("subtitle"),
    excerpt: text("excerpt").notNull().default(""),
    /** Markdown. Rendered without raw HTML, so it cannot inject markup. */
    content: text("content").notNull().default(""),
    conclusion: text("conclusion"),
    guideType: guideType("guide_type").notNull().default("buying_guide"),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    heroImage: text("hero_image"),
    heroImageAlt: text("hero_image_alt"),
    author: text("author").notNull().default("Vyhel Editorial"),
    readingTime: integer("reading_time"),
    seoTitle: text("seo_title"),
    seoDescription: text("seo_description"),
    canonicalUrl: text("canonical_url"),
    status: guideStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    isDemo: boolean("is_demo").notNull().default(false),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    publishedAt: ts("published_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("guides_status_idx").on(t.status, t.publishedAt)],
);

/** Secondary categories for a guide (primary lives on guides.category_id). */
export const guideCategories = pgTable(
  "guide_categories",
  {
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.categoryId] })],
);

export const guideProducts = pgTable(
  "guide_products",
  {
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    sortOrder: integer("sort_order").notNull().default(0),
    note: text("note"),
  },
  (t) => [
    primaryKey({ columns: [t.guideId, t.productId] }),
    index("guide_products_product_idx").on(t.productId),
  ],
);

export const guideRelations = pgTable(
  "guide_relations",
  {
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
    relatedGuideId: uuid("related_guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.guideId, t.relatedGuideId] })],
);

export const collectionGuides = pgTable(
  "collection_guides",
  {
    collectionId: uuid("collection_id")
      .notNull()
      .references(() => collections.id, { onDelete: "cascade" }),
    guideId: uuid("guide_id")
      .notNull()
      .references(() => guides.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.collectionId, t.guideId] })],
);

/* ------------------------------------------------------------- affiliate */

export const affiliateLinks = pgTable(
  "affiliate_links",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    /** amazon today; other networks, direct brands or own products later. */
    merchant: text("merchant").notNull().default("amazon"),
    label: text("label"),
    amazonUrl: text("amazon_url"),
    /** The exact Special Link copied from Amazon Associates (SiteStripe / Associates Central). */
    specialLink: text("special_link").notNull(),
    asin: text("asin"),
    associateTag: text("associate_tag"),
    subTag: text("sub_tag"),
    isPrimary: boolean("is_primary").notNull().default(true),
    isSponsored: boolean("is_sponsored").notNull().default(false),
    status: linkStatus("status").notNull().default("unverified"),
    lastCheckedAt: ts("last_checked_at"),
    notes: text("notes"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("affiliate_links_product_idx").on(t.productId),
    uniqueIndex("affiliate_links_one_primary")
      .on(t.productId)
      .where(sql`${t.isPrimary} = true`),
  ],
);

/** Aggregate click log. No IP addresses, no user agents, no cookies, no user identifiers. */
export const affiliateClicks = pgTable(
  "affiliate_clicks",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    productId: uuid("product_id").references(() => products.id, { onDelete: "set null" }),
    affiliateLinkId: uuid("affiliate_link_id").references(() => affiliateLinks.id, {
      onDelete: "set null",
    }),
    pageType: text("page_type").notNull().default("product"),
    pageId: uuid("page_id"),
    pagePath: text("page_path"),
    source: text("source").notNull().default("direct"),
    campaign: text("campaign"),
    placement: text("placement").notNull().default("unknown"),
    clickedAt: ts("clicked_at").notNull().defaultNow(),
  },
  (t) => [
    index("affiliate_clicks_time_idx").on(t.clickedAt),
    index("affiliate_clicks_product_idx").on(t.productId, t.clickedAt),
  ],
);

/**
 * First-party content analytics (product_view, guide_view, collection_view, category_view,
 * search, cta_click, page_view). `session_id` is a random per-tab id from sessionStorage that
 * is never linked to a person and disappears when the tab closes.
 */
export const analyticsEvents = pgTable(
  "analytics_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    eventType: text("event_type").notNull(),
    path: text("path"),
    entityType: text("entity_type"),
    entityId: uuid("entity_id"),
    source: text("source").notNull().default("direct"),
    campaign: text("campaign"),
    sessionId: text("session_id"),
    meta: jsonb("meta").$type<Record<string, string | number | boolean | null>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("analytics_events_type_time_idx").on(t.eventType, t.createdAt),
    index("analytics_events_entity_idx").on(t.entityId),
  ],
);

/* ----------------------------------------------------------------- media */

export const media = pgTable("media", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  url: text("url").notNull(),
  storage: text("storage").notNull().default("database"),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  width: integer("width"),
  height: integer("height"),
  alt: text("alt").notNull().default(""),
  /** Required: who took it / where it's licensed from. */
  source: text("source").notNull(),
  licenseNote: text("license_note"),
  entityType: text("entity_type"),
  entityId: uuid("entity_id"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

/** Bytes for media stored in Postgres (used when Vercel Blob isn't configured). */
export const mediaBlobs = pgTable("media_blobs", {
  mediaId: uuid("media_id")
    .primaryKey()
    .references(() => media.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

/* -------------------------------------------------------------- settings */

export const siteSettings = pgTable("site_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: ts("updated_at").notNull().defaultNow(),
});

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    userEmail: text("user_email"),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    action: text("action").notNull(),
    summary: text("summary"),
    changes: jsonb("changes").$type<Record<string, unknown>>(),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("audit_logs_time_idx").on(t.createdAt)],
);

/* ==================================================================
   DIGITAL PRODUCTS — sold directly by Vyhel (Razorpay + email delivery).
   Completely separate from the affiliate `products` above: different
   tables, routes, admin screens and purchase flow.
   ================================================================== */

export const digitalProductStatus = pgEnum("digital_product_status", ["draft", "active", "inactive", "archived"]);
export const paymentStatus = pgEnum("payment_status", ["created", "paid", "failed", "refunded"]);
export const deliveryStatus = pgEnum("delivery_status", ["pending", "sent", "failed"]);

/** Private deliverable files. Never served from a public URL. */
export const digitalFiles = pgTable("digital_files", {
  id: uuid("id").primaryKey().defaultRandom(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull().default(0),
  sha256: text("sha256"),
  /** "database" (bytes in digital_file_blobs) or "s3" (private S3/R2 bucket). */
  storage: text("storage").notNull().default("database"),
  /** Object key for "s3" storage. */
  storageKey: text("storage_key"),
  uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export const digitalFileBlobs = pgTable("digital_file_blobs", {
  fileId: uuid("file_id")
    .primaryKey()
    .references(() => digitalFiles.id, { onDelete: "cascade" }),
  data: bytea("data").notNull(),
});

export const digitalProducts = pgTable(
  "digital_products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    shortDescription: text("short_description").notNull().default(""),
    /** Markdown, rendered without raw HTML. */
    description: text("description").notNull().default(""),
    /** Price in the smallest currency unit (paise). The ONLY source of truth for checkout amounts. */
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    imageUrl: text("image_url"),
    imageAlt: text("image_alt"),
    fileId: uuid("file_id").references(() => digitalFiles.id, { onDelete: "set null" }),
    /** Shown inside the Razorpay checkout window. */
    checkoutDescription: text("checkout_description"),
    whatsIncluded: text("whats_included").array().notNull().default(sql`'{}'::text[]`),
    status: digitalProductStatus("status").notNull().default("draft"),
    featured: boolean("featured").notNull().default(false),
    sortOrder: integer("sort_order").notNull().default(0),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [index("digital_products_status_idx").on(t.status, t.sortOrder)],
);

export const digitalOrders = pgTable(
  "digital_orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => digitalProducts.id, { onDelete: "restrict" }),
    /** Snapshot so the order stays readable if the product is renamed. */
    productName: text("product_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    customerName: text("customer_name"),
    amountMinor: integer("amount_minor").notNull(),
    currency: text("currency").notNull().default("INR"),
    razorpayOrderId: text("razorpay_order_id").notNull().unique(),
    razorpayPaymentId: text("razorpay_payment_id").unique(),
    razorpaySignature: text("razorpay_signature"),
    paymentStatus: paymentStatus("payment_status").notNull().default("created"),
    paymentSource: text("payment_source"),
    failureReason: text("failure_reason"),
    deliveryStatus: deliveryStatus("delivery_status").notNull().default("pending"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    lastDeliveryAt: ts("last_delivery_at"),
    lastDeliveryError: text("last_delivery_error"),
    paidAt: ts("paid_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
    updatedAt: ts("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("digital_orders_status_idx").on(t.paymentStatus, t.createdAt),
    index("digital_orders_product_idx").on(t.productId),
    index("digital_orders_email_idx").on(t.customerEmail),
  ],
);

/** Download links. Only the SHA-256 of each token is stored; the raw token lives in the email/URL. */
export const digitalDownloadTokens = pgTable(
  "digital_download_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => digitalOrders.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    reason: text("reason").notNull().default("checkout"),
    expiresAt: ts("expires_at").notNull(),
    maxDownloads: integer("max_downloads").notNull().default(10),
    downloadCount: integer("download_count").notNull().default(0),
    revokedAt: ts("revoked_at"),
    lastUsedAt: ts("last_used_at"),
    createdAt: ts("created_at").notNull().defaultNow(),
  },
  (t) => [index("digital_download_tokens_order_idx").on(t.orderId)],
);

/** Razorpay webhook deliveries we've processed (ids only — no payloads, no card data). */
export const paymentEvents = pgTable("payment_events", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  provider: text("provider").notNull().default("razorpay"),
  eventId: text("event_id").notNull().unique(),
  eventType: text("event_type").notNull(),
  razorpayOrderId: text("razorpay_order_id"),
  razorpayPaymentId: text("razorpay_payment_id"),
  createdAt: ts("created_at").notNull().defaultNow(),
});

export type DigitalProduct = typeof digitalProducts.$inferSelect;
export type DigitalOrder = typeof digitalOrders.$inferSelect;
export type DigitalFile = typeof digitalFiles.$inferSelect;

export type Product = typeof products.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Collection = typeof collections.$inferSelect;
export type Guide = typeof guides.$inferSelect;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type User = typeof users.$inferSelect;
export type Media = typeof media.$inferSelect;
