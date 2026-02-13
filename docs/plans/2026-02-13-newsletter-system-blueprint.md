# Newsletter Management System — Enterprise-Grade Blueprint

> Implementation-ready product spec for upgrading the admin newsletter section.
> Produced 2026-02-13. Treats the existing codebase as ground truth.

---

## 1. Assumptions

| # | Assumption | Impact |
|---|-----------|--------|
| A1 | Lyne Tilt is a single-operator (owner + occasional assistant) business. The admin user pool will stay under 5 for the foreseeable future. | Roles kept practical — no RBAC engine, just enum-based permissions. |
| A2 | Subscriber list size stays under 50,000 for the next 2 years. | No need for dedicated queue infrastructure (SQS/Bull). Cloudflare Workers cron + serial Resend API calls are sufficient. Batch sends are throttled at the application layer. |
| A3 | Resend remains the email provider. All deliverability work targets Resend's API, webhooks, and domain verification. | No provider-abstraction layer. Direct Resend SDK calls. |
| A4 | The production backend is Cloudflare Workers (Hono + D1). The Express server is dev-only. All new schema and routes must be implemented in both, with Workers as the source of truth. | Dual-backend parity must be maintained. |
| A5 | No dedicated transactional email system is needed beyond what exists. The newsletter system handles marketing/broadcast email only. Transactional emails (verification, password reset, order confirmation) remain in the existing `email.ts` service. | Clean boundary: newsletter system = marketing; `services/email.ts` = transactional. |
| A6 | The admin panel continues using the existing React 19 + React Router + TipTap + dnd-kit stack. No framework migration. | All UI work extends the current component architecture. |
| A7 | The existing `subscribers` table already follows the correct pattern (single record per email, tag-based segmentation, no duplicate lists). This does not change. | Minimal migration required for subscriber data model. |
| A8 | Australian business. Primary compliance obligations: Australian Spam Act 2003, plus GDPR awareness for any EU subscribers. CAN-SPAM as baseline. | Unsubscribe must be one-click. Consent must be explicit. Sender identity must be verifiable. |

---

## 2. Competitive Teardown — Extracted Winning Mechanics

Analysis of structural patterns across Mailchimp, Kit (ConvertKit), Beehiiv, Klaviyo, Customer.io, Buttondown, and Substack. No feature comparison — only mechanics that consistently produce clarity, speed, safety, and scalability.

### Workflow Mechanics
- **Status-driven campaign lifecycle.** Every email has exactly one status at any time: `draft` → `review` → `scheduled` → `sending` → `sent` → `paused` (for automations) or `failed`. Status is the primary organizing principle, not tabs or dates.
- **Pre-send checklist as a gate.** The send button is disabled until a checklist of safety conditions passes (subject present, unsubscribe link present, audience selected, test email sent within session). Klaviyo and Mailchimp both enforce this. The checklist is not advisory — it blocks the action.
- **Two-step send confirmation.** "Send now" always requires a confirmation modal that shows recipient count, subject line, and an explicit "I understand this is irreversible" acknowledgment. Every tool does this. Tools that skip it get support tickets.
- **Cancel-scheduled window.** Scheduled sends must be cancelable up to the moment the cron job picks them up. Scheduled status is not a commitment — it's an intent that can be revoked.

### List Management Mechanics
- **Single subscriber identity.** One email = one record. Tags differentiate behavior, not separate lists. Kit pioneered this; it's now universal in modern tools.
- **Engagement scoring as computed state.** Subscribers get a health score derived from opens, clicks, and recency. This score drives automated segmentation (active / engaged / cold / at-risk / churned). Not stored as a static field — computed from event data.
- **Suppression is separate from unsubscribe.** Hard bounces, spam complaints, and manual blocks go to a suppression list that overrides everything. Suppressed addresses never receive email regardless of subscriber status.
- **Import with validation report.** CSV imports run through validation (email format, duplicates, suppressed addresses) and produce a report before committing. Invalid rows are skipped, not rejected as a batch.

### Editor Mechanics
- **Block-based + saved sections.** The canvas is a vertical stack of typed blocks. Any block or group of blocks can be saved as a reusable snippet. Templates are pre-populated block arrangements.
- **Merge tags as inline atoms.** Personalization tokens are non-editable inline nodes in the editor, not raw text. They render as pills in the editor and serialize to `{{tag}}` in HTML output.
- **Preview is always one click away.** Desktop/mobile toggle. Full HTML preview. Dark mode preview. Never more than one click from the current editing context.

### Deliverability Mechanics
- **Domain authentication status visible in UI.** SPF, DKIM, and DMARC status shown in settings. If any is misconfigured, a persistent warning appears on the compose screen.
- **Unsubscribe header is automatic.** `List-Unsubscribe` and `List-Unsubscribe-Post` headers are injected into every outgoing email. Not optional. Required by Gmail and Yahoo since Feb 2024.
- **Bounce and complaint webhooks process automatically.** Hard bounce → suppress. Complaint → suppress + unsubscribe. Soft bounce → count; suppress after 3 consecutive soft bounces within 7 days.

### Automation Mechanics
- **Trigger → delay → action** is the minimum viable automation unit. Branching (if/else conditions) is the first upgrade after that.
- **Automation queue is observable.** Admin can see what's queued, what's been sent, what failed, and retry or cancel individual queue items.

### Analytics Mechanics
- **Event-level tracking.** Every open, click, bounce, complaint, and delivery is stored as an individual event row linked to subscriber + sent email. Aggregates are computed, not stored.
- **Per-email dashboard shows:** delivered count, open rate, click rate, unsubscribe count, bounce count, click map (which links were clicked).
- **Subscriber-level timeline.** Every email sent to a subscriber, every open, every click — visible as a chronological feed on the subscriber detail view.

### UX Mechanics
- **Status badges as the primary scan pattern.** Campaign list shows colored badges (Draft = gray, Scheduled = blue, Sending = amber, Sent = green, Failed = red). Status is the first thing the eye hits.
- **Bulk actions require explicit selection.** No "select all + action" without a count confirmation. Bulk delete/unsubscribe always shows the exact count in the confirmation modal.
- **Empty states with clear CTAs.** Every empty list, empty inbox, empty segment shows a message explaining what belongs there and a single action button to create the first item.
- **Irreversible actions use red buttons + type-to-confirm.** Send, delete all, remove subscriber — anything that can't be undone uses a danger-colored button and, for the most destructive actions, a type-the-word-to-confirm pattern.

---

## 3. Principles (Non-Negotiables)

1. **Safety before speed.** Every send action has a pre-flight checklist. The system prevents accidental sends through UI gates, not just warnings.
2. **One subscriber, one record.** Tags and segments — never multiple lists. Duplicates are impossible at the database level.
3. **Events as the source of truth.** Open/click/bounce/complaint data lives in an events table. Aggregate counts are computed views, not manually incremented integers.
4. **Suppression overrides everything.** A suppressed email address never receives a newsletter, regardless of subscriber status, segment membership, or automation queue state.
5. **Every email includes an unsubscribe mechanism.** One-click unsubscribe link in body + `List-Unsubscribe` header. No exceptions.
6. **Compliance is structural, not advisory.** CAN-SPAM, GDPR, and Australian Spam Act requirements are enforced by the system architecture, not by admin discipline.
7. **The compose screen never lies.** What the admin sees in preview is what the subscriber receives. Merge tags render with fallback values in preview. The preview HTML is the actual send HTML.
8. **Observable queues.** Scheduled sends, automation queue items, and import jobs are all visible, cancelable, and debuggable from the admin UI.
9. **Audit everything that changes state.** Send actions, subscriber modifications, automation trigger events, and configuration changes all write to the activity log.
10. **Mobile-first email rendering.** All templates and the block builder produce responsive HTML that renders correctly in Gmail, Outlook, Apple Mail, and Yahoo Mail.

---

## 4. Product Spec

### A) Goals & Non-Goals

**Goals (the system must optimize for):**
- Reliable delivery of marketing emails with zero accidental sends
- Fast campaign creation workflow (draft to send in under 5 minutes for simple broadcasts)
- Complete subscriber lifecycle visibility (from signup → engagement → potential churn)
- Automated engagement workflows that run without daily admin attention
- Compliance with Australian Spam Act 2003, GDPR (consent + right to erasure), and CAN-SPAM
- Observable system state: the admin always knows what's been sent, what's scheduled, what failed, and why

