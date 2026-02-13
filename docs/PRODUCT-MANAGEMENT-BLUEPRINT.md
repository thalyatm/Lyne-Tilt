# Product Management System Blueprint

**Lyne Tilt Admin Centre — Implementation-Ready Specification**

---

## 1. Assumptions

These assumptions are made explicitly and the entire blueprint proceeds on them:

1. **Lyne Tilt is a boutique artisan business.** Products are handmade, often one-of-a-kind. This is not a high-volume marketplace. The system must serve a creator-merchant, not a warehouse operation.

2. **Two product families exist: Wearable Art and Wall Art.** These share 90% of their data model but diverge on physical attributes (dimensions for wall art, materials/weight for wearables). They will be unified into a single `products` table with a `productType` discriminator.

3. **Variants are limited in scope.** This is not a t-shirt sizing operation. Variants here mean: a brooch available in two colourways, or a print available in two sizes. The variant system must exist but remain lightweight — no infinite matrix combinatorics.

4. **Inventory is unit-level, not warehouse-level.** There is one location (Brisbane studio). Stock is tracked as a simple integer quantity per product/variant. No multi-warehouse, no bins, no lot tracking.

5. **The existing Cloudflare Workers + D1 + Hono + Drizzle stack is the target platform.** All schemas are SQLite-compatible. All API routes are Hono handlers. R2 is the media store.

6. **Stripe is the sole payment processor.** Stripe product/price IDs are synced from the admin. No multi-gateway.

7. **AUD is the primary currency.** Multi-currency is a display concern only — Stripe handles conversion. The system stores prices in a single currency with an optional secondary display price.

8. **The existing admin component library (DataTable, FormModal, AccordionSection, ArrayEditor, RichTextEditor) is the UI foundation.** New components extend this system, not replace it.

9. **The current user base is 1-2 admin users.** Role-based permissions are defined for future growth but Phase 1 implements single-role (Owner) access.

10. **SEO and structured data matter.** Products must generate proper Open Graph tags, JSON-LD schema markup, and clean URLs. This is a direct-to-consumer brand where organic discovery drives revenue.

---

## 2. Competitive Teardown — Extracted Structural Mechanics

Analysis of Shopify, Squarespace Commerce, Etsy Seller Tools, BigCommerce, and WooCommerce yields these winning patterns:

### Non-Negotiable Structural Mechanics

| Mechanic | Why It Wins |
|---|---|
| **Unified product object with type discriminator** | Eliminates table sprawl. Every product is a product. Type-specific fields are nullable columns or JSON metadata. Shopify, BigCommerce, and Squarespace all use this. |
| **Slug-first URLs** | `/products/hand-painted-brooch-autumn` not `/products/abc123`. Every platform enforces unique slugs with collision resolution. |
| **Variant → SKU → Inventory as separate layers** | Product holds brand/marketing data. Variant holds option combinations. Each variant has a SKU and an inventory record. This three-layer model scales from 1 to 10,000 products without restructuring. |
| **Status lifecycle with guardrails** | Draft → Active → Archived is the minimum. Transitions have preconditions (e.g., must have at least one image to go Active). Prevents broken storefronts. |
| **Media as first-class objects** | Images are not strings in a JSON array. They are records with alt text, sort order, dimensions, and variant association. This enables accessibility compliance and proper SEO. |
| **Autosave + explicit publish** | Changes are saved continuously. Publishing is a deliberate action. This separates "working on it" from "live on the site." Shopify and Squarespace both use this pattern. |
| **Soft delete everywhere** | Products referenced by orders are never hard-deleted. Archive hides from storefront. Delete moves to trash with 30-day recovery. |
| **Activity audit on every mutation** | Every create, update, publish, archive, and delete is logged with user, timestamp, and changed fields. Non-negotiable for commerce. |
| **Inline validation, not submit-and-pray** | Field-level validation as the user types. Form-level validation before save. Server-side validation as final gate. Three layers, always. |
| **Bulk operations with preview** | Select multiple → choose action → preview changes → confirm. Never apply bulk changes without showing the user what will happen. |

### Patterns That Differentiate Serious Infrastructure

| Pattern | Implementation |
|---|---|
| **Optimistic UI with rollback** | Show the change immediately, revert on server error. Makes the admin feel instant. |
| **Smart defaults** | New product pre-fills: AUD currency, "In stock" availability, Draft status, Brisbane shipping origin. Reduce decisions on every creation. |
| **Keyboard shortcuts** | `Cmd+S` saves. `Cmd+Shift+P` publishes. `Escape` closes modals. Power users expect this. |
| **Search-first navigation** | Global search (`Cmd+K`) finds any product by name, SKU, or category. For catalogs over 20 items, search beats scrolling. |
| **Undo on destructive actions** | Archive shows a toast with "Undo" for 8 seconds. Better than a confirmation modal that interrupts flow. |

---

## 3. Non-Negotiable Principles

1. **Every product has exactly one source of truth.** One table. One API. One admin screen. The current split between `products` and `wallArtProducts` tables is eliminated.

2. **The storefront never shows broken state.** A product cannot go Active without: a name, a price > 0, at least one image, a category, and a short description. The system enforces this, not the merchant's memory.

3. **Speed over ceremony.** Creating a simple product (name, price, one image, category) must be completable in under 60 seconds. Advanced fields are progressive disclosure — visible but not blocking.

4. **Data integrity over convenience.** Soft deletes. Audit logs. Referential integrity between orders and products. No orphaned data.

5. **The URL is sacred.** Once a product slug is published and indexed, changing it creates a redirect. Broken URLs are revenue leaks.

6. **Images are not optional metadata.** They are core product data with enforced alt text, defined sort order, and variant association capability.

---

## 4. Full Product Specification

---

### A) Goals & Non-Goals

#### Goals

- **Speed:** Product creation in <60 seconds for simple products, <3 minutes for complex products with variants
- **Safety:** Impossible to publish a product missing critical fields. Impossible to accidentally delete a product with order history.
- **Scalability:** Handles 1 to 5,000 products without UI degradation or query performance issues
- **Clarity:** The admin always shows what's live, what's draft, and what's archived. No ambiguity.
- **Conversion support:** SEO fields, structured data, and media management that directly support organic discovery and purchase conversion
- **Flexibility:** Supports physical goods (wearables, wall art), digital downloads, and future product types without schema changes

#### Non-Goals

