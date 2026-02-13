# Admin UI/UX Redesign

## Navigation Structure

Grouped sidebar replacing the current flat 11-item list:

```
OVERVIEW
  Dashboard         -- stats, quick actions, messages preview, activity

SHOP
  Products          -- unified catalog (wearable art + wall art merged)

SERVICES
  Coaching          -- packages + page settings tabs
  Workshops         -- courses/workshops + page settings tabs

CONTENT
  Blog              -- posts, categories
  Testimonials      -- all types with pill filter (Shop/Coaching/Learn)
  FAQs              -- all categories with pill filter, drag reorder

MARKETING
  Newsletter        -- compose, subscribers, campaigns, analytics
  Automations       -- email sequences

SETTINGS
  Site Settings     -- branding, footer, homepage, about, contact, SEO
```

## Unified Products Manager

Merges ProductsManager + WallArtManager into one page.

- Segmented control: [All] [Wearable Art] [Wall Art]
- Product form adds Type field (radio). Wall Art shows Dimensions field.
- Categories adapt based on type (Earrings/Brooches/Necklaces vs Prints/Originals/Mixed Media)
- Table columns: Drag | Image | Name | Type | Category | Price | Status | Actions
- Frontend merges `/api/products` + `/api/wall-art` data

## Component Design Language (shadcn-inspired, Tailwind only)

**Surfaces:** `bg-white border border-stone-200 rounded-lg`, no shadows
**Buttons:** Primary `bg-stone-900 text-white`, Secondary `bg-white border`, Ghost `text-stone-500 hover:bg-stone-100`. All `text-sm h-9 rounded-md`
**Inputs:** `border-stone-200 rounded-md text-sm focus:ring-2 focus:ring-stone-400 focus:ring-offset-1`
**Tables:** No outer border. Header `text-xs uppercase text-stone-500 bg-stone-50/50`. Row hover `bg-stone-50`
**Badges:** `text-xs rounded-full px-2 py-0.5`. Muted/success/warning variants
**Edit forms:** Slide-over sheet from right (w-[480px]) instead of centered modals
**Sidebar:** `w-60 bg-stone-50 border-r`. Section labels `text-[11px] uppercase tracking-wider text-stone-400`. Active `bg-stone-200/60 text-stone-900`

Clay accent used sparingly (logo, brand touches). Admin is neutral stone.

## Dashboard

- Stats row: 4 compact metric cards
- Two-column: activity feed (left), messages preview (right)
- Messages also accessible via top-bar bell icon with unread badge
- Messages open as slide-over sheet, full inbox still at /admin/inbox

## Services Sections

Coaching and Workshops each get tabs: [Data Manager] [Page Settings]
Page-specific settings from SiteSettingsManager relocate here.

## Site Settings (slimmed)

Only global concerns: branding, footer, homepage, about page, contact page, SEO.
Coaching/Learn page settings distributed to their respective sections.
