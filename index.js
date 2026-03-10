const express = require('express');
const cors = require('cors');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Cliente Anthropic ────────────────────────────────────────────
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── Health check ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'MediReminder Backend' });
});

// ── Chat endpoint ─────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    const { system, messages, max_tokens = 1024 } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens,
      system,
      messages,
    });

    res.json({
      content: response.content,
      usage: response.usage,
    });
  } catch (error) {
    console.error('Anthropic API error:', error);
    res.status(500).json({
      error: error.message || 'Error calling Anthropic API',
    });
  }
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MediReminder Backend corriendo en puerto ${PORT}`);
});
