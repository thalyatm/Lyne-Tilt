import React, { useState, useEffect } from 'react';
import { Save, Eye, EyeOff, PanelRightOpen, PanelRightClose } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config/api';
import AccordionSection from '../components/AccordionSection';
import { StringArrayEditor, StatArrayEditor, LinkArrayEditor, ObjectArrayEditor } from '../components/ArrayEditor';
import PreviewFrame from '../components/PreviewFrame';
import SeoFields from '../components/SeoFields';
import { ImageUploadField } from '../components/FormModal';

// Types matching the backend schema
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
    headline: '', tagline: '', subtitle: '', metaTags: '',
    primaryCta: { text: '', link: '' },
    secondaryCta: { text: '', link: '' },
    image: ''
  },
  splitPath: { title: '', cards: [] },
  home: {
    aboutSection: { image: '', title: '', paragraphs: [], linkText: '', linkUrl: '' },
    shopCta: { title: '', subtitle: '', buttonText: '' }
  },
  about: {
    header: { title: '', subtitle: '', location: '' },
    heroImage: '',
    philosophy: { quote: '', paragraphs: [] },
    howIShowUp: { cards: [] },
    journey: { title: '', description: '', stats: [], credentials: [] },
    whoThisIsFor: { title: '', subtitle: '', items: [] },
    cta: { title: '', description: '', buttonText: '', buttonUrl: '' }
  },
  coaching: {
    hero: { title: '', subtitle: '', description: '' },
    isThisForYou: { title: '', subtitle: '', items: [] },
    whatYoullExperience: { title: '', subtitle: '', cards: [] },
    howItWorks: { title: '', subtitle: '', steps: [] }
  },
  learn: {
    hero: { title: '', subtitle: '', description: '' },
    instructorBio: { name: '', paragraphs: [], stats: [] },
    newsletterSignup: { title: '', description: '' }
  },
  contact: {
    header: { title: '', subtitle: '' },
    welcomeMessage: { title: '', paragraphs: [] },
    formSubjects: [],
    info: { email: '', location: '', responseTime: '' },
    coachingCallout: { title: '', description: '' }
  },
  productDetail: { materialsAndCare: '', shippingAndReturns: '' },
  footer: {
    tagline: '', location: '', established: '', copyright: '',
    columns: [], socialLinks: []
  },
  sections: {
    showTestimonials: true, showNewsletter: true,
    showFeaturedProducts: true, showBlogPreview: true
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
  }
};

// Map tabs to frontend preview URLs
const tabToPreviewUrl: Record<string, string> = {
  hero: '/',
  home: '/',
  about: '/#/about',
  coaching: '/#/coaching',
  learn: '/#/learn',
  contact: '/#/contact',
  shop: '/#/shop',
  footer: '/',
  sections: '/',
  seo: '/',
};

