import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { initDatabase, db, DatabaseSchema } from '../config/database.js';

// Import data from frontend constants
// Using dynamic import to handle the TypeScript file
const constantsPath = new URL('../../../constants.ts', import.meta.url).pathname;
const { PRODUCTS, COACHING_PACKAGES, LEARN_ITEMS, BLOG_POSTS, TESTIMONIALS, FAQS } = await import(constantsPath);

async function seed() {
  console.log('Starting database seed...');

  await initDatabase();

  const now = new Date().toISOString();

  // Create admin user
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@lynetilt.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const adminUser = {
    id: uuidv4(),
    email: adminEmail,
    passwordHash,
    name: 'Admin',
    role: 'superadmin' as const,
    createdAt: now,
  };

  // Transform products
  const products = PRODUCTS.map((p: any) => ({
    id: p.id,
    name: p.name,
    price: p.price,
    currency: p.currency || 'AUD',
    category: p.category,
    shortDescription: p.shortDescription || '',
    longDescription: p.longDescription || '',
    image: p.image,
    detailImages: p.detailImages || [],
    badge: p.badge,
    rating: p.rating,
    reviewCount: p.reviewCount,
    availability: p.availability,
    archived: p.archived || false,
    createdAt: now,
    updatedAt: now,
  }));

  // Transform coaching packages
  const coachingPackages = COACHING_PACKAGES.map((c: any, index: number) => ({
    id: c.id,
    title: c.title,
    description: c.description || '',
    features: c.features || [],
    ctaText: c.ctaText || 'Book Now',
    image: c.image,
    price: c.price,
    badge: c.badge,
    displayOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  // Transform learn items
  const learnItems = LEARN_ITEMS.map((l: any, index: number) => ({
    id: l.id,
    title: l.title,
    type: l.type,
    price: l.price,
    image: l.image,
    description: l.description || '',
    displayOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  // Transform blog posts
  const blogPosts = BLOG_POSTS.map((b: any) => ({
    id: b.id,
    title: b.title,
    excerpt: b.excerpt || '',
    content: b.content,
    date: b.date,
    category: b.category || '',
    image: b.image,
    published: true,
    createdAt: now,
    updatedAt: now,
  }));

  // Transform testimonials
  const testimonials = TESTIMONIALS.map((t: any, index: number) => ({
    id: t.id,
    text: t.text,
    author: t.author,
    role: t.role || '',
    type: t.type,
    rating: t.rating || 5,
    displayOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  // Transform FAQs
  const faqs = FAQS.map((f: any, index: number) => ({
    id: uuidv4(),
    question: f.question,
    answer: f.answer,
    category: f.category,
    displayOrder: index,
    createdAt: now,
    updatedAt: now,
  }));

  // Default site settings from hardcoded content
  const siteSettings = {
    hero: {
      headline: "Art is Oxygen.",
      tagline: "Clarity is Power.",
      subtitle: "Wearable art & strategic coaching for creatives ready to make meaningful work.",
      metaTags: "Handmade Jewellery · 1:1 Coaching · Learn & Create",
      primaryCta: { text: "Shop Art", link: "/shop" },
      secondaryCta: { text: "Explore Coaching", link: "/coaching" },
      image: "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/25307466-b400-4d67-bb64-8763bd9cc285/5.png?format=2500w"
    },
    splitPath: {
      title: "Three Ways to Work Together",
      cards: [
        {
          label: "Handmade in Australia",
          title: "Wearable & Wall Art",
          description: "Unique small batch art - made with intention.",
          linkText: "Shop Collection",
          linkUrl: "/shop"
        },
        {
          label: "1:1 Sessions",
          title: "Coaching & Mentoring",
          description: "Clarity, direction, and accountability for creatives building something meaningful. Move from stuck to momentum.",
          linkText: "Explore Coaching",
          linkUrl: "/coaching"
        },
        {
          label: "Online & In-Person",
          title: "Learn & Create",
          description: "Hands-on learning for makers who want to develop their craft and creative practice.",
          linkText: "Browse Workshops",
          linkUrl: "/learn"
        }
      ]
    },
    home: {
      aboutSection: {
        image: "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w",
        title: "Two decades of making & guiding",
        paragraphs: [
          "Every piece I create is designed to be a quiet companion - something that holds meaning for the wearer. My coaching brings that same intentionality to your creative practice.",
          "Whether you're drawn to wearable art or looking for strategic guidance, you'll find work made with care, honesty, and two decades of experience in both making and mentoring."
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
      header: {
        title: "Meet Lyne",
        subtitle: "Artist. Maker. Coach. Helping creatives find clarity and build with purpose.",
        location: "Brisbane, Australia"
      },
      heroImage: "https://images.squarespace-cdn.com/content/v1/6182043dd1096334c6d280c8/a2b24cba-294f-4e4f-b4a6-ebaa1b285607/IMG_4502+copy.jpg?format=300w",
      philosophy: {
        quote: "Art is oxygen. Clarity is power.",
        paragraphs: [
          "I believe art isn't just something we make - it's how we breathe. Whether we create it, wear it, or let it shape how we think, art gives form to the parts of ourselves we're ready to reclaim.",
          "I'm here for those ready to shed what's no longer working - the second-guessing, the safe choices - and take themselves seriously. Not in a heavy way. In a clear, conscious, unapologetic way."
        ]
      },
      howIShowUp: {
        cards: [
          { title: "As a Maker", description: "Wearable art that anchors you into something bold and personal.", linkText: "Shop Collection", linkUrl: "/shop" },
          { title: "As an Educator", description: "Workshops that engage your mindset, capacity, and creative identity.", linkText: "View Workshops", linkUrl: "/learn" },
          { title: "As a Coach", description: "Strategic guidance to move through what's holding you back.", linkText: "Learn More", linkUrl: "/coaching" }
        ]
      },
      journey: {
        title: "The Journey",
        description: "Two decades of education, art, and coaching - all pointing to the same question: What would it take to truly belong to yourself?",
        stats: [
          { value: "20+", label: "Years in Education" },
          { value: "100+", label: "Creatives Coached" },
          { value: "2500+", label: "Students Led" },
          { value: "5+", label: "Disciplines" }
        ],
        credentials: ["Fine Art", "Education (Hons)", "ICF-Eligible Coach", "Nutrition Coach", "Creative Strategy", "Founder, Studio on Brunswick"]
      },
      whoThisIsFor: {
        title: "Who This Is For",
        subtitle: "You don't have to be an artist. You just have to be ready to stop circling and start building.",
        items: [
          "Creatives returning to their practice after a break",
          "Business owners building something that reflects their values",
          "Leaders ready to stop playing small"
        ]
      },
      cta: {
        title: "Let's Start a Conversation",
        description: "Book a free 15-minute call to explore what's possible.",
        buttonText: "Get in Touch",
        buttonUrl: "/contact"
      }
    },
    coaching: {
      hero: {
        title: "Clear the Path. Create Your Work.",
        subtitle: "Coaching & Mentoring",
        description: "Creative coaching for artists, makers, and business owners who are ready to move from confusion to confident action."
      },
      isThisForYou: {
        title: "Is This For You?",
        subtitle: "This coaching is designed for creatives who are ready to do the work. If any of these resonate, we might be a great fit.",
        items: [
          "You have ideas but struggle to follow through",
          "You're tired of second-guessing yourself",
          "You want a sustainable creative practice",
          "You're ready to stop waiting and start making",
          "You feel stuck between who you are and who you're becoming",
          "You want accountability and honest feedback"
        ]
      },
      whatYoullExperience: {
        title: "What You'll Experience",
        subtitle: "Most creative blocks aren't about lack of talent - they're about lack of clarity. Here's what shifts when we work together.",
        cards: [
          { title: "Clarity on Your Direction", description: "Stop spinning in circles. Know exactly what to focus on and why it matters to you." },
          { title: "Sustainable Creative Habits", description: "Build routines that actually work with your life, not against it." },
          { title: "Confident Action", description: "Move from planning to doing. Launch that project, share that work, make that leap." },
          { title: "A Trusted Sounding Board", description: "Someone in your corner who gets it - honest feedback without judgment." },
          { title: "Permission to Be You", description: "Stop waiting for external validation. Trust your instincts and creative vision." },
          { title: "Real Results", description: "Finished projects, new opportunities, and a creative practice you're proud of." }
        ]
      },
      howItWorks: {
        title: "How It Works",
        subtitle: "Getting started is simple. Here's what to expect.",
        steps: [
          { step: "01", title: "Free Discovery Call", description: "A 15-minute conversation to understand your goals and see if we're a good fit." },
          { step: "02", title: "Choose Your Path", description: "Select the coaching package that aligns with where you are and where you want to go." },
          { step: "03", title: "Start Creating", description: "Begin your coaching journey with clarity, accountability, and ongoing support." }
        ]
      }
    },
    learn: {
      hero: {
        title: "Unlock Your Creative Potential",
        subtitle: "Learn & Create",
        description: "Courses and workshops designed to reignite your creative fire, build sustainable momentum, and help you finally create the work you've been dreaming about."
      },
      instructorBio: {
        name: "Lyne Tilt",
        paragraphs: [
          "With over two decades at the intersection of art, psychology, and strategy, I've helped hundreds of creatives move from confusion to confident action.",
          "My teaching style blends practical technique with deep mindset work - because I believe creative blocks aren't about lack of talent. They're about lack of clarity. My courses are designed to give you both."
        ],
        stats: [
          { value: "2500+", label: "Students Taught" },
          { value: "20+", label: "Years Experience" },
          { value: "Brisbane", label: "Australia" }
        ]
      },
      newsletterSignup: {
        title: "Not Ready to Enrol?",
        description: "Join Oxygen Notes - my free weekly newsletter with insights on creativity, visibility, and staying true to your work. No spam, unsubscribe anytime."
      }
    },
    contact: {
      header: {
        title: "Start a Conversation",
        subtitle: "Get In Touch"
      },
      welcomeMessage: {
        title: "Hey there, it's great to see you.",
        paragraphs: [
          "If you've landed here, you're probably ready for something to shift - maybe a new creative direction, more clarity in your work, or just a conversation about what's possible.",
          "Use this space to tell me a little about why you're here. It might be to book your free 15-minute strategy session, ask about a workshop, or invite me to speak at your event or with your team. Or maybe it's something completely different.",
          "Whatever it is, I can't wait to hear from you and see where it leads."
        ]
      },
      formSubjects: ["General Inquiry", "Coaching Application", "Wholesale / Stockist", "Speaking Request", "Order Support"],
      info: {
        email: "lynettetiltart@outlook.com",
        location: "Brisbane, Australia",
        responseTime: "3-5 business days"
      },
      coachingCallout: {
        title: "Coaching Applications",
        description: "Ready to book a discovery call? Select \"Coaching Application\" in the subject line."
      }
    },
    productDetail: {
      materialsAndCare: "<p>Each piece is handmade from polymer clay with surgical steel or sterling silver hooks.</p><ul><li>Store in original packaging when not wearing</li><li>Avoid contact with water, perfume and harsh chemicals</li><li>Handle with care - polymer clay is durable but can chip if dropped</li></ul>",
      shippingAndReturns: "<p><strong>Shipping:</strong> All orders are sent via tracked Australia Post within 5-10 business days.</p><p><strong>Returns:</strong> 30-day returns on unworn items in original packaging. See FAQ for full policy.</p>"
    },
    footer: {
      tagline: "LYNE TILT",
      location: "Australia-based.",
      established: "Est. 2023",
      copyright: "© 2025 Lyne Tilt Studio. All rights reserved.",
      columns: [
        {
          title: "Collection",
          links: [
            { label: "All Items", url: "/shop" },
            { label: "Earrings", url: "/shop" },
            { label: "Brooches", url: "/shop" },
            { label: "Limited Edition", url: "/shop" }
          ]
        },
        {
          title: "Practice",
          links: [
            { label: "Clarity Coaching", url: "/coaching" },
            { label: "Workshops & Courses", url: "/learn" },
            { label: "The Blog", url: "/journal" },
            { label: "Book Free Call", url: "/contact" }
          ]
        },
        {
          title: "Studio",
          links: [
            { label: "About Lyne", url: "/about" },
            { label: "Contact", url: "/contact" },
            { label: "FAQ", url: "/faq" },
            { label: "Shipping & Returns", url: "/shop" }
          ]
        }
      ],
      socialLinks: [
        { platform: "instagram", url: "#" },
        { platform: "linkedin", url: "#" }
      ]
    },
    sections: {
      showTestimonials: true,
      showNewsletter: true,
      showFeaturedProducts: true,
      showBlogPreview: true
    }
  };

  // Update database with all required schema fields
  db.data = {
    users: [adminUser],
    refreshTokens: [],
    customerUsers: [],
    customerRefreshTokens: [],
    shippingAddresses: [],
    wishlistItems: [],
    orders: [],
    products,
    coachingPackages,
    learnItems,
    blogPosts,
    testimonials,
    faqs,
    subscribers: [],
    emailDrafts: [],
    sentEmails: [],
    subscriberTags: ['VIP', 'Workshop Attendee', 'Coaching Client'],
    contactSubmissions: [],
    activityLog: [],
    emailAutomations: [],
    automationQueue: [],
    siteSettings,
  } as DatabaseSchema;

  await db.write();

  console.log('Database seeded successfully!');
  console.log(`- Admin user: ${adminEmail}`);
  console.log(`- Products: ${products.length}`);
  console.log(`- Coaching packages: ${coachingPackages.length}`);
  console.log(`- Learn items: ${learnItems.length}`);
  console.log(`- Blog posts: ${blogPosts.length}`);
  console.log(`- Testimonials: ${testimonials.length}`);
  console.log(`- FAQs: ${faqs.length}`);
  console.log(`- Site settings: initialized`);
}

seed().catch(console.error);
