import { Router, Request, Response } from 'express';
import Stripe from 'stripe';
import { eq, inArray } from 'drizzle-orm';
import { db, products, orders, orderItems, coachingPackages } from '../db/index.js';
import { sendEmail } from '../services/email.js';

const router = Router();

// Initialize Stripe (only if API key is provided)
let stripe: Stripe | null = null;
if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
}

function getStripe(): Stripe {
  if (!stripe) {
    throw new Error('Stripe is not configured');
  }
  return stripe;
}

// Generate a unique order number
function generateOrderNumber(): string {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `LT-${year}${month}${day}-${random}`;
}

// Generate order confirmation email HTML
function generateOrderConfirmationEmail(
  customerName: string,
  orderNumber: string,
  items: Array<{ name: string; quantity: number; price: string }>,
  total: string,
  shippingAddress?: {
    firstName: string;
    lastName: string;
    address: string;
    city: string;
    state: string;
    postcode: string;
    country: string;
  }
): { subject: string; html: string } {
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

  const itemRows = items.map(item => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;">${item.name}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 0;border-bottom:1px solid #e7e5e4;text-align:right;">$${item.price}</td>
    </tr>
  `).join('');

  const shippingSection = shippingAddress ? `
    <div style="margin:30px 0;padding:20px;background-color:#fafaf9;border:1px solid #e7e5e4;">
      <h3 style="margin:0 0 15px;font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#78716c;">Shipping Address</h3>
      <p style="margin:0;line-height:1.6;">
        ${shippingAddress.firstName} ${shippingAddress.lastName}<br>
        ${shippingAddress.address}<br>
        ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.postcode}<br>
        ${shippingAddress.country}
      </p>
    </div>
  ` : '';

  const content = `
    <h2 style="margin:0 0 20px;font-size:22px;color:#1c1917;font-weight:normal;">Order Confirmation</h2>
    <p style="margin:0 0 20px;">Hi ${customerName},</p>
    <p style="margin:0 0 20px;">Thank you for your order! We're thrilled that you've chosen Lyne Tilt Studio for your wearable art needs.</p>

    <div style="margin:30px 0;padding:15px 20px;background-color:#fafaf9;border:1px solid #e7e5e4;">
      <p style="margin:0;font-size:14px;"><strong>Order Number:</strong> ${orderNumber}</p>
    </div>

    <table width="100%" cellspacing="0" cellpadding="0" style="margin:20px 0;">
      <thead>
        <tr>
          <th style="padding:12px 0;border-bottom:2px solid #1c1917;text-align:left;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Item</th>
          <th style="padding:12px 0;border-bottom:2px solid #1c1917;text-align:center;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Qty</th>
          <th style="padding:12px 0;border-bottom:2px solid #1c1917;text-align:right;font-size:12px;text-transform:uppercase;letter-spacing:0.1em;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
        <tr>
          <td colspan="2" style="padding:15px 0;text-align:right;font-weight:bold;">Total</td>
          <td style="padding:15px 0;text-align:right;font-weight:bold;font-size:18px;">$${total}</td>
        </tr>
      </tbody>
    </table>

    ${shippingSection}

    <p style="margin:30px 0 0;font-size:14px;color:#78716c;">
      Each piece is handcrafted with care. We'll email you once your order ships.
    </p>

    <p style="margin:20px 0 0;text-align:center;">
      <a href="${FRONTEND_URL}/#/account/orders" style="display:inline-block;background-color:#1c1917;color:#ffffff;padding:16px 32px;text-decoration:none;font-size:12px;text-transform:uppercase;letter-spacing:0.15em;font-weight:bold;">View Order</a>
    </p>

    <p style="margin:30px 0 0;font-style:italic;color:#8d3038;">With gratitude,<br>Lyne Tilt Studio</p>
  `;

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - Lyne Tilt Studio</title>
</head>
<body style="margin:0;padding:0;background-color:#fafaf9;font-family:Georgia,'Times New Roman',serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#fafaf9;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color:#ffffff;border:1px solid #e7e5e4;">
          <tr>
            <td style="padding:30px 40px;border-bottom:1px solid #e7e5e4;text-align:center;">
              <h1 style="margin:0;font-size:24px;font-weight:normal;color:#1c1917;letter-spacing:0.1em;">LYNE TILT STUDIO</h1>
              <p style="margin:8px 0 0;font-size:11px;color:#78716c;letter-spacing:0.15em;text-transform:uppercase;">Wearable Art & Creative Coaching</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px;color:#44403c;font-size:16px;line-height:1.7;">
              ${content}
            </td>
          </tr>
          <tr>
            <td style="padding:30px 40px;background-color:#fafaf9;border-top:1px solid #e7e5e4;text-align:center;">
              <p style="margin:0 0 15px;font-size:12px;color:#78716c;">
                <a href="${FRONTEND_URL}/#/shop" style="color:#8d3038;text-decoration:none;margin:0 10px;">Shop</a>
                <a href="${FRONTEND_URL}/#/coaching" style="color:#8d3038;text-decoration:none;margin:0 10px;">Coaching</a>
                <a href="${FRONTEND_URL}/#/learn" style="color:#8d3038;text-decoration:none;margin:0 10px;">Learn</a>
              </p>
              <p style="margin:0;font-size:11px;color:#a8a29e;">
                Australia-based &middot; Est. 2023<br>
                &copy; 2025 Lyne Tilt Studio
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Order Confirmed - ${orderNumber}`,
    html,
  };
}

