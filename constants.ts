
import { Product, ProductCategory, CoachingPackage, Testimonial, BlogPost, FAQItem, LearnItem } from './types';

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Terra Earrings',
    price: 185,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    shortDescription: 'Soft clay tones meet organic form. A study in quiet presence.',
    longDescription: 'Handmade clay earrings that ground you. Born from the earth, these earrings feature soft clay tones meeting organic forms. A study in quiet presence for the modern artist.',
    image: 'https://picsum.photos/id/106/800/1000',
    detailImages: ['https://picsum.photos/id/107/800/800', 'https://picsum.photos/id/108/800/800'],
    badge: 'LIMITED EDITION',
    rating: 4.7,
    reviewCount: 47,
    availability: 'Only 2 left in stock'
  },
  {
    id: 'p2',
    name: 'Elemental Brooch',
    price: 210,
    currency: 'AUD',
    category: ProductCategory.Brooches,
    shortDescription: 'A wearable sculpture. Earthy, bold, intentional.',
    longDescription: 'A handmade statement brooch that acts as a wearable sculpture. Earthy, bold, and intentional. Structured to sit with weight and presence on heavy coats or linens.',
    image: 'https://picsum.photos/id/112/800/1000',
    detailImages: ['https://picsum.photos/id/113/800/800', 'https://picsum.photos/id/114/800/800'],
    badge: 'BESTSELLER',
    rating: 5,
    reviewCount: 32,
    availability: 'In stock - Ships in 1-3 days'
  },
  {
    id: 'p3',
    name: 'Horizon Earrings',
    price: 195,
    currency: 'AUD',
    category: ProductCategory.Earrings,
    shortDescription: 'Where sky meets earth. Light, elegant, distinctive.',
    longDescription: 'Handmade artistic earrings capturing the moment where sky meets earth. Light, elegant, and distinctive. 14k gold wire meets hand-shaped porcelain.',
    image: 'https://picsum.photos/id/120/800/1000',
    detailImages: ['https://picsum.photos/id/121/800/800'],
    badge: 'ONE OF A KIND',
    rating: 5,
    reviewCount: 28,
    availability: 'In stock - Ships in 1-3 days'
  }
];

export const COACHING_PACKAGES: CoachingPackage[] = [
  {
    id: 'c1',
    title: 'Single Session',
    price: '$250',
    description: 'One 90-minute session',
    features: [
      '90-minute deep-dive session',
      'Strategic clarity on one key challenge',
      'Actionable next steps',
      'Follow-up email support (1 week)'
    ],
    ctaText: 'BOOK SINGLE SESSION',
    image: 'https://picsum.photos/id/180/800/600'
  },
  {
    id: 'c2',
    title: 'Monthly Coaching',
    price: '$800',
    description: 'per month (3-month minimum)',
    badge: 'MOST POPULAR',
    features: [
      'Two 60-minute sessions per month',
      'Ongoing email support',
      'Custom resources & frameworks',
      'Accountability check-ins',
      'Priority scheduling'
    ],
    ctaText: 'START MONTHLY COACHING',
    image: 'https://picsum.photos/id/20/800/600'
  },
  {
    id: 'c3',
    title: 'Creative Intensive',
    price: '$2,200',
    description: '8-week program',
    features: [
      'Six 90-minute sessions',
      'Comprehensive strategic planning',
      'Daily Voxer/email access',
      'Custom workbooks & templates',
      'Complete creative business foundation'
    ],
    ctaText: 'APPLY FOR INTENSIVE',
    image: 'https://picsum.photos/id/26/800/600'
  }
];

export const LEARN_ITEMS: LearnItem[] = [
  {
    id: 'l1',
    title: 'The Oxygen Series: Creative Momentum 2025',
    type: 'ONLINE',
    price: 'from $105.00',
    image: 'https://picsum.photos/id/180/800/600',
    description: 'A digital course designed to lift your vision and expand your creative life.'
  },
  {
    id: 'l2',
    title: 'Concept to Create: Wearable Art Online Workshop',
    type: 'WORKSHOP',
    price: 'from $135.00',
    image: 'https://picsum.photos/id/20/800/600',
    description: 'Learn the techniques and mindset behind creating distinct wearable artifacts.'
  }
];

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    text: "Lyne's coaching gave me the clarity and confidence I needed to finally launch my creative business. Her approach is intelligent, intuitive, and deeply transformative.",
    author: "Sarah Chen",
    role: "Ceramic Artist & Designer, Brisbane",
    type: "coaching",
    rating: 5
  },
  {
    id: 't2',
    text: "Wearing Lyne's work feels like wearing a secret. It grounds me before every presentation.",
    author: "Sarah J.",
    role: "Architect",
    type: "shop",
    rating: 5
  }
];

