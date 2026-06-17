const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const port = process.env.PORT || 3001;

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
  model: 'gemini-pro',
  generationConfig: { maxOutputTokens: 400, temperature: 0.7 },
});

const SYSTEM_PROMPT = `You are Vagmine Assistant, the official AI sales agent for Vagmine Overseas Pvt. Ltd., manufacturer of friction rubber compounds in Tirunelveli, Tamil Nadu, India.

Company: Founded 2010 | Third-generation | 40+ years expertise | 2400+ MT/year
Address: B-59, SIPCOT Industrial Growth Centre, Gangaikondan, Tirunelveli-627352, Tamil Nadu
Phone: +91 9313146672 | Email: info@vagmineoverseas.com
Certifications: ISO 9001:2015, BIS Certified, MSME Registered
Clients: TVS/Sundaram, Yokohama-ATG, BKT, Nexen, Global Rubber Sri Lanka
Export: India, Korea, China, Sri Lanka, USA, UAE

Products: FRRC (granules), FRC (baled), FRC-25, FRC-10/12, Chopped Friction Cord, Granulated Rubber (30-45ft rolls), Reprocessed Rubber, Tread Compounds, Hydraulic Seals, Pneumatic Seals.

Be professional, warm, concise. After 3 messages ask for name, company, contact.`;

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.set('trust proxy', 1);

app.use('/chat', rateLimit({
  windowMs: 10 * 60 * 1000, max: 30,
  message: { error: 'Too many requests.' },
}));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'Vagmine AI Backend' });
});

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

    const userText = messages[messages.length - 1]?.content?.slice(0, 1000) || '';

    const chat = model.startChat({
      history: [
        { role: 'user', parts: [{ text: 'Who are you?' }] },
        { role: 'model', parts: [{ text: SYSTEM_PROMPT }] },
        ...history,
      ],
    });

    const result = await chat.sendMessage(userText);
    const reply = result.response.text() || 'Please contact +91 9313146672.';
    res.json({ reply });

  } catch (err) {
    console.error('Error:', err.message);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(port, () => console.log(`Vagmine AI Backend running on port ${port}`));
