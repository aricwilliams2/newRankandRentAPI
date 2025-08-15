// routes/stripeRoutes.js
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const User = require("../models/User"); // Adjust the path if needed
const { authenticate: auth } = require("../middleware/auth");

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1RrKZIKggcV9qDyr8WkJu04U", // Replace with your actual Price ID
          quantity: 1,
        },
      ],
      success_url: `https://www.rankandrenttool.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.rankandrenttool.com/`,
      metadata: { name, email, password },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Unable to create session" });
  }
});

// Simple top-up endpoint to add balance via one-time payment (optional)
router.post('/top-up', auth, async (req, res) => {
  try {
    const { amount } = req.body; // in USD
    if (!amount || amount < 5) {
      return res.status(400).json({ error: 'Minimum top-up is $5' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: "price_1RwNgNKggcV9qDyrId8dMMqM",
          quantity: 1,
        },
      ],
      success_url: `https://www.rankandrenttool.com/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.rankandrenttool.com`,
      metadata: { user_id: String(req.user.id), type: 'top_up', amount: String(amount) },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating top-up session:', err);
    res.status(500).json({ error: 'Unable to create top-up session' });
  }
});

// Top-up via predefined Stripe Price (e.g., $5 or $10 products)
router.post('/top-up-product', auth, async (req, res) => {
  try {
    const { priceId } = req.body;
    if (!priceId) {
      return res.status(400).json({ error: 'priceId is required' });
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price: "price_1RwNhYKggcV9qDyr9qMxPNjD",
          quantity: 1,
        },
      ],
      success_url: `https://www.rankandrenttool.com/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.rankandrenttool.com`,
      metadata: { user_id: String(req.user.id), type: 'top_up_product', price_id: priceId },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('Error creating product top-up session:', err);
    res.status(500).json({ error: 'Unable to create product top-up session' });
  }
});


// Stripe Webhook (this one needs raw body)
router.post("/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Webhook error:", err.message);
    return res.status(400).send(`Webhook error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    if (session.mode === 'subscription') {
      const { name, email, password } = session.metadata || {};
      const customerId = session.customer;
      try {
        if (email) {
          const existingUser = await User.findByEmail(email);
          if (!existingUser) {
            await User.create({
              name,
              email,
              password, // will be hashed inside your User.create
              stripe_customer_id: customerId,
              is_paid: true,
            });
          }
          console.log(`✅ Created paid user: ${email}`);
        }
      } catch (err) {
        console.error('❌ Error in user creation:', err.message);
      }
    } else if (
      session.mode === 'payment' &&
      (session.metadata?.type === 'top_up' || session.metadata?.type === 'top_up_product')
    ) {
      const userId = parseInt(session.metadata.user_id, 10);
      // Prefer Stripe-calculated amounts; fallback to metadata.amount
      const cents = typeof session.amount_subtotal === 'number'
        ? session.amount_subtotal
        : (typeof session.amount_total === 'number' ? session.amount_total : null);
      const amount = cents !== null ? cents / 100 : parseFloat(session.metadata.amount || '0');
      if (userId && amount > 0) {
        try {
          const user = await User.findById(userId);
          if (user) {
            const newBalance = parseFloat((parseFloat(user.balance || 0) + amount).toFixed(2));
            await User.updateBalance(userId, newBalance);
          }
        } catch (e) {
          console.error('Error applying top-up to user:', e);
        }
      }
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    try {
      await User.downgradeByCustomerId(customerId);
      console.log(`⚠️ User with Stripe ID ${customerId} downgraded`);
    } catch (err) {
      console.error("❌ DB error downgrading user:", err);
    }
  }

  res.json({ received: true });
});

module.exports = router;