export const BLOG_POSTS: BlogPost[] = [
  {
    id: 'b1',
    title: 'Stop Hiding the Good Stuff: Why Visibility Is the Missing Piece',
    excerpt: 'You’re not showing off. You’re showing up. Visibility is part of your practice. It’s not the enemy of authenticity. It’s how authenticity becomes findable.',
    content: `Written By Lyne Tilt

There’s a strange paradox I see in so many creatives and business owners—especially the thoughtful ones, the values-led ones, the ones who are really good at what they do.

They’re sitting on incredible work. Original ideas. Beautiful products. Game-changing offers. But hardly anyone knows about them.

Why?

Because somewhere along the line, they learned that being “seen” is risky. Maybe they were told not to take up too much space. Maybe they got burned when they shared something vulnerable. Or maybe they’re waiting until it’s perfect—until they feel perfect—before stepping forward.

And so they hold back.
Not because they’re unsure about the work.
But because they’re unsure about being visible with it.

Visibility Isn’t Vanity—It’s Strategy

Visibility gets a bad rap. It’s often confused with ego, oversharing, or the hustle for attention. But real visibility—the kind that builds connection, community, and impact—is none of those things.

It’s not a performance. It’s a service.

If you’re creating something meaningful and no one knows about it, the problem isn’t your talent. It’s your strategy. People can’t connect with work they can’t see. They can’t buy from someone they don’t know exists. They can’t join your course or wear your piece or hire you if they don’t know what you offer.

That doesn’t mean you need to be loud. It means you need to be clear, consistent, and confident about putting your work where people can find it.

The Shame Loop (and How to Interrupt It)

Researcher Brené Brown reminds us that shame thrives in silence. When we keep our best work hidden, it’s often shame that’s running the show. The inner dialogue sounds like:

“I don’t want to seem salesy.”
“I’m not ready yet.”
“Other people are doing it better.”
“What if they don’t like it?”

This is completely normal—and completely interruptible.

Start small. Name the discomfort. Show up anyway. Show your process, not just your product. Share why your work matters to you, and trust that it will matter to others.

Your Brain Wants to Protect You

According to neuroscientist Dr Tara Swart, our brains are wired to resist risk. Visibility—especially if you’ve experienced judgment or criticism in the past—registers as a threat. Your nervous system will do everything it can to keep you in the safe zone: quiet, hidden, and out of range.

But staying there also keeps you stuck.

Your job isn’t to silence the discomfort. It’s to build capacity for it. To learn how to feel the visibility fear and keep showing up. To create a system that makes sharing part of your practice, not a heroic one-off effort.

What Hiding Costs You

Every time you downplay your work, wait too long to post, or avoid pitching your offer because it’s “not ready,” you create more distance between what you create and the people who need it.

And here’s the truth: your people want to see the good stuff.
They want to connect with your perspective, your process, your voice.
They want to believe in something—and you’re not giving them the chance if you stay invisible.

It’s Time to Stop Hiding

You’re not showing off. You’re showing up.

Whether you’re a maker, an artist, a coach, a teacher, or a builder—visibility is part of your practice. It’s not the enemy of authenticity. It’s how authenticity becomes findable.

🔗 Ready to show up more fully?

Join my newsletter for honest mindset tools, visibility prompts, and behind-the-scenes insight into creative life and business.
And if you’re ready to step out of hiding, explore the jewellery in the shop—a collection designed to help you show up boldly, intentionally, and completely as yourself.

Because clarity is power. And your good stuff deserves to be seen.`,
    date: '7/3/25',
    category: 'Mindset',
    image: 'https://picsum.photos/id/42/800/600'
  },
  {
    id: 'b2',
    title: 'Permission to Want More: Reframing Ambition in Creative Lives',
    excerpt: 'Ambition doesn’t have to be extractive or performative. It can be elegant, clear, and deeply rooted in service. It can be about scaling impact, not just income.',
    content: `Written By Lyne Tilt

There’s a quiet tension many creatives and values-led people carry—especially those who’ve built their lives around generosity, care, and meaning.

You’ve done the work. You’ve shown up for others. You’ve made art, taught, given, listened. You’ve built a business or a practice rooted in purpose. But deep down, there’s a new thought forming.

What if I want more?

More income. More visibility. More ease. More creative freedom.
And just as that thought rises, something else kicks in—guilt, self-doubt, even shame.

Who am I to want more?
Does that make me ungrateful?
Is this too much?

Let’s reframe that.

Wanting More Doesn’t Make You Greedy—It Makes You Honest

For so long, particularly in artistic and caregiving spaces, ambition has been side-eyed. We’re taught to value modesty, restraint, and "just enough." Especially for those of us raised in environments where survival was prioritised over expression, the idea of wanting more can feel like a betrayal.

But the truth is: wanting more is a sign of growth. Not dissatisfaction, but expansion.

More doesn’t mean you’re rejecting where you’ve been. It means you’re honouring where you’re going.

Ambition Can Be Conscious and Creative

We need to reclaim the word ambition. Not as hard-edged hustle, but as purposeful direction.

Dr. Tara Swart, neuroscientist and author of The Source, explains that our brains are driven by goals—when those goals are aligned with our values and identity, we enter a flow state that enhances motivation, clarity, and fulfilment.

But when we suppress those goals to “stay small” or “not be too much,” we break that connection. We start to stagnate. We dull our own signal.

Ambition doesn’t have to be extractive or performative. It can be elegant, clear, and deeply rooted in service. It can be about scaling impact, not just income. It can be about expression, not just exposure.

Brene Brown and the Shame of Wanting

Brené Brown reminds us that shame shows up any time we fear disconnection. Wanting more can feel dangerous—like we’re asking too much, pushing too hard, risking rejection.

But here’s the truth she offers: you are worthy now. Not when you reach a goal. Not when you’ve earned it through burnout or perfection. Now.

From that place of worthiness, it becomes safe to want.
To want joy. To want money. To want rest. To want more reach for your work.

Not because it proves anything—but because you’re finally ready to stop hiding.

How to Honour the Want

If this resonates, you don’t need to overhaul your life today. But you can begin to ask bigger questions:

What would “more” look like—on my terms?

What am I afraid ambition will cost me?

What would I gain if I let it lead me?

Write those down. Sit with them. Let them stir something.

You don’t need to wait for permission.
You get to lead your creative life with as much depth, scale, and fire as you choose.

💌 Want more clarity and courage in your inbox?

Sign up for my newsletter where I share honest mindset tools, creative strategy, and real conversations about building a life and business that reflects your whole self.

And if you're ready to express more, earn more, and expand—on your own terms—browse the jewellery collection and claim a piece that speaks to who you're becoming.

Because art is oxygen. And ambition is not a flaw—it’s fuel.`,
    date: '6/2/25',
    category: 'Growth',
    image: 'https://picsum.photos/id/56/800/600'
  },
  {
    id: 'b3',
    title: 'Why Beautiful Things Matter (Even When Life Feels Messy)',
    excerpt: 'When you surround yourself with things that speak to your identity, you create a feedback loop. You remind your nervous system who you are and what you’re building.',
    content: `Written By Lyne Tilt

And how they can help you reconnect to who you are becoming

Let’s be honest: beauty sometimes gets dismissed.

It’s written off as indulgent, impractical, or optional—especially when life feels chaotic or uncertain. When you're stretched running a household, building a business, caregiving, or simply surviving another week, it can feel selfish to focus on aesthetics.

But here’s what I’ve learned after decades as an artist, educator, and someone who’s navigated both personal loss and professional growth:

Beautiful things aren’t frivolous. They’re functional. They’re fortifying. They’re how we remember ourselves.

Beauty as an Anchor

In my own life, beauty has never been about perfection or excess. It’s been about anchoring. A handmade ring I never take off. A corner of my studio arranged just right. A painting I made in the middle of grief that still catches my breath.

These moments of visual and tactile beauty are small declarations. They say:
I’m still here. I still care. I still get to choose what surrounds me.

And that’s not superficial—it’s spiritual. Sensory. Grounded. Vital.

Your Space Shapes Your Energy

Neuroscience backs this up. Dr Tara Swart explains that our physical environment has a measurable impact on cognitive function, emotional state, and clarity of thought. What you see, wear, and touch every day can either drain your energy—or return it.

That’s why curating your space (and your self-expression) isn’t vanity. It’s strategy.

When you surround yourself with things that speak to your identity, your aspirations, and your strength, you create a feedback loop. You remind your nervous system who you are and what you’re building—even on the days when your mindset lags behind.

Why I Create the Way I Do

The jewellery and artwork I create are designed with this purpose in mind. They’re made to be worn with meaning, not just matched to outfits. They’re small but powerful signals—of creativity, courage, elegance, softness, structure, boldness… whatever part of you wants to be seen today.

Some clients wear their pieces like talismans. Others use them to mark a transition. Some just say, “I don’t know what it is about this one—I just felt it.”
That’s the oxygen moment. When something beautiful breathes life back into you.

Your Invitation

If life feels messy, don’t wait for it to be tidy to surround yourself with things that make you feel strong, expressed, or grounded. That’s not indulgent—it’s intelligent.

Buy the art. Wear the piece. Make the corner of your world just a little more beautiful.

It doesn’t need to fix everything. It just needs to remind you of who you are becoming.

💌 Want more of this in your inbox?

Sign up for my newsletter for grounded insights, honest mindset tools, and a behind-the-scenes look at life and business as a creative professional.
And if something in you is asking to be honoured, visit the shop and choose a piece of jewellery that captures your energy, your edge, or your quiet power. Let it be your anchor.

Because beauty isn’t a distraction from the work. Sometimes, it is the work.`,
    date: '10/1/25',
    category: 'Aesthetics',
    image: 'https://picsum.photos/id/60/800/600'
  },
  {
    id: 'b4',
    title: 'When the Past Shows Up at the Easel (or the Launch Pad)',
    excerpt: 'Whether you\'re picking up a paintbrush or preparing to launch, you\'re not just managing the task in front of you—you’re managing every story you\'ve ever been told.',
    content: `Written By Lyne Tilt

Why the mindset work matters when you’re building something new

There’s a moment many artists and business builders know well. You sit down to begin—whether it’s a canvas, a collection, a class, or a new offer—and suddenly you’re flooded. Not with inspiration, but with uncertainty.

Who do I think I am?
Am I good enough?
What if they don’t like it? What if they’re right?

You’re not alone. That voice? It’s normal. But it’s not the truth.

Whether you're picking up a paintbrush after years of silence or preparing to launch a new product or service, you're not just managing the task in front of you—you’re managing every story you've ever been told (or told yourself) about who you’re allowed to be.

This is where mindset work becomes more than just a nice-to-have. It becomes the foundation.

The Oxygen of Art — And the Resistance to Breathing Deeply

When I say art is oxygen, I don’t just mean the act of making. I mean the space it creates. The clarity it offers. The strength that emerges when we finally stop performing and start expressing.

But for many of us, the moment we move toward that kind of clarity—through art, through business, through visibility—our nervous system registers risk. And with good reason. Many of us were raised in systems or environments where being visible, confident, or self-expressed wasn’t encouraged. It was labelled as “too much.”

So when we dare to take ourselves seriously now, the body sometimes fights back with doubt. It’s not sabotage—it’s survival logic. And that’s where self-awareness becomes strategy.

What Brene Brown and Neuroscience Can Teach Us

Research professor Brené Brown writes extensively on shame and vulnerability. She reminds us that “vulnerability is the birthplace of innovation, creativity and change.” But she also teaches that shame—the voice of “not good enough”—grows in silence.

Naming it out loud, sharing the feeling, and making a conscious decision to act anyway is the first step toward freedom.

Dr Tara Swart, neuroscientist and executive advisor, explains this in neurological terms: the brain’s resistance to change is biological. It prefers the predictable, even if the predictable is painful. The unfamiliar—like stepping into a new identity, or charging more, or showing your work—feels threatening until it becomes integrated.

This is why mindset work isn’t fluff. It’s neurobiological. It’s the difference between a system that shuts down in fear and one that can tolerate—and even seek—growth.

Clarity Is the Turning Point

The best thing I ever did for my own creative and professional growth was stop trying to earn my place, and start creating from clarity. That meant:

Getting specific about what I wanted

Building systems to support it

And rewriting the narrative that said I had to stay small to stay safe

When I work with clients—whether they’re artists, educators, or entrepreneurs—we’re often doing exactly this. Peeling back the performance. Dropping the shame. Making a new plan.

Because when you know who you are, what you offer, and how you want to lead, you stop second-guessing and start building with integrity.

Final Thoughts

Yes, the mindset stuff comes up. Yes, it’s messy. But the voice that asks “Am I good enough?” isn’t there to stop you—it’s asking you to listen more closely. It’s asking you to choose clarity over fear.

And clarity? That’s what gives your work power.

Whether you’re creating something beautiful or building something bold—
Art is oxygen. Clarity is power. And you are absolutely allowed to breathe.`,
    date: '7/12/24',
    category: 'Process',
    image: 'https://picsum.photos/id/24/800/600'
  }
];

export const FAQS: FAQItem[] = [
  {
    question: "How long does shipping take?",
    answer: "Ready-to-ship items are dispatched within 1-3 business days. Custom pieces take 2-3 weeks.",
    category: "Shop"
  },
  {
    question: "Do you offer international shipping?",
    answer: "Yes, we ship worldwide from our studio in Brisbane, Australia.",
    category: "Shop"
  },
  {
    question: "What happens in a Clarity Call?",
    answer: "We spend 90 minutes deconstructing your current creative block. It's part therapy, part strategy.",
    category: "Coaching"
  },
  {
    question: "Can I refund a coaching session?",
    answer: "Sessions can be rescheduled up to 24 hours in advance. Refunds are not available once the session is booked, but credits can be applied.",
    category: "Coaching"
  }
];
