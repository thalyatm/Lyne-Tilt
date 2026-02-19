import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Save, Eye, Loader2, Check, ChevronRight, AlertCircle,
  Home, User, Palette, GraduationCap, Mail, ShoppingBag,
  Globe, Search, ToggleLeft, PanelRightOpen, PanelRightClose,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { API_BASE } from '../config/api';
import { StringArrayEditor, StatArrayEditor, LinkArrayEditor, ObjectArrayEditor } from '../components/ArrayEditor';
import PreviewFrame from '../components/PreviewFrame';
import SeoFields from '../components/SeoFields';
import { ImageUploadField } from '../components/FormModal';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SiteSettings {
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
  seo: {
    home: { title: string; description: string; image: string };
    about: { title: string; description: string; image: string };
    coaching: { title: string; description: string; image: string };
    learn: { title: string; description: string; image: string };
    contact: { title: string; description: string; image: string };
    shop: { title: string; description: string; image: string };
    blog: { title: string; description: string; image: string };
    faq: { title: string; description: string; image: string };
  };
}

const defaultSettings: SiteSettings = {
  hero: {
    headline: 'Art is Oxygen.',
    tagline: 'Clarity is Power.',
    subtitle: 'Wearable art & strategic coaching for creatives ready to make meaningful work.',
    metaTags: 'Wearable Art \u00b7 1:1 Coaching \u00b7 Learn & Create',
    primaryCta: { text: 'Shop Art', link: '/shop' },
    secondaryCta: { text: 'Explore Coaching', link: '/coaching' },
    image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w',
  },
  splitPath: {
    title: 'Your Next Move Starts Here',
    cards: [
      { label: 'Handmade in Australia', title: 'Wearable & Wall Art', description: 'Wear your story. Collect what resonates. Original, handmade pieces designed to anchor your identity and bring beauty into your everyday.', linkText: 'Shop Collection', linkUrl: '/shop' },
      { label: '1:1 Sessions', title: 'Coaching & Mentoring', description: 'Deep work with practical outcomes. Intelligent, experienced coaching for creatives, founders, and deep thinkers ready to recalibrate and move forward with clarity.', linkText: 'Explore Coaching', linkUrl: '/coaching' },
      { label: 'Online & In-Person', title: 'Learn & Create', description: 'Break free from the scroll, the trends, and the sameness. Workshops designed to help you move from feeling stuck to creating work that feels unmistakably yours.', linkText: 'Browse Workshops', linkUrl: '/learn' },
    ],
  },
  home: {
    aboutSection: {
      image: 'https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w',
      title: 'Artist, educator & coach',
      paragraphs: [
        'Every piece I create is designed to be a quiet companion - something that holds meaning for the wearer.',
        "Whether you're drawn to wearable art or looking for strategic guidance, you'll find work made with care.",
      ],
      linkText: 'Read My Story',
      linkUrl: '/about',
    },
    shopCta: {
      title: 'Shop the Collection',
      subtitle: 'Handmade polymer clay earrings & brooches - each one of a kind.',
      buttonText: 'View Full Collection',
    },
  },
  about: {
    header: { title: 'About Lyne Tilt', subtitle: 'Artist. Educator. Creative Strategist. Coach.', location: 'Brisbane, Australia' },
    heroImage: '',
    philosophy: {
      quote: 'I believe that art is oxygen, and clarity is power.',
      paragraphs: [
        'Whether we\u2019re creating, collecting, building, or leading, we need creative expression to stay connected to ourselves and the lives we want to live. Every offer I create, a painting, a ring, a workshop, or a coaching call, is an invitation to take yourself seriously. To act with intention. To step into the next version of who you want to be.',
        'For over two decades, I\u2019ve helped people do exactly that.',
        'My professional background spans Fine Art, Literature, Education, Human Behaviour, and most recently, Nutrition and Integrative Health. I hold First Class Honours in Education and completed Honours research through Griffith University examining identity and belonging in adolescent girls. That early work still drives me, because at every stage of life the question remains: what would it take to truly belong to yourself?',
        'As a former educator and wellbeing leader in schools, I\u2019ve led thousands of people toward more focused, values-aligned ways of living and working. Over the last five years, I\u2019ve coached more than 200 artists, creatives, and business owners, helping them find their voice, clarify their message, and build with purpose.',
      ],
    },
    howIShowUp: { cards: [
      { title: 'As a Maker', description: 'If you wear my jewellery or collect my art, you\'re not just choosing beauty. You\'re anchoring into something bold and personal.', linkText: 'Shop Collection', linkUrl: '/shop' },
      { title: 'As an Educator', description: 'If you attend one of my classes or workshops, you\'re not just learning a skill. You\'re engaging with your mindset, your capacity, and your creative identity.', linkText: 'View Workshops', linkUrl: '/learn' },
      { title: 'As a Coach', description: 'If you work with me as a coach, we\'ll get to the heart of what\'s holding you back and build the strategy and structure to move through it.', linkText: 'Learn More', linkUrl: '/coaching' },
    ] },
    journey: {
      title: 'A Background Built for Clarity + Action',
      description: 'I\u2019m a qualified Nutrition Coach and an ICF-eligible professional coach, combining evidence-based mindset and behaviour change approaches with creative strategy and communication.',
      stats: [
        { value: '20+', label: 'Years in Education' },
        { value: '200+', label: 'Creatives Coached' },
        { value: '2500+', label: 'Students Taught' },
        { value: '5+', label: 'Disciplines' },
      ],
      credentials: ['Fine Art', 'Education (Hons)', 'ICF-Eligible Coach', 'Nutrition Coach', 'Creative Strategy', 'Founder, Studio on Brunswick'],
    },
    whoThisIsFor: {
      title: 'Who I Work With',
      subtitle: 'I work with people who are ready to show up with more intention, creatively, professionally, and personally.',
      items: [
        'People starting or returning to a creative practice after a long break',
        'People creating or refining businesses that reflect their values',
        'People ready to stop playing small in life, work, or leadership',
      ],
    },
    cta: {
      title: 'Want to Work With Lyne?',
      description: 'Whether you\u2019re looking to book a guest speaker, collaborate on a creative project, or schedule a free 15-minute strategy call.',
      buttonText: 'Get in Touch',
      buttonUrl: '/contact',
    },
  },
  coaching: {
    hero: { title: 'Coaching & Mentoring', subtitle: 'Artist Transformation', description: 'Whether you\u2019re seeking a coach to challenge your thinking or a mentor to guide your creative path, this is your space to transform.' },
    isThisForYou: { title: 'Is This For You?', subtitle: '', items: [] },
    whatYoullExperience: { title: "What You'll Experience", subtitle: '', cards: [] },
    howItWorks: { title: 'How It Works', subtitle: '', steps: [] },
  },
  learn: {
    hero: { title: 'Unlock Your Creative Potential', subtitle: 'Learn & Create', description: 'From self-paced courses to live workshops and in-person experiences. Learn at your own pace, connect with a community, and build the creative skills that last.' },
    instructorBio: { name: 'Lyne Tilt', paragraphs: [], stats: [] },
    newsletterSignup: { title: 'Not Ready to Enrol?', description: '' },
  },
  contact: {
    header: { title: 'Start a Conversation', subtitle: 'Get In Touch' },
    welcomeMessage: { title: 'Hey there, it\u2019s great to see you.', paragraphs: [] },
    formSubjects: ['General Inquiry', 'Coaching Application', 'Speaking Request'],
    info: { email: 'hello@lynetilt.com', location: 'Brisbane, Australia', responseTime: '1-2 business days' },
    coachingCallout: { title: 'Coaching Applications', description: '' },
  },
  productDetail: { materialsAndCare: '', shippingAndReturns: '' },
  footer: {
    tagline: 'LYNE TILT',
    location: 'Australia-based.',
    established: 'Est. 2023',
    copyright: '\u00a9 2023 - 2026 Lyne Tilt Studio. All rights reserved.',
    columns: [],
    socialLinks: [],
  },
  sections: {
    showTestimonials: true, showNewsletter: true,
    showFeaturedProducts: true, showBlogPreview: true,
  },
  seo: {
    home: { title: '', description: '', image: '' },
    about: { title: '', description: '', image: '' },
    coaching: { title: '', description: '', image: '' },
    learn: { title: '', description: '', image: '' },
    contact: { title: '', description: '', image: '' },
    shop: { title: '', description: '', image: '' },
    blog: { title: '', description: '', image: '' },
    faq: { title: '', description: '', image: '' },
  },
};

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