- **Multi-warehouse inventory:** Out of scope. Single location.
- **Complex discount engine:** Stripe handles coupons. No in-app discount rule builder in Phase 1.
- **Multi-language:** English only.
- **Marketplace features:** No multi-vendor, no seller onboarding.
- **Subscription management:** Out of scope for Phase 1. Schema reserves space for it.
- **A/B testing of product pages:** Out of scope.

---

### B) User Roles & Permission Matrix

#### Roles

| Role | Description |
|---|---|
| **Owner** | Full access. Business owner. Can do everything including destructive operations. |
| **Admin** | Full product management. Cannot change billing or delete the Owner account. |
| **Product Manager** | Create, edit, publish products. Cannot delete products or access cost/margin data. |
| **Editor** | Edit existing products only. Cannot create, delete, or change prices. |
| **Support** | Read-only product access. Can view inventory and order references. |
| **Analyst** | Read-only. Access to analytics and export. No mutation capabilities. |

#### Permission Matrix

| Action | Owner | Admin | Product Mgr | Editor | Support | Analyst |
|---|---|---|---|---|---|---|
| Create product | Y | Y | Y | - | - | - |
| Edit product fields | Y | Y | Y | Y | - | - |
| Delete product | Y | Y | - | - | - | - |
| Publish / Unpublish | Y | Y | Y | - | - | - |
| Archive / Unarchive | Y | Y | Y | - | - | - |
| Change price | Y | Y | Y | - | - | - |
| Manage inventory | Y | Y | Y | Y | - | - |
| Manage variants | Y | Y | Y | - | - | - |
| Access cost data | Y | Y | - | - | - | - |
| Access analytics | Y | Y | Y | - | - | Y |
| Bulk operations | Y | Y | Y | - | - | - |
| Export data | Y | Y | Y | - | - | Y |
| Manage collections | Y | Y | Y | - | - | - |
| Manage media library | Y | Y | Y | Y | - | - |
| View audit log | Y | Y | Y | - | - | - |

**Phase 1 implementation:** Owner role only. The permission check middleware is built but all current users receive Owner permissions. Roles are activated in Phase 2.

---

### C) Information Architecture

#### Navigation Structure (within Products section)

```
Shop (sidebar section)
├── Products          → Product list view (all types, filterable)
├── Collections       → Collection management (Phase 2)
└── Inventory         → Inventory overview (Phase 2)
```

#### Screens

| Screen | Route | Purpose |
|---|---|---|
| Product List | `/admin/products` | Filterable, searchable table of all products |
| Product Editor | `/admin/products/new` | Full-page product creation form |
| Product Editor | `/admin/products/:id` | Full-page product edit form |
| Collections | `/admin/collections` | Collection list + editor (Phase 2) |
| Inventory Overview | `/admin/inventory` | Cross-product inventory table (Phase 2) |

#### Object Hierarchy

```
Product (unified)
├── productType: 'wearable' | 'wall-art' | 'digital'
├── Variants[] (optional)
│   ├── option values (e.g., colour: "Midnight Blue")
│   ├── sku
│   ├── price override (optional)
│   ├── inventory quantity
│   └── MediaAsset[] (variant-specific images)
├── MediaAsset[] (product-level images)
│   ├── url, alt, sortOrder
│   └── variantId (optional association)
├── SEO metadata
│   ├── slug, metaTitle, metaDescription
│   └── ogImage
├── Pricing
│   ├── price, compareAtPrice, costPrice
│   └── taxable, taxProfileId
├── Shipping
│   ├── weight, dimensions (physical only)
│   └── shippingProfileId
├── Collections[] (many-to-many)
└── Status lifecycle
    └── draft | active | archived | discontinued
```

---

### D) Core UX Flows

#### Flow 1: Create New Product (Physical — Wearable or Wall Art)

**Entry point:** "Add Product" button on Product List page, or `Cmd+N` shortcut.

**Step 1 — Product type selection**
- Full-page editor opens at `/admin/products/new`
- Top bar shows: Product type selector (Wearable Art / Wall Art / Digital)
- Default: Wearable Art
- Selecting type reveals/hides type-specific fields (dimensions for wall art)

**Step 2 — Essential fields (left column, 60% width)**
- **Title** (required, text input, auto-generates slug on first blur)
- **Short description** (required, textarea, 200 char soft limit with counter)
- **Long description** (optional, RichTextEditor with Tiptap)
- **Media section** (drag-drop zone, multi-file, reorderable thumbnails)
  - First uploaded image becomes primary automatically
  - Alt text input appears below each image (required for publish)

**Step 3 — Product details (right column, 40% width)**
- **Status card:** Shows "Draft" badge. Save / Publish buttons.
- **Pricing card:**
  - Price (required, number input, AUD prefix)
  - Compare-at price (optional, for showing crossed-out original price)
  - Cost price (optional, for margin calculation, hidden from non-Owner roles)
- **Organisation card:**
  - Product type (already selected, can change)
  - Category (required, select: Earrings/Brooches/Necklaces for wearable, Prints/Originals/Mixed Media for wall art)
  - Tags (optional, comma-separated free-text)
  - Badge (optional, select: ONE OF A KIND, LIMITED EDITION, NEW, BESTSELLER, or custom text)
- **Inventory card:**
  - Track inventory toggle (default: on)
  - Quantity (integer, default: 1 for handmade items)
  - "Continue selling when out of stock" toggle (default: off)
- **Shipping card** (physical only):
  - Weight (grams)
  - Dimensions (wall art only: width x height, text field)

**Step 4 — SEO (collapsible section below main content)**
- URL slug (auto-generated from title, editable)
- Meta title (defaults to product title, 60 char target with counter)
- Meta description (defaults to short description, 160 char target with counter)
- Preview card showing Google search result appearance

**Step 5 — Save**
- Autosave fires 3 seconds after last edit (saves as Draft)
- "Save" button saves current state
- "Publish" button validates all required fields, then sets status to Active

**Validation rules:**
| Field | Rule |
|---|---|
| Title | Required. 1-200 chars. |
| Short description | Required for publish. Max 500 chars. |
| Price | Required. Must be > 0. |
| Category | Required. Must match product type. |
| Image | At least 1 image required for publish. |
| Alt text | Required on all images for publish. |
| Slug | Required. Unique. Auto-generated. Lowercase alphanumeric + hyphens. |
| Quantity | Integer >= 0 when tracking inventory. |

**Confirmation states:**
- Autosave: subtle "Saved" indicator in top bar, no modal
- Manual save: "Saved" indicator
- Publish: "Product is now live" toast with "View on site" link

