# Newsletter Editor Upgrade Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the newsletter editor from a basic block builder into a world-class newsletter creator with full rich text editing, merge tags, reusable snippets, and polished UX.

**Architecture:** Upgrade the existing MiniTipTapEditor component in BlockBuilder.tsx to activate all installed-but-unused TipTap extensions (color, highlight, text-align, text-style, strike, bubble-menu, floating-menu). Add a custom MergeTag TipTap node extension for personalization. Add a snippets CRUD system (Postgres + Express + React). All changes stay within the existing 3-panel BlockBuilder architecture.

**Tech Stack:** React 19, TipTap 3.x (already installed), dnd-kit, Drizzle ORM, Express, PostgreSQL, Tailwind CSS, Lucide icons.

**Verification:** No test suite exists. Verification = TypeScript compilation via `npx tsc --noEmit` + `npm run build` + visual inspection at localhost.

---

## Task 1: Upgrade MiniTipTapEditor — Full Formatting Toolbar

**Files:**
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (lines 21-26 imports, lines 293-397 MiniTipTapEditor)

**Step 1: Add new imports to BlockBuilder.tsx**

At the top of the file, add the missing TipTap extension imports and new Lucide icons:

```tsx
// Add after line 24 (import Underline from '@tiptap/extension-underline';)
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import TextAlign from '@tiptap/extension-text-align';
import TextStyle from '@tiptap/extension-text-style';
import { BubbleMenu } from '@tiptap/react';
```

Add new Lucide icons to the existing import:

```tsx
// Add to the lucide-react import (line 26-52):
import {
  // ... existing icons ...
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  Quote,
  Palette,
  Highlighter,
  RemoveFormatting,
  ChevronDown as ChevronDownIcon,
  Bookmark,
  Smartphone as SmartphoneIcon,
  Monitor as MonitorIcon,
  Moon,
  Sun,
} from 'lucide-react';
```

**Step 2: Rewrite MiniTipTapEditor with full toolbar**

Replace the `MiniTipTapEditor` function (lines 301-397) with the upgraded version. The new editor:
- Configures all TipTap extensions: StarterKit (with heading levels 1-3), Link, Underline, Color, Highlight, TextAlign, TextStyle, Placeholder
- Two-row toolbar with grouped formatting controls
- Heading level dropdown (Paragraph / H1 / H2 / H3)
- Bold, Italic, Underline, Strikethrough toggle buttons
- Text color picker (popover with preset brand colors + custom hex input)
- Highlight color picker (similar popover)
- Text alignment group (left, center, right)
- Clear formatting button
- Row 2: Link, Blockquote, Bullet list, Ordered list, Horizontal rule
- BubbleMenu for quick formatting on text selection (Bold, Italic, Underline, Link)

Key implementation details:
- Color picker is a small popover div toggled by state, with 8 preset colors + hex input
- Heading dropdown uses a `<select>` styled to match
- All buttons use the same pattern: `editor.chain().focus().toggleXxx().run()` with `editor.isActive('xxx')` for active state
- Toolbar buttons use `BRAND_CLAY` active color (existing pattern)
- BubbleMenu from `@tiptap/react` wraps the quick-access formatting buttons

**Step 3: Verify build**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds with no TypeScript errors

**Step 4: Commit**

```bash
git add admin/components/newsletter/BlockBuilder.tsx
git commit -m "feat(newsletter): upgrade rich text editor with full formatting toolbar

Activate TipTap extensions for color, highlight, text-align, text-style,
strike. Add 2-row toolbar with heading dropdown, color pickers, alignment,
blockquote, and clear formatting. Add BubbleMenu for quick formatting on
text selection."
```

---

## Task 2: Merge Tag TipTap Extension

**Files:**
- Create: `admin/components/newsletter/MergeTagExtension.tsx`
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (MiniTipTapEditor extensions + toolbar)

**Step 1: Create the MergeTag TipTap node extension**

Create `admin/components/newsletter/MergeTagExtension.tsx`:

This file exports:
- `MERGE_TAGS` constant: Array of `{ id, label, placeholder, fallback }` objects:
  - `{ id: 'first_name', label: 'First Name', placeholder: '{{first_name}}', fallback: 'there' }`
  - `{ id: 'subscriber_name', label: 'Full Name', placeholder: '{{subscriber_name}}', fallback: 'Subscriber' }`
  - `{ id: 'email', label: 'Email', placeholder: '{{email}}', fallback: '' }`
  - `{ id: 'unsubscribe_url', label: 'Unsubscribe URL', placeholder: '{{unsubscribe_url}}', fallback: '#' }`

