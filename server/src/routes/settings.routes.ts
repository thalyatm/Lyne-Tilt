import { Router, Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { db, siteSettings } from '../db/index.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// Default settings structure for fallback
const defaultSettings = {
  hero: {
    headline: "Art is Oxygen.",
    tagline: "Clarity is Power.",
    subtitle: "Wearable art & strategic coaching for creatives ready to make meaningful work.",
    metaTags: "Handmade Jewellery · 1:1 Coaching · Learn & Create",
    primaryCta: { text: "Shop Art", link: "/shop" },
    secondaryCta: { text: "Explore Coaching", link: "/coaching" },
    image: ""
  },
  splitPath: {
    title: "Three Ways to Work Together",
    cards: []
  },
  home: {
    aboutSection: { image: "", title: "", paragraphs: [], linkText: "", linkUrl: "" },
    shopCta: { title: "", subtitle: "", buttonText: "" }
  },
  about: {
    header: { title: "", subtitle: "", location: "" },
    heroImage: "",
    philosophy: { quote: "", paragraphs: [] },
    howIShowUp: { cards: [] },
    journey: { title: "", description: "", stats: [], credentials: [] },
    whoThisIsFor: { title: "", subtitle: "", items: [] },
    cta: { title: "", description: "", buttonText: "", buttonUrl: "" }
  },
  coaching: {
    hero: { title: "", subtitle: "", description: "" },
    isThisForYou: { title: "", subtitle: "", items: [] },
    whatYoullExperience: { title: "", subtitle: "", cards: [] },
    howItWorks: { title: "", subtitle: "", steps: [] }
  },
  learn: {
    hero: { title: "", subtitle: "", description: "" },
    instructorBio: { name: "", paragraphs: [], stats: [] },
    newsletterSignup: { title: "", description: "" }
  },
  contact: {
    header: { title: "", subtitle: "" },
    welcomeMessage: { title: "", paragraphs: [] },
    formSubjects: [],
    info: { email: "", location: "", responseTime: "" },
    coachingCallout: { title: "", description: "" }
  },
  productDetail: {
    materialsAndCare: "",
    shippingAndReturns: ""
  },
  footer: {
    tagline: "",
    location: "",
    established: "",
    copyright: "",
    columns: [],
    socialLinks: []
  },
  sections: {
    showTestimonials: true,
    showNewsletter: true,
    showFeaturedProducts: true,
    showBlogPreview: true
  }
};

// Helper to get settings from database
async function getSettings() {
  const result = await db.select().from(siteSettings).where(eq(siteSettings.key, 'main'));
  if (result.length === 0) {
    return defaultSettings;
  }
  return result[0].value as typeof defaultSettings;
}

// GET settings (protected - only admins should see all settings)
router.get('/', authMiddleware, async (req: Request, res: Response) => {
  const settings = await getSettings();
  res.json(settings);
});

// PUT update settings (protected)
router.put('/', authMiddleware, async (req: Request, res: Response) => {
  const existing = await db.select().from(siteSettings).where(eq(siteSettings.key, 'main'));

  if (existing.length === 0) {
    await db.insert(siteSettings).values({
      key: 'main',
      value: req.body,
      updatedAt: new Date(),
      updatedBy: req.user?.userId,
    });
  } else {
    await db.update(siteSettings)
      .set({
        value: req.body,
        updatedAt: new Date(),
        updatedBy: req.user?.userId,
      })
      .where(eq(siteSettings.key, 'main'));
  }

  res.json({ message: 'Settings updated', settings: req.body });
});

// GET public settings (for frontend to fetch hero content etc.)
router.get('/public', async (req: Request, res: Response) => {
  const settings = await getSettings();
  res.json(settings);
});

export default router;