**Error states:**
- Validation failure on publish: scroll to first error field, highlight in red, show inline message
- Network error on save: "Save failed — retrying..." with automatic retry (3 attempts, exponential backoff)
- Slug collision: append `-2`, `-3`, etc. automatically, show notice

**Success states:**
- After publish: redirect to product list with success toast
- After save (draft): stay on editor, show saved indicator

#### Flow 2: Create New Product (Digital)

Same as Flow 1 with these differences:
- No Shipping card
- No Weight/Dimensions fields
- Inventory card replaced with "Download file" upload field
- Download limit field (optional, integer, 0 = unlimited)
- File type display (auto-detected: PDF, ZIP, etc.)

**Phase 1 note:** Digital products are schema-ready but UI is Phase 2. The product type selector shows "Digital (Coming Soon)" as disabled.

#### Flow 3: Create Subscription Product

Deferred to Phase 3. Schema reserves `subscriptionPlanId` field.

#### Flow 4: Add Variants

**Entry point:** "Variants" section on product editor (collapsed by default).

**Step 1 — Define option**
- Click "Add option" button
- Option name field appears (e.g., "Colour", "Size")
- Option values field: tag-style input, type value + Enter to add
- Example: Option "Colour" → values: "Midnight Blue", "Forest Green", "Copper"

**Step 2 — Variant rows auto-generate**
- Table appears below with one row per option combination
- Columns: Variant name, SKU (auto-generated, editable), Price (inherits product price), Quantity, Image
- Each row is inline-editable

**Step 3 — Variant-specific overrides**
- Click variant row to expand
- Override: price, compare-at price, SKU, quantity, image(s)
- Non-overridden fields inherit from parent product

**Validation:**
- SKU must be unique across all products/variants
- At least one variant must have quantity > 0 for Active products (if tracking inventory)
- Deleting the last variant removes the option entirely

**Limits:**
- Maximum 2 option types per product (e.g., Colour + Size)
- Maximum 10 values per option
- Maximum 20 total variants per product

#### Flow 5: Bulk Edit Products

**Entry point:** Checkboxes on Product List → "Edit selected" action bar appears at bottom.

**Step 1 — Select products**
- Individual checkboxes per row
- "Select all" checkbox in header (selects current filtered view, not all products)
- Counter shows "X selected"

**Step 2 — Choose action**
- Bottom action bar shows: "Update fields", "Change status", "Add to collection", "Export", "Delete"

**Step 3 — "Update fields" flow**
- Modal opens with field selector
- Choose fields to update: Category, Badge, Availability, Tags
- Enter new value(s)
- Preview table shows: Product name | Current value | New value
- Confirm button applies changes

**Step 4 — Confirmation**
- "Apply to X products?" confirmation
- Progress indicator during application
- Results summary: "X updated, Y failed" with error details for failures

#### Flow 6: Duplicate Product

**Entry point:** Three-dot menu on product row → "Duplicate", or `Cmd+D` on product editor.

**Behavior:**
- Creates new product with all fields copied
- Title becomes "[Original Title] (Copy)"
- Slug becomes `[original-slug]-copy` (with collision resolution)
- Status set to Draft (never duplicates as Active)
- Stripe product/price IDs cleared (new Stripe records created on publish)
- New product opens in editor immediately
- Inventory resets to 0

#### Flow 7: Schedule Product Publish

**Entry point:** Dropdown arrow next to "Publish" button → "Schedule".

**Behavior:**
- Date/time picker appears (minimum: 1 hour from now)
- Product status becomes "Scheduled"
- Scheduled time shown on product card in list view
- Cron job checks every 5 minutes and publishes when time arrives
- Can cancel scheduled publish (reverts to Draft)

**Phase 1 note:** Scheduling is Phase 2. Publish is immediate only.

#### Flow 8: Archive Product

**Entry point:** Three-dot menu → "Archive", or from product editor status card.

**Behavior:**
- Product removed from storefront immediately
- Product remains in admin with "Archived" badge
- Product list filter can show/hide archived items
- Existing order references maintained
- Stripe product deactivated (not deleted)
- Toast: "Product archived" with "Undo" button (8 seconds)

**No confirmation modal.** The undo toast is faster and less disruptive.

#### Flow 9: Delete Product

**Entry point:** Three-dot menu → "Delete" (only on archived products).

**Preconditions:**
- Product must be Archived first. Active products cannot be deleted directly.
- This prevents accidental deletion of live products.

**Behavior:**
- Confirmation modal: "Delete [Product Name]? This moves it to trash. You can recover it within 30 days."
- Product marked as `deletedAt = now()` (soft delete)
- Removed from admin list (unless "Show deleted" filter is active — Phase 2)
- After 30 days: hard-deleted by scheduled cleanup job
- Products referenced by orders: `productId` in `orderItems` preserved, product data snapshot stored in order

#### Flow 10: Add Product to Collections

Deferred to Phase 2. Collection system defined in schema but UI not built.

#### Flow 11: Adjust Inventory

**Entry point A:** Product editor → Inventory card → edit quantity field.

**Entry point B:** Inventory Overview page (Phase 2) → inline edit.

**Behavior:**
- Direct number input (not +/- adjustment)
- When quantity changes to 0 and "Continue selling when out of stock" is off:
  - Product availability automatically set to "Sold out"
  - If product has variants: only that variant marked sold out
- When quantity changes from 0 to >0:
  - Availability automatically set to "In stock"
- Activity log records: old quantity → new quantity, user, timestamp

#### Flow 12: Change Pricing

**Entry point:** Product editor → Pricing card.

**Behavior:**
- Edit price, compare-at price, or cost price
- If product is Active and has existing Stripe price:
  - New Stripe price object created (Stripe prices are immutable)
  - Old Stripe price archived
  - Stripe product updated with new default price
- Autosave captures price changes same as other fields
- Activity log records: old price → new price

#### Flow 13: Set Tax Behavior

**Phase 1:** Simple toggle: "This product is taxable" (boolean). GST (10%) applied at checkout by Stripe if taxable.

**Phase 2:** Tax profiles with configurable rates per jurisdiction.

#### Flow 14: Manage SEO Metadata

**Entry point:** Product editor → SEO section (below main content).

**Behavior:**
- Slug auto-generated from title on first creation
- Slug editable after creation — if product is Active, changing slug creates a redirect record
- Meta title: defaults to product title, character counter (green <50, yellow 50-60, red >60)
- Meta description: defaults to short description, character counter (green <140, yellow 140-160, red >160)
- Google preview card updates live as fields change
- Open Graph image: defaults to primary product image, can be overridden

#### Flow 15: Upload and Manage Product Media

