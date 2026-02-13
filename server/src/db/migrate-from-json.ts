/**
 * Migration script to transfer data from LowDB (JSON) to PostgreSQL
 * Run with: npx tsx src/db/migrate-from-json.ts
 */

import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import * as schema from './schema.js';
import bcrypt from 'bcryptjs';

// Map old IDs to new UUIDs
const idMap: Record<string, string> = {};

const __dirname = dirname(fileURLToPath(import.meta.url));

// Types for the old JSON database
interface OldDatabaseSchema {
  users: any[];
  refreshTokens: any[];
  customerUsers: any[];
  customerRefreshTokens: any[];
  shippingAddresses: any[];
  wishlistItems: any[];
  orders: any[];
  products: any[];
  coachingPackages: any[];
  learnItems: any[];
  blogPosts: any[];
  testimonials: any[];
  faqs: any[];
  subscribers: any[];
  emailDrafts: any[];
  sentEmails: any[];
  subscriberTags: string[];
  contactSubmissions: any[];
  activityLog: any[];
  siteSettings?: any;
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 200);
}

async function migrate() {
  console.log('Starting migration from JSON to PostgreSQL...\n');

  // Check for DATABASE_URL
  if (!process.env.DATABASE_URL) {
    console.error('ERROR: DATABASE_URL environment variable is not set');
    console.log('Please add DATABASE_URL to your .env file');
    process.exit(1);
  }

  // Connect to PostgreSQL
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  });

  const db = drizzle(pool, { schema });

  // Read the JSON database
  const jsonDbPath = join(__dirname, '../../data/db.json');
  let oldData: OldDatabaseSchema;

  try {
    const jsonContent = readFileSync(jsonDbPath, 'utf-8');
    oldData = JSON.parse(jsonContent);
    console.log('Successfully loaded JSON database\n');
  } catch (error) {
    console.error('Failed to read JSON database:', error);
    process.exit(1);
  }

  try {
    // Helper to get or create UUID for old ID
    function getNewId(oldId: string, prefix: string = ''): string {
      const key = prefix + oldId;
      if (!idMap[key]) {
        idMap[key] = randomUUID();
      }
      return idMap[key];
    }

    // ============================================
    // MIGRATE ADMIN USERS
    // ============================================
    if (oldData.users?.length > 0) {
      console.log(`Migrating ${oldData.users.length} admin users...`);
      for (const user of oldData.users) {
        const newId = getNewId(user.id, 'user_');
        await db.insert(schema.users).values({
          id: newId,
          email: user.email,
          passwordHash: user.passwordHash,
          name: user.name,
          role: user.role || 'admin',
          createdAt: new Date(user.createdAt || Date.now()),
          updatedAt: new Date(),
        }).onConflictDoNothing();
      }
      console.log('✓ Admin users migrated\n');
    }

    // ============================================
    // MIGRATE CUSTOMER USERS
    // ============================================
    if (oldData.customerUsers?.length > 0) {
      console.log(`Migrating ${oldData.customerUsers.length} customer users...`);
      for (const user of oldData.customerUsers) {
        const newId = getNewId(user.id, 'customer_');
        await db.insert(schema.customerUsers).values({
          id: newId,
          email: user.email,
          passwordHash: user.passwordHash,
          firstName: user.firstName,
          lastName: user.lastName,
          role: 'customer',
          emailVerified: user.emailVerified || false,
          verificationToken: user.verificationToken,
          verificationTokenExpiry: user.verificationTokenExpiry ? new Date(user.verificationTokenExpiry) : null,
          resetToken: user.resetToken,
          resetTokenExpiry: user.resetTokenExpiry ? new Date(user.resetTokenExpiry) : null,
          createdAt: new Date(user.createdAt || Date.now()),
          updatedAt: new Date(user.updatedAt || Date.now()),
          lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt) : null,
        }).onConflictDoNothing();
      }
      console.log('✓ Customer users migrated\n');
    }

    // ============================================
    // MIGRATE SHIPPING ADDRESSES
    // ============================================
    if (oldData.shippingAddresses?.length > 0) {
      console.log(`Migrating ${oldData.shippingAddresses.length} shipping addresses...`);
      for (const address of oldData.shippingAddresses) {
        const newId = getNewId(address.id, 'address_');
        const newUserId = getNewId(address.userId, 'customer_');
        await db.insert(schema.shippingAddresses).values({
          id: newId,
          userId: newUserId,
          firstName: address.firstName,
          lastName: address.lastName,
          address: address.address,
          city: address.city,
          state: address.state,
          postcode: address.postcode,
          country: address.country || 'Australia',
          phone: address.phone,
          isDefault: address.isDefault || false,
          createdAt: new Date(address.createdAt || Date.now()),
          updatedAt: new Date(address.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Shipping addresses migrated\n');
    }

    // ============================================
    // MIGRATE PRODUCTS
    // ============================================
    if (oldData.products?.length > 0) {
      console.log(`Migrating ${oldData.products.length} products...`);
      for (const product of oldData.products) {
        const newId = getNewId(product.id, 'product_');
        const slug = generateSlug(product.name);
        await db.insert(schema.products).values({
          id: newId,
          name: product.name,
          slug: `${slug}-${product.id}`,
          price: String(product.price),
          currency: product.currency || 'AUD',
          category: product.category,
          shortDescription: product.shortDescription,
          longDescription: product.longDescription,
          image: product.image,
          detailImages: product.detailImages || [],
          badge: product.badge,
          rating: product.rating ? String(product.rating) : null,
          reviewCount: product.reviewCount || 0,
          availability: product.availability || 'In stock',
          archived: product.archived || false,
          createdAt: new Date(product.createdAt || Date.now()),
          updatedAt: new Date(product.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Products migrated\n');
    }

    // ============================================
    // MIGRATE COACHING PACKAGES
    // ============================================
    if (oldData.coachingPackages?.length > 0) {
      console.log(`Migrating ${oldData.coachingPackages.length} coaching packages...`);
      for (const pkg of oldData.coachingPackages) {
        const newId = getNewId(pkg.id, 'coaching_');
        const slug = generateSlug(pkg.title);
        await db.insert(schema.coachingPackages).values({
          id: newId,
          title: pkg.title,
          slug: `${slug}-${pkg.id}`,
          description: pkg.description,
          features: pkg.features || [],
          ctaText: pkg.ctaText || 'Apply Now',
          image: pkg.image,
          price: pkg.price,
          badge: pkg.badge,
          displayOrder: pkg.displayOrder || 0,
          createdAt: new Date(pkg.createdAt || Date.now()),
          updatedAt: new Date(pkg.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Coaching packages migrated\n');
    }

    // ============================================
    // MIGRATE LEARN ITEMS
    // ============================================
    if (oldData.learnItems?.length > 0) {
      console.log(`Migrating ${oldData.learnItems.length} learn items...`);
      for (const item of oldData.learnItems) {
        const newId = getNewId(item.id, 'learn_');
        const slug = generateSlug(item.title);
        await db.insert(schema.learnItems).values({
          id: newId,
          title: item.title,
          slug: `${slug}-${item.id}`,
          subtitle: item.subtitle,
          type: item.type,
          price: item.price,
          image: item.image,
          description: item.description,
          duration: item.duration,
          format: item.format,
          level: item.level,
          nextDate: item.nextDate,
          enrolledCount: item.enrolledCount || 0,
          includes: item.includes || [],
          outcomes: item.outcomes || [],
          modules: item.modules || [],
          testimonial: item.testimonial,
          displayOrder: item.displayOrder || 0,
          createdAt: new Date(item.createdAt || Date.now()),
          updatedAt: new Date(item.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Learn items migrated\n');
    }

    // ============================================
    // MIGRATE BLOG POSTS
    // ============================================
    if (oldData.blogPosts?.length > 0) {
      console.log(`Migrating ${oldData.blogPosts.length} blog posts...`);
      for (const post of oldData.blogPosts) {
        const newId = getNewId(post.id, 'blog_');
        const slug = generateSlug(post.title);
        await db.insert(schema.blogPosts).values({
          id: newId,
          title: post.title,
          slug: `${slug}-${post.id}`,
          excerpt: post.excerpt,
          content: post.content,
          date: post.date,
          category: post.category,
          image: post.image,
          published: post.published || false,
          createdAt: new Date(post.createdAt || Date.now()),
          updatedAt: new Date(post.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Blog posts migrated\n');
    }

    // ============================================
    // MIGRATE TESTIMONIALS
    // ============================================
    if (oldData.testimonials?.length > 0) {
      console.log(`Migrating ${oldData.testimonials.length} testimonials...`);
      for (const testimonial of oldData.testimonials) {
        const newId = getNewId(testimonial.id, 'testimonial_');
        await db.insert(schema.testimonials).values({
          id: newId,
          text: testimonial.text,
          author: testimonial.author,
          role: testimonial.role,
          type: testimonial.type,
          rating: testimonial.rating || 5,
          displayOrder: testimonial.displayOrder || 0,
          createdAt: new Date(testimonial.createdAt || Date.now()),
          updatedAt: new Date(testimonial.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Testimonials migrated\n');
    }

    // ============================================
    // MIGRATE FAQS
    // ============================================
    if (oldData.faqs?.length > 0) {
      console.log(`Migrating ${oldData.faqs.length} FAQs...`);
      for (const faq of oldData.faqs) {
        const newId = getNewId(faq.id, 'faq_');
        await db.insert(schema.faqs).values({
          id: newId,
          question: faq.question,
          answer: faq.answer,
          category: faq.category,
          displayOrder: faq.displayOrder || 0,
          createdAt: new Date(faq.createdAt || Date.now()),
          updatedAt: new Date(faq.updatedAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ FAQs migrated\n');
    }

    // ============================================
    // MIGRATE SUBSCRIBERS
    // ============================================
    if (oldData.subscribers?.length > 0) {
      console.log(`Migrating ${oldData.subscribers.length} subscribers...`);
      for (const subscriber of oldData.subscribers) {
        const newId = getNewId(subscriber.id, 'subscriber_');
        await db.insert(schema.subscribers).values({
          id: newId,
          email: subscriber.email,
          name: subscriber.name,
          source: subscriber.source || 'website',
          tags: subscriber.tags || [],
          subscribedAt: new Date(subscriber.subscribedAt || Date.now()),
          lastEmailedAt: subscriber.lastEmailedAt ? new Date(subscriber.lastEmailedAt) : null,
          emailsReceived: subscriber.emailsReceived || 0,
          createdAt: new Date(subscriber.subscribedAt || Date.now()),
          updatedAt: new Date(),
        }).onConflictDoNothing();
      }
      console.log('✓ Subscribers migrated\n');
    }

    // ============================================
    // MIGRATE SUBSCRIBER TAGS
    // ============================================
    if (oldData.subscriberTags?.length > 0) {
      console.log(`Migrating ${oldData.subscriberTags.length} subscriber tags...`);
      for (const tag of oldData.subscriberTags) {
        await db.insert(schema.subscriberTags).values({
          name: tag,
        }).onConflictDoNothing();
      }
      console.log('✓ Subscriber tags migrated\n');
    }

    // ============================================
    // MIGRATE CONTACT SUBMISSIONS
    // ============================================
    if (oldData.contactSubmissions?.length > 0) {
      console.log(`Migrating ${oldData.contactSubmissions.length} contact submissions...`);
      for (const submission of oldData.contactSubmissions) {
        const newId = getNewId(submission.id, 'contact_');
        await db.insert(schema.contactSubmissions).values({
          id: newId,
          name: submission.name,
          email: submission.email,
          subject: submission.subject,
          message: submission.message,
          status: submission.status || 'unread',
          createdAt: new Date(submission.createdAt || Date.now()),
          readAt: submission.readAt ? new Date(submission.readAt) : null,
        }).onConflictDoNothing();
      }
      console.log('✓ Contact submissions migrated\n');
    }

    // ============================================
    // MIGRATE ORDERS
    // ============================================
    if (oldData.orders?.length > 0) {
      console.log(`Migrating ${oldData.orders.length} orders...`);
      for (const order of oldData.orders) {
        const newOrderId = getNewId(order.id, 'order_');
        const newUserId = order.userId ? getNewId(order.userId, 'customer_') : null;
        // Insert order
        await db.insert(schema.orders).values({
          id: newOrderId,
          userId: newUserId,
          orderNumber: order.orderNumber,
          status: order.status || 'pending',
          subtotal: String(order.subtotal),
          shipping: String(order.shipping || 0),
          total: String(order.total),
          currency: order.currency || 'AUD',
          shippingFirstName: order.shippingAddress?.firstName || '',
          shippingLastName: order.shippingAddress?.lastName || '',
          shippingAddress: order.shippingAddress?.address || '',
          shippingCity: order.shippingAddress?.city || '',
          shippingState: order.shippingAddress?.state || '',
          shippingPostcode: order.shippingAddress?.postcode || '',
          shippingCountry: order.shippingAddress?.country || 'Australia',
          shippingPhone: order.shippingAddress?.phone,
          trackingNumber: order.trackingNumber,
          trackingUrl: order.trackingUrl,
          createdAt: new Date(order.createdAt || Date.now()),
          updatedAt: new Date(order.updatedAt || Date.now()),
          shippedAt: order.shippedAt ? new Date(order.shippedAt) : null,
          deliveredAt: order.deliveredAt ? new Date(order.deliveredAt) : null,
        }).onConflictDoNothing();

        // Insert order items
        if (order.items?.length > 0) {
          for (const item of order.items) {
            const newProductId = item.productId ? getNewId(item.productId, 'product_') : null;
            await db.insert(schema.orderItems).values({
              orderId: newOrderId,
              productId: newProductId,
              productName: item.name,
              productImage: item.image,
              price: String(item.price),
              quantity: item.quantity || 1,
            }).onConflictDoNothing();
          }
        }
      }
      console.log('✓ Orders migrated\n');
    }

    // ============================================
    // MIGRATE ACTIVITY LOG
    // ============================================
    if (oldData.activityLog?.length > 0) {
      console.log(`Migrating ${oldData.activityLog.length} activity log entries...`);
      for (const entry of oldData.activityLog) {
        const newId = getNewId(entry.id, 'activity_');
        const newUserId = entry.userId ? getNewId(entry.userId, 'user_') : null;
        await db.insert(schema.activityLog).values({
          id: newId,
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId,
          entityName: entry.entityName,
          userId: newUserId,
          userName: entry.userName,
          details: entry.details,
          createdAt: new Date(entry.createdAt || Date.now()),
        }).onConflictDoNothing();
      }
      console.log('✓ Activity log migrated\n');
    }

    // ============================================
    // MIGRATE SITE SETTINGS
    // ============================================
    if (oldData.siteSettings) {
      console.log('Migrating site settings...');
      await db.insert(schema.siteSettings).values({
        key: 'main',
        value: oldData.siteSettings,
        updatedAt: new Date(),
      }).onConflictDoNothing();
      console.log('✓ Site settings migrated\n');
    }

    console.log('========================================');
    console.log('Migration completed successfully!');
    console.log('========================================\n');

  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run migration
migrate().catch(console.error);
