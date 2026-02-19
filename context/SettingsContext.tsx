import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { API_BASE } from '../config/api';

// Types matching the backend schema
export interface SiteSettings {
  hero: {
    headline: string;
    tagline: string;
    subtitle: string;
    metaTags: string;
    primaryCta: { text: string; link: string };
    secondaryCta: { text: string; link: string };
    image: string;
  };
  splitPath: {
    title: string;
    cards: { label: string; title: string; description: string; linkText: string; linkUrl: string }[];
  };
  home: {
    aboutSection: {
      image: string;
      title: string;
      paragraphs: string[];
      linkText: string;
      linkUrl: string;
    };
    shopCta: {
      title: string;
      subtitle: string;
      buttonText: string;
    };
  };
  about: {
    header: { title: string; subtitle: string; location: string };
    heroImage: string;
    philosophy: { quote: string; paragraphs: string[] };
    howIShowUp: { cards: { title: string; description: string; linkText: string; linkUrl: string }[] };
    journey: {
      title: string;
      description: string;
      stats: { value: string; label: string }[];
      credentials: string[];
    };
    whoThisIsFor: { title: string; subtitle: string; items: string[] };
    cta: { title: string; description: string; buttonText: string; buttonUrl: string };
  };
  coaching: {
    hero: { title: string; subtitle: string; description: string };
    isThisForYou: { title: string; subtitle: string; items: string[] };
    whatYoullExperience: { title: string; subtitle: string; cards: { title: string; description: string }[] };
    howItWorks: { title: string; subtitle: string; steps: { step: string; title: string; description: string }[] };
  };
  learn: {
    hero: { title: string; subtitle: string; description: string };
    instructorBio: { name: string; paragraphs: string[]; stats: { value: string; label: string }[] };
    newsletterSignup: { title: string; description: string };
  };
  contact: {
    header: { title: string; subtitle: string };
    welcomeMessage: { title: string; paragraphs: string[] };
    formSubjects: string[];
    info: { email: string; location: string; responseTime: string };
    coachingCallout: { title: string; description: string };
  };
  productDetail: {
    materialsAndCare: string;
    shippingAndReturns: string;
  };
  footer: {
    tagline: string;
    location: string;
    established: string;
    copyright: string;
    columns: { title: string; links: { label: string; url: string }[] }[];
    socialLinks: { platform: string; url: string }[];
  };
  sections: {
    showTestimonials: boolean;
    showNewsletter: boolean;
    showFeaturedProducts: boolean;
    showBlogPreview: boolean;
  };
}