**Entry point:** Product editor → Media section.

**Upload:**
- Drag-and-drop zone accepts: JPG, PNG, WebP
- Maximum file size: 10MB per image
- Maximum 10 images per product
- Upload progress bar per file
- Concurrent upload (up to 3 simultaneous)
- Files uploaded to R2 bucket via `/api/upload`

**Management:**
- Thumbnail grid, drag to reorder
- First image = primary (shown in listings and social shares)
- Click image to open detail panel:
  - Alt text input (required for publish)
  - Associate with variant (optional dropdown)
  - Set as primary button
  - Delete button
- Bulk delete: checkbox on thumbnails → "Delete selected"

**Error handling:**
- File too large: "Image must be under 10MB" inline error, file not uploaded
- Wrong format: "Accepted formats: JPG, PNG, WebP" inline error
- Upload failure: retry button appears on failed thumbnail
- All images deleted: warning banner "At least one image required to publish"

---

### E) Data Model

#### Entity: Product

```sql
CREATE TABLE products (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_type    TEXT NOT NULL DEFAULT 'wearable',  -- 'wearable' | 'wall-art' | 'digital'
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,

  -- Pricing
  price           TEXT NOT NULL DEFAULT '0',          -- stored as decimal string e.g. '89.00'
  compare_at_price TEXT,                              -- original price for sale display
  cost_price      TEXT,                               -- merchant cost for margin calc
  currency        TEXT NOT NULL DEFAULT 'AUD',
  taxable         INTEGER NOT NULL DEFAULT 1,         -- boolean

  -- Descriptions
  short_description TEXT NOT NULL DEFAULT '',
  long_description  TEXT NOT NULL DEFAULT '',

  -- Organisation
  category        TEXT NOT NULL,                      -- category value from product type
  tags            TEXT DEFAULT '[]',                  -- JSON array of strings
  badge           TEXT,                               -- display badge text

  -- Physical attributes (nullable for digital)
  weight_grams    INTEGER,
  dimensions      TEXT,                               -- 'WxH' for wall art, free text

  -- Inventory
  track_inventory INTEGER NOT NULL DEFAULT 1,         -- boolean
  quantity        INTEGER NOT NULL DEFAULT 1,
  continue_selling INTEGER NOT NULL DEFAULT 0,        -- sell when out of stock
  availability    TEXT NOT NULL DEFAULT 'In stock',

  -- Media (primary image shortcut for listings)
  image           TEXT NOT NULL DEFAULT '',            -- primary image URL

  -- Stripe
  stripe_product_id TEXT,
  stripe_price_id   TEXT,

  -- Ratings (aggregated)
  rating          REAL,
  review_count    INTEGER NOT NULL DEFAULT 0,

  -- SEO
  meta_title       TEXT,
  meta_description TEXT,
  og_image         TEXT,

  -- Lifecycle
  status          TEXT NOT NULL DEFAULT 'draft',      -- 'draft' | 'active' | 'archived' | 'discontinued'
  published_at    TEXT,                               -- ISO timestamp of first publish
  scheduled_for   TEXT,                               -- ISO timestamp for scheduled publish
  display_order   INTEGER NOT NULL DEFAULT 0,

  -- Soft delete
  archived        INTEGER NOT NULL DEFAULT 0,         -- kept for backward compat
  deleted_at      TEXT,                               -- null = not deleted

  -- Timestamps
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_products_slug ON products(slug);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_product_type ON products(product_type);
CREATE INDEX idx_products_category ON products(category);
CREATE INDEX idx_products_deleted_at ON products(deleted_at);
CREATE INDEX idx_products_display_order ON products(display_order);
```

**Soft delete:** `deleted_at IS NULL` means active. `deleted_at IS NOT NULL` means trashed. Scheduled cleanup hard-deletes records older than 30 days.

**Backward compatibility:** The `archived` column is kept for the transition period. `status = 'archived'` is the source of truth going forward.

#### Entity: ProductVariant

```sql
CREATE TABLE product_variants (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,

  -- Option values
  option1_name    TEXT,                               -- e.g., 'Colour'
  option1_value   TEXT,                               -- e.g., 'Midnight Blue'
  option2_name    TEXT,                               -- e.g., 'Size'
  option2_value   TEXT,                               -- e.g., 'Large'

  -- Variant-specific overrides (null = inherit from product)
  sku             TEXT UNIQUE,
  price           TEXT,                               -- override product price
  compare_at_price TEXT,

  -- Inventory
  quantity        INTEGER NOT NULL DEFAULT 1,
  availability    TEXT NOT NULL DEFAULT 'In stock',

  -- Stripe
  stripe_price_id TEXT,

  -- Media
  image           TEXT,                               -- variant-specific image URL

  display_order   INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_variants_sku ON product_variants(sku);
CREATE INDEX idx_variants_product_id ON product_variants(product_id);
```

#### Entity: ProductMedia

```sql
CREATE TABLE product_media (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  variant_id      TEXT REFERENCES product_variants(id) ON DELETE SET NULL,

  url             TEXT NOT NULL,
  filename        TEXT NOT NULL,
  alt_text        TEXT NOT NULL DEFAULT '',
  width           INTEGER,
  height          INTEGER,
  file_size       INTEGER,                            -- bytes
  mime_type       TEXT,

  is_primary      INTEGER NOT NULL DEFAULT 0,         -- boolean, exactly one per product
  sort_order      INTEGER NOT NULL DEFAULT 0,

  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_media_product_id ON product_media(product_id);
CREATE INDEX idx_media_sort_order ON product_media(sort_order);
```

#### Entity: Collection (Phase 2)

```sql
CREATE TABLE collections (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name            TEXT NOT NULL,
  slug            TEXT NOT NULL UNIQUE,
  description     TEXT NOT NULL DEFAULT '',
  image           TEXT,

  -- Rules-based or manual
  type            TEXT NOT NULL DEFAULT 'manual',     -- 'manual' | 'smart'
  rules           TEXT DEFAULT '[]',                  -- JSON: smart collection filter rules

  sort_order      INTEGER NOT NULL DEFAULT 0,
  published       INTEGER NOT NULL DEFAULT 0,

  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE product_collections (
  product_id      TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  collection_id   TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  sort_order      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, collection_id)
);
```

#### Entity: SlugRedirect

```sql
CREATE TABLE slug_redirects (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  old_slug        TEXT NOT NULL UNIQUE,
  new_slug        TEXT NOT NULL,
  product_type    TEXT NOT NULL,                      -- for URL prefix resolution
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX idx_redirects_old_slug ON slug_redirects(old_slug);
```

