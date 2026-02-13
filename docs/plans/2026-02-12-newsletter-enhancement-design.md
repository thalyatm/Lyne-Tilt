# Newsletter Enhancement Design

## Overview

Transform the admin newsletter section from a basic compose-and-send tool into a full-featured email marketing platform with a block-based email builder, campaign analytics with open/click tracking, enhanced subscriber management (CRM-lite), and automation workflows.

## 1. Block-Based Email Builder

Replace the current plain TipTap compose editor with a visual drag-and-drop block builder.

### Content Blocks

| Block | Description | Configurable Properties |
|-------|-------------|------------------------|
| **Header** | Brand name + tagline | Background color, text color, logo toggle |
| **Rich Text** | TipTap editor per section | Full formatting toolbar |
| **Image** | Full-width or sized image | src, alt, caption, link URL, width, border-radius |
| **CTA Button** | Styled action button | Text, URL, bg color, text color, border-radius, alignment |
| **Product Card** | Pull product from shop | Product selector (id), auto-fills image/name/price/link |
| **Testimonial** | Quote callout | Quote text, author, role, style variant |
| **Divider** | Horizontal rule | Color, thickness, width %, margin |
| **Spacer** | Vertical whitespace | Height (px) |
| **Two Column** | Side-by-side layout | Each column contains nested blocks (text/image) |

### UI Layout

- Left panel: Block palette (draggable block types)
- Center: Email canvas with live-rendered blocks, drag to reorder via @dnd-kit
- Right panel: Settings for selected block (appears when a block is clicked)
- Top bar: Subject, preheader, audience selector, actions (save/schedule/send)

### Starter Templates

Pre-configured block arrangements the user picks to start from:

1. **Product Launch** — Hero image + intro text + product card + CTA button + footer
2. **Weekly Digest** — Header + 2-3 rich text sections with dividers + CTA
3. **Coaching Update** — Header + testimonial + rich text + CTA button
4. **Announcement** — Header + centered rich text + CTA button
5. **Blank** — Just header + empty text block + footer

### HTML Generation

Each block renders to inline-CSS HTML for email compatibility. The builder maintains a `blocks[]` array as the source of truth. On save/send, the array is serialized to JSON (stored in draft) and compiled to HTML (for sending). The preview panel renders the compiled HTML in real-time.

---

## 2. Campaign Analytics & Tracking

### Email Events Table (new)

```sql
CREATE TABLE email_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  sent_email_id TEXT NOT NULL REFERENCES sent_emails(id) ON DELETE CASCADE,
  subscriber_id TEXT REFERENCES subscribers(id) ON DELETE SET NULL,
  subscriber_email TEXT NOT NULL,
  event_type TEXT NOT NULL CHECK(event_type IN ('open', 'click')),
  link_url TEXT,
  link_index INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_email_events_sent_email ON email_events(sent_email_id);
CREATE INDEX idx_email_events_subscriber ON email_events(subscriber_id);
```

### Tracking Endpoints

- `GET /api/newsletter/track/open/:sentEmailId/:subscriberEmail` — Returns 1x1 transparent GIF, records open event. Deduplicated per subscriber per email.
- `GET /api/newsletter/track/click/:sentEmailId/:linkIndex/:subscriberEmail?url=<encoded>` — Records click event, 302 redirects to actual URL.

### Link Rewriting

Before sending, all `<a href>` tags in the HTML are rewritten to pass through the click tracker. Each link gets a `linkIndex` for identification. Original URLs are preserved as query params.

### Campaign Detail View

Clicking a sent campaign opens a detail page:

- **Summary cards**: Recipients, unique opens (%), unique clicks (%), open-to-click ratio
- **Open/click timeline**: Line chart showing opens and clicks over 7 days after send
- **Per-link breakdown**: Table of each link URL with click count and CTR
- **Recipient activity**: Scrollable list of subscribers who opened/clicked with timestamps

### Subscriber Engagement Score

Calculated on-read (not stored) from email_events:

- Recent opens (last 30 days): 40 points max
- Recent clicks (last 30 days): 40 points max
- Overall open rate: 20 points max
- Score: 0-100, displayed as color badge (red < 25, amber 25-50, green 50-75, emerald > 75)

### Growth Chart

Recharts AreaChart on the newsletter dashboard showing cumulative subscriber count over the last 90 days. Data derived from `subscribedAt` timestamps.

---

## 3. Enhanced Subscriber Management

### Search & Filter

- **Search bar**: Instant client-side search across email and name
- **Filter panel**: Collapsible panel with filters for:
  - Tags (multi-select)
  - Source (multi-select)
  - Status (subscribed / unsubscribed)
  - Engagement score range (slider)
  - Date subscribed range
- Filters compose with AND logic

