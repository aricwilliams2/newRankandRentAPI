// routes/stripeRoutes.js
const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

// Create Checkout Session
router.post("/create-checkout-session", async (req, res) => {
  const { userId } = req.body;

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: "price_1234", // Replace with your actual Price ID
          quantity: 1,
        },
      ],
      success_url: `https://www.rankandrenttool.com/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://www.rankandrenttool.com/cancel`,
      metadata: { userId },
    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("Error creating session:", error);
    res.status(500).json({ error: "Unable to create session" });
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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const userId = session.metadata.userId;

    try {
      await User.updateIsPaid(userId, true);
      console.log(`✅ User ${userId} marked as paid in DB.`);
    } catch (err) {
      console.error("❌ Error updating user:", err.message);
    }
  }
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    const customerId = subscription.customer;

    // ❌ Downgrade or revoke access
    await User.update({ stripeCustomerId: customerId }, { isPaid: false });
  }

  res.json({ received: true });
});

module.exports = router;