#### Entity: AuditLog (extends existing activityLog)

Existing `activityLog` table is sufficient. Add these fields:

```sql
ALTER TABLE activity_log ADD COLUMN changed_fields TEXT;  -- JSON: { field: { old, new } }
ALTER TABLE activity_log ADD COLUMN entity_snapshot TEXT;  -- JSON: full entity state after change
```

#### Relationships Summary

```
Product 1 ──→ * ProductVariant
Product 1 ──→ * ProductMedia
Product * ←──→ * Collection (via product_collections)
Product 1 ──→ * SlugRedirect (historical slugs)
Product 1 ──→ * OrderItem (via product_id, preserved after soft delete)
ProductVariant 1 ──→ * ProductMedia (optional association)
```

#### Indexing Strategy

- All foreign keys indexed
- `slug` unique indexed (primary lookup path for storefront)
- `status` indexed (filtered in every list query)
- `product_type` indexed (filtered in admin list)
- `category` indexed (filtered in storefront)
- `deleted_at` indexed (soft delete queries)
- `display_order` indexed (sort queries)
- Composite index `(status, product_type, deleted_at)` for the most common admin query

#### Version History

Not a separate table. The `entity_snapshot` field in `activity_log` captures the full product state on every update. This is sufficient for a catalog of this size. Full version history tables are unnecessary overhead for <5,000 products.

---

### F) Product States & Lifecycle Logic

#### States

| Status | Storefront Visible | Admin Visible | Editable | Can Delete |
|---|---|---|---|---|
| **Draft** | No | Yes | Yes | Yes (hard delete, no orders) |
| **Active** | Yes | Yes | Yes | No (must archive first) |
| **Scheduled** | No | Yes (with schedule badge) | Yes | Yes (cancels schedule) |
| **Archived** | No | Yes (with archived badge) | Yes | Yes (soft delete) |
| **Discontinued** | No (or "no longer available" page) | Yes | Limited (no price/inventory) | Yes (soft delete) |

#### Allowed Transitions

```
Draft        → Active       (requires validation pass)
Draft        → Scheduled    (requires validation pass + future datetime)
Draft        → Archived     (no conditions)
Scheduled    → Draft        (cancels schedule)
Scheduled    → Active       (via cron job at scheduled time)
Active       → Archived     (immediate, removes from storefront)
Active       → Discontinued (permanent retirement, keeps URL for SEO)
Archived     → Active       (re-validates, re-publishes)
Archived     → Draft        (back to editing)
Discontinued → Archived     (can't go directly to Active)
```

#### Restricted Transitions

```
Active       → Draft        (NOT ALLOWED - use Archive instead)
Deleted      → any          (NOT ALLOWED - deleted is terminal after 30 days)
Any          → Active       (WITHOUT validation - blocked by system)
```

#### Publish Guardrails (validation for Draft/Scheduled → Active)

All must pass:
- [ ] Name is not empty
- [ ] Price > 0
- [ ] Category is set
- [ ] Short description is not empty
- [ ] At least 1 image uploaded
- [ ] All images have alt text
- [ ] Slug is set and unique
- [ ] If tracking inventory: quantity >= 0

Warning (non-blocking):
- [ ] No meta description set (SEO warning)
- [ ] No compare-at price (missed sale opportunity)
- [ ] Long description is empty
- [ ] Only 1 image (recommendation: 3+)

#### Inventory-Based Automatic State Changes

| Trigger | Action |
|---|---|
| Quantity reaches 0, `continue_selling = false` | Set `availability = 'Sold out'`. Status stays Active (product still visible with "Sold out" label). |
| Quantity increases from 0, `continue_selling = false` | Set `availability = 'In stock'`. |
| All variants out of stock | Set product-level `availability = 'Sold out'`. |
| Any variant back in stock | Set product-level `availability = 'In stock'`. |

---

### G) UI Component System Spec

#### Product List Table

**Base:** Extends existing `DataTable` component.

**Columns:**
| Column | Width | Content |
|---|---|---|
| Checkbox | 40px | Selection for bulk actions |
| Image | 56px | Primary image thumbnail (48x48, rounded) |
| Product | flex | Name + status badge + type badge |
| Category | 120px | Category text |
| Inventory | 100px | Quantity (or "Not tracked") |
| Price | 100px | Formatted price with currency |
| Status | 100px | Status badge (colour-coded) |
| Actions | 48px | Three-dot menu |

**Filters (persistent, combinable):**
- Status: All / Active / Draft / Archived
- Type: All / Wearable Art / Wall Art
- Category: All / [dynamic based on type filter]
- Availability: All / In Stock / Sold Out

**Search:** Searches name, SKU, and tags. Debounced 300ms.

**Sorting:** Click column header. Default: display_order ASC, then created_at DESC.

**Saved views:** Phase 2.

**Bulk actions bar** (appears when items selected):
- "Update status" → dropdown: Publish / Archive / Set Draft
- "Update fields" → modal with field picker
- "Delete" → confirmation with count
- "Export" → CSV download

**Empty states:**
- No products: "Create your first product" CTA with illustration
- No results for filter: "No products match your filters" with "Clear filters" link

#### Product Editor Layout

**Full-page layout** (not modal — products are too complex for modals).

**Top bar:**
- Back arrow → Product list
- Product title (editable inline, large font)
- Status badge
- Autosave indicator: "Saved" / "Saving..." / "Unsaved changes"
- Actions: "Save Draft" / "Publish" (or "Update" if already active)
- Three-dot menu: Duplicate, Archive, Delete, View on site

**Two-column layout:**
- Left column (60%): Title, descriptions, media, variants, SEO
- Right column (40%): Status card, pricing, organisation, inventory, shipping

**Cards:** Each section in a bordered card with header. Consistent padding (24px). 16px gap between cards.

#### Status Badges

| Status | Colour | Label |
|---|---|---|
| Draft | Grey (`bg-gray-100 text-gray-700`) | Draft |
| Active | Green (`bg-green-100 text-green-700`) | Active |
| Scheduled | Blue (`bg-blue-100 text-blue-700`) | Scheduled [date] |
| Archived | Yellow (`bg-amber-100 text-amber-700`) | Archived |
| Discontinued | Red (`bg-red-100 text-red-700`) | Discontinued |
| Sold Out | Red outline (`border-red-200 text-red-600`) | Sold out |
| In Stock | Green outline (`border-green-200 text-green-600`) | In stock |

#### Media Uploader