export default function SiteSettingsManager() {
  const { accessToken } = useAuth();
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('hero');
  const [saved, setSaved] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const previewUrl = tabToPreviewUrl[activeTab] || '/';

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_BASE}/settings`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setSettings({ ...defaultSettings, ...data });
        }
      } catch (error) {
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [accessToken]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API_BASE}/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(settings),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (error) {
    } finally {
      setSaving(false);
    }
  };

  const updateSettings = (path: string, value: any) => {
    setSettings((prev) => {
      const keys = path.split('.');
      const newSettings = JSON.parse(JSON.stringify(prev)); // Deep clone
      let current: any = newSettings;
      for (let i = 0; i < keys.length - 1; i++) {
        if (!current[keys[i]]) current[keys[i]] = {};
        current = current[keys[i]];
      }
      current[keys[keys.length - 1]] = value;
      return newSettings;
    });
  };

  const tabs = [
    { id: 'hero', label: 'Hero' },
    { id: 'home', label: 'Home' },
    { id: 'about', label: 'About' },
    { id: 'contact', label: 'Contact' },
    { id: 'shop', label: 'Shop' },
    { id: 'footer', label: 'Footer' },
    { id: 'sections', label: 'Visibility' },
    { id: 'seo', label: 'SEO' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-stone-200 border-t-stone-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900">Site Settings</h1>
          <p className="text-sm text-stone-500 mt-1">Global website content and configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPreview(!showPreview)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition text-sm ${
              showPreview
                ? 'bg-stone-100 text-stone-900 border border-stone-200'
                : 'text-stone-500 hover:text-stone-700 hover:bg-stone-100 border border-transparent'
            }`}
            title={showPreview ? 'Hide preview panel' : 'Show preview panel'}
          >
            {showPreview ? <PanelRightClose size={18} /> : <PanelRightOpen size={18} />}
            <span className="text-sm">{showPreview ? 'Hide Preview' : 'Preview'}</span>
          </button>
          <a
            href={previewUrl}
            target="_blank"
            className="flex items-center gap-2 px-3 py-2 text-stone-600 hover:bg-stone-100 rounded-lg transition"
            title="Open in new tab"
          >
            <Eye size={18} />
          </a>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-1.5 bg-stone-900 text-white rounded-md hover:bg-stone-800 transition text-sm disabled:opacity-50"
          >
            <Save size={18} />
            {saving ? 'Saving...' : saved ? 'Saved!' : 'Save'}
          </button>
        </div>
      </div>

      {/* Split Layout Container */}
      <div className={`flex gap-6 ${showPreview ? '' : ''}`}>
        {/* Editor Panel */}
        <div className={`${showPreview ? 'flex-1 min-w-0' : 'w-full'}`}>
          {/* Tabs */}
          <div className="inline-flex bg-stone-100 rounded-md p-0.5 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 text-sm rounded-md transition whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-white text-stone-900 font-medium shadow-sm'
                    : 'text-stone-500 hover:text-stone-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg border border-stone-200 p-6 mt-4">
        {/* HERO TAB */}
        {activeTab === 'hero' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Hero Section</h2>
            <p className="text-sm text-stone-500 mb-6">Main landing section on the homepage</p>

            <div className="grid gap-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Headline</label>
                  <input
                    type="text"
                    value={settings.hero.headline}
                    onChange={(e) => updateSettings('hero.headline', e.target.value)}
                    placeholder="Art is Oxygen."
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settings.hero.tagline}
                    onChange={(e) => updateSettings('hero.tagline', e.target.value)}
                    placeholder="Clarity is Power."
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subtitle</label>
                <textarea
                  value={settings.hero.subtitle}
                  onChange={(e) => updateSettings('hero.subtitle', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Meta Tags</label>
                <input
                  type="text"
                  value={settings.hero.metaTags}
                  onChange={(e) => updateSettings('hero.metaTags', e.target.value)}
                  placeholder="Handmade Jewellery · 1:1 Coaching · Learn & Create"
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Hero Image</label>
                <ImageUploadField
                  value={settings.hero.image}
                  onChange={(url) => updateSettings('hero.image', url)}
                  compact
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-stone-50 rounded-lg">
                  <h4 className="font-medium text-stone-700 mb-3">Primary CTA</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={settings.hero.primaryCta.text}
                      onChange={(e) => updateSettings('hero.primaryCta.text', e.target.value)}
                      placeholder="Button text"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                    <input
                      type="text"
                      value={settings.hero.primaryCta.link}
                      onChange={(e) => updateSettings('hero.primaryCta.link', e.target.value)}
                      placeholder="/shop"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
                <div className="p-4 bg-stone-50 rounded-lg">
                  <h4 className="font-medium text-stone-700 mb-3">Secondary CTA</h4>
                  <div className="space-y-2">
                    <input
                      type="text"
                      value={settings.hero.secondaryCta.text}
                      onChange={(e) => updateSettings('hero.secondaryCta.text', e.target.value)}
                      placeholder="Button text"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                    <input
                      type="text"
                      value={settings.hero.secondaryCta.link}
                      onChange={(e) => updateSettings('hero.secondaryCta.link', e.target.value)}
                      placeholder="/coaching"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* HOME TAB */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Home Page Content</h2>

            <AccordionSection title="Split Path Section" description="Three Ways to Work Together" defaultOpen>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Section Title</label>
                <input
                  type="text"
                  value={settings.splitPath.title}
                  onChange={(e) => updateSettings('splitPath.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-stone-400 focus:ring-offset-1"
                />
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
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => updateItem({ label: e.target.value })}
                          placeholder="e.g., Handmade in Australia"
                          className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Title</label>
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItem({ title: e.target.value })}
                          placeholder="e.g., Wearable Art"
                          className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs text-stone-500 mb-1">Description</label>
                      <textarea
                        value={item.description}
                        onChange={(e) => updateItem({ description: e.target.value })}
                        rows={2}
                        className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm resize-none"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Link Text</label>
                        <input
                          type="text"
                          value={item.linkText}
                          onChange={(e) => updateItem({ linkText: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-stone-500 mb-1">Link URL</label>
                        <input
                          type="text"
                          value={item.linkUrl}
                          onChange={(e) => updateItem({ linkUrl: e.target.value })}
                          className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                        />
                      </div>
                    </div>
                  </div>
                )}
              />
            </AccordionSection>

            <AccordionSection title="About Section" description="Meet Lyne section on homepage">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Image</label>
                <ImageUploadField
                  value={settings.home.aboutSection.image}
                  onChange={(url) => updateSettings('home.aboutSection.image', url)}
                  compact
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.home.aboutSection.title}
                  onChange={(e) => updateSettings('home.aboutSection.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <StringArrayEditor
                label="Paragraphs"
                items={settings.home.aboutSection.paragraphs}
                onChange={(items) => updateSettings('home.aboutSection.paragraphs', items)}
                placeholder="Enter paragraph..."
              />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Link Text</label>
                  <input
                    type="text"
                    value={settings.home.aboutSection.linkText}
                    onChange={(e) => updateSettings('home.aboutSection.linkText', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Link URL</label>
                  <input
                    type="text"
                    value={settings.home.aboutSection.linkUrl}
                    onChange={(e) => updateSettings('home.aboutSection.linkUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Shop CTA Section" description="Shop the Collection section">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.home.shopCta.title}
                  onChange={(e) => updateSettings('home.shopCta.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={settings.home.shopCta.subtitle}
                  onChange={(e) => updateSettings('home.shopCta.subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Button Text</label>
                <input
                  type="text"
                  value={settings.home.shopCta.buttonText}
                  onChange={(e) => updateSettings('home.shopCta.buttonText', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
            </AccordionSection>
          </div>
        )}

        {/* ABOUT TAB */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">About Page Content</h2>

            <AccordionSection title="Page Header" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={settings.about.header.title}
                    onChange={(e) => updateSettings('about.header.title', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={settings.about.header.location}
                    onChange={(e) => updateSettings('about.header.location', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={settings.about.header.subtitle}
                  onChange={(e) => updateSettings('about.header.subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Hero Image</label>
                <ImageUploadField
                  value={settings.about.heroImage}
                  onChange={(url) => updateSettings('about.heroImage', url)}
                  compact
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Philosophy Section">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Quote</label>
                <input
                  type="text"
                  value={settings.about.philosophy.quote}
                  onChange={(e) => updateSettings('about.philosophy.quote', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <StringArrayEditor
                label="Philosophy Paragraphs"
                items={settings.about.philosophy.paragraphs}
                onChange={(items) => updateSettings('about.philosophy.paragraphs', items)}
              />
            </AccordionSection>

            <AccordionSection title="How I Show Up">
              <ObjectArrayEditor
                label="Cards"
                items={settings.about.howIShowUp.cards}
                onChange={(cards) => updateSettings('about.howIShowUp.cards', cards)}
                createItem={() => ({ title: '', description: '', linkText: '', linkUrl: '' })}
                addLabel="Add Card"
                renderItem={(item, _, updateItem) => (
                  <div className="space-y-2 pr-6">
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => updateItem({ title: e.target.value })}
                      placeholder="Title"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                    />
                    <textarea
                      value={item.description}
                      onChange={(e) => updateItem({ description: e.target.value })}
                      placeholder="Description"
                      rows={2}
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm resize-none"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.linkText}
                        onChange={(e) => updateItem({ linkText: e.target.value })}
                        placeholder="Link text"
                        className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                      />
                      <input
                        type="text"
                        value={item.linkUrl}
                        onChange={(e) => updateItem({ linkUrl: e.target.value })}
                        placeholder="/url"
                        className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                      />
                    </div>
                  </div>
                )}
              />
            </AccordionSection>

            <AccordionSection title="The Journey Section">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.about.journey.title}
                  onChange={(e) => updateSettings('about.journey.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={settings.about.journey.description}
                  onChange={(e) => updateSettings('about.journey.description', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm resize-none"
                />
              </div>
              <StatArrayEditor
                label="Stats"
                items={settings.about.journey.stats}
                onChange={(items) => updateSettings('about.journey.stats', items)}
              />
              <StringArrayEditor
                label="Credentials"
                items={settings.about.journey.credentials}
                onChange={(items) => updateSettings('about.journey.credentials', items)}
                placeholder="e.g., Fine Art"
              />
            </AccordionSection>

            <AccordionSection title="Who This Is For">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.about.whoThisIsFor.title}
                  onChange={(e) => updateSettings('about.whoThisIsFor.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subtitle</label>
                <input
                  type="text"
                  value={settings.about.whoThisIsFor.subtitle}
                  onChange={(e) => updateSettings('about.whoThisIsFor.subtitle', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <StringArrayEditor
                label="Items"
                items={settings.about.whoThisIsFor.items}
                onChange={(items) => updateSettings('about.whoThisIsFor.items', items)}
              />
            </AccordionSection>

            <AccordionSection title="CTA Section">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.about.cta.title}
                  onChange={(e) => updateSettings('about.cta.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <input
                  type="text"
                  value={settings.about.cta.description}
                  onChange={(e) => updateSettings('about.cta.description', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Button Text</label>
                  <input
                    type="text"
                    value={settings.about.cta.buttonText}
                    onChange={(e) => updateSettings('about.cta.buttonText', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Button URL</label>
                  <input
                    type="text"
                    value={settings.about.cta.buttonUrl}
                    onChange={(e) => updateSettings('about.cta.buttonUrl', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
            </AccordionSection>
          </div>
        )}

        {/* CONTACT TAB */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Contact Page Content</h2>

            <AccordionSection title="Page Header" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Subtitle</label>
                  <input
                    type="text"
                    value={settings.contact.header.subtitle}
                    onChange={(e) => updateSettings('contact.header.subtitle', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                  <input
                    type="text"
                    value={settings.contact.header.title}
                    onChange={(e) => updateSettings('contact.header.title', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Welcome Message">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.contact.welcomeMessage.title}
                  onChange={(e) => updateSettings('contact.welcomeMessage.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <StringArrayEditor
                label="Paragraphs"
                items={settings.contact.welcomeMessage.paragraphs}
                onChange={(items) => updateSettings('contact.welcomeMessage.paragraphs', items)}
              />
            </AccordionSection>

            <AccordionSection title="Form Settings">
              <StringArrayEditor
                label="Subject Options"
                items={settings.contact.formSubjects}
                onChange={(items) => updateSettings('contact.formSubjects', items)}
                placeholder="e.g., General Inquiry"
              />
            </AccordionSection>

            <AccordionSection title="Contact Info">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Email</label>
                <input
                  type="email"
                  value={settings.contact.info.email}
                  onChange={(e) => updateSettings('contact.info.email', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
                <input
                  type="text"
                  value={settings.contact.info.location}
                  onChange={(e) => updateSettings('contact.info.location', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Response Time</label>
                <input
                  type="text"
                  value={settings.contact.info.responseTime}
                  onChange={(e) => updateSettings('contact.info.responseTime', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Coaching Callout">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Title</label>
                <input
                  type="text"
                  value={settings.contact.coachingCallout.title}
                  onChange={(e) => updateSettings('contact.coachingCallout.title', e.target.value)}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Description</label>
                <textarea
                  value={settings.contact.coachingCallout.description}
                  onChange={(e) => updateSettings('contact.coachingCallout.description', e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm resize-none"
                />
              </div>
            </AccordionSection>
          </div>
        )}

        {/* SHOP TAB */}
        {activeTab === 'shop' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Shop & Product Settings</h2>
            <p className="text-sm text-stone-500 mb-6">Shared content for product detail pages</p>

            <AccordionSection title="Materials & Care" defaultOpen>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Content (HTML supported)</label>
                <textarea
                  value={settings.productDetail.materialsAndCare}
                  onChange={(e) => updateSettings('productDetail.materialsAndCare', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm resize-none font-mono text-sm"
                />
              </div>
            </AccordionSection>

            <AccordionSection title="Shipping & Returns">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Content (HTML supported)</label>
                <textarea
                  value={settings.productDetail.shippingAndReturns}
                  onChange={(e) => updateSettings('productDetail.shippingAndReturns', e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm resize-none font-mono text-sm"
                />
              </div>
            </AccordionSection>
          </div>
        )}

        {/* FOOTER TAB */}
        {activeTab === 'footer' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Footer Content</h2>

            <AccordionSection title="Brand Info" defaultOpen>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Tagline</label>
                  <input
                    type="text"
                    value={settings.footer.tagline}
                    onChange={(e) => updateSettings('footer.tagline', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={settings.footer.location}
                    onChange={(e) => updateSettings('footer.location', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Established</label>
                  <input
                    type="text"
                    value={settings.footer.established}
                    onChange={(e) => updateSettings('footer.established', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Copyright</label>
                  <input
                    type="text"
                    value={settings.footer.copyright}
                    onChange={(e) => updateSettings('footer.copyright', e.target.value)}
                    className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm"
                  />
                </div>
              </div>
            </AccordionSection>

            <AccordionSection title="Link Columns">
              <ObjectArrayEditor
                label="Footer Columns"
                items={settings.footer.columns}
                onChange={(columns) => updateSettings('footer.columns', columns)}
                createItem={() => ({ title: '', links: [] })}
                addLabel="Add Column"
                renderItem={(col, colIndex, updateCol) => (
                  <div className="space-y-3 pr-6">
                    <input
                      type="text"
                      value={col.title}
                      onChange={(e) => updateCol({ title: e.target.value })}
                      placeholder="Column title"
                      className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                    />
                    <LinkArrayEditor
                      label="Links"
                      items={col.links}
                      onChange={(links) => updateCol({ links })}
                    />
                  </div>
                )}
              />
            </AccordionSection>

            <AccordionSection title="Social Links">
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
                      <select
                        value={item.platform}
                        onChange={(e) => updateItem({ platform: e.target.value })}
                        className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                      >
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
                      <input
                        type="url"
                        value={item.url}
                        onChange={(e) => updateItem({ url: e.target.value })}
                        placeholder="https://..."
                        className="w-full px-3 py-2 border border-stone-200 rounded-md text-sm text-sm"
                      />
                    </div>
                  </div>
                )}
              />
            </AccordionSection>
          </div>
        )}

        {/* SECTIONS/VISIBILITY TAB */}
        {activeTab === 'sections' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">Section Visibility</h2>
            <p className="text-sm text-stone-500 mb-4">Toggle which sections appear on the homepage</p>
            <div className="space-y-4">
              {[
                { key: 'showFeaturedProducts', label: 'Featured Products', desc: 'Show product highlights on homepage' },
                { key: 'showTestimonials', label: 'Testimonials', desc: 'Display customer testimonials' },
                { key: 'showBlogPreview', label: 'Blog Preview', desc: 'Show recent blog posts' },
                { key: 'showNewsletter', label: 'Newsletter Signup', desc: 'Show email signup section' },
              ].map((item) => (
                <label
                  key={item.key}
                  className="flex items-center justify-between p-4 bg-stone-50 rounded-lg cursor-pointer hover:bg-stone-100 transition"
                >
                  <div>
                    <p className="font-medium text-stone-800">{item.label}</p>
                    <p className="text-sm text-stone-500">{item.desc}</p>
                  </div>
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={settings.sections[item.key as keyof typeof settings.sections]}
                      onChange={(e) => updateSettings(`sections.${item.key}`, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-stone-300 peer-checked:bg-stone-900 rounded-full transition" />
                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full transition peer-checked:translate-x-5" />
                  </div>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* SEO TAB */}
        {activeTab === 'seo' && (
          <div className="space-y-6">
            <h2 className="text-lg font-medium text-stone-800 mb-4">SEO Settings</h2>
            <p className="text-sm text-stone-500 mb-6">
              Configure search engine optimization for each page. These settings affect how your pages appear in Google and social media.
            </p>

            {[
              { key: 'home', label: 'Home Page', url: 'yoursite.com' },
              { key: 'about', label: 'About Page', url: 'yoursite.com/about' },
              { key: 'coaching', label: 'Coaching Page', url: 'yoursite.com/coaching' },
              { key: 'learn', label: 'Learn Page', url: 'yoursite.com/learn' },
              { key: 'shop', label: 'Shop Page', url: 'yoursite.com/shop' },
              { key: 'blog', label: 'Blog Page', url: 'yoursite.com/journal' },
              { key: 'contact', label: 'Contact Page', url: 'yoursite.com/contact' },
              { key: 'faq', label: 'FAQ Page', url: 'yoursite.com/faq' },
            ].map((page) => (
              <AccordionSection key={page.key} title={page.label} description={page.url}>
                <SeoFields
                  title={settings.seo?.[page.key as keyof typeof settings.seo]?.title || ''}
                  description={settings.seo?.[page.key as keyof typeof settings.seo]?.description || ''}
                  image={settings.seo?.[page.key as keyof typeof settings.seo]?.image || ''}
                  onTitleChange={(value) => updateSettings(`seo.${page.key}.title`, value)}
                  onDescriptionChange={(value) => updateSettings(`seo.${page.key}.description`, value)}
                  onImageChange={(value) => updateSettings(`seo.${page.key}.image`, value)}
                  baseUrl={page.url}
                />
              </AccordionSection>
            ))}
          </div>
        )}
          </div>
        </div>

        {/* Preview Panel */}
        {showPreview && (
          <div className="w-[480px] flex-shrink-0 sticky top-4 h-[calc(100vh-200px)]">
            <PreviewFrame
              url={previewUrl}
              onClose={() => setShowPreview(false)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
