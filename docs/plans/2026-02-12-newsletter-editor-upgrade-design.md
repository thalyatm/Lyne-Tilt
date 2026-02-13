# Newsletter Editor Upgrade Design

## Overview

Transform the newsletter editor's basic rich text blocks into a world-class newsletter creator with full formatting, merge tags, reusable snippets, and polished UX — while keeping the existing 9 block types and 3-panel architecture.

## Current State

- **BlockBuilder.tsx** (1,595 lines): 3-panel layout (block palette | canvas | settings)
- **MiniTipTapEditor**: Only bold, italic, underline, links, bullet/ordered lists
- **Unused TipTap extensions** already in package.json: color, highlight, text-align, text-style, image, youtube
- **9 block types**: header, richtext, image, CTA, product, testimonial, divider, spacer, twocolumn
- **dnd-kit** for drag-and-drop reordering
- **Email HTML generation** with MSO/Outlook fallbacks

## Design

### 1. Full Rich Text Editor (Upgrade MiniTipTapEditor)

**Persistent Compact Toolbar** (2 rows at top of each rich text editor area):

Row 1 — Text formatting:
- Heading dropdown (Paragraph, H1, H2, H3)
- Bold, Italic, Underline, Strikethrough
- Text color picker, Highlight color picker
- Text align (left, center, right)
- Clear formatting button

Row 2 — Insert & structure:
- Link insertion/editing
- Blockquote toggle
- Bullet list, Ordered list
- Horizontal rule
- Merge tag dropdown (see section 2)

**Floating Bubble Menu** (appears on text selection):
- Quick access: Bold, Italic, Underline, Link, Text color, Highlight
- Small, non-intrusive, follows selection

**Slash Commands** (type `/` in rich text blocks):
- Opens command palette showing all insertable blocks
- Searchable, keyboard navigable (arrows + enter)
- Shows block icon + name + description
- Inserts block below current position in the canvas

**Key details:**
- All rich text blocks and two-column sub-editors share this upgraded editor
- Activates existing unused TipTap extensions (color, highlight, text-align, text-style)
- Adds @tiptap/extension-strike (or use StarterKit's built-in)
- Content continues to be stored as HTML strings (keeping current data model)
- Headings render properly in both canvas preview and email HTML output

### 2. Merge Tags System

**Available tags:**
- `{{first_name}}` — First name from subscriber name field
- `{{subscriber_name}}` — Full name
- `{{email}}` — Subscriber email
- `{{unsubscribe_url}}` — Unsubscribe link

**Editor integration:**
- Custom TipTap Node extension: `MergeTagNode`
- Renders as styled inline pill/badge (clay background, non-editable)
- Insertable via toolbar dropdown or slash command
- Atomic inline node — click selects, backspace deletes whole tag
- Serializes to `{{tag_name}}` in HTML output

**Fallback values:**
- Each tag has a configurable default fallback (e.g., `{{first_name|"there"}}`)
- Small settings popover next to tag dropdown for configuring defaults

**Email HTML output:**
- Tags serialize to `{{tag_name}}` placeholder text in generated HTML
- Backend replaces placeholders with subscriber data at send time
- Falls back to configured default if subscriber data missing

### 3. Reusable Snippets System

**Database:**
- New `email_snippets` table: id, name, category, blocks (jsonb), createdAt, updatedAt

**API endpoints (newsletter.routes.ts):**
- `GET /newsletter/snippets` — List all snippets
- `POST /newsletter/snippets` — Create snippet
- `PUT /newsletter/snippets/:id` — Update snippet
- `DELETE /newsletter/snippets/:id` — Delete snippet

**UI in BlockBuilder:**
- New "Snippets" tab in left panel (alongside block types)
- Each snippet shows: name, category badge, block count
- Click to insert (appends blocks to canvas as copies)
- "Save as Snippet" action in block hover menu
- Multi-block selection with shift+click, then "Save Selection as Snippet"
- Dialog for naming snippet + selecting category

**Default categories:** Headers, Content, CTAs, Footers, Signatures (user can add custom)

### 4. UX Polish & Preview Upgrades

**Canvas header improvements:**
- Desktop/Mobile preview toggle (600px vs 375px width)
- Dark mode preview toggle
- Block count indicator

**Block hover enhancements:**
- "+" insertion button between blocks (opens mini block picker)
- "Save as Snippet" action added to block action buttons

**Settings panel:**
- Collapsible sections for block settings (grouped logically)
- Color pickers use popover with preset brand colors + custom hex

**Editor header bar (in compose tab):**
- Auto-save indicator ("Saved 2m ago" / "Unsaved changes")
- Character counter on subject line (already exists)

**Keyboard shortcuts:**
- `Cmd+B/I/U` — Format (TipTap built-in)
- `Cmd+K` — Insert/edit link
- `Cmd+S` — Save draft (new)

## Files to Modify

1. `admin/components/newsletter/BlockBuilder.tsx` — Main changes (editor upgrade, snippets UI, UX polish)
2. `admin/pages/NewsletterManager.tsx` — Auto-save, Cmd+S handler, snippet state
3. `server/src/db/schema.ts` — Add `emailSnippets` table
4. `server/src/routes/newsletter.routes.ts` — Add snippet CRUD endpoints

## Implementation Order

1. Rich text editor upgrade (biggest impact, frontend only)
2. Merge tags system (TipTap extension + HTML serialization)
3. UX polish (preview toggles, insertion points, keyboard shortcuts)
4. Snippets system (DB + API + UI — full stack)