interface NavSection {
  id: string;
  label: string;
}

interface NavPage {
  id: string;
  label: string;
  icon: React.ElementType;
  sections: NavSection[];
  previewUrl: string;
}

const pages: NavPage[] = [
  {
    id: 'home', label: 'Home', icon: Home, previewUrl: '/',
    sections: [
      { id: 'hero', label: 'Hero Banner' },
      { id: 'splitPath', label: 'Three Paths' },
      { id: 'homeAbout', label: 'About Preview' },
      { id: 'shopCta', label: 'Shop CTA' },
    ],
  },
  {
    id: 'about', label: 'About', icon: User, previewUrl: '/#/about',
    sections: [
      { id: 'aboutHeader', label: 'Page Header' },
      { id: 'philosophy', label: 'Philosophy' },
      { id: 'howIShowUp', label: 'How I Show Up' },
      { id: 'journey', label: 'The Journey' },
      { id: 'whoThisIsFor', label: 'Who This Is For' },
      { id: 'aboutCta', label: 'Call to Action' },
    ],
  },
  {
    id: 'coaching', label: 'Coaching', icon: Palette, previewUrl: '/#/coaching',
    sections: [
      { id: 'coachingHero', label: 'Hero Section' },
      { id: 'isThisForYou', label: 'Is This For You?' },
      { id: 'whatYoullExperience', label: "What You'll Experience" },
      { id: 'howItWorks', label: 'How It Works' },
    ],
  },
  {
    id: 'learn', label: 'Learn', icon: GraduationCap, previewUrl: '/#/learn',
    sections: [
      { id: 'learnHero', label: 'Hero Section' },
      { id: 'instructorBio', label: 'Instructor Bio' },
      { id: 'newsletterSignup', label: 'Newsletter Signup' },
    ],
  },
  {
    id: 'contact', label: 'Contact', icon: Mail, previewUrl: '/#/contact',
    sections: [
      { id: 'contactHeader', label: 'Page Header' },
      { id: 'welcomeMessage', label: 'Welcome Message' },
      { id: 'formSettings', label: 'Form Settings' },
      { id: 'contactInfo', label: 'Contact Info' },
      { id: 'coachingCallout', label: 'Coaching Callout' },
    ],
  },
  {
    id: 'shop', label: 'Shop', icon: ShoppingBag, previewUrl: '/#/shop',
    sections: [
      { id: 'materialsAndCare', label: 'Materials & Care' },
      { id: 'shippingAndReturns', label: 'Shipping & Returns' },
    ],
  },
];