// Default settings for fallback
const defaultSettings: SiteSettings = {
  hero: {
    headline: "Art is Oxygen.",
    tagline: "Clarity is Power.",
    subtitle: "Wearable art & strategic coaching for creatives ready to make meaningful work.",
    metaTags: "Wearable Art · 1:1 Coaching · Learn & Create",
    primaryCta: { text: "Shop Art", link: "/shop" },
    secondaryCta: { text: "Explore Coaching", link: "/coaching" },
    image: "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w"
  },
  splitPath: {
    title: "Your Next Move Starts Here",
    cards: [
      { label: "Handmade in Australia", title: "Wearable & Wall Art", description: "Wear your story. Collect what resonates. Original, handmade pieces designed to anchor your identity and bring beauty into your everyday.", linkText: "Shop Collection", linkUrl: "/shop" },
      { label: "1:1 Sessions", title: "Coaching & Mentoring", description: "Deep work with practical outcomes. Intelligent, experienced coaching for creatives, founders, and deep thinkers ready to recalibrate and move forward with clarity.", linkText: "Explore Coaching", linkUrl: "/coaching" },
      { label: "Online & In-Person", title: "Learn & Create", description: "Break free from the scroll, the trends, and the sameness. Workshops designed to help you move from feeling stuck to creating work that feels unmistakably yours.", linkText: "Browse Workshops", linkUrl: "/learn" }
    ]
  },
  home: {
    aboutSection: {
      image: "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w",
      title: "Artist, educator & coach",
      paragraphs: [
        "Every piece I create is designed to be a quiet companion - something that holds meaning for the wearer.",
        "Whether you're drawn to wearable art or looking for strategic guidance, you'll find work made with care."
      ],
      linkText: "Read My Story",
      linkUrl: "/about"
    },
    shopCta: {
      title: "Shop the Collection",
      subtitle: "Handmade polymer clay earrings & brooches - each one of a kind.",
      buttonText: "View Full Collection"
    }
  },
  about: {
    header: { title: "About Lyne Tilt", subtitle: "Artist. Educator. Creative Strategist. Coach.", location: "Brisbane, Australia" },
    heroImage: "",
    philosophy: { quote: "I believe that art is oxygen, and clarity is power.", paragraphs: [
      "Whether we're creating, collecting, building, or leading, we need creative expression to stay connected to ourselves and the lives we want to live. Every offer I create, a painting, a ring, a workshop, or a coaching call, is an invitation to take yourself seriously. To act with intention. To step into the next version of who you want to be.",
      "For over two decades, I've helped people do exactly that.",
      "My professional background spans Fine Art, Literature, Education, Human Behaviour, and most recently, Nutrition and Integrative Health. I hold First Class Honours in Education and completed Honours research through Griffith University examining identity and belonging in adolescent girls. That early work still drives me, because at every stage of life the question remains: what would it take to truly belong to yourself?",
      "As a former educator and wellbeing leader in schools, I've led thousands of people toward more focused, values-aligned ways of living and working. Over the last five years, I've coached more than 200 artists, creatives, and business owners, helping them find their voice, clarify their message, and build with purpose."
    ] },
    howIShowUp: { cards: [
      { title: "As a Maker", description: "If you wear my jewellery or collect my art, you're not just choosing beauty. You're anchoring into something bold and personal.", linkText: "Shop Collection", linkUrl: "/shop" },
      { title: "As an Educator", description: "If you attend one of my classes or workshops, you're not just learning a skill. You're engaging with your mindset, your capacity, and your creative identity.", linkText: "View Workshops", linkUrl: "/learn" },
      { title: "As a Coach", description: "If you work with me as a coach, we'll get to the heart of what's holding you back and build the strategy and structure to move through it.", linkText: "Learn More", linkUrl: "/coaching" },
    ] },
    journey: { title: "A Background Built for Clarity + Action", description: "I'm a qualified Nutrition Coach and an ICF-eligible professional coach, combining evidence-based mindset and behaviour change approaches with creative strategy and communication.", stats: [
      { value: "20+", label: "Years in Education" },
      { value: "200+", label: "Creatives Coached" },
      { value: "2500+", label: "Students Taught" },
      { value: "5+", label: "Disciplines" },
    ], credentials: ["Fine Art", "Education (Hons)", "ICF-Eligible Coach", "Nutrition Coach", "Creative Strategy", "Founder, Studio on Brunswick"] },
    whoThisIsFor: { title: "Who I Work With", subtitle: "I work with people who are ready to show up with more intention, creatively, professionally, and personally.", items: [
      "People starting or returning to a creative practice after a long break",
      "People creating or refining businesses that reflect their values",
      "People ready to stop playing small in life, work, or leadership",
    ] },
    cta: { title: "Want to Work With Lyne?", description: "Whether you're looking to book a guest speaker, collaborate on a creative project, or schedule a free 15-minute strategy call.", buttonText: "Get in Touch", buttonUrl: "/contact" }
  },
  coaching: {
    hero: { title: "Coaching & Mentoring", subtitle: "Artist Transformation", description: "Whether you're seeking a coach to challenge your thinking or a mentor to guide your creative path, this is your space to transform." },
    isThisForYou: { title: "Is This For You?", subtitle: "", items: [] },
    whatYoullExperience: { title: "What You'll Experience", subtitle: "", cards: [] },
    howItWorks: { title: "How It Works", subtitle: "", steps: [] }
  },
  learn: {
    hero: { title: "Unlock Your Creative Potential", subtitle: "Learn & Create", description: "From self-paced courses to live workshops and in-person experiences. Learn at your own pace, connect with a community, and build the creative skills that last." },
    instructorBio: { name: "Lyne Tilt", paragraphs: [], stats: [] },
    newsletterSignup: { title: "Not Ready to Enrol?", description: "" }
  },
  contact: {
    header: { title: "Start a Conversation", subtitle: "Get In Touch" },
    welcomeMessage: { title: "Hey there, it's great to see you.", paragraphs: [] },
    formSubjects: ["General Inquiry", "Coaching Application", "Speaking Request"],
    info: { email: "hello@lynetilt.com", location: "Brisbane, Australia", responseTime: "1-2 business days" },
    coachingCallout: { title: "Coaching Applications", description: "" }
  },
  productDetail: {
    materialsAndCare: "",
    shippingAndReturns: ""
  },
  footer: {
    tagline: "LYNE TILT",
    location: "Australia-based.",
    established: "Est. 2023",
    copyright: "© 2023 - 2026 Lyne Tilt Studio. All rights reserved.",
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

interface SettingsContextType {
  settings: SiteSettings;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch(`${API_BASE}/settings/public`);
      if (!response.ok) {
        throw new Error('Failed to fetch settings');
      }
      const data = await response.json();
      // Deep merge with defaults to ensure all fields exist
      setSettings(deepMerge(defaultSettings, data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      // Keep default settings on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, loading, error, refetch: fetchSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

// Helper function to deep merge objects, treating empty strings and empty arrays as missing
function deepMerge<T extends Record<string, any>>(target: T, source: Partial<T>): T {
  const result = { ...target };

  for (const key in source) {
    const val = source[key];
    if (val === undefined || val === null) continue;
    // Skip empty strings and empty arrays — keep the default
    if (val === '') continue;
    if (Array.isArray(val) && val.length === 0 && Array.isArray(target[key]) && target[key].length > 0) continue;

    if (
      typeof val === 'object' &&
      !Array.isArray(val) &&
      typeof target[key] === 'object' &&
      target[key] !== null &&
      !Array.isArray(target[key])
    ) {
      result[key] = deepMerge(target[key], val as any);
    } else {
      result[key] = val as any;
    }
  }

  return result;
}