**Non-goals (the system explicitly will not do):**
- A/B subject line testing — complexity exceeds value at current scale. Revisit at 10,000+ subscribers.
- Multi-language email support — single-language (English) for the foreseeable future
- Drag-and-drop visual automation builder (flowchart UI) — the current step-list automation model is sufficient. Visual builder is a Phase 3 consideration.
- Revenue attribution from email to purchase — requires deep Stripe integration beyond current scope. Track clicks to product pages instead.
- RSS-to-email or auto-generated content — all newsletters are manually composed
- Email deliverability warm-up tooling — Resend handles IP reputation. The admin's job is domain authentication only.
- White-label sending (multiple brand identities) — single brand: Lyne Tilt

### B) User Roles & Permissions

Extends the existing `userRoleEnum` (`admin`, `superadmin`). Add `editor` role.

| Action | superadmin | admin | editor |
|--------|-----------|-------|--------|
| **Campaigns** | | | |
| Create/edit draft | Yes | Yes | Yes |
| Delete draft | Yes | Yes | Own only |
| Send test email | Yes | Yes | Yes |
| Schedule campaign | Yes | Yes | No |
| Send campaign (immediate) | Yes | Yes | No |
| Cancel scheduled campaign | Yes | Yes | No |
| View sent campaigns + analytics | Yes | Yes | Yes (read-only) |
| **Subscribers** | | | |
| View subscriber list | Yes | Yes | Yes (read-only) |
| Add/edit subscriber | Yes | Yes | No |
| Delete/unsubscribe subscriber | Yes | Yes | No |
| Import subscribers | Yes | Yes | No |
| Export subscribers | Yes | No | No |
| **Segments** | | | |
| Create/edit/delete segments | Yes | Yes | No |
| **Templates & Snippets** | | | |
| Create/edit/delete templates | Yes | Yes | Yes |
| Create/edit/delete snippets | Yes | Yes | Yes |
| **Automations** | | | |
| Create/edit automations | Yes | Yes | No |
| Activate/pause automations | Yes | Yes | No |
| Delete automations | Yes | No | No |
| View automation queue | Yes | Yes | Yes (read-only) |
| **Settings** | | | |
| Configure sender identity/domain | Yes | No | No |
| Manage suppression list | Yes | Yes | No |
| View activity log | Yes | Yes | No |

**Implementation:** Add `editor` to `userRoleEnum`. Add `role` check middleware function:

```typescript
function requireRole(...roles: string[]) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient permissions' });
    next();
  };
}
```

### C) Information Architecture

**Admin left-nav structure** (modified from current):

```
Marketing (section header)
├── Campaigns          ← renamed from "Newsletter", campaign list + compose
├── Subscribers        ← extracted to own page
├── Segments           ← new page
├── Automations        ← already exists, stays
├── Templates          ← new page (full email templates, not snippets)
└── Email Settings     ← new page (sender identity, domain, suppression)
```

**Page Inventory:**

| Page | Route | Purpose |
|------|-------|---------|
| Campaign List | `/admin/campaigns` | All campaigns with status filter tabs |
| Campaign Compose | `/admin/campaigns/new` | New campaign creation |
| Campaign Edit | `/admin/campaigns/:id` | Edit existing draft |
| Campaign Analytics | `/admin/campaigns/:id/analytics` | Post-send performance |
| Subscriber List | `/admin/subscribers` | Searchable/filterable subscriber table |
| Subscriber Detail | `/admin/subscribers/:id` | Individual subscriber profile + timeline |
| Subscriber Import | `/admin/subscribers/import` | CSV import workflow |
| Segment List | `/admin/segments` | Saved segments |
| Segment Builder | `/admin/segments/:id` | Segment rule editor |
| Automation List | `/admin/automations` | All automations with status |
| Automation Editor | `/admin/automations/:id` | Edit automation steps |
| Automation Queue | `/admin/automations/queue` | Observable queue with retry/cancel |
| Template Library | `/admin/templates` | Full email template gallery |
| Template Editor | `/admin/templates/:id` | Template block builder |
| Email Settings | `/admin/email-settings` | Domain auth, sender identity, suppression list |

**Objects:**

| Object | Description |
|--------|-------------|
| Campaign | A single email broadcast with lifecycle status |
| Subscriber | An individual with email, tags, engagement data |
| Segment | A saved set of filter rules that resolves to a subscriber list |
| Template | A reusable full-email block arrangement |
| Snippet | A reusable partial block or block group |
| Automation | A trigger-based multi-step email sequence |
| AutomationQueueItem | A single pending/sent/failed automation email |
| EmailEvent | An individual tracking event (open, click, bounce, complaint, delivery) |
| SuppressionEntry | A blocked email address with reason and timestamp |
| ImportJob | A CSV import with status, validation results, and row counts |

### D) Primary UX Flows

#### Flow 1: Create Campaign
1. Admin clicks "New Campaign" button on Campaign List page
2. System creates a new campaign record with status `draft`, redirects to Campaign Compose page
3. Admin enters subject line (required, max 150 chars)
4. Admin optionally enters preheader text (max 200 chars)
5. Admin builds email body using block builder (left panel: block palette + snippets; center: canvas; right: block settings)
6. System auto-saves draft every 30 seconds when changes are detected, or on Cmd+S
7. "Last saved Xm ago" indicator updates in the toolbar
8. Admin clicks "Continue to Review" button

#### Flow 2: Edit Content (Block Builder)
1. Left panel shows two tabs: "Blocks" (9 block types) and "Snippets" (saved reusable blocks)
2. Admin drags a block type from palette onto canvas, or clicks to append
3. Block appears in canvas; right panel shows block-specific settings
4. For rich text blocks: full TipTap toolbar (headings, bold/italic/underline/strike, color, highlight, alignment, lists, links, blockquote, merge tags)
5. "+" insertion buttons appear on hover between blocks
6. Blocks are reorderable via drag handles
7. Block action bar: Duplicate | Save as Snippet | Delete
8. Admin can switch to "Snippets" tab, click any snippet to insert its blocks at the end of the canvas
9. Admin can load a full template from "Templates" dropdown in toolbar, which replaces all blocks (with confirmation if canvas is non-empty)

#### Flow 3: Preview / Test
1. From Campaign Compose, admin clicks "Preview" toggle in toolbar
2. Canvas switches to rendered HTML preview (merge tags show fallback values)
3. Desktop/Mobile toggle switches preview width (600px / 375px)
4. Admin clicks "Send Test" button
5. Modal: "Send test to:" with pre-filled admin email, editable
6. Admin clicks "Send Test Email"
7. System sends actual email via Resend to the test address
8. Toast: "Test email sent to [email]"
9. The pre-send checklist item "Test email sent" is now checked

#### Flow 4: Approval / Review (Pre-Send Checklist)
1. Admin clicks "Continue to Review" from compose
2. Review screen shows:
   - Subject line + preheader (editable inline)
   - Full email preview (desktop)
   - **Pre-send checklist** (all must pass to enable send/schedule):
     - [ ] Subject line is present
     - [ ] Email body has content (at least 1 block with content)
     - [ ] Unsubscribe link is present (system checks for `{{unsubscribe_url}}` in HTML)
     - [ ] Test email sent in this session
     - [ ] Audience selected (all subscribers or a segment)
   - Audience summary: "Sending to X subscribers" (with segment name if segmented)
   - Any warnings (e.g., "3 subscribers in this segment have not received any email — consider a smaller test first")
3. All checklist items green → "Schedule" and "Send Now" buttons are enabled
4. Any checklist item red → buttons are disabled, items that fail are highlighted with fix instructions

#### Flow 5: Schedule
1. From Review screen, admin clicks "Schedule"
2. Modal shows: date picker + time picker + timezone selector (defaults to `Australia/Melbourne`)
3. Admin selects date/time
4. "Schedule for [date] at [time] [timezone]" confirmation
5. System updates campaign status from `draft` → `scheduled`, stores `scheduledFor` timestamp (UTC)
6. Redirect to Campaign List. Campaign shows "Scheduled" badge with date
7. Campaign can be opened and edited (reverts to `draft` status on edit, removing the schedule)
8. Campaign can be canceled (reverts to `draft`)

