# Site Settings Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the flat tab-based Site Settings page with a page-first sidebar navigation, autosave, and improved field grouping so the site owner can intuitively edit any page's content.

**Architecture:** Single-file rewrite of `admin/pages/SiteSettingsManager.tsx` (~1100 lines) into a cleaner layout with inline sub-components. The left sidebar provides page-level navigation with expandable section lists. The main area renders section cards with the same field components already in use. Autosave (1.5s debounce) saves per-key via the existing `PUT /api/settings/key/:key` endpoint. The existing `PreviewFrame` component is reused with auto-refresh after save.

**Tech Stack:** React, TypeScript, Tailwind CSS, Lucide icons, existing components (AccordionSection, ImageUploadField, StringArrayEditor, ObjectArrayEditor, StatArrayEditor, LinkArrayEditor, SeoFields, PreviewFrame)

---

## Task 1: Build the new SiteSettingsManager shell with sidebar + autosave

**Files:**
- Rewrite: `admin/pages/SiteSettingsManager.tsx`

**What to build:**

Replace the entire `SiteSettingsManager.tsx` with a new layout:

1. **Left sidebar** (~200px) with a page tree. Pages:
   - Home (sections: Hero, Split Path, About Preview, Shop CTA)
   - About (sections: Page Header, Philosophy, How I Show Up, The Journey, Who This Is For, CTA)
   - Coaching (sections: Hero, Is This For You, What You'll Experience, How It Works)
   - Learn (sections: Hero, Instructor Bio, Newsletter Signup)
   - Contact (sections: Page Header, Welcome Message, Form Settings, Contact Info, Coaching Callout)
   - Shop (sections: Materials & Care, Shipping & Returns)
   - Separator line
   - Footer (sections: Brand Info, Link Columns, Social Links)
   - SEO (sections: one per page — Home, About, Coaching, Learn, Contact, Shop, Blog, FAQ)
   - Visibility (no sub-sections, just toggles)

   Each page node is clickable to expand/collapse its section list. Clicking a section sets `activePage` and `activeSection` state, scrolling the main area to that section card via `scrollIntoView`.

2. **Header bar** with:
   - Title "Site Settings"
   - Save status indicator: idle (hidden) | "Saving..." with spinner | "All changes saved" with checkmark (fades after 3s)
   - Preview toggle button (existing pattern)

3. **Main editor area** (scrollable) showing all section cards for the active page. Each section card uses a wrapper component:
   ```tsx
   function SectionCard({ id, title, description, children }) {
     return (
       <div id={`section-${id}`} className="bg-white rounded-lg border border-stone-200 mb-6">
         <div className="px-5 py-4 border-b border-stone-100">
           <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
           {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
         </div>
         <div className="p-5 space-y-4">{children}</div>
       </div>
     );
   }
   ```

4. **Autosave logic:**
   - `hasUnsavedChanges` ref tracks if any field was modified since last save
   - `saveTimer` ref holds the debounce timeout (1.5s)
   - `updateSettings(path, value)` — same deep-path setter as current, but also sets `hasUnsavedChanges = true` and resets the debounce timer
   - When the timer fires, call `saveAllSettings()` which PUTs the full settings blob via `PUT /api/settings` (keeping the bulk endpoint for simplicity — no need to switch to per-key saves)
   - On successful save: set status to "saved", clear `hasUnsavedChanges`, refresh preview iframe
   - On failed save: show error toast, set status to "error"
   - `beforeunload` event listener warns if `hasUnsavedChanges` is true

5. **Preview panel** (right side, toggled):
   - Reuse existing `PreviewFrame` component
   - Pass `previewUrl` based on `activePage`:
     - home → `/`
     - about → `/#/about`
     - coaching → `/#/coaching`
     - learn → `/#/learn`
     - contact → `/#/contact`
     - shop → `/#/shop`
     - footer → `/`
     - seo → `/`
     - visibility → `/`
   - Add a `refreshKey` state that increments after each successful save, passed to PreviewFrame to trigger iframe reload

**Reusable input class:**
```tsx
const inputClass = 'w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';
```

**Reusable FieldLabel:**
```tsx
function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      {hint && <p className="text-xs text-stone-400 mt-0.5">{hint}</p>}
    </div>
  );
}
```

---

## Task 2: Build all page section editors

**Files:**
- Continue in: `admin/pages/SiteSettingsManager.tsx` (inline section components)

**For each page, build the section fields inside SectionCard wrappers. All fields use `updateSettings('path.to.field', value)` exactly as the current code does. Reuse all existing field components.**

### Home Page Sections

**Hero Section** — `SectionCard id="hero" title="Hero Banner" description="The main landing section visitors see first on your homepage"`
- Headline (input)
- Tagline (input)
- Subtitle (textarea, 2 rows)
- Meta Tags (input, hint: "Displayed as rotating tags below the hero text")
- Hero Image (ImageUploadField)
- Primary CTA: side-by-side inputs for text + link in a light bg container
- Secondary CTA: same pattern

**Split Path Section** — `SectionCard id="splitPath" title="Three Paths" description="The three-column 'ways to work together' section"`
- Section Title (input)
- Path Cards (ObjectArrayEditor with label, title, description, linkText, linkUrl)

**About Preview Section** — `SectionCard id="homeAbout" title="About Preview" description="The 'Meet Lyne' teaser section on the homepage"`
- Image (ImageUploadField compact)
- Title (input)
- Paragraphs (StringArrayEditor)
- Link Text + Link URL (side-by-side inputs)

**Shop CTA Section** — `SectionCard id="shopCta" title="Shop Call-to-Action" description="The 'Shop the Collection' banner section"`
- Title (input)
- Subtitle (input)
- Button Text (input)

### About Page Sections

**Page Header** — `SectionCard id="aboutHeader" title="Page Header" description="Title, subtitle, and hero image at the top of the About page"`
- Title + Location (side-by-side inputs)
- Subtitle (input)
- Hero Image (ImageUploadField compact)

**Philosophy** — `SectionCard id="philosophy" title="Philosophy" description="Your creative philosophy quote and story"`
- Quote (input)
- Paragraphs (StringArrayEditor)

**How I Show Up** — `SectionCard id="howIShowUp" title="How I Show Up" description="Cards showing your different roles and offerings"`
- Cards (ObjectArrayEditor: title, description, linkText, linkUrl)

**The Journey** — `SectionCard id="journey" title="The Journey" description="Background, stats, and credentials"`
- Title (input)
- Description (textarea, 3 rows)
- Stats (StatArrayEditor)
- Credentials (StringArrayEditor)

**Who This Is For** — `SectionCard id="whoThisIsFor" title="Who This Is For" description="Your ideal client description"`
- Title (input)
- Subtitle (input)
- Items (StringArrayEditor)

**CTA** — `SectionCard id="aboutCta" title="Call to Action" description="The bottom CTA section on your About page"`
- Title (input)
- Description (input)
- Button Text + Button URL (side-by-side inputs)

### Coaching Page Sections

**Hero** — `SectionCard id="coachingHero" title="Hero Section" description="The main heading area of your Coaching page"`
- Title (input)
- Subtitle (input)
- Description (textarea, 3 rows)

**Is This For You** — `SectionCard id="isThisForYou" title="Is This For You?" description="Helps visitors self-identify if coaching is right for them"`
- Title (input)
- Subtitle (input)
- Items (StringArrayEditor)

**What You'll Experience** — `SectionCard id="whatYoullExperience" title="What You'll Experience" description="Cards describing the coaching experience"`
- Title (input)
- Subtitle (input)
- Cards (ObjectArrayEditor: title, description)

**How It Works** — `SectionCard id="howItWorks" title="How It Works" description="Step-by-step process for getting started"`
- Title (input)
- Subtitle (input)
- Steps (ObjectArrayEditor: step, title, description)

### Learn Page Sections

**Hero** — `SectionCard id="learnHero" title="Hero Section" description="The main heading area of your Learn page"`
- Title (input)
- Subtitle (input)
- Description (textarea, 3 rows)

**Instructor Bio** — `SectionCard id="instructorBio" title="Instructor Bio" description="Your bio displayed alongside course listings"`
- Name (input)
- Paragraphs (StringArrayEditor)
- Stats (StatArrayEditor)

**Newsletter Signup** — `SectionCard id="newsletterSignup" title="Newsletter Signup" description="The email signup section at the bottom of Learn"`
- Title (input)
- Description (input)

### Contact Page Sections

**Page Header** — `SectionCard id="contactHeader" title="Page Header" description="Title and subtitle at the top of Contact"`
- Subtitle + Title (side-by-side inputs)

**Welcome Message** — `SectionCard id="welcomeMessage" title="Welcome Message" description="The personal greeting shown alongside the form"`
- Title (input)
- Paragraphs (StringArrayEditor)

**Form Settings** — `SectionCard id="formSettings" title="Form Settings" description="Subject dropdown options in the contact form"`
- Subject Options (StringArrayEditor)

**Contact Info** — `SectionCard id="contactInfo" title="Contact Info" description="Email, location, and response time shown on the page"`
- Email (input type="email")
- Location (input)
- Response Time (input)

**Coaching Callout** — `SectionCard id="coachingCallout" title="Coaching Callout" description="The coaching application prompt on the Contact page"`
- Title (input)
- Description (textarea, 2 rows)

### Shop Page Sections

**Materials & Care** — `SectionCard id="materialsAndCare" title="Materials & Care" description="Shared content shown on all product detail pages"`
- Content (textarea, 6 rows, hint: "HTML supported")

**Shipping & Returns** — `SectionCard id="shippingAndReturns" title="Shipping & Returns" description="Shared shipping and returns policy for all products"`
- Content (textarea, 6 rows, hint: "HTML supported")

### Footer Sections

**Brand Info** — `SectionCard id="footerBrand" title="Brand Info" description="Tagline, location, and copyright in the footer"`
- Tagline + Location (side-by-side)
- Established + Copyright (side-by-side)

**Link Columns** — `SectionCard id="footerLinks" title="Link Columns" description="Navigation link columns in the footer"`
- Footer Columns (ObjectArrayEditor with nested LinkArrayEditor — same as current)

**Social Links** — `SectionCard id="socialLinks" title="Social Links" description="Social media icons in the footer"`
- Social Media (ObjectArrayEditor: platform select + url input — same as current)

### SEO Sections

**One SectionCard per page** — `SectionCard id="seo-{key}" title="{Page Name} SEO" description="How this page appears in Google and social media"`
- Each uses the existing `SeoFields` component
- Pages: Home, About, Coaching, Learn, Contact, Shop, Oxygen Notes, FAQ

### Visibility Section

**Single SectionCard** — `SectionCard id="visibility" title="Section Visibility" description="Toggle which sections appear on the homepage"`
- Same toggle switches as current (showFeaturedProducts, showTestimonials, showBlogPreview, showNewsletter) using the same styled toggle pattern

---

## Task 3: Polish and deploy

**Files:**
- Modified: `admin/pages/SiteSettingsManager.tsx`

**Steps:**

1. Verify the complete page works locally:
   - `npm run dev` (frontend)
   - `cd workers && npm run dev` (API)
   - Navigate to `/#/admin/settings`
   - Test: sidebar navigation expands/collapses pages
   - Test: clicking a section scrolls to it
   - Test: editing a field triggers autosave after 1.5s
   - Test: save status shows "Saving..." then "All changes saved"
   - Test: preview panel opens showing correct page
   - Test: preview refreshes after save
   - Test: all existing field values load correctly from API

2. Build and deploy:
   ```bash
   VITE_API_BASE=https://lyne-tilt-api.verdant-digital-co.workers.dev/api npm run build
   npx wrangler pages deploy dist --project-name lyne-tilt --commit-dirty=true
   ```

3. Verify on production at `https://lyne-tilt.pages.dev/#/admin/settings`
