import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { z } from 'zod';
import { eq, inArray } from 'drizzle-orm';
import { db, products, coachingPackages, orders, orderItems } from '../db/index.js';
import { customerAuthMiddleware } from '../middleware/customerAuth.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Initialize Stripe (only if API key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

// Helper to ensure Stripe is configured
function getStripe(): Stripe {
  if (!stripe) {
    throw new AppError('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.', 500);
  }
  return stripe;
}

// Cart item types
const cartItemSchema = z.object({
  id: z.string(),
  type: z.enum(['product', 'coaching']),
  quantity: z.number().int().positive().default(1),
});

const createSessionSchema = z.object({
  items: z.array(cartItemSchema).min(1),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

interface CartProduct {
  id: string;
  name: string;
  price: string;
  currency: string;
  image: string;
  quantity: number;
}

interface CartCoaching {
  id: string;
  title: string;
  priceAmount: string | null;
  currency: string | null;
  recurring: boolean;
  recurringInterval: string | null;
  image: string | null;
}

// POST /api/checkout/create-session
router.post('/create-session', async (req: Request, res: Response) => {
  const data = createSessionSchema.parse(req.body);

  const productIds = data.items.filter(i => i.type === 'product').map(i => i.id);
  const coachingIds = data.items.filter(i => i.type === 'coaching').map(i => i.id);

  // Fetch products and coaching packages from database
  const [fetchedProducts, fetchedCoaching] = await Promise.all([
    productIds.length > 0
      ? db.select().from(products).where(inArray(products.id, productIds))
      : Promise.resolve([]),
    coachingIds.length > 0
      ? db.select().from(coachingPackages).where(inArray(coachingPackages.id, coachingIds))
      : Promise.resolve([]),
  ]);

  // Validate all items exist
  if (fetchedProducts.length !== productIds.length) {
    throw new AppError('One or more products not found', 404);
  }
  if (fetchedCoaching.length !== coachingIds.length) {
    throw new AppError('One or more coaching packages not found', 404);
  }

  // Check for unavailable products
  const unavailableProducts = fetchedProducts.filter(
    p => p.availability === 'Sold out' || p.archived
  );
  if (unavailableProducts.length > 0) {
    throw new AppError(
      `The following products are unavailable: ${unavailableProducts.map(p => p.name).join(', ')}`,
      400
    );
  }

  // Separate recurring and one-time coaching items
  const recurringCoaching = fetchedCoaching.filter(c => c.recurring);
  const oneTimeCoaching = fetchedCoaching.filter(c => !c.recurring);

  // Cannot mix subscriptions with one-time products in Stripe Checkout
  const hasPhysicalProducts = fetchedProducts.length > 0;
  const hasOneTimeCoaching = oneTimeCoaching.length > 0;
  const hasRecurringCoaching = recurringCoaching.length > 0;

  if (hasRecurringCoaching && (hasPhysicalProducts || hasOneTimeCoaching)) {
    throw new AppError(
      'Subscription items cannot be purchased together with one-time items. Please checkout separately.',
      400
    );
  }

  // Build quantity map
  const quantityMap = new Map(data.items.map(i => [i.id, i.quantity]));

  // Determine checkout mode
  const isSubscription = hasRecurringCoaching;
  const hasShipping = hasPhysicalProducts;

  // Build line items
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  // Add physical products
  for (const product of fetchedProducts) {
    const quantity = quantityMap.get(product.id) || 1;
    const priceInCents = Math.round(parseFloat(product.price) * 100);

    lineItems.push({
      price_data: {
        currency: product.currency.toLowerCase(),
        product_data: {
          name: product.name,
          description: product.shortDescription || undefined,
          images: product.image ? [product.image] : undefined,
          metadata: {
            productId: product.id,
            type: 'product',
          },
        },
        unit_amount: priceInCents,
      },
      quantity,
    });
  }

  // Add one-time coaching packages
  for (const coaching of oneTimeCoaching) {
    if (!coaching.priceAmount) {
      throw new AppError(`Coaching package "${coaching.title}" does not have a price configured`, 400);
    }

    const priceInCents = Math.round(parseFloat(coaching.priceAmount) * 100);

    lineItems.push({
      price_data: {
        currency: (coaching.currency || 'AUD').toLowerCase(),
        product_data: {
          name: coaching.title,
          description: coaching.description || undefined,
          images: coaching.image ? [coaching.image] : undefined,
          metadata: {
            coachingId: coaching.id,
            type: 'coaching',
          },
        },
        unit_amount: priceInCents,
      },
      quantity: 1, // Coaching packages are typically single quantity
    });
  }

  // Add recurring coaching packages (subscriptions)
  for (const coaching of recurringCoaching) {
    if (!coaching.priceAmount) {
      throw new AppError(`Coaching package "${coaching.title}" does not have a price configured`, 400);
    }

    const priceInCents = Math.round(parseFloat(coaching.priceAmount) * 100);
    const interval = (coaching.recurringInterval || 'month') as Stripe.Price.Recurring.Interval;

    lineItems.push({
      price_data: {
        currency: (coaching.currency || 'AUD').toLowerCase(),
        product_data: {
          name: coaching.title,
          description: coaching.description || undefined,
          images: coaching.image ? [coaching.image] : undefined,
          metadata: {
            coachingId: coaching.id,
            type: 'coaching_subscription',
          },
        },
        unit_amount: priceInCents,
        recurring: {
          interval,
        },
      },
      quantity: 1,
    });
  }

  // Build session parameters
  const baseUrl = process.env.FRONTEND_URL || process.env.CORS_ORIGIN || 'http://localhost:3001';
  const successUrl = data.successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = data.cancelUrl || `${baseUrl}/cart`;

  const sessionParams: Stripe.Checkout.SessionCreateParams = {
    mode: isSubscription ? 'subscription' : 'payment',
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    automatic_tax: {
      enabled: true,
    },
    // Customer email collection
    customer_creation: isSubscription ? undefined : 'if_required',
    billing_address_collection: 'required',
    // Metadata for webhook processing
    // Store quantities as JSON for proper order processing
    metadata: {
      itemCount: data.items.length.toString(),
      hasPhysicalProducts: hasPhysicalProducts.toString(),
      productIds: productIds.join(','),
      coachingIds: coachingIds.join(','),
      // Store product quantities as JSON: {"productId": quantity, ...}
      productQuantities: JSON.stringify(
        Object.fromEntries(
          data.items
            .filter(i => i.type === 'product')
            .map(i => [i.id, i.quantity])
        )
      ),
    },
  };

  // Add shipping for physical products
  if (hasShipping) {
    sessionParams.shipping_address_collection = {
      allowed_countries: ['AU'],
    };
    sessionParams.shipping_options = [
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 0,
            currency: 'aud',
          },
          display_name: 'Standard Shipping',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 3,
            },
            maximum: {
              unit: 'business_day',
              value: 7,
            },
          },
        },
      },
      {
        shipping_rate_data: {
          type: 'fixed_amount',
          fixed_amount: {
            amount: 1500, // $15.00 AUD
            currency: 'aud',
          },
          display_name: 'Express Shipping',
          delivery_estimate: {
            minimum: {
              unit: 'business_day',
              value: 1,
            },
            maximum: {
              unit: 'business_day',
              value: 3,
            },
          },
        },
      },
    ];
  }

  // Add phone number collection for physical products
  if (hasShipping) {
    sessionParams.phone_number_collection = {
      enabled: true,
    };
  }

  // Create the checkout session
  const session = await getStripe().checkout.sessions.create(sessionParams);

  res.json({
    sessionId: session.id,
    url: session.url,
  });
});