#### Flow 6: Send
1. From Review screen, admin clicks "Send Now"
2. Confirmation modal:
   - "You are about to send **[subject]** to **[X] subscribers**."
   - "This action cannot be undone."
   - [Cancel] [Send Now — red button]
3. Admin clicks "Send Now"
4. System updates campaign status to `sending`
5. System creates `sentEmails` record
6. System begins sending via Resend (serial, with per-email tracking URL injection)
7. Progress indicator on Campaign List ("Sending... X/Y")
8. On completion: status → `sent`. Toast: "Campaign sent to X subscribers"
9. On partial failure: status → `sent` with warning badge. Analytics page shows delivered vs failed breakdown.

#### Flow 7: Post-Send Analytics Review
1. Admin clicks a "Sent" campaign in Campaign List
2. Campaign Analytics page shows:
   - **Summary cards:** Recipients, Delivered, Opened (rate), Clicked (rate), Bounced, Unsubscribed
   - **Open/click timeline chart** (Recharts line chart, first 72 hours)
   - **Link click breakdown** (table: URL, click count, unique clicks)
   - **Subscriber activity table** (who opened, who clicked, searchable)
   - **Bounce/complaint details** (if any)
3. All data derived from `email_events` table, computed on page load

#### Flow 8: Manage Subscribers
1. Subscriber List page shows a DataTable with columns: Email, Name, Tags, Source, Status, Engagement, Last Emailed, Subscribed Date
2. Search bar: instant search across email and name
3. Filter bar: Status (Active/Unsubscribed/All), Source dropdown, Tag dropdown, Engagement level (Highly Engaged / Engaged / Cold / At-Risk / Churned)
4. Bulk actions (with selection checkboxes): Add Tag, Remove Tag, Unsubscribe, Delete
5. Bulk actions require count confirmation modal
6. Click any subscriber row → Subscriber Detail page
7. Subscriber Detail shows: profile info, tag editor, engagement score, email timeline (every email sent to them + opens/clicks), subscription history

#### Flow 9: Import / Export
**Import:**
1. Admin clicks "Import" button on Subscriber List
2. Import page: drag-and-drop CSV upload zone
3. System parses CSV, shows column mapping UI (auto-detects `email`, `name`, `first_name`, `last_name`, `tags`, `source`)
4. Admin confirms column mapping
5. System validates all rows:
   - Valid email format
   - Not already subscribed (skip duplicates, report count)
   - Not on suppression list (skip, report count)
   - Invalid emails (skip, report count)
6. Validation report shown: "X valid, Y duplicates (will be skipped), Z invalid (will be skipped), W suppressed (will be skipped)"
7. Admin clicks "Import X subscribers"
8. Import job runs, creates subscriber records with specified source and tags
9. Import job record stored for audit (date, file name, row counts, admin who imported)

**Export:**
1. Admin clicks "Export" button (superadmin only)
2. System generates CSV of current filtered view
3. Browser downloads CSV file
4. Activity log entry: "Exported X subscribers"

#### Flow 10: Unsubscribe / Complaints Handling
1. **One-click unsubscribe (email link):**
   - Subscriber clicks `{{unsubscribe_url}}` in email
   - GET request to `/api/newsletter/unsubscribe?email=...&token=...`
   - System sets `subscribed = false`, `unsubscribedAt = now()`
   - Subscriber sees a branded "You've been unsubscribed" confirmation page
   - Admin sees the unsubscribe reflected in subscriber list and campaign analytics
2. **List-Unsubscribe header:**
   - Every sent email includes `List-Unsubscribe: <mailto:unsubscribe@lynetilt.com>, <https://...unsubscribe-url>`
   - Also `List-Unsubscribe-Post: List-Unsubscribe=One-Click` header
3. **Admin-initiated unsubscribe:**
   - From Subscriber Detail, admin clicks "Unsubscribe"
   - Confirmation modal, then subscriber is unsubscribed
4. **Re-subscribe:**
   - Unsubscribed subscribers can re-subscribe via the public signup form
   - System re-activates with new `subscribedAt` timestamp

#### Flow 11: Suppression / Blocked Addresses
1. Email Settings page has a "Suppression List" section
2. Table shows: Email, Reason (hard_bounce / complaint / manual), Date Added, Source (webhook / admin)
3. Admin can manually add an email to suppression list (with reason "manual")
4. Admin can remove from suppression list (with confirmation + activity log)
5. **Automatic suppression:**
   - Resend webhook `bounce` (type: hard) → auto-add to suppression
   - Resend webhook `complaint` → auto-add to suppression + auto-unsubscribe
   - 3 consecutive soft bounces within 7 days → auto-add to suppression
6. Before any send, the send logic filters out suppressed addresses

#### Flow 12: Automation Creation + Debugging
1. Admin clicks "New Automation" on Automation List
2. Form: Name, Trigger (dropdown: newsletter_signup / purchase / coaching_inquiry / contact_form / manual), Description
3. Admin adds steps:
   - Each step: Delay (days + hours), Subject, Email body (simplified TipTap editor)
   - Steps are ordered, reorderable via drag handles
   - Add Step button appends a new step
4. Admin sets status: Active or Paused
5. Save → automation is created
6. **Queue monitoring:** Automation Queue page shows:
   - Table: Recipient, Automation Name, Step #, Subject, Scheduled For, Status (scheduled/sent/failed), Error message (if failed)
   - Filter by status, automation name
   - Actions: Cancel (for scheduled items), Retry (for failed items)
7. **Debugging:** Failed items show the error message from Resend. Admin can retry individual items.

### E) Data Model

#### New/Modified Tables

**campaigns** (replaces `emailDrafts` + merges with `sentEmails` concept)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| subject | VARCHAR(255) | Yes | — | |
| preheader | VARCHAR(255) | No | null | |
| body | TEXT | Yes | — | JSON string of block array |
| bodyHtml | TEXT | No | null | Rendered HTML, generated before send |
| status | ENUM | Yes | 'draft' | 'draft', 'scheduled', 'sending', 'sent', 'failed' |
| audience | ENUM | Yes | 'all' | 'all', 'segment' |
| segmentId | UUID | No | null | FK → segments.id |
| segmentFilters | JSONB | No | null | Snapshot of segment rules at send time |
| scheduledFor | TIMESTAMP | No | null | UTC |
| scheduledTimezone | VARCHAR(50) | No | null | IANA timezone for display |
| sentAt | TIMESTAMP | No | null | |
| recipientCount | INTEGER | No | null | Set at send time |
| recipientSnapshot | JSONB | No | null | Array of {email, subscriberId} at send time |
| deliveredCount | INTEGER | No | 0 | Computed from events |
| testSentTo | JSONB | No | null | Array of test emails sent this session |
| createdBy | UUID | No | null | FK → users.id |
| createdAt | TIMESTAMP | Yes | now() | |
| updatedAt | TIMESTAMP | Yes | now() | |

Indexes: `status`, `scheduledFor`, `sentAt`, `createdBy`

**email_events** (new — replaces openCount/clickCount on sentEmails)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| campaignId | UUID | Yes | — | FK → campaigns.id |
| subscriberId | UUID | No | null | FK → subscribers.id (null if subscriber deleted) |
| email | VARCHAR(255) | Yes | — | Denormalized for lookup after subscriber deletion |
| eventType | ENUM | Yes | — | 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'unsubscribed' |
| metadata | JSONB | No | null | For clicks: {url, linkIndex}. For bounces: {bounceType, reason} |
| createdAt | TIMESTAMP | Yes | now() | |

Indexes: `campaignId`, `subscriberId`, `eventType`, `createdAt`, composite `(campaignId, eventType)`

**segments** (new)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| name | VARCHAR(255) | Yes | — | |
| description | TEXT | No | null | |
| rules | JSONB | Yes | — | See rule structure below |
| subscriberCount | INTEGER | No | 0 | Cached count, refreshed on access |
| lastCalculatedAt | TIMESTAMP | No | null | |
| createdAt | TIMESTAMP | Yes | now() | |
| updatedAt | TIMESTAMP | Yes | now() | |