**Drop zone:**
- Dashed border, 120px height when empty
- "Drag images here or click to browse" text
- Accepts: image/jpeg, image/png, image/webp
- Max 10MB per file indicator

**Thumbnail grid:**
- 4 thumbnails per row
- 96x96px, object-cover, rounded-lg
- Drag handle on hover (top-left)
- Delete button on hover (top-right)
- "Primary" badge on first image
- Click to select → detail panel appears below

**Detail panel (below selected image):**
- Alt text input (label: "Alt text (required for accessibility)")
- Associate with variant dropdown
- "Set as primary" button
- "Remove" button

#### Price Editor

**Layout:**
- Price input with currency prefix ("A$")
- Number input, step 0.01, min 0
- Compare-at price below (smaller font, "Original price" label)
- Cost price below (smaller font, "Cost" label, with lock icon — restricted to Owner)
- Margin calculated and displayed: `((price - cost) / price * 100).toFixed(0)%`

#### Variant Editor

**Collapsed state:** "Variants" section header with "Add option" button.

**Expanded state:**
- Option row: Label input ("Colour") + tag-style value input ("Midnight Blue", "Forest Green")
- "Add another option" button (max 2)
- Variant table below: auto-generated rows from option combinations
- Inline-editable cells: SKU, Price, Quantity
- Image column: click to upload variant image
- Row delete button

#### Form Validation System

**Three layers:**
1. **Inline (as-you-type):** Character counters, format validation, immediate feedback
2. **On save:** All required fields checked. Errors shown inline with red border + message below field.
3. **On publish:** Full validation including images, alt text, slug uniqueness. Errors block publish. First error field scrolled into view.

**Error message hierarchy:**
1. Field-level: red text below the field, red border on input
2. Card-level: red banner at top of card ("2 issues in this section")
3. Page-level: toast notification for server errors

#### Confirmation Modals

Used only for:
- Delete operations
- Bulk operations that affect >5 items
- Publishing (when publish guardrails have warnings)

NOT used for:
- Archive (use undo toast instead)
- Save (autosave handles this)
- Navigation away with unsaved changes (use "Unsaved changes" indicator + browser beforeunload)

#### Autosave Behavior

- **Trigger:** 3 seconds after last keystroke/change
- **Scope:** Saves all form fields to server as Draft (or updates existing record)
- **Indicator:** Top bar shows "Saving..." during request, "Saved [time]" on success
- **Failure:** "Save failed" indicator with retry. Does not block further editing.
- **Publish is separate:** Autosave never publishes. The user must explicitly click Publish.
- **New products:** First autosave creates the product record. URL updates to `/admin/products/:id`.

---

### H) Edge Cases & Failure Handling

| Edge Case | System Behavior |
|---|---|
| **Duplicate slug** | Auto-append `-2`, `-3`, etc. Show notice: "Slug adjusted to avoid conflict." |
| **Duplicate SKU** | Block save. Inline error: "This SKU is already in use by [Product Name]." |
| **Variant price higher than compare-at price** | Warning (non-blocking): "Sale price is higher than original price." |
| **Negative inventory** | Prevented at input level. Minimum value: 0. |
| **Concurrent edits** | Last-write-wins with `updated_at` check. If `updated_at` on server is newer than when the editor loaded, show: "This product was edited by another user. Reload to see changes?" with Reload/Overwrite options. |
| **Large catalog (>500 products)** | Server-side pagination (50 per page). Virtual scrolling in table. Search hits server, not client filter. |
| **Bulk import with errors** | Phase 2. CSV import with validation. Preview screen shows valid rows (green) and invalid rows (red) with error details. User confirms import of valid rows only. |
| **Product deleted but referenced in order** | Soft delete. `orderItems` retains `product_name`, `product_image`, `price` snapshot. Product page shows "This product is no longer available" with order link. |
| **Slug changed on active product** | Old slug stored in `slug_redirects` table. Storefront `/products/old-slug` returns 301 redirect to `/products/new-slug`. |
| **Media upload failure** | Retry button on failed thumbnail. Does not block other uploads. Toast: "1 image failed to upload. Click to retry." |
| **Partial publish failure (Stripe sync fails)** | Product saved but remains Draft. Error: "Product saved but Stripe sync failed. Try publishing again." Stripe sync retried on next publish attempt. |
| **Price set to 0** | Blocked for physical products. Error: "Price must be greater than $0." Allowed for digital products (free download). |
| **All images deleted from active product** | Warning toast: "This product has no images and will appear without an image on your site. Add an image to improve conversion." Product stays Active (images not required to stay active, only to initially publish). |
| **Category changed on active product** | Allowed. Storefront filters update immediately. No redirect needed (category is not part of URL). |
| **Product type changed after creation** | Allowed only while in Draft. Once published, product type is locked. This prevents breaking variant structures and shipping profiles. |
| **Browser closed with unsaved changes** | `beforeunload` event shows browser-native "You have unsaved changes" dialog. Autosave mitigates data loss — at most 3 seconds of changes lost. |

---

### I) Analytics & Observability

#### Events to Track

| Event | Trigger | Payload |
|---|---|---|
| `product.created` | Product saved for first time | productId, productType, category |
| `product.updated` | Product saved (any field change) | productId, changedFields[] |
| `product.published` | Status changed to Active | productId, slug |
| `product.archived` | Status changed to Archived | productId, previousStatus |
| `product.deleted` | Soft delete applied | productId, hadOrders (boolean) |
| `product.duplicated` | Duplicate created | sourceProductId, newProductId |
| `product.variant_added` | Variant created | productId, variantId, options |
| `product.price_changed` | Price field updated | productId, oldPrice, newPrice |
| `product.inventory_changed` | Quantity changed | productId, variantId?, oldQty, newQty |
| `product.media_uploaded` | Image added | productId, mediaId, fileSize |
| `product.viewed` | Storefront product page loaded | productId, slug, referrer |
| `product.added_to_cart` | Add to cart clicked | productId, variantId?, price |
| `product.purchased` | Checkout completed | productId, variantId?, quantity, revenue |
| `product.bulk_updated` | Bulk operation applied | productIds[], action, fields |

#### Product Performance Dashboard (Phase 2)

**Metrics cards:**
- Total products (active/draft/archived breakdown)
- Total inventory value (sum of quantity * price for all active products)
- Low stock alerts (products with quantity <= 3)
- Revenue this month (from orders)

**Per-product metrics (on product editor sidebar — Phase 2):**
- Views (last 30 days)
- Add-to-cart rate (views → cart)
- Conversion rate (views → purchase)
- Revenue generated (all time + last 30 days)
- Average order value when this product is in cart

