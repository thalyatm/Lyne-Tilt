# Lyne Tilt Studio

A modern e-commerce and coaching platform for wearable art, wall art, and creative mentoring services.

## Tech Stack

- **Frontend:** React 18 + TypeScript
- **Styling:** Tailwind CSS
- **Routing:** React Router DOM
- **State Management:** React Context API
- **Icons:** Lucide React
- **Build Tool:** Vite

## Project Structure

```
/
├── components/          # Reusable UI components
│   ├── AuthModal.tsx           # Login/Register modal
│   ├── CoachingApplicationModal.tsx  # Coaching application form
│   ├── CoachingCard.tsx        # Coaching package display card
│   ├── FilterDropdown.tsx      # Product filter dropdown
│   ├── GlobalBackground.tsx    # Decorative background elements
│   ├── Hero.tsx                # Homepage hero section
│   ├── Layout.tsx              # Main layout with nav/footer
│   ├── LeadMagnet.tsx          # Newsletter signup component
│   ├── ProductCard.tsx         # Product display card
│   ├── SectionHeading.tsx      # Reusable section header
│   └── SplitPath.tsx           # Homepage split navigation
│
├── pages/               # Route pages
│   ├── Home.tsx               # Landing page
│   ├── Shop.tsx               # Wearable art collection
│   ├── WallArt.tsx            # Wall art collection
│   ├── ProductDetail.tsx      # Individual product page
│   ├── Checkout.tsx           # Shopping cart & checkout
│   ├── Coaching.tsx           # Coaching & mentoring page
│   ├── Learn.tsx              # Courses & workshops
│   ├── About.tsx              # About Lyne page
│   ├── Blog.tsx               # Blog listing
│   ├── BlogPostDetail.tsx     # Individual blog post
│   ├── FAQ.tsx                # Policies & FAQs
│   ├── Contact.tsx            # Contact form
│   ├── Account.tsx            # Customer account
│   └── VerifyEmail.tsx        # Email verification
│
├── admin/               # Admin dashboard
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── ProductsManager.tsx
│   │   ├── CoachingManager.tsx
│   │   ├── LearnManager.tsx
│   │   ├── BlogManager.tsx
│   │   ├── TestimonialsManager.tsx
│   │   ├── FAQsManager.tsx
│   │   ├── SiteSettingsManager.tsx
│   │   └── NewsletterManager.tsx
│   └── components/
│
├── context/             # React Context providers
│   ├── CartContext.tsx        # Shopping cart state
│   ├── CustomerAuthContext.tsx # Customer authentication
│   └── SettingsContext.tsx    # Site settings
│
├── constants.ts         # Product data, testimonials, FAQs
├── types.ts             # TypeScript interfaces & enums
└── App.tsx              # Main app with routing
```

## Features

### Public Site
- **Shop:** Wearable art collection (earrings, brooches, necklaces)
- **Wall Art:** Original artworks and limited edition prints
- **Coaching & Mentoring:** Package offerings with application modal
- **Learn & Create:** Online courses and live workshops
- **Blog:** Articles on creative living and mindset
- **Policies & FAQs:** Shipping, returns, product care info

### Admin Dashboard
- Product management
- Coaching package management
- Course/workshop management
- Blog post management
- Testimonial management
- FAQ management
- Site settings (footer, contact info)
- Newsletter subscriber management

## Run Locally

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm install
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Open http://localhost:5173

## Build for Production

```bash
npm run build
```

Output will be in the `dist/` folder.

## Key Routes

| Route | Description |
|-------|-------------|
| `/` | Homepage |
| `/shop` | Wearable art collection |
| `/wall-art` | Wall art collection |
| `/coaching` | Coaching & mentoring |
| `/learn` | Courses & workshops |
| `/about` | About Lyne |
| `/journal` | Blog |
| `/faq` | Policies & FAQs |
| `/contact` | Contact form |
| `/admin` | Admin dashboard |