- `MergeTagNode` TipTap Node extension:
  - `name: 'mergeTag'`
  - `group: 'inline'`, `inline: true`, `atom: true` (non-editable inline node)
  - Attributes: `tagId` (string), `fallback` (string, default from MERGE_TAGS)
  - `parseHTML`: Matches `<span data-merge-tag="...">` elements
  - `renderHTML`: Returns `['span', { 'data-merge-tag': tagId, class: 'merge-tag-badge', contenteditable: 'false' }, `{{${tagId}}}`]`
  - `addNodeView`: Returns a Decoration that renders the tag as a styled inline pill

- `MergeTagNodeView` React component (used by `addNodeView`):
  - Renders as a small inline pill with clay background: `bg-clay/10 text-clay text-xs font-medium px-1.5 py-0.5 rounded-md inline cursor-default`
  - Shows the tag's `label` (e.g., "First Name"), not the placeholder
  - Non-editable (atom handles this)

Key implementation note: Use `@tiptap/react`'s `NodeViewWrapper` and `ReactNodeViewRenderer` for the node view.

**Step 2: Integrate MergeTagNode into MiniTipTapEditor**

In BlockBuilder.tsx:
- Import `MergeTagNode` and `MERGE_TAGS` from `./MergeTagExtension`
- Add `MergeTagNode` to the editor's extensions array
- Add a "Merge Tags" dropdown button in toolbar row 2:
  - Button shows `<Tag size={14} />` icon with a small dropdown arrow
  - On click, shows a dropdown list of all MERGE_TAGS
  - Each item shows tag label + example (e.g., "First Name → {{first_name}}")
  - Clicking a tag inserts it: `editor.chain().focus().insertContent({ type: 'mergeTag', attrs: { tagId: tag.id } }).run()`

**Step 3: Update email HTML generation to serialize merge tags**

In BlockBuilder.tsx's `renderBlockToHtml` function for `richtext` and `twocolumn` blocks:
- The merge tag nodes render as `<span data-merge-tag="first_name">{{first_name}}</span>` in HTML
- This is already functional since `getHTML()` outputs the renderHTML result
- Add a simple post-processing step in `generateEmailHtml`: strip the `<span data-merge-tag>` wrapper, keeping just the `{{tag}}` text
  - `html.replace(/<span[^>]*data-merge-tag="[^"]*"[^>]*>(.*?)<\/span>/g, '$1')`

**Step 4: Verify build**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds

**Step 5: Commit**

```bash
git add admin/components/newsletter/MergeTagExtension.tsx admin/components/newsletter/BlockBuilder.tsx
git commit -m "feat(newsletter): add merge tag system for personalization

Custom TipTap node extension renders merge tags as inline badges.
Tags: first_name, subscriber_name, email, unsubscribe_url.
Tags serialize to {{tag}} placeholders in email HTML output."
```

---

## Task 3: Slash Commands for Block Insertion

**Files:**
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (MiniTipTapEditor + BlockBuilder)

**Step 1: Add slash command suggestion extension**

This uses TipTap's `Extension.create` with an `addProseMirrorPlugins` method to listen for `/` typed in the editor. When `/` is typed at the start of a line or after a space:
- Show a floating command palette (absolutely positioned div below the cursor)
- The palette lists all BLOCK_DEFINITIONS with their icon + label + short description
- Also include merge tags in the list (under a "Personalization" heading)
- Filter as user types after `/` (e.g., `/ima` filters to "Image")
- Arrow keys navigate, Enter selects, Escape closes
- On selection: remove the `/query` text, call a callback to insert the block

Implementation approach:
- Create a `SlashCommandExtension` using TipTap's `Extension.create()`
- Use the `suggestion` utility pattern (similar to @tiptap/suggestion but lighter)
- The command palette is a React component rendered via a portal
- The `onAddBlock` callback is passed from BlockBuilder through props to MiniTipTapEditor
- When a block type is selected: delete the slash text, call `onAddBlock(blockType)` which adds a new block below the current one in the canvas

Key detail: The slash command inserts blocks into the *canvas* (not into the rich text), so the MiniTipTapEditor needs an `onInsertBlock?: (type: BlockType) => void` prop.

**Step 2: Thread the onInsertBlock callback**

- Add `onInsertBlock?: (type: BlockType) => void` to MiniEditorProps
- In BlockBuilder, when rendering `RichTextSettings`, pass `onInsertBlock` that:
  1. Gets the index of the current block
  2. Creates a new block of the requested type
  3. Inserts it after the current block in the blocks array
  4. Selects the new block