#### Audit Logging

Every product mutation logged to `activity_log` with:
- `action`: create, update, delete, publish, unpublish, archive, duplicate
- `entity_type`: 'product'
- `entity_id`: product ID
- `entity_name`: product name
- `user_id` + `user_name`: who did it
- `changed_fields`: JSON of `{ fieldName: { old: value, new: value } }`
- `entity_snapshot`: full product JSON after the change
- `created_at`: timestamp

#### Admin Activity Tracking

The existing Activity Log page already displays this data. No new UI needed — the enhanced `changed_fields` data will be displayed in the existing activity detail view.

---

### J) Implementation Roadmap

---

#### Phase 1 — Core Commerce Foundation

**Goal:** Replace the current split product system with a unified, production-ready product management experience.

**Database changes:**

1. Create migration `0003_unified_products.sql`:
   - Add new columns to `products` table: `product_type`, `compare_at_price`, `cost_price`, `taxable`, `tags`, `weight_grams`, `track_inventory`, `quantity`, `continue_selling`, `status`, `published_at`, `meta_title`, `meta_description`, `og_image`, `deleted_at`
   - Migrate all `wall_art_products` rows into `products` with `product_type = 'wall-art'`
   - Add indexes on new columns
   - Keep `wall_art_products` table temporarily (read-only, for rollback safety)

2. Create `product_media` table
3. Create `slug_redirects` table
4. Alter `activity_log`: add `changed_fields`, `entity_snapshot` columns

**API endpoints:**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products` | List products (paginated, filterable by status/type/category) |
| GET | `/api/products/:idOrSlug` | Get single product by ID or slug |
| POST | `/api/products` | Create product (autosave creates as draft) |
| PUT | `/api/products/:id` | Update product |
| PATCH | `/api/products/:id/status` | Change status (publish, archive, etc.) |
| DELETE | `/api/products/:id` | Soft delete (set deleted_at) |
| POST | `/api/products/:id/duplicate` | Duplicate product |
| GET | `/api/products/:id/media` | List product media |
| POST | `/api/products/:id/media` | Upload media to product |
| PUT | `/api/products/:id/media/:mediaId` | Update media (alt text, sort order) |
| DELETE | `/api/products/:id/media/:mediaId` | Delete media |
| PUT | `/api/products/:id/media/reorder` | Reorder media |
| POST | `/api/products/bulk` | Bulk update (status, fields) |
| GET | `/api/redirect/:slug` | Check for slug redirect |

**Backward compatibility endpoints (deprecated, removed in Phase 2):**
| Method | Path | Redirects to |
|---|---|---|
| GET | `/api/wall-art` | `/api/products?productType=wall-art` |
| GET | `/api/wall-art/:id` | `/api/products/:id` |

**UI pages:**
1. **Product List** (`/admin/products`) — rebuilt with new table, filters, bulk actions, search
2. **Product Editor** (`/admin/products/new` and `/admin/products/:id`) — full-page editor with two-column layout, autosave, media management, SEO section
3. Remove `WallArtManager.tsx` (redundant)

**Frontend storefront updates:**
1. `Shop.tsx` — fetch from unified `/api/products?productType=wearable&status=active`
2. `WallArt.tsx` — fetch from unified `/api/products?productType=wall-art&status=active`
3. `ProductDetail.tsx` — single component, handles both types via `productType` field
4. Add slug redirect handling: if product not found by slug, check `/api/redirect/:slug`

**Tracking events:** `product.created`, `product.updated`, `product.published`, `product.archived`, `product.deleted`, `product.duplicated`, `product.media_uploaded`

**Acceptance criteria:**
- [ ] All existing products migrated to unified table with correct `product_type`
- [ ] Existing storefront URLs continue to work (no broken links)
- [ ] Product creation completes in <60 seconds for simple product
- [ ] Draft products invisible on storefront
- [ ] Publish blocked when required fields missing (name, price, image, category, short description)
- [ ] All images have alt text enforcement on publish
- [ ] Autosave works with <3 second delay, no data loss
- [ ] Activity log captures all product mutations with changed fields
- [ ] Archived products hidden from storefront but visible in admin
- [ ] Soft delete prevents accidental permanent deletion
- [ ] Slug changes on active products create redirects
- [ ] Media upload to R2 works with drag-drop, reorder, alt text
- [ ] Price stored correctly, displayed with AUD formatting
- [ ] Admin product list supports search, filter by status/type/category
- [ ] Bulk status change (archive, publish) works for selected products
- [ ] Duplicate product creates correct copy with Draft status
- [ ] SEO fields (slug, meta title, meta description) present and functional
- [ ] Existing order references preserved after product archive/delete
- [ ] Backward-compat `/api/wall-art` endpoints return correct data
- [ ] Mobile-responsive admin editor (stacks to single column on mobile)

---

#### Phase 2 — Advanced Capabilities

**Goal:** Variants, collections, inventory management, and scheduled publishing.

**Database changes:**
1. Create `product_variants` table
2. Create `collections` and `product_collections` tables
3. Drop `wall_art_products` table (migration complete, backward-compat endpoints removed)

**API endpoints (new):**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products/:id/variants` | List variants |
| POST | `/api/products/:id/variants` | Create variant |
| PUT | `/api/products/:id/variants/:variantId` | Update variant |
| DELETE | `/api/products/:id/variants/:variantId` | Delete variant |
| GET | `/api/collections` | List collections |
| POST | `/api/collections` | Create collection |
| PUT | `/api/collections/:id` | Update collection |
| DELETE | `/api/collections/:id` | Delete collection |
| POST | `/api/collections/:id/products` | Add products to collection |
| DELETE | `/api/collections/:id/products/:productId` | Remove product from collection |
| GET | `/api/inventory` | Inventory overview (all products) |
| PUT | `/api/inventory/bulk` | Bulk inventory update |

**UI pages:**
1. Variant editor section in Product Editor
2. Collections manager (`/admin/collections`)
3. Inventory overview (`/admin/inventory`)
4. Scheduled publish functionality
5. Saved views for product list
6. CSV bulk import/export
7. Colour filter support on storefront (populated from variant options)

**Tracking events:** `product.variant_added`, `product.inventory_changed`, `collection.created`, `product.scheduled`