**Segment rules structure:**
```typescript
interface SegmentRules {
  match: 'all' | 'any'; // AND vs OR
  conditions: SegmentCondition[];
}

interface SegmentCondition {
  field: 'source' | 'tags' | 'subscribed_days_ago' | 'engagement_score' | 'emails_received' | 'last_emailed_days_ago' | 'last_opened_days_ago';
  operator: 'equals' | 'not_equals' | 'contains' | 'not_contains' | 'greater_than' | 'less_than' | 'in' | 'not_in';
  value: string | number | string[];
}
```

**suppression_list** (new)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| email | VARCHAR(255) | Yes | — | Unique |
| reason | ENUM | Yes | — | 'hard_bounce', 'complaint', 'manual', 'consecutive_soft_bounce' |
| source | VARCHAR(50) | Yes | — | 'webhook', 'admin', 'system' |
| details | TEXT | No | null | Error message from bounce, etc. |
| createdAt | TIMESTAMP | Yes | now() | |

Index: unique on `email`

**import_jobs** (new)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| fileName | VARCHAR(255) | Yes | — | |
| status | ENUM | Yes | 'pending' | 'pending', 'validating', 'importing', 'completed', 'failed' |
| totalRows | INTEGER | No | null | |
| validRows | INTEGER | No | null | |
| importedRows | INTEGER | No | null | |
| skippedDuplicates | INTEGER | No | null | |
| skippedInvalid | INTEGER | No | null | |
| skippedSuppressed | INTEGER | No | null | |
| defaultSource | VARCHAR(100) | No | null | |
| defaultTags | JSONB | No | null | |
| columnMapping | JSONB | No | null | |
| errors | JSONB | No | null | Array of {row, field, message} |
| importedBy | UUID | No | null | FK → users.id |
| createdAt | TIMESTAMP | Yes | now() | |
| completedAt | TIMESTAMP | No | null | |

**email_templates** (new — separate from snippets)

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| id | UUID | Yes | random | PK |
| name | VARCHAR(255) | Yes | — | |
| description | TEXT | No | null | |
| thumbnail | TEXT | No | null | URL or base64 preview image |
| blocks | JSONB | Yes | — | Full block array |
| category | VARCHAR(100) | Yes | 'General' | |
| isDefault | BOOLEAN | Yes | false | System-provided templates |
| createdAt | TIMESTAMP | Yes | now() | |
| updatedAt | TIMESTAMP | Yes | now() | |

**Modifications to existing `subscribers` table — add columns:**

| Column | Type | Required | Default | Notes |
|--------|------|----------|---------|-------|
| firstName | VARCHAR(100) | No | null | Parsed from name or import |
| lastName | VARCHAR(100) | No | null | Parsed from name or import |
| engagementScore | INTEGER | No | 0 | 0-100, recomputed by cron |
| engagementLevel | VARCHAR(20) | No | 'new' | 'highly_engaged', 'engaged', 'cold', 'at_risk', 'churned', 'new' |
| lastOpenedAt | TIMESTAMP | No | null | Derived from latest open event |
| lastClickedAt | TIMESTAMP | No | null | Derived from latest click event |
| bounceCount | INTEGER | No | 0 | |
| lastBounceAt | TIMESTAMP | No | null | |

**Modifications to existing `emailAutomations` — add columns (workers schema):**

| Column | Type | Notes |
|--------|------|-------|
| lastTriggeredAt | TIMESTAMP | When the automation last fired |
| totalTriggered | INTEGER | Count of times triggered |
| totalSent | INTEGER | Count of automation emails sent |

**Modifications to existing `automationQueue` — add columns:**

| Column | Type | Notes |
|--------|------|-------|
| retryCount | INTEGER | Number of retries attempted |
| maxRetries | INTEGER | Default 3 |
| lastAttemptAt | TIMESTAMP | |

#### Relationships

```
campaigns 1 ←→ N email_events
subscribers 1 ←→ N email_events
campaigns N ←→ 1 segments (optional)
campaigns N ←→ 1 users (createdBy)
import_jobs N ←→ 1 users (importedBy)
suppression_list (standalone, referenced by email string match)
```

#### Audit Log Approach

Extend the existing `activityLog` table. New `entityType` values:
- `campaign` — create, update, send, schedule, cancel_schedule, delete
- `subscriber` — create, update, unsubscribe, resubscribe, delete, import, export
- `segment` — create, update, delete
- `automation` — create, update, activate, pause, delete
- `suppression` — add, remove
- `template` — create, update, delete
- `email_settings` — update

Every write operation to these entities logs to `activityLog` with the admin's `userId`, the action, and a metadata JSONB with relevant context (e.g., recipient count for sends, file name for imports).

#### Event Tracking Schema for Analytics

All email events flow through one path:

1. **Click tracking:** Subscriber clicks a tracked link → GET `/api/newsletter/track/click/:campaignId/:linkIndex?url=...&email=...` → insert `email_events` row (type: `clicked`, metadata: {url, linkIndex}) → 302 redirect to original URL
2. **Open tracking:** Email client loads tracking pixel → GET `/api/newsletter/track/open/:campaignId?email=...` → insert `email_events` row (type: `opened`) → return 1x1 transparent GIF
3. **Delivery/Bounce/Complaint:** Resend webhook POST `/api/newsletter/webhooks/resend` → parse event type → insert `email_events` row → if hard bounce or complaint, also insert into `suppression_list`
4. **Unsubscribe:** Subscriber clicks unsubscribe → insert `email_events` row (type: `unsubscribed`) → update subscriber record

Deduplication: Opens are deduplicated per subscriber per campaign (first open only counts for rate calculation, but all opens are stored). Clicks are deduplicated per subscriber per URL per campaign for unique click counts.

### F) Deliverability & Compliance

#### Pre-Send Guardrails

The "Send Now" and "Schedule" buttons are disabled until all of these pass:

| Check | How it's verified |
|-------|-------------------|
| Subject line present | `subject.trim().length > 0` |
| Email body has content | At least 1 non-empty block |
| Unsubscribe link present | HTML contains `{{unsubscribe_url}}` or the rendered unsubscribe URL |
| Physical address in footer | Block builder auto-injects footer with sender address from Email Settings |
| Audience selected | `audience` is 'all' or a valid segment with > 0 subscribers |
| Test email sent this session | `testSentTo` array is non-empty |

If domain authentication (DKIM) is not verified in Resend, a warning banner appears on the compose page: "Your sending domain is not authenticated. Emails may land in spam."

#### Unsubscribe Handling Rules

1. Every email body must contain `{{unsubscribe_url}}`. The block builder auto-adds a footer block with the unsubscribe link. This footer block cannot be deleted (it is locked at the bottom of every email).
2. Every email sent includes HTTP headers:
   ```
   List-Unsubscribe: <https://lynetilt.com/api/newsletter/unsubscribe?email={{email}}&token={{token}}>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```
3. Unsubscribe is processed immediately. No "are you sure" re-confirmation email. No waiting period.
4. Unsubscribed addresses remain in the subscriber table with `subscribed = false`. They are never deleted automatically (for compliance record-keeping).

#### CAN-SPAM / GDPR / AU Spam Act Compliance

| Requirement | Implementation |
|-------------|---------------|
| **Sender identity** | `From` header uses verified domain. Physical address in email footer (configurable in Email Settings). |
| **Opt-in consent** | Public signup form captures explicit consent. No pre-checked boxes. Import flow requires admin to confirm consent was obtained. |
| **Easy unsubscribe** | One-click unsubscribe link in every email + List-Unsubscribe header. Processed within 1 second (immediate database update). |
| **No misleading headers** | Subject line entered by admin as-is. No system-generated deceptive subjects. |
| **GDPR right to erasure** | Subscriber Detail page has "Delete Subscriber" action. Deletes subscriber record. Email events retain anonymized data (email hash, not plaintext) for aggregate analytics. |
| **GDPR right to access** | Subscriber Detail page shows all data held about the subscriber. Future: add "Export subscriber data" button that generates a JSON/CSV of their record + events. |
| **AU Spam Act: identify sender** | Sender name + ABN/business details in footer. Configurable in Email Settings. |
| **AU Spam Act: consent record** | `subscribers.source` field records where consent was obtained. Import jobs record the consent basis. |
| **Honor unsubscribe within 5 business days** | System processes unsubscribe instantly (< 1 second). |