**Step 3: Verify build**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds

**Step 4: Commit**

```bash
git add admin/components/newsletter/BlockBuilder.tsx
git commit -m "feat(newsletter): add slash commands for quick block insertion

Type / in any rich text block to open command palette. Filter by typing,
navigate with arrow keys, Enter to insert. Adds new block below current
position in canvas."
```

---

## Task 4: UX Polish — Preview Modes, Insertion Points, Keyboard Shortcuts

**Files:**
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (canvas header, block wrapper, settings)
- Modify: `admin/pages/NewsletterManager.tsx` (Cmd+S, auto-save indicator)

**Step 1: Add preview mode toggles to canvas header**

In BlockBuilder's main builder UI, update the canvas header section (around line 1421):
- Add a `previewMode` state: `'desktop' | 'mobile'` (default `'desktop'`)
- Add a `darkPreview` state: `boolean` (default `false`)
- Desktop/Mobile toggle: two buttons with Monitor/Smartphone icons
- Dark mode toggle: Moon/Sun icon button
- When mobile: email preview container width changes from `max-w-[600px]` to `max-w-[375px]`
- When dark: email preview container gets `bg-gray-900` background and a CSS filter or wrapper class

**Step 2: Add "+" insertion buttons between blocks**

In the SortableBlock component or the block list rendering:
- Between each block, render a thin hover-activated insertion bar
- On hover, shows a "+" button centered on the divider line
- Clicking "+" opens a small popover with the block type list (same as left panel but compact)
- Selecting a block type inserts it at that position in the array
- Implementation: Add an `InsertionPoint` component rendered between blocks in the map

**Step 3: Add "Save as Snippet" to block actions**

In SortableBlock's action buttons (right side of top bar):
- Add a Bookmark icon button before the Copy button
- Title: "Save as Snippet"
- On click: calls a `onSaveAsSnippet(blockId)` callback
- For now, this just shows a `window.prompt` for the snippet name (will be upgraded in Task 6)

**Step 4: Add Cmd+S keyboard shortcut for save draft**

In `NewsletterManager.tsx`:
- Add a `useEffect` that listens for `keydown` events
- On `Cmd+S` (or `Ctrl+S`): `e.preventDefault()` and call `handleSaveDraft()`
- Only active when on the compose tab

**Step 5: Add auto-save indicator**

In `NewsletterManager.tsx`:
- Add `lastSavedAt` state (Date | null)
- After successful draft save, update `lastSavedAt`
- Display "Saved Xm ago" or "Unsaved changes" badge next to the Save Draft button
- "Unsaved changes" shows when blocks/subject/preheader changed after last save

**Step 6: Verify build**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add admin/components/newsletter/BlockBuilder.tsx admin/pages/NewsletterManager.tsx
git commit -m "feat(newsletter): add UX polish - preview modes, insertion points, shortcuts

