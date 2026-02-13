# Analytics Suite Design

**Date:** 2026-02-13
**Status:** Approved

## Overview

A comprehensive analytics suite for the Lyne-Tilt admin centre. Provides the site owner with actionable insights across revenue, products, email marketing, content, customers, and services (workshops + coaching).

**Architecture:** Analytics Hub + Domain Pages (Approach B)
**UI Style:** shadcn/ui-inspired — minimal, cozy, effective with clean cards and Recharts charts
**Data freshness:** Refresh on page load (no real-time streaming)
**Audience:** Solo owner

## Event Tracking Infrastructure

### New table: `analytics_events`

| Column | Type | Purpose |
|--------|------|---------|
| id | text (UUID) | Primary key |
| event_type | text (enum) | `page_view`, `product_view`, `add_to_cart`, `checkout_start`, `blog_read`, `search` |
| entity_type | text | `product`, `blog_post`, `page`, etc. |
| entity_id | text (nullable) | ID of the viewed item |
| session_id | text | Anonymous session fingerprint (sessionStorage, not cookies) |
| referrer | text (nullable) | Where the user came from |
| pathname | text | URL path visited |
| metadata | text (JSON, nullable) | Extra context (search query, cart value, scroll depth) |
| created_at | text | ISO timestamp |

### Frontend tracker: `lib/analytics.ts` (~1KB)

- Generates session ID stored in sessionStorage (privacy-friendly, no cookies)
- Sends events via `navigator.sendBeacon()` to `POST /api/analytics/events`
- Batches events, flushes every 5 seconds or on page unload
- Auto-tracks `page_view` on route changes
- Exports `trackEvent(type, data)` for manual events (add-to-cart, product view)

### Workers endpoint

`POST /api/analytics/events` — public, rate-limited, bulk insert into D1.

## Pages

### 1. Analytics Hub (`/admin/analytics`)

Bird's-eye view with global date range picker (7d, 30d, 90d, custom).

**KPI cards row:** Revenue, Orders, Visitors, Emails Sent, Conversion Rate
- Each shows value + % change vs previous period + sparkline

**Charts:** Revenue & Orders trend (area chart, toggleable granularity)

**Leaderboards (2-column grid):**
- Top Products (by revenue)
- Top Blog Posts (by views)

**Summary cards (2-column grid):**
- Email Performance (open/click rates, best campaign)
- Customer Insights (new customers, returning %, AOV)

Each section has a "View all →" link to its deep-dive page.

### 2. Revenue & Products (`/admin/analytics/revenue`)

**Revenue section:**
- Revenue over time (area chart, daily/weekly/monthly)
- Average order value trend line
- Orders by status (stacked bar or donut: confirmed, shipped, delivered, cancelled)
- Revenue by product type (wearable, wall-art, digital)

**Product leaderboard:**
- Sortable table: product name, units sold, revenue, avg rating, conversion rate (views → purchase)
- Per-product sparkline showing sales trend
- Filter by product type, status, date range

**Inventory health:**
- Low stock alerts (products below threshold)
- Stock movement trend

### 3. Email & Marketing (`/admin/analytics/email`)

**Campaign performance:**
- Sortable/filterable table: campaign name, sent count, open rate, click rate, bounce rate, unsubscribe rate
- Expandable rows for per-campaign engagement timeline

**Subscriber funnel:**
- Growth chart: new subscribers vs unsubscribes over time
- Engagement distribution donut (highly engaged, engaged, at-risk, inactive)
- Subscriber sources breakdown (by tag)

**Automation performance:**
- Table: automation name, trigger count, emails sent, success/failure rates

### 4. Content & Traffic (`/admin/analytics/content`)

**Blog performance:**
- Sortable table: post title, views, unique visitors, publish date
- Views over time area chart
- Traffic sources breakdown (referrer data from analytics_events)

**Content-to-sale attribution:**
- Pages most commonly visited before purchase (session path: page_view → add_to_cart → checkout)

### 5. Customer Insights (`/admin/analytics/customers`)

**Customer overview:**
- New vs returning customers over time
- Customer lifetime value distribution (histogram)
- Average orders per customer
- Top customers by spend

**Cohort analysis:**
- Monthly cohort retention: customers acquired in month X → reorder in months 1, 2, 3...
- Retention heatmap (shadcn-style muted color scale)

### 6. Services — Learn & Coaching (`/admin/analytics/services`)

**Workshop performance:**
- Enrollment trends over time
- Revenue by course/workshop
- Completion rates (enrolled → completed)
- Most popular courses by enrollments
- Upcoming vs past workshops with enrollment counts

**Coaching performance:**
- Revenue from coaching packages
- Inquiry-to-booking conversion
- Package popularity ranking

## API Endpoints

All under `/api/analytics/`:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/events` | POST | Ingest tracking events (public, rate-limited) |
| `/overview` | GET | Hub KPIs + sparkline data |
| `/revenue` | GET | Revenue charts + product leaderboard |
| `/email` | GET | Campaign table + subscriber funnel |
| `/content` | GET | Blog performance + traffic sources |
| `/customers` | GET | Customer metrics + cohort data |
| `/services` | GET | Workshop + coaching analytics |

All GET endpoints accept `?from=&to=` date range query params.

## Tech Stack

- **Charts:** Recharts (already installed)
- **Icons:** Lucide React (already installed)
- **Styling:** Inline styles matching existing admin pages (shadcn-inspired aesthetic)
- **Backend:** Hono routes on Cloudflare Workers + D1 queries
- **ORM:** Drizzle for typed queries, raw SQL for complex aggregations

## Data Sources

| Analytics Area | Primary Data Source | New Tracking Needed |
|----------------|--------------------|--------------------|
| Revenue | orders, orderItems | No |
| Products | products, orderItems, analytics_events | product_view events |
| Email | campaigns, campaignEvents, subscribers | No |
| Content | blogPosts, analytics_events | page_view, blog_read events |
| Customers | customerUsers, orders | No |
| Services | learnItems, enrollments, coachingPackages | No |
| Traffic | analytics_events | page_view events |