#### Bounce/Complaint Processing Lifecycle

```
Resend Webhook Event Received
├── Type: delivered
│   └── Insert email_events (type: delivered)
├── Type: bounced
│   ├── Hard bounce?
│   │   ├── Insert email_events (type: bounced, metadata: {bounceType: 'hard', reason})
│   │   ├── Add email to suppression_list (reason: hard_bounce)
│   │   └── Set subscriber.subscribed = false
│   └── Soft bounce?
│       ├── Insert email_events (type: bounced, metadata: {bounceType: 'soft', reason})
│       ├── Increment subscriber.bounceCount
│       ├── Set subscriber.lastBounceAt = now()
│       └── If bounceCount >= 3 AND lastBounceAt within 7 days of previous bounce:
│           ├── Add email to suppression_list (reason: consecutive_soft_bounce)
│           └── Set subscriber.subscribed = false
├── Type: complained
│   ├── Insert email_events (type: complained)
│   ├── Add email to suppression_list (reason: complaint)
│   └── Set subscriber.subscribed = false
└── Type: opened / clicked
    └── Insert email_events (already handled by tracking endpoints)
```

### G) UI Component / System Spec

#### DataTable (extends existing `admin/components/DataTable.tsx`)

**Behavior rules:**
- Sortable columns: click header to sort asc, click again desc, third click clears sort
- Filter bar: dropdowns per filterable column + text search field. Filters are AND-combined
- Saved views: not in MVP. Phase 2 consideration.
- Bulk actions: checkbox column on left. "Select all on this page" checkbox in header. Selecting triggers a bulk action bar at the top: action buttons + "X selected" count
- Bulk action execution: always shows a confirmation modal with the exact count and action description
- Pagination: bottom of table. "Showing X–Y of Z" + page number buttons. 25 rows per page default.
- Empty state: centered message + primary CTA button (e.g., "No subscribers yet. Import your first list.")
- Loading state: skeleton rows (3 shimmer rows)

#### Block Editor (extends existing `BlockBuilder.tsx`)

**Behavior rules:**
- Left panel (280px fixed): "Blocks" tab (block type grid) and "Snippets" tab (saved snippets list)
- Center canvas (flexible, max 600px): vertical block stack with drag handles, selection highlight, hover insertion points
- Right panel (320px fixed): block-specific settings when a block is selected; campaign metadata (subject, preheader) when no block is selected
- Locked footer block: always present at the bottom, contains unsubscribe link + sender address. Cannot be deleted or reordered. Can be edited (text above the required links).
- Auto-save: debounced 30 seconds after last change. Visual indicator in toolbar: "Saved" / "Saving..." / "Unsaved changes"
- Cmd+S / Ctrl+S: immediate save

#### Rich Text Editor (TipTap — extends existing `MiniTipTapEditor`)

**Toolbar rows:**
- Row 1: Heading dropdown (P/H1/H2/H3) | Bold, Italic, Underline, Strikethrough | Text color picker | Highlight color picker | Alignment (L/C/R) | Clear formatting
- Row 2: Link | Blockquote | Bullet list | Ordered list | Horizontal rule | Merge tags dropdown
- BubbleMenu on text selection: Bold, Italic, Underline, Link

**Merge tag dropdown:**
- Shows all available merge tags with label + placeholder preview
- Inserts tag as an inline atom node (non-editable pill)
- Tags: `{{first_name}}`, `{{subscriber_name}}`, `{{email}}`, `{{unsubscribe_url}}`

#### Modals / Drawers

| Component | Type | Use cases |
|-----------|------|-----------|
| Confirmation Modal | Modal (centered overlay) | Send confirmation, delete confirmation, bulk action confirmation |
| Subscriber Detail | Drawer (right slide-in, 480px) | Subscriber profile + timeline |
| Block Settings | Inline panel (right side of builder) | Block-specific editing |
| Import Wizard | Full page | CSV import multi-step flow |
| Segment Builder | Full page | Segment rule editor |
| Template Picker | Modal (large) | Select template when starting a campaign |

**Modal behavior rules:**
- Backdrop click closes non-destructive modals (template picker, previews)
- Backdrop click does NOT close destructive modals (send confirmation, delete confirmation)
- Escape key always closes (except during loading/processing states)
- Focus trap: tab key cycles within modal
- Body scroll locked when modal is open

#### Status Badges

| Status | Color | Label |
|--------|-------|-------|
| Draft | Stone/gray (`bg-stone-100 text-stone-700`) | Draft |
| Scheduled | Blue (`bg-blue-100 text-blue-700`) | Scheduled |
| Sending | Amber (`bg-amber-100 text-amber-700`) | Sending |
| Sent | Green (`bg-green-100 text-green-700`) | Sent |
| Failed | Red (`bg-red-100 text-red-700`) | Failed |
| Active (automations) | Green (`bg-green-100 text-green-700`) | Active |
| Paused (automations) | Stone/gray (`bg-stone-100 text-stone-700`) | Paused |
| Subscribed | Green | Active |
| Unsubscribed | Stone/gray | Unsubscribed |
| Suppressed | Red | Suppressed |

**Badge component:** `<StatusBadge status={status} />` — a single reusable component that maps status → color + label.

#### Toasts / Errors

- **Success toasts:** bottom-right, auto-dismiss after 4 seconds. Green left border.
- **Error toasts:** bottom-right, persistent until dismissed. Red left border. Show error message from API response.
- **Warning toasts:** bottom-right, auto-dismiss after 6 seconds. Amber left border.
- **Implementation:** use a toast context provider (same pattern as existing cart context). `useToast()` hook returns `{ success(msg), error(msg), warning(msg) }`.

#### Empty States

Every list view has a specific empty state:

| View | Message | CTA |
|------|---------|-----|
| Campaign List | "No campaigns yet" | "Create your first campaign" |
| Subscriber List | "No subscribers yet" | "Import subscribers" |
| Segment List | "No segments defined" | "Create a segment" |
| Automation List | "No automations set up" | "Create an automation" |
| Automation Queue | "Queue is empty — all caught up" | (no CTA) |
| Template Library | "No custom templates" | "Create a template" |
| Snippet Library | "No saved snippets" | "Save a block as a snippet from the editor" |
| Suppression List | "No suppressed addresses" | (no CTA) |

#### Confirmation + Irreversible Actions

| Action | Confirmation Pattern |
|--------|---------------------|
| Send campaign | Modal: shows subject + recipient count + "This cannot be undone" + red "Send Now" button |
| Delete campaign | Modal: "Delete [subject]?" + red "Delete" button |
| Delete subscriber | Modal: "Remove [email]? This will delete all their data." + red "Delete" button |
| Bulk unsubscribe | Modal: "Unsubscribe [X] subscribers?" + "Unsubscribe" button |
| Delete automation | Modal: "Delete [name]? All queued emails for this automation will be canceled." + red "Delete" button |
| Remove from suppression | Modal: "Remove [email] from suppression list? This address will be eligible to receive emails again." + "Remove" button |
| Import subscribers | Review screen with validation report → "Import X subscribers" button |

### H) Edge Cases

