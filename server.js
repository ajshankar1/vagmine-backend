const express   = require('express');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app  = express();
const port = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash-latest',
  generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
});

const SYSTEM_PROMPT = `You are Vagmine Assistant, the official AI sales and support agent for Vagmine Overseas Pvt. Ltd., a leading manufacturer of friction rubber compounds based in Tirunelveli, Tamil Nadu, India.

Company Details:
- Founded: 2010 | Third-generation | 40+ years expertise | 2,400+ MT/year
- Address: B-59, SIPCOT Industrial Growth Centre, Gangaikondan, Tirunelveli-627352, Tamil Nadu
- Phone & WhatsApp: +91 9313146672
- Email: info@vagmineoverseas.com
- Certifications: ISO 9001:2015, BIS Certified, MSME Registered
- USA Office: Delaware (North America)
- Clients: Sundaram Industries (TVS Group), Yokohama-ATG, BKT Tyres, Nexen Tyre, Global Rubber Sri Lanka
- Export: India, South Korea, China, Sri Lanka, USA, UAE

Products:
1. FRRC - Fiber Reinforced Rubber Compound: half to 1 inch granules, quick mill dispersion, solid tyres
2. FRC - Friction Rubber Compound (Baled): high friction, industrial and off-highway applications
3. FRC-25: Grade 25, medium hardness, commercial vehicle braking
4. FRC-10/12: Grades 10 and 12, lighter duty, slab or granule form
5. Chopped Friction Cord: reinforcement filler for brake and clutch linings
6. Granulated Friction Rubber: 30-45ft rolls, 7mm thick, custom preforms, solid tyre building
7. Reprocessed Rubber Compound: cost-effective general industrial use
8. Tread Rubber Compounds: abrasion resistant, high flexibility, commercial tyre retreading
9. Industrial Hydraulic Seals: high-pressure, oil-resistant, custom profiles
10. Pneumatic Rubber Seals: low friction, air cylinders, long service life

Your Role:
- Answer product queries professionally
- Help buyers find the right product for their application
- After 3 messages, collect: name, company, phone, email for a quote
- Be concise (3-4 sentences), warm, and action-oriented
- Always end with a helpful next step`;

/* ── CORS — allow all origins ── */
app.use(cors());
app.use(express.json({ limit: '10kb' }));

/* Rate limiting */
app.use('/chat', rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  message: { error: 'Too many requests. Please try again shortly.' },
}));

/* Health check */
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Vagmine AI Backend', timestamp: new Date().toISOString() });
});

/* AI Chat */
app.post('/chat', async (req, res) => {
  try {
    const { messages } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0)
      return res.status(400).json({ error: 'Messages required.' });

    const history = messages.slice(0, -1)
      .filter(m => m.role && m.content)
      .map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content.slice(0, 1000) }],
      }));

    const lastMessage = messages[messages.length - 1];
    const userText = lastMessage?.content?.slice(0, 1000) || '';

    const chat = model.startChat({
      history: [
        { role: 'user',  parts: [{ text: 'Who are you?' }] },
        { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(userText);
    const reply = result.response.text() || 'Please contact us at +91 9313146672.';
    res.json({ reply });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Something went wrong. Call: +91 9313146672' });
  }
});

app.listen(port, () => console.log(`Vagmine AI Backend running on port ${port}`));
