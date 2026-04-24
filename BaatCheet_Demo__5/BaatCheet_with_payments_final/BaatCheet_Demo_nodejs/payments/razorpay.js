require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require('crypto');

const TIERS = {
  green: {
    amount: 15000,
    label: 'Guided Listener',
    description: 'Peer support · Basic listening',
  },
  yellow: {
    amount: 25000,
    label: 'Trained Listener',
    description: 'More experienced support',
  },
  red: {
    amount: 200000,
    label: 'Clinical Psychologist',
    description: 'Licensed professional session',
  },
};

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'demo_secret',
});

async function createOrder(req, res) {
  try {
    const { tier, phone } = req.body;

    if (!TIERS[tier]) {
      return res.status(400).json({
        error: "Invalid tier. Use green, yellow, or red.",
      });
    }

    const config = TIERS[tier];

    const options = {
      amount: config.amount,
      currency: 'INR',
      receipt: `baatcheet_${tier}_${Date.now()}`,
      notes: {
        tier,
        label: config.label,
        user_phone: phone || 'unknown',
        description: config.description,
      },
    };

    // Demo mode
    if (!process.env.RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID === 'rzp_test_demo') {
      return res.json({
        id: `order_DEMO_${Date.now()}`,
        amount: config.amount,
        currency: 'INR',
        tier,
        label: config.label,
        demo: true,
      });
    }

    const order = await razorpay.orders.create(options);

    return res.json({
      ...order,
      tier,
      label: config.label,
      key_id: process.env.RAZORPAY_KEY_ID,
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment failed' });
  }
}

function verifyPayment(orderId, paymentId, signature) {
  const body = `${orderId}|${paymentId}`;

  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'demo_secret')
    .update(body)
    .digest('hex');

  return expected === signature;
}

module.exports = { createOrder, verifyPayment, TIERS };