const globalSections: NavPage[] = [
  {
    id: 'footer', label: 'Footer', icon: Globe, previewUrl: '/',
    sections: [
      { id: 'footerBrand', label: 'Brand Info' },
      { id: 'footerLinks', label: 'Link Columns' },
      { id: 'socialLinks', label: 'Social Links' },
    ],
  },
  {
    id: 'seo', label: 'SEO', icon: Search, previewUrl: '/',
    sections: [
      { id: 'seo-home', label: 'Home' },
      { id: 'seo-about', label: 'About' },
      { id: 'seo-coaching', label: 'Coaching' },
      { id: 'seo-learn', label: 'Learn' },
      { id: 'seo-contact', label: 'Contact' },
      { id: 'seo-shop', label: 'Shop' },
      { id: 'seo-blog', label: 'Oxygen Notes' },
      { id: 'seo-faq', label: 'FAQ' },
    ],
  },
  {
    id: 'visibility', label: 'Visibility', icon: ToggleLeft, previewUrl: '/',
    sections: [],
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputClass =
  'w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1';

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1">
      <label className="block text-sm font-medium text-stone-700">{label}</label>
      {hint && <p className="text-xs text-stone-400 mt-0.5">{hint}</p>}
    </div>
  );
}

function SectionCard({ id, title, description, children }: {
  id: string; title: string; description?: string; children: React.ReactNode;
}) {
  return (
    <div id={`section-${id}`} className="bg-white rounded-lg border border-stone-200 mb-5">
      <div className="px-5 py-4 border-b border-stone-100">
        <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
        {description && <p className="text-xs text-stone-400 mt-0.5">{description}</p>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function CtaPair({ label, textValue, linkValue, onTextChange, onLinkChange }: {
  label: string;
  textValue: string;
  linkValue: string;
  onTextChange: (v: string) => void;
  onLinkChange: (v: string) => void;
}) {
  return (
    <div className="p-4 bg-stone-50 rounded-lg space-y-2">
      <h4 className="text-xs font-semibold text-stone-500 uppercase tracking-wide">{label}</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-stone-500 mb-1">Button Text</label>
          <input type="text" value={textValue} onChange={(e) => onTextChange(e.target.value)} placeholder="Button text" className={inputClass} />
        </div>
        <div>
          <label className="block text-xs text-stone-500 mb-1">Link</label>
          <input type="text" value={linkValue} onChange={(e) => onLinkChange(e.target.value)} placeholder="/page" className={inputClass} />
        </div>
      </div>
    </div>
  );
}

function Toggle({ checked, onChange, label, description }: {
  checked: boolean; onChange: (v: boolean) => void; label: string; description: string;
}) {
  return (
    <label className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition">
      <div>
        <p className="font-medium text-stone-800 text-sm">{label}</p>
        <p className="text-xs text-stone-500">{description}</p>
      </div>
      <div className="relative">
        <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="sr-only peer" />
        <div className="w-10 h-5 bg-stone-300 peer-checked:bg-stone-900 rounded-full transition" />
        <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
      </div>
    </label>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SiteSettingsManager() {
  const { accessToken } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('home');
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set(['home']));
  const [showPreview, setShowPreview] = useState(false);

  // Save state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const hasUnsavedChanges = useRef(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const savedTimeout = useRef<ReturnType<typeof setTimeout>>();
  const previewRefreshKey = useRef(0);
  const [, setPreviewTick] = useState(0); // force re-render for preview refresh

  // Preview URL
  const allPages = [...pages, ...globalSections];
  const currentPage = allPages.find(p => p.id === activePage);
  const previewUrl = currentPage?.previewUrl || '/';

  // ---------- Load settings ----------

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings(prev => deepMerge(prev, data));
        }
      } catch {
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [accessToken]);

  // ---------- beforeunload ----------

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges.current) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  // ---------- Deep merge util ----------

  function deepMerge(target: any, source: any): any {
    const result = { ...target };
    for (const key of Object.keys(source)) {
      const val = source[key];
      if (val === undefined || val === null) continue;
      // Skip empty strings from API — keep the default content
      if (val === '' && target[key] !== '') continue;
      // Skip empty arrays from API — keep the default content
      if (Array.isArray(val) && val.length === 0 && Array.isArray(target[key]) && target[key].length > 0) continue;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        result[key] = deepMerge(target[key] || {}, val);
      } else {
        result[key] = val;
      }
    }
    return result;
  }

  // ---------- Update field ----------

  const updateSettings = useCallback((path: string, value: any) => {
    setSettings(prev => {
      const keys = path.split('.');
      const next = JSON.parse(JSON.stringify(prev));
      let current: any = next;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return next;
    });

    hasUnsavedChanges.current = true;
    setSaveStatus('idle');

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveSettings();
    }, 1500);
  }, [accessToken]);

  // ---------- Save ----------

  const saveSettings = useCallback(async () => {
    if (!hasUnsavedChanges.current) return;

    setSaveStatus('saving');
    try {
      const res = await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Save failed');

      hasUnsavedChanges.current = false;
      setSaveStatus('saved');

      // Refresh preview
      previewRefreshKey.current += 1;
      setPreviewTick(t => t + 1);

      // Clear "saved" status after 3s
      if (savedTimeout.current) clearTimeout(savedTimeout.current);
      savedTimeout.current = setTimeout(() => setSaveStatus('idle'), 3000);
    } catch {
      setSaveStatus('error');
      toast.error('Failed to save settings');
    }
  }, [settings, accessToken]);

  // ---------- Navigation ----------

  const togglePage = (pageId: string) => {
    setExpandedPages(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      return next;
    });
    setActivePage(pageId);
  };

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(`section-${sectionId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // ---------- Loading ----------

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="text-stone-400 animate-spin" />
      </div>
    );
  }

  // ---------- Render ----------

  return (
    <div className="min-h-screen -m-4 lg:-m-6">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-stone-200 px-4 lg:px-6 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Site Settings</h1>
            <p className="text-xs text-stone-400 mt-0.5">Edit your website content and configuration</p>
          </div>
          <div className="flex items-center gap-3">
            {/* Save status */}
            <div className="flex items-center gap-1.5 text-xs text-stone-400">
              {saveStatus === 'saving' && (
                <><Loader2 size={12} className="animate-spin" /> <span>Saving...</span></>
              )}
              {saveStatus === 'saved' && (
                <><Check size={12} className="text-green-500" /> <span className="text-green-600">All changes saved</span></>
              )}
              {saveStatus === 'error' && (
                <><AlertCircle size={12} className="text-red-500" /> <span className="text-red-500">Save failed</span></>
              )}
            </div>

            <button
              onClick={() => setShowPreview(!showPreview)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition text-sm ${
                showPreview
                  ? 'bg-stone-100 text-stone-900 border border-stone-200'
                  : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 border border-transparent'
              }`}
            >
              {showPreview ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
              <span className="hidden sm:inline">{showPreview ? 'Hide Preview' : 'Preview'}</span>
            </button>

            <button
              onClick={() => { if (saveTimer.current) clearTimeout(saveTimer.current); saveSettings(); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm"
            >
              <Save size={14} />
              Save
            </button>
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex">
        {/* Left sidebar */}
        <aside className="w-52 flex-shrink-0 border-r border-stone-200 bg-stone-50/50 min-h-[calc(100vh-64px)] overflow-y-auto">
          <nav className="py-3">
            {/* Page sections */}
            <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Pages</p>
            {pages.map(page => {
              const Icon = page.icon;
              const isExpanded = expandedPages.has(page.id);
              const isActive = activePage === page.id;
              return (
                <div key={page.id}>
                  <button
                    onClick={() => togglePage(page.id)}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                      isActive ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    <ChevronRight size={12} className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    <Icon size={14} className={isActive ? 'text-stone-700' : 'text-stone-400'} />
                    <span>{page.label}</span>
                  </button>
                  {isExpanded && (
                    <div className="ml-4 border-l border-stone-200">
                      {page.sections.map(section => (
                        <button
                          key={section.id}
                          onClick={() => { setActivePage(page.id); scrollToSection(section.id); }}
                          className="w-full text-left pl-5 pr-4 py-1 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Separator */}
            <div className="border-t border-stone-200 my-3 mx-4" />

            {/* Global sections */}
            <p className="px-4 text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-2">Global</p>
            {globalSections.map(page => {
              const Icon = page.icon;
              const isExpanded = expandedPages.has(page.id);
              const isActive = activePage === page.id;
              return (
                <div key={page.id}>
                  <button
                    onClick={() => togglePage(page.id)}
                    className={`w-full flex items-center gap-2 px-4 py-1.5 text-sm transition-colors ${
                      isActive ? 'bg-stone-100 text-stone-900 font-medium' : 'text-stone-600 hover:bg-stone-100'
                    }`}
                  >
                    {page.sections.length > 0 ? (
                      <ChevronRight size={12} className={`text-stone-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                    ) : (
                      <span className="w-3" />
                    )}
                    <Icon size={14} className={isActive ? 'text-stone-700' : 'text-stone-400'} />
                    <span>{page.label}</span>
                  </button>
                  {isExpanded && page.sections.length > 0 && (
                    <div className="ml-4 border-l border-stone-200">
                      {page.sections.map(section => (
                        <button
                          key={section.id}
                          onClick={() => { setActivePage(page.id); scrollToSection(section.id); }}
                          className="w-full text-left pl-5 pr-4 py-1 text-xs text-stone-500 hover:text-stone-800 hover:bg-stone-100 transition-colors"
                        >
                          {section.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Editor area */}
        <main className={`flex-1 min-w-0 p-6 overflow-y-auto max-h-[calc(100vh-64px)] ${showPreview ? '' : ''}`}>
          {/* ============================================================= */}
          {/* HOME PAGE                                                      */}
          {/* ============================================================= */}
          {activePage === 'home' && (
            <>
              <SectionCard id="hero" title="Hero Banner" description="The main landing section visitors see first on your homepage">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Headline" />
                    <input type="text" value={settings.hero.headline} onChange={(e) => updateSettings('hero.headline', e.target.value)} placeholder="Art is Oxygen." className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Tagline" />
                    <input type="text" value={settings.hero.tagline} onChange={(e) => updateSettings('hero.tagline', e.target.value)} placeholder="Clarity is Power." className={inputClass} />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <textarea value={settings.hero.subtitle} onChange={(e) => updateSettings('hero.subtitle', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                </div>
                <div>
                  <FieldLabel label="Meta Tags" hint="Displayed as rotating tags below the hero text" />
                  <input type="text" value={settings.hero.metaTags} onChange={(e) => updateSettings('hero.metaTags', e.target.value)} placeholder="Handmade Jewellery · 1:1 Coaching · Learn & Create" className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Hero Image" />
                  <ImageUploadField value={settings.hero.image} onChange={(url) => updateSettings('hero.image', url)} compact />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <CtaPair label="Primary Button" textValue={settings.hero.primaryCta.text} linkValue={settings.hero.primaryCta.link} onTextChange={(v) => updateSettings('hero.primaryCta.text', v)} onLinkChange={(v) => updateSettings('hero.primaryCta.link', v)} />
                  <CtaPair label="Secondary Button" textValue={settings.hero.secondaryCta.text} linkValue={settings.hero.secondaryCta.link} onTextChange={(v) => updateSettings('hero.secondaryCta.text', v)} onLinkChange={(v) => updateSettings('hero.secondaryCta.link', v)} />
                </div>
              </SectionCard>

              <SectionCard id="splitPath" title="Three Paths" description="The three-column 'ways to work together' section">
                <div>
                  <FieldLabel label="Section Title" />
                  <input type="text" value={settings.splitPath.title} onChange={(e) => updateSettings('splitPath.title', e.target.value)} className={inputClass} />
                </div>
                <ObjectArrayEditor
                  label="Path Cards"
                  items={settings.splitPath.cards}
                  onChange={(cards) => updateSettings('splitPath.cards', cards)}
                  createItem={() => ({ label: '', title: '', description: '', linkText: '', linkUrl: '' })}
                  addLabel="Add Path Card"
                  renderItem={(item, _, updateItem) => (
                    <div className="space-y-3 pr-6">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Label</label>
                          <input type="text" value={item.label} onChange={(e) => updateItem({ label: e.target.value })} placeholder="e.g., Handmade in Australia" className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Title</label>
                          <input type="text" value={item.title} onChange={(e) => updateItem({ title: e.target.value })} placeholder="e.g., Wearable Art" className={inputClass} />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Description</label>
                        <textarea value={item.description} onChange={(e) => updateItem({ description: e.target.value })} rows={2} className={`${inputClass} resize-none`} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Link Text</label>
                          <input type="text" value={item.linkText} onChange={(e) => updateItem({ linkText: e.target.value })} className={inputClass} />
                        </div>
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Link URL</label>
                          <input type="text" value={item.linkUrl} onChange={(e) => updateItem({ linkUrl: e.target.value })} className={inputClass} />
                        </div>
                      </div>
                    </div>
                  )}
                />
              </SectionCard>

              <SectionCard id="homeAbout" title="About Preview" description="The 'Meet Lyne' teaser section on the homepage">
                <div>
                  <FieldLabel label="Image" />
                  <ImageUploadField value={settings.home.aboutSection.image} onChange={(url) => updateSettings('home.aboutSection.image', url)} compact />
                </div>
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.home.aboutSection.title} onChange={(e) => updateSettings('home.aboutSection.title', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Paragraphs" items={settings.home.aboutSection.paragraphs} onChange={(items) => updateSettings('home.aboutSection.paragraphs', items)} placeholder="Enter paragraph..." />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Link Text" />
                    <input type="text" value={settings.home.aboutSection.linkText} onChange={(e) => updateSettings('home.aboutSection.linkText', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Link URL" />
                    <input type="text" value={settings.home.aboutSection.linkUrl} onChange={(e) => updateSettings('home.aboutSection.linkUrl', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="shopCta" title="Shop Call-to-Action" description="The 'Shop the Collection' banner section">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.home.shopCta.title} onChange={(e) => updateSettings('home.shopCta.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.home.shopCta.subtitle} onChange={(e) => updateSettings('home.shopCta.subtitle', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Button Text" />
                  <input type="text" value={settings.home.shopCta.buttonText} onChange={(e) => updateSettings('home.shopCta.buttonText', e.target.value)} className={inputClass} />
                </div>
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* ABOUT PAGE                                                     */}
          {/* ============================================================= */}
          {activePage === 'about' && (
            <>
              <SectionCard id="aboutHeader" title="Page Header" description="Title, subtitle, and hero image at the top of the About page">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Title" />
                    <input type="text" value={settings.about.header.title} onChange={(e) => updateSettings('about.header.title', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Location" />
                    <input type="text" value={settings.about.header.location} onChange={(e) => updateSettings('about.header.location', e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.about.header.subtitle} onChange={(e) => updateSettings('about.header.subtitle', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Hero Image" />
                  <ImageUploadField value={settings.about.heroImage} onChange={(url) => updateSettings('about.heroImage', url)} compact />
                </div>
              </SectionCard>

              <SectionCard id="philosophy" title="Philosophy" description="Your creative philosophy quote and story">
                <div>
                  <FieldLabel label="Quote" />
                  <input type="text" value={settings.about.philosophy.quote} onChange={(e) => updateSettings('about.philosophy.quote', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Paragraphs" items={settings.about.philosophy.paragraphs} onChange={(items) => updateSettings('about.philosophy.paragraphs', items)} />
              </SectionCard>

              <SectionCard id="howIShowUp" title="How I Show Up" description="Cards showing your different roles and offerings">
                <ObjectArrayEditor
                  label="Cards"
                  items={settings.about.howIShowUp.cards}
                  onChange={(cards) => updateSettings('about.howIShowUp.cards', cards)}
                  createItem={() => ({ title: '', description: '', linkText: '', linkUrl: '' })}
                  addLabel="Add Card"
                  renderItem={(item, _, updateItem) => (
                    <div className="space-y-2 pr-6">
                      <input type="text" value={item.title} onChange={(e) => updateItem({ title: e.target.value })} placeholder="Title" className={inputClass} />
                      <textarea value={item.description} onChange={(e) => updateItem({ description: e.target.value })} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={item.linkText} onChange={(e) => updateItem({ linkText: e.target.value })} placeholder="Link text" className={inputClass} />
                        <input type="text" value={item.linkUrl} onChange={(e) => updateItem({ linkUrl: e.target.value })} placeholder="/url" className={inputClass} />
                      </div>
                    </div>
                  )}
                />
              </SectionCard>

              <SectionCard id="journey" title="The Journey" description="Background, stats, and credentials">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.about.journey.title} onChange={(e) => updateSettings('about.journey.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <textarea value={settings.about.journey.description} onChange={(e) => updateSettings('about.journey.description', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                </div>
                <StatArrayEditor label="Stats" items={settings.about.journey.stats} onChange={(items) => updateSettings('about.journey.stats', items)} />
                <StringArrayEditor label="Credentials" items={settings.about.journey.credentials} onChange={(items) => updateSettings('about.journey.credentials', items)} placeholder="e.g., Fine Art" />
              </SectionCard>

              <SectionCard id="whoThisIsFor" title="Who This Is For" description="Your ideal client description">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.about.whoThisIsFor.title} onChange={(e) => updateSettings('about.whoThisIsFor.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.about.whoThisIsFor.subtitle} onChange={(e) => updateSettings('about.whoThisIsFor.subtitle', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Items" items={settings.about.whoThisIsFor.items} onChange={(items) => updateSettings('about.whoThisIsFor.items', items)} />
              </SectionCard>

              <SectionCard id="aboutCta" title="Call to Action" description="The bottom CTA section on your About page">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.about.cta.title} onChange={(e) => updateSettings('about.cta.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <input type="text" value={settings.about.cta.description} onChange={(e) => updateSettings('about.cta.description', e.target.value)} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Button Text" />
                    <input type="text" value={settings.about.cta.buttonText} onChange={(e) => updateSettings('about.cta.buttonText', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Button URL" />
                    <input type="text" value={settings.about.cta.buttonUrl} onChange={(e) => updateSettings('about.cta.buttonUrl', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* COACHING PAGE                                                  */}
          {/* ============================================================= */}
          {activePage === 'coaching' && (
            <>
              <SectionCard id="coachingHero" title="Hero Section" description="The main heading area of your Coaching page">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.coaching.hero.title} onChange={(e) => updateSettings('coaching.hero.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.coaching.hero.subtitle} onChange={(e) => updateSettings('coaching.hero.subtitle', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <textarea value={settings.coaching.hero.description} onChange={(e) => updateSettings('coaching.hero.description', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                </div>
              </SectionCard>

              <SectionCard id="isThisForYou" title="Is This For You?" description="Helps visitors self-identify if coaching is right for them">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.coaching.isThisForYou.title} onChange={(e) => updateSettings('coaching.isThisForYou.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.coaching.isThisForYou.subtitle} onChange={(e) => updateSettings('coaching.isThisForYou.subtitle', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Items" items={settings.coaching.isThisForYou.items} onChange={(items) => updateSettings('coaching.isThisForYou.items', items)} placeholder="e.g., You're a creative who feels stuck..." />
              </SectionCard>

              <SectionCard id="whatYoullExperience" title="What You'll Experience" description="Cards describing the coaching experience">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.coaching.whatYoullExperience.title} onChange={(e) => updateSettings('coaching.whatYoullExperience.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.coaching.whatYoullExperience.subtitle} onChange={(e) => updateSettings('coaching.whatYoullExperience.subtitle', e.target.value)} className={inputClass} />
                </div>
                <ObjectArrayEditor
                  label="Experience Cards"
                  items={settings.coaching.whatYoullExperience.cards}
                  onChange={(cards) => updateSettings('coaching.whatYoullExperience.cards', cards)}
                  createItem={() => ({ title: '', description: '' })}
                  addLabel="Add Card"
                  renderItem={(item, _, updateItem) => (
                    <div className="space-y-2 pr-6">
                      <input type="text" value={item.title} onChange={(e) => updateItem({ title: e.target.value })} placeholder="Title" className={inputClass} />
                      <textarea value={item.description} onChange={(e) => updateItem({ description: e.target.value })} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />
                    </div>
                  )}
                />
              </SectionCard>

              <SectionCard id="howItWorks" title="How It Works" description="Step-by-step process for getting started">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.coaching.howItWorks.title} onChange={(e) => updateSettings('coaching.howItWorks.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.coaching.howItWorks.subtitle} onChange={(e) => updateSettings('coaching.howItWorks.subtitle', e.target.value)} className={inputClass} />
                </div>
                <ObjectArrayEditor
                  label="Steps"
                  items={settings.coaching.howItWorks.steps}
                  onChange={(steps) => updateSettings('coaching.howItWorks.steps', steps)}
                  createItem={() => ({ step: '', title: '', description: '' })}
                  addLabel="Add Step"
                  renderItem={(item, _, updateItem) => (
                    <div className="space-y-2 pr-6">
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-xs text-stone-500 mb-1">Step #</label>
                          <input type="text" value={item.step} onChange={(e) => updateItem({ step: e.target.value })} placeholder="01" className={inputClass} />
                        </div>
                        <div className="col-span-3">
                          <label className="block text-xs text-stone-500 mb-1">Title</label>
                          <input type="text" value={item.title} onChange={(e) => updateItem({ title: e.target.value })} placeholder="Step title" className={inputClass} />
                        </div>
                      </div>
                      <textarea value={item.description} onChange={(e) => updateItem({ description: e.target.value })} placeholder="Description" rows={2} className={`${inputClass} resize-none`} />
                    </div>
                  )}
                />
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* LEARN PAGE                                                     */}
          {/* ============================================================= */}
          {activePage === 'learn' && (
            <>
              <SectionCard id="learnHero" title="Hero Section" description="The main heading area of your Learn page">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.learn.hero.title} onChange={(e) => updateSettings('learn.hero.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Subtitle" />
                  <input type="text" value={settings.learn.hero.subtitle} onChange={(e) => updateSettings('learn.hero.subtitle', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <textarea value={settings.learn.hero.description} onChange={(e) => updateSettings('learn.hero.description', e.target.value)} rows={3} className={`${inputClass} resize-none`} />
                </div>
              </SectionCard>

              <SectionCard id="instructorBio" title="Instructor Bio" description="Your bio displayed alongside course listings">
                <div>
                  <FieldLabel label="Name" />
                  <input type="text" value={settings.learn.instructorBio.name} onChange={(e) => updateSettings('learn.instructorBio.name', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Paragraphs" items={settings.learn.instructorBio.paragraphs} onChange={(items) => updateSettings('learn.instructorBio.paragraphs', items)} placeholder="Bio paragraph..." />
                <StatArrayEditor label="Stats" items={settings.learn.instructorBio.stats} onChange={(items) => updateSettings('learn.instructorBio.stats', items)} />
              </SectionCard>

              <SectionCard id="newsletterSignup" title="Newsletter Signup" description="The email signup section at the bottom of Learn">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.learn.newsletterSignup.title} onChange={(e) => updateSettings('learn.newsletterSignup.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <input type="text" value={settings.learn.newsletterSignup.description} onChange={(e) => updateSettings('learn.newsletterSignup.description', e.target.value)} className={inputClass} />
                </div>
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* CONTACT PAGE                                                   */}
          {/* ============================================================= */}
          {activePage === 'contact' && (
            <>
              <SectionCard id="contactHeader" title="Page Header" description="Title and subtitle at the top of Contact">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Subtitle" />
                    <input type="text" value={settings.contact.header.subtitle} onChange={(e) => updateSettings('contact.header.subtitle', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Title" />
                    <input type="text" value={settings.contact.header.title} onChange={(e) => updateSettings('contact.header.title', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="welcomeMessage" title="Welcome Message" description="The personal greeting shown alongside the form">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.contact.welcomeMessage.title} onChange={(e) => updateSettings('contact.welcomeMessage.title', e.target.value)} className={inputClass} />
                </div>
                <StringArrayEditor label="Paragraphs" items={settings.contact.welcomeMessage.paragraphs} onChange={(items) => updateSettings('contact.welcomeMessage.paragraphs', items)} />
              </SectionCard>

              <SectionCard id="formSettings" title="Form Settings" description="Subject dropdown options in the contact form">
                <StringArrayEditor label="Subject Options" items={settings.contact.formSubjects} onChange={(items) => updateSettings('contact.formSubjects', items)} placeholder="e.g., General Inquiry" />
              </SectionCard>

              <SectionCard id="contactInfo" title="Contact Info" description="Email, location, and response time shown on the page">
                <div>
                  <FieldLabel label="Email" />
                  <input type="email" value={settings.contact.info.email} onChange={(e) => updateSettings('contact.info.email', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Location" />
                  <input type="text" value={settings.contact.info.location} onChange={(e) => updateSettings('contact.info.location', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Response Time" />
                  <input type="text" value={settings.contact.info.responseTime} onChange={(e) => updateSettings('contact.info.responseTime', e.target.value)} className={inputClass} />
                </div>
              </SectionCard>

              <SectionCard id="coachingCallout" title="Coaching Callout" description="The coaching application prompt on the Contact page">
                <div>
                  <FieldLabel label="Title" />
                  <input type="text" value={settings.contact.coachingCallout.title} onChange={(e) => updateSettings('contact.coachingCallout.title', e.target.value)} className={inputClass} />
                </div>
                <div>
                  <FieldLabel label="Description" />
                  <textarea value={settings.contact.coachingCallout.description} onChange={(e) => updateSettings('contact.coachingCallout.description', e.target.value)} rows={2} className={`${inputClass} resize-none`} />
                </div>
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* SHOP PAGE                                                      */}
          {/* ============================================================= */}
          {activePage === 'shop' && (
            <>
              <SectionCard id="materialsAndCare" title="Materials & Care" description="Shared content shown on all product detail pages">
                <div>
                  <FieldLabel label="Content" hint="HTML supported" />
                  <textarea value={settings.productDetail.materialsAndCare} onChange={(e) => updateSettings('productDetail.materialsAndCare', e.target.value)} rows={6} className={`${inputClass} resize-none font-mono text-xs`} />
                </div>
              </SectionCard>

              <SectionCard id="shippingAndReturns" title="Shipping & Returns" description="Shared shipping and returns policy for all products">
                <div>
                  <FieldLabel label="Content" hint="HTML supported" />
                  <textarea value={settings.productDetail.shippingAndReturns} onChange={(e) => updateSettings('productDetail.shippingAndReturns', e.target.value)} rows={6} className={`${inputClass} resize-none font-mono text-xs`} />
                </div>
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* FOOTER                                                         */}
          {/* ============================================================= */}
          {activePage === 'footer' && (
            <>
              <SectionCard id="footerBrand" title="Brand Info" description="Tagline, location, and copyright in the footer">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Tagline" />
                    <input type="text" value={settings.footer.tagline} onChange={(e) => updateSettings('footer.tagline', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Location" />
                    <input type="text" value={settings.footer.location} onChange={(e) => updateSettings('footer.location', e.target.value)} className={inputClass} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Established" />
                    <input type="text" value={settings.footer.established} onChange={(e) => updateSettings('footer.established', e.target.value)} className={inputClass} />
                  </div>
                  <div>
                    <FieldLabel label="Copyright" />
                    <input type="text" value={settings.footer.copyright} onChange={(e) => updateSettings('footer.copyright', e.target.value)} className={inputClass} />
                  </div>
                </div>
              </SectionCard>

              <SectionCard id="footerLinks" title="Link Columns" description="Navigation link columns in the footer">
                <ObjectArrayEditor
                  label="Footer Columns"
                  items={settings.footer.columns}
                  onChange={(columns) => updateSettings('footer.columns', columns)}
                  createItem={() => ({ title: '', links: [] })}
                  addLabel="Add Column"
                  renderItem={(col, _colIndex, updateCol) => (
                    <div className="space-y-3 pr-6">
                      <input type="text" value={col.title} onChange={(e) => updateCol({ title: e.target.value })} placeholder="Column title" className={inputClass} />
                      <LinkArrayEditor label="Links" items={col.links} onChange={(links) => updateCol({ links })} />
                    </div>
                  )}
                />
              </SectionCard>

              <SectionCard id="socialLinks" title="Social Links" description="Social media icons in the footer">
                <ObjectArrayEditor
                  label="Social Media"
                  items={settings.footer.socialLinks}
                  onChange={(links) => updateSettings('footer.socialLinks', links)}
                  createItem={() => ({ platform: '', url: '' })}
                  addLabel="Add Social Link"
                  renderItem={(item, _, updateItem) => (
                    <div className="grid grid-cols-2 gap-3 pr-6">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Platform</label>
                        <select value={item.platform} onChange={(e) => updateItem({ platform: e.target.value })} className={inputClass}>
                          <option value="">Select...</option>
                          <option value="instagram">Instagram</option>
                          <option value="facebook">Facebook</option>
                          <option value="twitter">Twitter/X</option>
                          <option value="linkedin">LinkedIn</option>
                          <option value="pinterest">Pinterest</option>
                          <option value="youtube">YouTube</option>
                          <option value="tiktok">TikTok</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">URL</label>
                        <input type="url" value={item.url} onChange={(e) => updateItem({ url: e.target.value })} placeholder="https://..." className={inputClass} />
                      </div>
                    </div>
                  )}
                />
              </SectionCard>
            </>
          )}

          {/* ============================================================= */}
          {/* SEO                                                            */}
          {/* ============================================================= */}
          {activePage === 'seo' && (
            <>
              {[
                { key: 'home', label: 'Home Page', url: 'lynetilt.com' },
                { key: 'about', label: 'About Page', url: 'lynetilt.com/about' },
                { key: 'coaching', label: 'Coaching Page', url: 'lynetilt.com/coaching' },
                { key: 'learn', label: 'Learn Page', url: 'lynetilt.com/learn' },
                { key: 'shop', label: 'Shop Page', url: 'lynetilt.com/shop' },
                { key: 'blog', label: 'Oxygen Notes', url: 'lynetilt.com/oxygennotes' },
                { key: 'contact', label: 'Contact Page', url: 'lynetilt.com/contact' },
                { key: 'faq', label: 'FAQ Page', url: 'lynetilt.com/faq' },
              ].map((page) => (
                <SectionCard key={page.key} id={`seo-${page.key}`} title={`${page.label} SEO`} description={`How this page appears in Google and social media — ${page.url}`}>
                  <SeoFields
                    title={settings.seo?.[page.key as keyof typeof settings.seo]?.title || ''}
                    description={settings.seo?.[page.key as keyof typeof settings.seo]?.description || ''}
                    image={settings.seo?.[page.key as keyof typeof settings.seo]?.image || ''}
                    onTitleChange={(value) => updateSettings(`seo.${page.key}.title`, value)}
                    onDescriptionChange={(value) => updateSettings(`seo.${page.key}.description`, value)}
                    onImageChange={(value) => updateSettings(`seo.${page.key}.image`, value)}
                    baseUrl={page.url}
                  />
                </SectionCard>
              ))}
            </>
          )}

          {/* ============================================================= */}
          {/* VISIBILITY                                                     */}
          {/* ============================================================= */}
          {activePage === 'visibility' && (
            <SectionCard id="visibility" title="Section Visibility" description="Toggle which sections appear on the homepage">
              <div className="space-y-3">
                <Toggle
                  checked={settings.sections.showFeaturedProducts}
                  onChange={(v) => updateSettings('sections.showFeaturedProducts', v)}
                  label="Featured Products"
                  description="Show product highlights on homepage"
                />
                <Toggle
                  checked={settings.sections.showTestimonials}
                  onChange={(v) => updateSettings('sections.showTestimonials', v)}
                  label="Testimonials"
                  description="Display customer testimonials"
                />
                <Toggle
                  checked={settings.sections.showBlogPreview}
                  onChange={(v) => updateSettings('sections.showBlogPreview', v)}
                  label="Blog Preview"
                  description="Show recent blog posts"
                />
                <Toggle
                  checked={settings.sections.showNewsletter}
                  onChange={(v) => updateSettings('sections.showNewsletter', v)}
                  label="Newsletter Signup"
                  description="Show email signup section"
                />
              </div>
            </SectionCard>
          )}
        </main>

        {/* Preview panel */}
        {showPreview && (
          <div className="w-[480px] flex-shrink-0 sticky top-16 h-[calc(100vh-64px)] border-l border-stone-200">
            <PreviewFrame
              key={previewRefreshKey.current}
              url={previewUrl}
              onClose={() => setShowPreview(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