**Acceptance criteria:**
- [ ] Variants created with up to 2 options, 20 combinations max
- [ ] SKU uniqueness enforced across all products and variants
- [ ] Variant-specific pricing overrides work
- [ ] Variant-specific images associate correctly
- [ ] Inventory tracks per-variant when variants exist
- [ ] Collections display correctly on storefront
- [ ] Smart collections auto-update based on rules
- [ ] Scheduled publish executes within 5 minutes of target time
- [ ] CSV import validates data and shows preview before applying
- [ ] CSV export includes all product fields
- [ ] Inventory overview shows all products with low-stock highlighting
- [ ] Bulk inventory update works from overview page
- [ ] Backward-compat wall-art endpoints removed

---

#### Phase 3 — Differentiation + Scale Mechanics

**Goal:** Analytics, digital products, RBAC, and conversion optimization features.

**Database changes:**
1. Add `product_views` table (aggregated daily views)
2. Add user `role` enforcement tables
3. Add `digital_assets` table for download management

**API endpoints (new):**
| Method | Path | Purpose |
|---|---|---|
| GET | `/api/products/:id/analytics` | Product performance metrics |
| GET | `/api/analytics/products` | Cross-product performance dashboard |
| POST | `/api/products/:id/digital-asset` | Upload digital download file |
| GET | `/api/download/:token` | Secure download link (tokenized) |

**UI pages:**
1. Per-product analytics sidebar in Product Editor
2. Product performance dashboard (`/admin/analytics/products`)
3. Digital product creation flow
4. Role-based permission enforcement in UI
5. Keyboard shortcuts (Cmd+S, Cmd+Shift+P, Cmd+N, Cmd+K, Escape)
6. Global search (Cmd+K) for products
7. Undo for archive/bulk operations
8. Concurrent edit detection

**Tracking events:** `product.viewed`, `product.added_to_cart`, `product.purchased`, per-product conversion funnel

**Acceptance criteria:**
- [ ] Product analytics show views, cart rate, conversion rate, revenue
- [ ] Dashboard shows top products, low stock, revenue trends
- [ ] Digital products uploadable with secure download links
- [ ] Download links expire after configurable period
- [ ] Role-based permissions restrict UI elements appropriately
- [ ] Keyboard shortcuts functional across all product screens
- [ ] Global search returns results in <200ms for catalogs up to 5,000 products
- [ ] Concurrent edit detection prevents data loss
- [ ] Undo toast on archive restores product within 8 seconds

---

## 5. Acceptance Criteria Checklist (Ticket-Ready)

### Phase 1 Tickets

```
P1-001  Database migration: Add unified product columns
P1-002  Database migration: Create product_media table
P1-003  Database migration: Create slug_redirects table
P1-004  Database migration: Alter activity_log for change tracking
P1-005  Data migration: Move wall_art_products into products table
P1-006  API: GET /api/products with pagination, filtering, search
P1-007  API: GET /api/products/:idOrSlug with slug lookup
P1-008  API: POST /api/products (create with autosave support)
P1-009  API: PUT /api/products/:id (update with change tracking)
P1-010  API: PATCH /api/products/:id/status (publish/archive/etc.)
P1-011  API: DELETE /api/products/:id (soft delete)
P1-012  API: POST /api/products/:id/duplicate
P1-013  API: Product media CRUD endpoints (upload, update, delete, reorder)
P1-014  API: POST /api/products/bulk (bulk status + field updates)
P1-015  API: GET /api/redirect/:slug (slug redirect lookup)
P1-016  API: Backward-compat /api/wall-art proxy endpoints
P1-017  API: Publish validation logic (required fields check)
P1-018  API: Stripe sync on publish (create/update product + price)
P1-019  Admin UI: Product List page (table, filters, search, bulk actions)
P1-020  Admin UI: Product Editor — layout and top bar
P1-021  Admin UI: Product Editor — title, descriptions, rich text
P1-022  Admin UI: Product Editor — media section (upload, reorder, alt text)
P1-023  Admin UI: Product Editor — pricing card
P1-024  Admin UI: Product Editor — organisation card (type, category, tags, badge)
P1-025  Admin UI: Product Editor — inventory card
P1-026  Admin UI: Product Editor — shipping card (physical products)
P1-027  Admin UI: Product Editor — SEO section
P1-028  Admin UI: Product Editor — status card with publish/save actions
P1-029  Admin UI: Product Editor — autosave implementation
P1-030  Admin UI: Product Editor — form validation (inline + on-publish)
P1-031  Admin UI: Remove WallArtManager.tsx
P1-032  Storefront: Update Shop.tsx for unified API
P1-033  Storefront: Update WallArt.tsx for unified API
P1-034  Storefront: Update ProductDetail.tsx for unified model
P1-035  Storefront: Slug redirect handling
P1-036  Storefront: Structured data (JSON-LD) for product pages
P1-037  Activity log: Enhanced change tracking with field diffs
P1-038  Testing: Migration rollback verification
P1-039  Testing: All existing storefront URLs resolve correctly post-migration
```

### Phase 2 Tickets

```
P2-001  Database: Create product_variants table
P2-002  Database: Create collections + product_collections tables
P2-003  Database: Drop wall_art_products table
P2-004  API: Variant CRUD endpoints
P2-005  API: Collection CRUD endpoints
P2-006  API: Inventory overview + bulk update endpoints
P2-007  Admin UI: Variant editor in Product Editor
P2-008  Admin UI: Collections manager page
P2-009  Admin UI: Inventory overview page
P2-010  Admin UI: Scheduled publish flow
P2-011  Admin UI: CSV import/export
P2-012  Admin UI: Saved views for product list
P2-013  Storefront: Variant selector on product detail
P2-014  Storefront: Collection pages
P2-015  Storefront: Colour filter populated from variants
P2-016  Checkout: Variant-aware cart and Stripe line items
P2-017  Cron: Scheduled publish job
P2-018  Remove backward-compat wall-art endpoints
```

### Phase 3 Tickets

```
P3-001  Database: Product views aggregation table
P3-002  Database: Digital assets table
P3-003  API: Product analytics endpoints
P3-004  API: Digital download with tokenized URLs
P3-005  Admin UI: Product analytics sidebar
P3-006  Admin UI: Product performance dashboard
P3-007  Admin UI: Digital product creation flow
P3-008  Admin UI: Keyboard shortcuts system
P3-009  Admin UI: Global search (Cmd+K)
P3-010  Admin UI: Undo toast system for destructive actions
P3-011  Admin UI: Concurrent edit detection
P3-012  RBAC: Role enforcement middleware
P3-013  RBAC: UI permission gating
P3-014  Storefront: Digital product purchase + download flow
```

---

*This document is the single source of truth for the Product Management system. All implementation work references this spec. Deviations require explicit justification.*