// POST /api/webhooks/stripe - Stripe webhook handler
router.post('/stripe', async (req: Request, res: Response) => {
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

  console.log(`Received Stripe event: ${event.type}`);

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
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      console.log('Subscription cancelled:', subscription.id);
      break;
    }
    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  res.json({ received: true });
});

// Handle completed checkout session
async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  console.log('Processing checkout.session.completed:', session.id);

  const metadata = session.metadata || {};
  const productIds = metadata.productIds ? metadata.productIds.split(',').filter(Boolean) : [];
  const coachingIds = metadata.coachingIds ? metadata.coachingIds.split(',').filter(Boolean) : [];

  // Skip if no products (might be coaching-only order handled differently)
  if (productIds.length === 0 && coachingIds.length === 0) {
    console.log('No items in metadata, skipping order creation');
    return;
  }

  const now = new Date();
  const orderNumber = generateOrderNumber();

  // Extract shipping details from Stripe session
  const shippingDetails = session.shipping_details;
  const customerDetails = session.customer_details;

  // Parse name into first/last
  const fullName = shippingDetails?.name || customerDetails?.name || '';
  const nameParts = fullName.split(' ');
  const firstName = nameParts[0] || 'Customer';
  const lastName = nameParts.slice(1).join(' ') || '';

  // Get shipping address
  const address = shippingDetails?.address || customerDetails?.address;

  // Fetch purchased products
  let purchasedProducts: typeof products.$inferSelect[] = [];
  if (productIds.length > 0) {
    purchasedProducts = await db.select().from(products)
      .where(inArray(products.id, productIds));
  }

  // Calculate amounts
  const amountTotal = session.amount_total || 0;
  const amountSubtotal = session.amount_subtotal || amountTotal;
  const shippingAmount = session.shipping_cost?.amount_total || 0;
  const taxAmount = (session as any).total_details?.amount_tax || 0;

  // Create order record
  const [order] = await db.insert(orders).values({
    orderNumber,
    status: 'confirmed',
    subtotal: (amountSubtotal / 100).toFixed(2),
    shipping: (shippingAmount / 100).toFixed(2),
    tax: (taxAmount / 100).toFixed(2),
    total: (amountTotal / 100).toFixed(2),
    currency: (session.currency || 'aud').toUpperCase(),
    shippingFirstName: firstName,
    shippingLastName: lastName,
    shippingAddress: address?.line1 ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}` : '',
    shippingCity: address?.city || '',
    shippingState: address?.state || '',
    shippingPostcode: address?.postal_code || '',
    shippingCountry: address?.country || 'Australia',
    shippingPhone: customerDetails?.phone || null,
    stripePaymentIntentId: session.payment_intent as string | null,
    stripeCheckoutSessionId: session.id,
    paymentStatus: session.payment_status,
    paidAt: session.payment_status === 'paid' ? now : null,
    createdAt: now,
    updatedAt: now,
  }).returning();

  console.log('Created order:', order.id, orderNumber);

  // Create order items for products
  const emailItems: Array<{ name: string; quantity: number; price: string }> = [];

  for (const product of purchasedProducts) {
    await db.insert(orderItems).values({
      orderId: order.id,
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      price: product.price,
      quantity: 1,
      createdAt: now,
    });

    emailItems.push({
      name: product.name,
      quantity: 1,
      price: product.price,
    });

    // Mark product as sold (archived) - these are one-of-a-kind items
    await db.update(products)
      .set({
        archived: true,
        availability: 'Sold out',
        updatedAt: now,
      })
      .where(eq(products.id, product.id));

    console.log(`Marked product as sold: ${product.id} - ${product.name}`);
  }

  // Handle coaching packages (add to email items but don't archive)
  if (coachingIds.length > 0) {
    const purchasedCoaching = await db.select().from(coachingPackages)
      .where(inArray(coachingPackages.id, coachingIds));

    for (const coaching of purchasedCoaching) {
      emailItems.push({
        name: coaching.title,
        quantity: 1,
        price: coaching.priceAmount || '0',
      });
    }
  }

  // Send confirmation email
  const customerEmail = customerDetails?.email;
  if (customerEmail) {
    const { subject, html } = generateOrderConfirmationEmail(
      firstName,
      orderNumber,
      emailItems,
      (amountTotal / 100).toFixed(2),
      address ? {
        firstName,
        lastName,
        address: address.line1 ? `${address.line1}${address.line2 ? ', ' + address.line2 : ''}` : '',
        city: address.city || '',
        state: address.state || '',
        postcode: address.postal_code || '',
        country: address.country || 'Australia',
      } : undefined
    );

    const emailSent = await sendEmail({ to: customerEmail, subject, html });
    console.log(`Confirmation email ${emailSent ? 'sent' : 'failed'} to: ${customerEmail}`);
  } else {
    console.warn('No customer email available for confirmation');
  }
}

export default router;