### Table Enhancements

- Sortable columns (click header to toggle asc/desc): email, subscribed date, emails received, engagement score
- Checkbox selection (individual + select all on page)
- Pagination: 25 per page, server-side

### Bulk Actions

Toolbar appears when 1+ subscribers selected:

- **Bulk Add Tag**: Select tag from dropdown, apply to all selected
- **Bulk Remove Tag**: Select tag, remove from all selected
- **Bulk Delete**: With confirmation modal showing count

### Import/Export

- **CSV Export**: Download current filtered view as CSV (email, name, source, tags, subscribed date, emails received)
- **CSV Import**: Upload modal with:
  - File drop zone
  - Column mapping preview (auto-detect email column)
  - Duplicate handling: skip / update existing
  - Optional tag assignment for all imported
  - Summary after import: added, skipped, updated counts

### Subscriber Detail Drawer

Slide-in panel from the right when clicking a subscriber row:

- Profile section: email, name, source, tags (editable inline)
- Stats: emails received, open rate, click rate, engagement score
- Activity timeline: chronological list of email events (received, opened, clicked) with timestamps
- Actions: edit tags, delete subscriber

---

## 4. Scheduling & Automation

### Email Scheduling

- Date/time picker component in the compose top bar (next to Send button)
- "Schedule" button replaces "Send" when a time is set
- Scheduled emails saved as drafts with `scheduledFor` timestamp
- Drafts tab shows scheduled emails with countdown badge and cancel/reschedule actions
- **Cron Trigger**: Workers Cron runs every 5 minutes, queries drafts where `scheduledFor <= now`, sends them, moves to sent_emails

### Automation Workflows

Uses existing `emailAutomations` and `automationQueue` schema.

**Automation Builder UI:**

- New "Automations" sub-tab in newsletter section
- List view: shows all automations with name, trigger, status (active/paused), step count, enrolled count
- Create/Edit view:
  - Name + description
  - Trigger selector: newsletter_signup, purchase, coaching_inquiry, contact_form, manual
  - Steps timeline: vertical list of email steps, each with:
    - Delay config (days + hours after trigger or previous step)
    - Email content (subject + body using the block builder)
    - Preview of the email
  - Add step button between existing steps
  - Drag to reorder steps
  - Toggle active/paused

**Automation Execution:**

- When trigger fires (e.g., new subscriber via /subscribe endpoint), check for active automations matching that trigger
- For each matching automation, queue all steps into `automationQueue` with calculated `scheduledFor` timestamps
- The same Cron Trigger that handles scheduled emails also processes the automation queue
- Queue items track status: scheduled -> sent / failed / cancelled
- If automation is paused, pending queue items are set to cancelled

**Automation Dashboard:**

- Per-automation stats: total enrolled, completed, in-progress, cancelled
- Queue view: list of pending/sent items with subscriber email and scheduled time

---

## Implementation Order

1. **Backend: email_events table + tracking endpoints** (foundation for analytics)
2. **Frontend: Block builder component** (biggest UI piece, independent)
3. **Frontend: Enhanced subscriber management** (search, filter, bulk, import/export)
4. **Backend: Scheduling Cron Trigger + automation queue processing**
5. **Frontend: Campaign analytics detail view + growth chart**
6. **Frontend: Scheduling UI in composer**
7. **Frontend: Automation builder UI**
8. **Integration: Wire block builder HTML generation to send flow with link rewriting**

## Files to Create/Modify

### New Files
- `admin/components/newsletter/BlockBuilder.tsx` — Main block builder component
- `admin/components/newsletter/blocks/` — Individual block components (TextBlock, ImageBlock, CTABlock, etc.)
- `admin/components/newsletter/BlockSettings.tsx` — Right panel settings for selected block
- `admin/components/newsletter/TemplateSelector.tsx` — Template picker modal
- `admin/components/newsletter/CampaignDetail.tsx` — Analytics detail view
- `admin/components/newsletter/SubscriberDrawer.tsx` — Subscriber detail drawer
- `admin/components/newsletter/ImportModal.tsx` — CSV import modal
- `admin/components/newsletter/AutomationBuilder.tsx` — Automation workflow editor
- `workers/src/routes/tracking.ts` — Open/click tracking endpoints
- `workers/src/db/migrations/add-email-events.sql` — New table migration

### Modified Files
- `admin/pages/NewsletterManager.tsx` — Major rewrite: new tabs, block builder integration, analytics
- `workers/src/routes/newsletter.ts` — New endpoints: analytics, import, pagination, engagement
- `workers/src/index.ts` — Mount tracking routes, add Cron trigger
- `workers/wrangler.toml` — Add cron trigger config
- `workers/src/db/schema.ts` — Add email_events table schema