Desktop/mobile preview toggle, dark mode preview, '+' insertion buttons
between blocks, save-as-snippet action on blocks, Cmd+S to save draft,
auto-save indicator."
```

---

## Task 5: Snippets Backend — Database + API

**Files:**
- Modify: `server/src/db/schema.ts` (add emailSnippets table)
- Modify: `server/src/routes/newsletter.routes.ts` (add CRUD endpoints)

**Step 1: Add emailSnippets table to schema**

In `server/src/db/schema.ts`, after the `sentEmails` table (around line 437):

```typescript
export const emailSnippets = pgTable('email_snippets', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  category: varchar('category', { length: 100 }).notNull().default('Content'),
  blocks: jsonb('blocks').$type<any[]>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
```

**Step 2: Add CRUD endpoints for snippets**

In `server/src/routes/newsletter.routes.ts`:
- Import `emailSnippets` from the db
- Add these endpoints (following the exact pattern of the drafts endpoints):

```
GET /snippets — List all snippets ordered by updatedAt desc
POST /snippets — Create snippet (body: { name, category, blocks })
PUT /snippets/:id — Update snippet (body: { name?, category?, blocks? })
DELETE /snippets/:id — Delete snippet by id
```

All endpoints protected with `authMiddleware`.

**Step 3: Run migration**

Run: `cd /Users/thalya/DEV/Lyne-Tilt/server && npx drizzle-kit generate && npx drizzle-kit migrate`

Note: Check the project's migration approach — if they use `drizzle-kit push` instead, use that.

**Step 4: Verify server builds**

Run: `cd /Users/thalya/DEV/Lyne-Tilt/server && npx tsc --noEmit`
Expected: No errors

**Step 5: Commit**

```bash
git add server/src/db/schema.ts server/src/routes/newsletter.routes.ts
git commit -m "feat(newsletter): add email snippets backend - DB table + CRUD API

New email_snippets table with name, category, blocks JSON.
GET/POST/PUT/DELETE /newsletter/snippets endpoints."
```

---

## Task 6: Snippets Frontend — UI in BlockBuilder

**Files:**
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (left panel tabs, snippet UI, save dialog)

**Step 1: Add snippet state and API calls**

In BlockBuilder:
- Add new props: `snippets`, `onSaveSnippet`, `onDeleteSnippet`, `onLoadSnippets` (or handle internally with fetch)
- OR: Handle snippet API calls directly in BlockBuilder using `fetch` to the API (matching the pattern used in NewsletterManager)
- State: `snippets: EmailSnippet[]`, `leftPanelTab: 'blocks' | 'snippets'`, `showSnippetDialog: boolean`

Type:
```typescript
interface EmailSnippet {
  id: string;
  name: string;
  category: string;
  blocks: EmailBlock[];
  createdAt: string;
  updatedAt: string;
}
```

**Step 2: Add tab switcher in left panel**

Replace the left panel's "Add Block" header with two tab buttons: "Blocks" | "Snippets"
- "Blocks" tab shows the existing block palette grid (unchanged)
- "Snippets" tab shows the snippet library

**Step 3: Build the Snippets tab UI**

When "Snippets" tab is active:
- Fetch snippets from API on mount (GET /newsletter/snippets)
- Show each snippet as a card: name, category badge, block count, timestamp
- Click to insert: deep-copies all blocks with new IDs, appends to canvas
- Delete button (small X) with confirmation
- Empty state: "No saved snippets yet. Save blocks from the canvas."

**Step 4: Build the Save Snippet dialog**

When "Save as Snippet" is clicked on a block:
- Show a modal/dialog overlay
- Fields: Snippet name (text input), Category (select from defaults: Headers, Content, CTAs, Footers, Signatures, or type custom)
- "Save" button: POST /newsletter/snippets with { name, category, blocks: [selectedBlock] }
- On success: refresh snippet list, close dialog, show success toast

**Step 5: Wire up snippet callbacks in NewsletterManager**

In `NewsletterManager.tsx`:
- Pass the API_BASE URL to BlockBuilder (or BlockBuilder reads it from a shared config)
- Add the auth token to snippet API calls (use existing `useAuth` pattern)

**Step 6: Verify build**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds

**Step 7: Commit**

```bash
git add admin/components/newsletter/BlockBuilder.tsx admin/pages/NewsletterManager.tsx
git commit -m "feat(newsletter): add reusable snippets system - save, browse, insert

Snippets tab in left panel for browsing saved snippets. Save any block
as a snippet with name and category. Click to insert copies into canvas.
Full CRUD with backend API."
```

---

## Task 7: Final Integration & Cleanup

**Files:**
- Modify: `admin/components/newsletter/BlockBuilder.tsx` (any remaining fixes)
- Modify: `admin/pages/NewsletterManager.tsx` (any remaining fixes)

**Step 1: Verify email HTML output with new features**

- Ensure headings (H1-H3) render correctly in `renderBlockToHtml` for richtext blocks
- Ensure text alignment inline styles work in email HTML
- Ensure text colors and highlights work in email HTML
- Ensure merge tags strip their `<span>` wrapper in final email HTML
- Test the "Preview HTML" modal to confirm output looks correct

**Step 2: Test all TipTap extensions together**

Visual check in browser:
- Create a rich text block
- Apply heading, bold, italic, underline, strikethrough
- Apply text color and highlight
- Insert a merge tag
- Change text alignment
- Add a link
- Toggle bullet list and ordered list
- Insert a blockquote
- Type `/` and verify slash command palette appears
- Use BubbleMenu on selected text
- Preview email HTML and confirm all formatting renders

**Step 3: Test snippets flow end-to-end**

Visual check in browser:
- Save a block as snippet
- Switch to Snippets tab
- See the saved snippet
- Click to insert it
- Verify it appears in canvas with new IDs
- Delete the snippet

**Step 4: Final build verification**

Run: `cd /Users/thalya/DEV/Lyne-Tilt && npm run build`
Expected: Build succeeds with no warnings

**Step 5: Commit any final fixes**

```bash
git add -A
git commit -m "fix(newsletter): final integration cleanup for newsletter editor upgrade"
```
