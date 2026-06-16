/* ═══════════════════════════════════════════════════════
   VAGMINE OVERSEAS — server.js
   Node.js Express Backend — Google Gemini AI (FREE)
   ✅ No credit card needed
   ✅ 1,500 free requests/day
   ✅ Deploy on Railway.app or Render.com (free)
═══════════════════════════════════════════════════════ */

const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app  = express();
const port = process.env.PORT || 3001;

/* ─── Gemini Client ─── */
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',   // FREE model
  generationConfig: {
    maxOutputTokens: 400,
    temperature: 0.7,
  },
});

/* ─── Vagmine System Prompt ─── */
const SYSTEM_PROMPT = `You are Vagmine Assistant, the official AI sales and support agent for Vagmine Overseas Pvt. Ltd., a leading manufacturer of friction rubber compounds and industrial sealing products based in Tirunelveli, Tamil Nadu, India.

Your role:
1. Answer product queries about FRRC, FRC-25, FRC-10/12, Chopped Friction Cord, Granulated Friction Rubber, Reprocessed Rubber Compound, Tread Rubber Compounds, Industrial Hydraulic Seals, Pneumatic Rubber Seals.
2. Help clients find the right product for their application (braking, clutch, retreading, sealing).
3. After 3 user messages, politely collect: name, company, phone/email for a formal quote.
4. Always be professional, warm, and action-oriented.

Company Details:
- Address: B-59, SIPCOT Industrial Growth Centre, Gangaikondan, Tirunelveli-627352, Tamil Nadu
- Phone & WhatsApp: +91 9313146672
- Email: info@vagmineoverseas.com
- Certifications: ISO 9001:2015, BIS Certified, MSME Registered
- Markets: Pan India + Middle East, Southeast Asia, Europe

Products:
- Chopped Friction Cord: Reinforcement filler for brake/clutch linings
- FRC-25: Grade 25, medium hardness, commercial vehicle braking
- FRC-10/12: Grades 10 & 12, lighter duty, slab or granule form
- FRRC: High-friction, heat-resistant, heavy duty braking
- Granulated Friction Rubber: For compound formulation & retreading
- Reprocessed Rubber Compound: Cost-effective general industrial use
- Tread Rubber Compounds: Commercial tyre retreading (cold & hot cure)
- Industrial Hydraulic Seals: High-pressure, oil-resistant, custom profiles
- Pneumatic Rubber Seals: Low-friction, air cylinders, long service life

Keep responses concise (3-5 sentences). End with a helpful next step.`;

/* ─── Middleware ─── */
app.use(express.json({ limit: '10kb' }));

const allowedOrigins = [
  process.env.FRONTEND_URL || 'https://yourusername.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.some(o => origin.startsWith(o))) callback(null, true);
    else callback(new Error('CORS: origin not allowed'));
  },
  methods: ['POST', 'GET'],
}));

/* Rate limiting — 20 req / 10 mins per IP */
app.use('/chat', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  message: { error: 'Too many requests. Please try again shortly.' },
}));

/* ─── Health Check ─── */
app.get('/', (req, res) => {
  res.json({
    status:    'ok',
    service:   'Vagmine AI Backend (Gemini Free)',
    timestamp: new Date().toISOString(),
  });
});

/* ─── AI Chat Endpoint ─── */
app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Messages array is required.' });

    if (messages.length > 20)
      return res.status(400).json({ error: 'Conversation too long. Please start a new chat.' });

    /* Build Gemini conversation history */
    const history = messages
      .slice(0, -1) // all except last
      .filter(m => m.role && m.content)
      .map(m => ({
        role:  m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content.slice(0, 1000) }],
      }));

    const lastMessage = messages[messages.length - 1];
    const userText    = lastMessage?.content?.slice(0, 1000) || '';

    /* Start chat session with system context */
    const chat = model.startChat({
      history: [
        /* Inject system prompt as first exchange */
        { role: 'user',  parts: [{ text: 'Who are you and what can you help me with?' }] },
        { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(userText);
    const reply  = result.response.text() || 'I apologise, I could not generate a response. Please contact +91 9313146672.';

    res.json({ reply });

  } catch (err) {
    console.error('Gemini Error:', err.message);
    if (err.message?.includes('API_KEY'))
      return res.status(500).json({ error: 'API key error. Please check configuration.' });
    if (err.message?.includes('quota'))
      return res.status(429).json({ error: 'Daily free limit reached. Contact us directly.' });
    res.status(500).json({ error: 'Something went wrong. Call us: +91 9313146672' });
  }
});

/* ─── Lead Capture ─── */
app.post('/lead', (req, res) => {
  console.log('NEW LEAD:', { ...req.body, timestamp: new Date().toISOString() });
  res.json({ success: true });
});

/* ─── Start ─── */
app.listen(port, () => {
  console.log(`✅ Vagmine AI Backend (Gemini Free) running on port ${port}`);
});
