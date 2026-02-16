import { Hono } from 'hono';
import { eq, inArray, sql } from 'drizzle-orm';
import Stripe from 'stripe';
import { products, coachingPackages, orders, orderItems } from '../db/schema';
import type { Bindings, Variables } from '../index';

export const checkoutRoutes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Helper to get Stripe instance
function getStripe(secretKey: string): Stripe {
  return new Stripe(secretKey, {
    apiVersion: '2024-12-18.acacia',
  });
}

// POST /api/checkout/create-session - Create Stripe checkout session
checkoutRoutes.post('/create-session', async (c) => {
  const db = c.get('db');
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
  const body = await c.req.json();
  const { items, successUrl, cancelUrl } = body;

  if (!items || items.length === 0) {
    return c.json({ error: 'No items provided' }, 400);
  }

  const productIds = items.filter((i: any) => i.type === 'product').map((i: any) => i.id);
  const coachingIds = items.filter((i: any) => i.type === 'coaching').map((i: any) => i.id);

  // Fetch products and coaching packages
  const fetchedProducts = productIds.length > 0
    ? await db.select().from(products).where(inArray(products.id, productIds)).all()
    : [];

  const fetchedCoaching = coachingIds.length > 0
    ? await db.select().from(coachingPackages).where(inArray(coachingPackages.id, coachingIds)).all()
    : [];

  // Build quantity map
  const quantityMap = new Map(items.map((i: any) => [i.id, i.quantity || 1]));

  // Build line items for Stripe
  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

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
        },
        unit_amount: priceInCents,
      },
      quantity,
    });
  }

  for (const coaching of fetchedCoaching) {
    if (!coaching.priceAmount) continue;
    const priceInCents = Math.round(parseFloat(coaching.priceAmount) * 100);

    lineItems.push({
      price_data: {
        currency: (coaching.currency || 'AUD').toLowerCase(),
        product_data: {
          name: coaching.title,
          description: coaching.description || undefined,
        },
        unit_amount: priceInCents,
      },
      quantity: 1,
    });
  }

  // Create checkout session
  const baseUrl = c.env.FRONTEND_URL || 'https://lyne-tilt.pages.dev';

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: lineItems,
    success_url: successUrl || `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl || `${baseUrl}/checkout`,
    allow_promotion_codes: true,
    billing_address_collection: 'required',
    shipping_address_collection: fetchedProducts.length > 0 ? {
      allowed_countries: ['AU'],
    } : undefined,
    metadata: {
      productIds: productIds.join(','),
      coachingIds: coachingIds.join(','),
      productQuantities: JSON.stringify(Object.fromEntries(
        items.filter((i: any) => i.type === 'product').map((i: any) => [i.id, i.quantity || 1])
      )),
    },
  });

  return c.json({
    sessionId: session.id,
    url: session.url,
  });
});

// GET /api/checkout/session/:sessionId - Get session details
checkoutRoutes.get('/session/:sessionId', async (c) => {
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
  const sessionId = c.req.param('sessionId');

  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['line_items'],
  });

  return c.json({
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
checkoutRoutes.post('/webhook', async (c) => {
  const db = c.get('db');
  const stripe = getStripe(c.env.STRIPE_SECRET_KEY);
  const sig = c.req.header('stripe-signature');
  const webhookSecret = c.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return c.json({ error: 'Missing signature or webhook secret' }, 400);
  }

  let event: Stripe.Event;

  try {
    const rawBody = await c.req.text();
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return c.json({ error: 'Webhook Error' }, 400);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};

    const productIds = metadata.productIds ? metadata.productIds.split(',').filter(Boolean) : [];

    if (productIds.length > 0) {
      let productQuantities: Record<string, number> = {};
      try {
        productQuantities = metadata.productQuantities ? JSON.parse(metadata.productQuantities) : {};
      } catch {}

      const orderedProducts = await db.select().from(products)
        .where(inArray(products.id, productIds))
        .all();

      // Generate order number
      const orderNumber = `LT-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

      // Create order
      const order = await db.insert(orders).values({
        orderNumber,
        status: 'confirmed',
        subtotal: ((session.amount_subtotal || 0) / 100).toString(),
        total: ((session.amount_total || 0) / 100).toString(),
        currency: (session.currency || 'AUD').toUpperCase(),
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: session.payment_intent as string,
        paymentStatus: 'paid',
        paidAt: new Date().toISOString(),
        shippingFirstName: session.customer_details?.name?.split(' ')[0] || '',
        shippingLastName: session.customer_details?.name?.split(' ').slice(1).join(' ') || '',
        shippingAddress: session.shipping_details?.address?.line1 || '',
        shippingCity: session.shipping_details?.address?.city || '',
        shippingState: session.shipping_details?.address?.state || '',
        shippingPostcode: session.shipping_details?.address?.postal_code || '',
        shippingCountry: session.shipping_details?.address?.country || 'AU',
      }).returning().get();

      // Create order items
      for (const product of orderedProducts) {
        const quantity = productQuantities[product.id] || 1;

        await db.insert(orderItems).values({
          orderId: order.id,
          productId: product.id,
          productName: product.name,
          productImage: product.image,
          price: product.price,
          quantity,
        });
      }

      // Deduct inventory and update availability
      for (const product of orderedProducts) {
        const qty = productQuantities[product.id] || 1;

        if (product.trackInventory) {
          const newQuantity = Math.max(0, product.quantity - qty);
          const updates: Record<string, any> = {
            quantity: newQuantity,
            updatedAt: new Date().toISOString(),
          };

          // Mark sold out if inventory hits zero and continueSelling is off
          if (newQuantity <= 0 && !product.continueSelling) {
            updates.availability = 'Sold out';
          }

          await db.update(products).set(updates).where(eq(products.id, product.id));
        }
      }

      console.log('Order created:', order.orderNumber);
    }
  }

  return c.json({ received: true });
});