| # | Scenario | System Behavior |
|---|----------|-----------------|
| H1 | **Partial send failure.** 200 recipients, Resend fails for 15 of them. | Campaign status → `sent`. `deliveredCount` reflects actual delivered (from webhook events). Campaign analytics page shows "185 delivered, 15 failed" with expandable error list. Failed recipient emails are shown. No automatic retry for broadcast sends (retry is a manual re-send to a segment of failed recipients). |
| H2 | **Resend rate limits (429 response).** Sending to a large list exceeds Resend's rate limit. | The send loop implements exponential backoff: 1s → 2s → 4s → 8s, max 3 retries per email. If still 429 after retries, that email is logged as failed. The overall campaign continues to the next recipient. |
| H3 | **Duplicate subscriber on signup.** Someone submits the public signup form with an already-subscribed email. | Return success (do not reveal that the email exists — prevents email enumeration). No database change. No duplicate created. Log nothing (not an error). |
| H4 | **Duplicate subscriber on import.** CSV contains an email that already exists in the database. | Skip the row. Increment `skippedDuplicates` counter on the import job. The existing subscriber's data is NOT overwritten. Import report shows "X duplicates skipped." |
| H5 | **Import CSV with invalid rows.** Mixed valid and invalid emails, missing required fields. | Parse all rows. Validate each individually. Invalid rows are skipped and listed in the import job's `errors` JSONB array with row number and reason. Valid rows are imported. Import never fails as a batch — it's always a partial success. |
| H6 | **Timezone confusion in scheduling.** Admin in Melbourne schedules for "9 AM" but system stores UTC. | The schedule modal shows a timezone selector defaulting to `Australia/Melbourne`. The stored `scheduledFor` is UTC. The display always shows the original timezone context: "Scheduled for Feb 14 at 9:00 AM AEDT". The cron job compares against UTC. |
| H7 | **Scheduled send conflict.** Two campaigns scheduled for the exact same minute. | The cron job processes them sequentially in `createdAt` order. No conflict. Both send. If needed, a future optimization can stagger sends by 60 seconds. |
| H8 | **Template breaking changes.** Admin edits a template that was used in a previous campaign. | Templates are copied into campaigns at creation time (deep clone of blocks). Editing a template does not affect existing campaigns or drafts. |
| H9 | **Accidental send — safety interlocks.** Admin clicks "Send Now" by mistake. | Interlocks: (1) Pre-send checklist must all pass, (2) Confirmation modal with recipient count, (3) Red "Send Now" button requires intentional click. There is no "undo send" — the interlocks are the safety mechanism. Post-send, the only option is to check analytics and, if needed, send a correction email. |
| H10 | **Subscriber unsubscribes during a bulk send.** Send started, 100 of 500 emails sent, subscriber at position 350 unsubscribes. | The send loop does NOT re-check subscriber status mid-send. The recipient snapshot is captured at send start. The unsubscribed subscriber will receive this email (it's already committed). Their unsubscribe takes effect for all future sends. This is standard behavior across all email platforms. |
| H11 | **Admin deletes a subscriber who has historical email events.** | Subscriber record is deleted. `email_events` rows remain but with `subscriberId = null`. The denormalized `email` field on events allows historical analytics to continue working (aggregate counts stay accurate). Subscriber detail page is no longer accessible. |
| H12 | **Automation triggers but subscriber is suppressed.** | The automation trigger check queries suppression list before queuing. Suppressed subscribers are skipped entirely — no queue item is created. |
| H13 | **Resend webhook arrives before tracking pixel event.** Resend reports `delivered` before admin checks analytics. | All events go to the same `email_events` table regardless of source (webhook vs tracking endpoint). Events are timestamped independently. Analytics queries aggregate from this table and handle any arrival order. |
| H14 | **Campaign body contains no unsubscribe link.** Admin removes it from content. | The locked footer block always contains `{{unsubscribe_url}}`. Even if the admin clears the footer text, the unsubscribe link is injected by the system at HTML generation time. The pre-send checklist verifies its presence. If somehow absent, the send button stays disabled. |

### I) Observability & QA

#### Key Logs / Metrics to Implement

**Application logs (console + structured JSON):**

| Log | Level | Trigger |
|-----|-------|---------|
| `campaign.send.start` | info | Campaign send initiated. Include campaignId, recipientCount. |
| `campaign.send.email.success` | debug | Individual email sent. Include campaignId, email (hashed in prod). |
| `campaign.send.email.fail` | error | Individual email failed. Include campaignId, email (hashed), error message. |
| `campaign.send.complete` | info | Campaign send finished. Include campaignId, sent count, failed count, duration_ms. |
| `campaign.schedule.create` | info | Campaign scheduled. Include campaignId, scheduledFor. |
| `campaign.schedule.cancel` | info | Scheduled campaign canceled. Include campaignId. |
| `webhook.resend.received` | debug | Resend webhook received. Include event type, email (hashed). |
| `webhook.resend.suppression` | warn | Suppression triggered by webhook. Include email (hashed), reason. |
| `automation.trigger` | info | Automation triggered. Include automationId, trigger type, recipient email (hashed). |
| `automation.queue.send` | info | Automation queue item sent. Include queueItemId. |
| `automation.queue.fail` | error | Automation queue item failed. Include queueItemId, error. |
| `subscriber.import.start` | info | Import job started. Include jobId, fileName, totalRows. |
| `subscriber.import.complete` | info | Import job completed. Include jobId, imported/skipped counts. |

**Dashboard metrics (displayed on admin Dashboard page):**

| Metric | Calculation |
|--------|-------------|
| Total active subscribers | `COUNT(*) WHERE subscribed = true` |
| New subscribers (last 30 days) | `COUNT(*) WHERE subscribedAt > now() - 30d` |
| Unsubscribes (last 30 days) | `COUNT(*) WHERE unsubscribedAt > now() - 30d` |
| Campaigns sent (last 30 days) | `COUNT(*) WHERE status = 'sent' AND sentAt > now() - 30d` |
| Average open rate (last 30 days) | `AVG(open_rate) across campaigns sent in last 30 days` |
| Average click rate (last 30 days) | `AVG(click_rate) across campaigns sent in last 30 days` |
| Automation queue depth | `COUNT(*) WHERE status = 'scheduled'` |
| Suppression list size | `COUNT(*) in suppression_list` |

#### QA Checklist Per Flow

**Campaign Creation:**
- [ ] Can create a new campaign from Campaign List
- [ ] Subject line is required — cannot proceed without it
- [ ] Preheader is optional
- [ ] Block builder loads with all 9 block types available
- [ ] Can add, reorder, duplicate, and delete blocks
- [ ] Rich text editor has full toolbar (headings, formatting, colors, alignment, lists, links)
- [ ] Merge tags insert as inline pills
- [ ] Auto-save triggers after 30 seconds of inactivity
- [ ] Cmd+S triggers immediate save
- [ ] Draft status persists after page reload

**Preview / Test:**
- [ ] Preview renders HTML correctly
- [ ] Desktop/Mobile toggle changes preview width
- [ ] Merge tags show fallback values in preview
- [ ] Test email sends successfully via Resend
- [ ] Test email arrives with correct formatting
- [ ] Test email has working unsubscribe link

**Send Flow:**
- [ ] Pre-send checklist correctly identifies missing items
- [ ] Send button disabled when checklist is incomplete
- [ ] Audience selector shows correct subscriber count
- [ ] Segment filter shows correct filtered count
- [ ] Confirmation modal shows correct subject + count
- [ ] Campaign status changes to 'sending' then 'sent'
- [ ] Sent campaign appears in Campaign List with green badge
- [ ] Recipients receive the email
- [ ] Tracking pixel is present in received email HTML
- [ ] Links are rewritten to tracking URLs
- [ ] Unsubscribe link works in received email

**Subscriber Management:**
- [ ] Subscriber list loads with pagination
- [ ] Search works across email and name
- [ ] Filter by status, source, tags works
- [ ] Bulk tag add/remove works
- [ ] Bulk unsubscribe shows count confirmation
- [ ] Subscriber detail drawer shows correct data
- [ ] Subscriber email timeline shows sent emails
- [ ] Manual subscriber add works
- [ ] Manual subscriber delete works

**Import:**
- [ ] CSV upload accepts .csv files
- [ ] Column mapping auto-detects email/name fields
- [ ] Validation report correctly identifies duplicates, invalid emails, suppressed addresses
- [ ] Import creates subscriber records with correct source and tags
- [ ] Import job record is created for audit trail

**Automations:**
- [ ] Can create automation with trigger and steps
- [ ] Steps are reorderable
- [ ] Activate/pause toggle works
- [ ] Automation triggers on relevant events (signup, purchase, etc.)
- [ ] Queue items appear in Automation Queue page
- [ ] Scheduled queue items send at the correct time
- [ ] Failed queue items show error and can be retried

**Analytics:**
- [ ] Open tracking pixel fires on email open
- [ ] Click tracking redirects work and record events
- [ ] Campaign analytics page shows correct counts
- [ ] Open/click rate calculations are accurate
- [ ] Link click breakdown shows correct URLs and counts

**Compliance:**
- [ ] Every sent email has List-Unsubscribe header
- [ ] Every sent email has unsubscribe link in body
- [ ] Unsubscribe processes immediately
- [ ] Hard bounces add to suppression list automatically
- [ ] Complaints add to suppression list automatically
- [ ] Suppressed addresses never receive new emails

#### Test Plan

**Unit tests** (Vitest — to be set up):
- Segment rule evaluator: given a subscriber and rules, returns true/false
- Engagement score calculator: given event history, returns 0-100 score
- Email HTML generator: given blocks, returns valid HTML with merge tags replaced
- Pre-send checklist validator: given campaign state, returns pass/fail per check
- Import CSV parser: given CSV string, returns parsed rows with validation errors
- Tracking URL rewriter: given HTML and campaign/subscriber IDs, returns rewritten HTML

**Integration tests** (API-level, using supertest or similar):
- Campaign CRUD endpoints
- Subscriber CRUD endpoints with duplicate handling
- Segment CRUD + evaluation endpoint
- Send endpoint (mocked Resend)
- Webhook endpoint (simulated Resend events)
- Import endpoint with test CSV
- Suppression list CRUD + automatic suppression from webhooks
- Tracking endpoints (click redirect, open pixel)
- Authentication + role-based access

**E2E tests** (Playwright — to be set up):
- Full campaign creation → preview → test → send flow
- Subscriber import from CSV
- Subscriber search + filter + bulk action
- Automation creation + queue monitoring
- Unsubscribe flow from email link
- Campaign analytics page loads with correct data

### J) Implementation Roadmap

---

#### MVP (Phase 1) — Minimum Enterprise-Grade

**Objective:** Replace the current monolithic NewsletterManager.tsx with a proper campaign lifecycle, event-based analytics, and safety interlocks. This is the foundation everything else builds on.

**Duration estimate: excluded per instructions.**

**Endpoints (new / modified):**

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/campaigns` | List campaigns with status filter |
| GET | `/api/campaigns/:id` | Get single campaign |
| POST | `/api/campaigns` | Create campaign (returns draft) |
| PUT | `/api/campaigns/:id` | Update campaign (draft only) |
| DELETE | `/api/campaigns/:id` | Delete campaign (draft only) |
| POST | `/api/campaigns/:id/send-test` | Send test email |
| POST | `/api/campaigns/:id/schedule` | Schedule campaign |
| POST | `/api/campaigns/:id/cancel-schedule` | Cancel scheduled campaign |
| POST | `/api/campaigns/:id/send` | Send campaign immediately |
| GET | `/api/campaigns/:id/analytics` | Campaign analytics (computed from events) |
| GET | `/api/campaigns/:id/preflight` | Run pre-send checklist, return results |
| POST | `/api/newsletter/webhooks/resend` | Resend webhook receiver |
| GET | `/api/newsletter/track/click/:campaignId/:linkIndex` | Click tracking redirect |
| GET | `/api/newsletter/track/open/:campaignId` | Open tracking pixel |
| GET | `/api/newsletter/unsubscribe` | One-click unsubscribe |
| GET | `/api/suppression` | List suppression entries |
| POST | `/api/suppression` | Manually suppress an email |
| DELETE | `/api/suppression/:id` | Remove from suppression |

**Pages:**

| Page | Route | Notes |
|------|-------|-------|
| Campaign List | `/admin/campaigns` | Status-filtered table, replaces current Newsletter tab |
| Campaign Compose | `/admin/campaigns/new` and `/admin/campaigns/:id` | Block builder + metadata |
| Campaign Review | `/admin/campaigns/:id/review` | Pre-send checklist + confirmation |
| Campaign Analytics | `/admin/campaigns/:id/analytics` | Post-send dashboard |

**Database changes:**
- Create `campaigns` table (migration from `emailDrafts` + `sentEmails`)
- Create `email_events` table
- Create `suppression_list` table
- Add `firstName`, `lastName` to `subscribers`
- Migrate existing `sentEmails` data into `campaigns` (status: 'sent')
- Migrate existing `emailDrafts` data into `campaigns` (status: 'draft')
- Drop `emailDrafts` and `sentEmails` tables after migration

**Tracking events to implement:**
- `campaign.created`, `campaign.updated`, `campaign.scheduled`, `campaign.schedule_canceled`, `campaign.sent`, `campaign.deleted`
- `email_event.delivered`, `email_event.opened`, `email_event.clicked`, `email_event.bounced`, `email_event.complained`

**Acceptance criteria:**
- [ ] Campaign lifecycle works end-to-end: create → edit → preview → test → send → view analytics
- [ ] Pre-send checklist blocks send when conditions are not met
- [ ] Send confirmation modal shows correct recipient count
- [ ] Emails are delivered with tracking pixel and rewritten links
- [ ] Click tracking redirects correctly and records events
- [ ] Open tracking pixel fires and records events
- [ ] Resend webhook processes bounces → suppression list
- [ ] Resend webhook processes complaints → suppression list + unsubscribe
- [ ] Suppressed addresses are excluded from campaign sends
- [ ] Campaign analytics page shows delivered, open, click, bounce counts from event data
- [ ] Scheduling works: campaign sends at scheduled time via cron
- [ ] Scheduled campaigns can be canceled (revert to draft)
- [ ] All campaign actions log to activity log
- [ ] List-Unsubscribe header present on all sent emails
- [ ] Locked footer block with unsubscribe link cannot be removed
- [ ] Existing email data (drafts + sent) migrated to new campaigns table

---

#### Phase 2 — Subscriber Intelligence + Segmentation

**Objective:** Upgrade subscriber management from a flat list to an intelligent, segmentable audience with engagement scoring and import/export.

**Endpoints (new / modified):**

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/subscribers` | Enhanced: support engagement filter, pagination, sort |
| GET | `/api/subscribers/:id` | Enhanced: include event timeline |
| GET | `/api/subscribers/:id/events` | Subscriber's email event history |
| POST | `/api/subscribers/import` | Start CSV import job |
| GET | `/api/subscribers/import/:jobId` | Get import job status/results |
| GET | `/api/subscribers/export` | Export CSV (superadmin only) |
| GET | `/api/segments` | List saved segments |
| GET | `/api/segments/:id` | Get segment with subscriber count |
| POST | `/api/segments` | Create segment |
| PUT | `/api/segments/:id` | Update segment rules |
| DELETE | `/api/segments/:id` | Delete segment |
| GET | `/api/segments/:id/preview` | Preview subscribers matching segment |

**Pages:**

| Page | Route |
|------|-------|
| Subscriber List | `/admin/subscribers` (extracted from NewsletterManager) |
| Subscriber Detail | `/admin/subscribers/:id` (full page, not drawer) |
| Subscriber Import | `/admin/subscribers/import` |
| Segment List | `/admin/segments` |
| Segment Builder | `/admin/segments/new` and `/admin/segments/:id` |

**Database changes:**
- Create `segments` table
- Create `import_jobs` table
- Add `engagementScore`, `engagementLevel`, `lastOpenedAt`, `lastClickedAt`, `bounceCount`, `lastBounceAt` to `subscribers`
- Add cron job to recompute engagement scores (daily)

**Engagement score algorithm:**

```
Score = (
  (openedInLast30Days ? 30 : 0) +
  (clickedInLast30Days ? 25 : 0) +
  (openedInLast60Days ? 15 : 0) +
  (clickedInLast60Days ? 10 : 0) +
  (subscribedInLast30Days ? 20 : 0)
)
// Max: 100

Levels:
  80-100: highly_engaged
  50-79: engaged
  20-49: cold
  1-19: at_risk
  0: churned (must have received at least 3 emails)
  new: received < 3 emails
```

**Tracking events:**
- `subscriber.imported`, `subscriber.exported`, `segment.created`, `segment.updated`, `segment.deleted`

**Acceptance criteria:**
- [ ] Subscriber list supports search, filter by status/source/tag/engagement, pagination
- [ ] Subscriber detail page shows profile, tags, engagement score, email timeline
- [ ] CSV import works end-to-end: upload → map columns → validate → report → import
- [ ] Import correctly skips duplicates, invalid emails, suppressed addresses
- [ ] Import job is recorded for audit
- [ ] CSV export generates correct file (superadmin only)
- [ ] Segments can be created with multiple conditions (AND/OR)
- [ ] Segment preview shows matching subscribers with count
- [ ] Segments are selectable as campaign audience
- [ ] Campaign compose shows segment subscriber count
- [ ] Engagement scores are computed correctly from event data
- [ ] Engagement scores refresh daily via cron
- [ ] Subscriber engagement level drives filtering on subscriber list

---

#### Phase 3 — Templates, Advanced Automations, Polish

**Objective:** Round out the system with a proper template library, enhanced automations with observable queues, editor role support, and the Email Settings page.

**Endpoints (new / modified):**

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/templates` | List email templates |
| GET | `/api/templates/:id` | Get single template |
| POST | `/api/templates` | Create template |
| PUT | `/api/templates/:id` | Update template |
| DELETE | `/api/templates/:id` | Delete template (non-default only) |
| GET | `/api/automations/queue` | List automation queue items |
| POST | `/api/automations/queue/:id/retry` | Retry failed queue item |
| DELETE | `/api/automations/queue/:id` | Cancel scheduled queue item |
| GET | `/api/email-settings` | Get email settings (sender, domain status) |
| PUT | `/api/email-settings` | Update email settings |
| PUT | `/api/automations/:id` | Enhanced: add `lastTriggeredAt`, `totalTriggered`, `totalSent` |

**Pages:**

| Page | Route |
|------|-------|
| Template Library | `/admin/templates` |
| Template Editor | `/admin/templates/new` and `/admin/templates/:id` |
| Automation Queue | `/admin/automations/queue` |
| Email Settings | `/admin/email-settings` |

**Database changes:**
- Create `email_templates` table
- Add `retryCount`, `maxRetries`, `lastAttemptAt` to `automationQueue`
- Add `lastTriggeredAt`, `totalTriggered`, `totalSent` to `emailAutomations`
- Add `editor` to `userRoleEnum`
- Seed 5 default templates (Product Launch, Weekly Digest, Coaching Update, Announcement, Blank)

**Tracking events:**
- `template.created`, `template.updated`, `template.deleted`
- `automation.queue.retried`, `automation.queue.canceled`
- `email_settings.updated`

**Acceptance criteria:**
- [ ] Template library shows all templates with thumbnail previews
- [ ] Can create, edit, delete custom templates
- [ ] Default templates cannot be deleted (only duplicated)
- [ ] Starting a new campaign offers template selection
- [ ] Selected template deep-clones blocks into new campaign
- [ ] Automation queue page shows all queue items with status filter
- [ ] Failed queue items can be retried (resets status to scheduled, increments retryCount)
- [ ] Scheduled queue items can be canceled
- [ ] Email Settings page shows sender identity fields
- [ ] Email Settings page shows domain authentication status (fetched from Resend API)
- [ ] Email Settings page shows suppression list (migrated from standalone page if needed)
- [ ] Editor role can create/edit drafts and templates but cannot send or manage subscribers
- [ ] Role-based access is enforced on all protected endpoints
- [ ] Toast notification system works for all success/error/warning states
- [ ] All empty states render correctly with appropriate CTAs
- [ ] All confirmation modals render correctly for irreversible actions

---

## 5. Acceptance Criteria Checklist (Copy/Paste for Tickets)

### Campaign System
- [ ] `campaigns` table created with full lifecycle status
- [ ] Campaign CRUD API endpoints functional
- [ ] Campaign list page with status filter tabs (All, Drafts, Scheduled, Sent)
- [ ] Campaign compose page with block builder
- [ ] Block builder has locked footer block with unsubscribe link
- [ ] Rich text editor has full formatting toolbar + merge tags
- [ ] Auto-save with visual indicator (30s debounce + Cmd+S)
- [ ] Campaign preview with desktop/mobile toggle
- [ ] Test email send functional
- [ ] Pre-send checklist validates: subject, content, unsubscribe, test sent, audience
- [ ] Pre-send checklist blocks send/schedule when incomplete
- [ ] Schedule modal with date/time/timezone picker
- [ ] Scheduled campaigns cancelable
- [ ] Send confirmation modal with recipient count + irreversibility warning
- [ ] Campaign status transitions: draft → scheduled → sending → sent
- [ ] Failed sends handled gracefully with partial delivery reporting
- [ ] List-Unsubscribe + List-Unsubscribe-Post headers on all sent emails

### Event Tracking & Analytics
- [ ] `email_events` table created
- [ ] Click tracking endpoint records events + redirects
- [ ] Open tracking pixel endpoint records events + serves 1x1 GIF
- [ ] Resend webhook endpoint processes delivered/bounced/complained events
- [ ] Hard bounces auto-suppress
- [ ] Complaints auto-suppress + auto-unsubscribe
- [ ] Soft bounces tracked; 3 consecutive in 7 days → suppress
- [ ] Campaign analytics page: delivered, opened, clicked, bounced, unsubscribed counts
- [ ] Campaign analytics page: link click breakdown table
- [ ] Open/click rates calculated from events (not stored counters)

### Suppression
- [ ] `suppression_list` table created
- [ ] Manual add/remove from admin UI
- [ ] Automatic add from bounce/complaint webhooks
- [ ] Suppressed addresses filtered out before every campaign send
- [ ] Suppressed addresses filtered out before automation queue creation

### Subscribers
- [ ] Subscriber list with search, filter, pagination
- [ ] Filter by: status, source, tags, engagement level
- [ ] Subscriber detail with profile info, tags, engagement score, email timeline
- [ ] Bulk actions: add tag, remove tag, unsubscribe, delete (with count confirmation)
- [ ] One-click unsubscribe from email link processes immediately
- [ ] Unsubscribe preserves subscriber record (subscribed = false)
- [ ] `firstName`, `lastName` fields added to subscribers

### Import / Export
- [ ] CSV upload with drag-drop zone
- [ ] Column auto-detection + manual mapping
- [ ] Row-by-row validation (email format, duplicates, suppressed)
- [ ] Validation report before import commit
- [ ] Import job recorded for audit trail
- [ ] Export generates CSV of filtered subscriber view (superadmin only)

### Segments
- [ ] `segments` table created with JSONB rules
- [ ] Segment CRUD API endpoints
- [ ] Segment builder UI with condition rows (field + operator + value)
- [ ] AND/OR matching toggle
- [ ] Segment preview shows matching subscriber count
- [ ] Segments selectable as campaign audience
- [ ] Segment rules snapshot stored on campaign at send time

### Engagement Scoring
- [ ] Engagement score algorithm implemented (0-100)
- [ ] Engagement level derived from score
- [ ] Daily cron job recomputes all subscriber scores
- [ ] Engagement level filterable on subscriber list
- [ ] Engagement score visible on subscriber detail

### Templates
- [ ] `email_templates` table created
- [ ] Template CRUD API endpoints
- [ ] Template library page with thumbnails
- [ ] Template editor (same block builder as campaigns)
- [ ] 5 default templates seeded
- [ ] Template picker on new campaign creation
- [ ] Template selection deep-clones blocks (no reference)

### Automations
- [ ] Automation queue page with status filter
- [ ] Queue item retry (failed → scheduled)
- [ ] Queue item cancel (scheduled → canceled)
- [ ] Automation stats: lastTriggeredAt, totalTriggered, totalSent
- [ ] Automation trigger check excludes suppressed addresses

### Email Settings
- [ ] Email Settings page with sender identity fields
- [ ] Domain authentication status display
- [ ] Suppression list management (view, add, remove)

### Roles & Permissions
- [ ] `editor` role added to enum
- [ ] Role-based middleware enforces permissions per endpoint
- [ ] Editor can create/edit drafts and templates
- [ ] Editor cannot send, schedule, manage subscribers, or manage automations
- [ ] Superadmin-only actions enforced (export, delete automation, email settings)

### UX Components
- [ ] StatusBadge component with consistent color mapping
- [ ] Toast notification system (success, error, warning)
- [ ] Empty states for all list views
- [ ] Confirmation modals for all irreversible actions
- [ ] Loading/skeleton states for all data-loading views
- [ ] Activity log records all state-changing actions

### Data Migration
- [ ] Existing `emailDrafts` data migrated to `campaigns` (status: draft)
- [ ] Existing `sentEmails` data migrated to `campaigns` (status: sent)
- [ ] Existing open/click counts preserved as aggregate data during migration
- [ ] Old tables dropped after successful migration verification
- [ ] Admin nav updated: "Newsletter" → "Campaigns", new sub-pages added
- [ ] Old `/admin/newsletter` route redirects to `/admin/campaigns`