// GET /api/checkout/session/:sessionId - Get session details (for success page)
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  const { sessionId } = req.params;

  const session = await getStripe().checkout.sessions.retrieve(sessionId, {
    expand: ['line_items', 'customer', 'payment_intent', 'subscription'],
  });

  res.json({
    id: session.id,
    status: session.status,
    paymentStatus: session.payment_status,
    customerEmail: session.customer_details?.email,
    amountTotal: session.amount_total,
    currency: session.currency,
    lineItems: session.line_items?.data.map(item => ({
      description: item.description,
      quantity: item.quantity,
      amountTotal: item.amount_total,
    })),
  });
});

// POST /api/checkout/webhook - Stripe webhook handler
router.post('/webhook', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured');
    return res.status(500).json({ error: 'Webhook not configured' });
  }

  let event: Stripe.Event;

  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await handleCheckoutComplete(session);
      break;
    }
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      console.log('Subscription invoice paid:', invoice.id);
      // Handle subscription renewal if needed
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription cancelled:', subscription.id);
      // Handle subscription cancellation if needed
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Helper function to handle completed checkout
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Checkout completed:', session.id);

  const metadata = session.metadata || {};
  const productIds = metadata.productIds ? metadata.productIds.split(',').filter(Boolean) : [];
  const coachingIds = metadata.coachingIds ? metadata.coachingIds.split(',').filter(Boolean) : [];

  // Parse product quantities from metadata
  let productQuantities: Record<string, number> = {};
  try {
    productQuantities = metadata.productQuantities ? JSON.parse(metadata.productQuantities) : {};
  } catch (e) {
    console.error('Failed to parse product quantities:', e);
  }

  // For physical products, create an order record
  if (productIds.length > 0) {
    const now = new Date();

    // Fetch product details
    const orderedProducts = await db.select().from(products)
      .where(inArray(products.id, productIds));

    // Create order
    const orderResult = await db.insert(orders).values({
      customerEmail: session.customer_details?.email || '',
      customerName: session.customer_details?.name || '',
      status: 'confirmed',
      total: (session.amount_total || 0) / 100,
      currency: (session.currency || 'AUD').toUpperCase(),
      stripeSessionId: session.id,
      stripePaymentIntentId: session.payment_intent as string,
      shippingAddress: session.shipping_details ? {
        name: session.shipping_details.name,
        address: session.shipping_details.address,
      } : null,
      billingAddress: session.customer_details?.address ? {
        address: session.customer_details.address,
      } : null,
      createdAt: now,
      updatedAt: now,
    }).returning();

    const order = orderResult[0];

    // Create order items with actual quantities
    for (const product of orderedProducts) {
      const quantity = productQuantities[product.id] || 1;
      const unitPrice = parseFloat(product.price);
      const totalPrice = (unitPrice * quantity).toFixed(2);

      await db.insert(orderItems).values({
        orderId: order.id,
        productId: product.id,
        productName: product.name,
        quantity: quantity,
        unitPrice: product.price,
        totalPrice: totalPrice,
        createdAt: now,
      });
    }

    console.log('Order created:', order.id);
  }

  // For coaching packages, you might want to:
  // 1. Create an enrollment record
  // 2. Send a welcome email
  // 3. Grant access to coaching portal
  if (coachingIds.length > 0) {
    console.log('Coaching packages purchased:', coachingIds);
    // TODO: Handle coaching package fulfillment
  }
}

export default router;
