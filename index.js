const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ───────────────────────────────────────────────────
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ── Health check ─────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'MediReminder Backend' });
});

// ── Chat endpoint ─────────────────────────────────────────────────
app.post('/chat', async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });
    }

    // Convertir historial al formato de Gemini
    // Gemini usa 'user' y 'model' (no 'assistant')
    const geminiHistory = messages.slice(0, -1).map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    // Último mensaje del usuario
    const lastMessage = messages[messages.length - 1];

    const body = {
      system_instruction: system ? { parts: [{ text: system }] } : undefined,
      contents: [
        ...geminiHistory,
        { role: 'user', parts: [{ text: lastMessage.content }] },
      ],
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7,
      },
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', data);
      return res.status(500).json({ error: data?.error?.message || 'Error de Gemini' });
    }

    // Extraer texto de la respuesta de Gemini
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sin respuesta';

    // Devolver en el mismo formato que espera ChatbotScreen
    res.json({
      content: [{ type: 'text', text }],
    });

  } catch (error) {
    console.error('Backend error:', error);
    res.status(500).json({ error: error.message || 'Error interno del servidor' });
  }
});

// ── Start ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ MediReminder Backend (Gemini) corriendo en puerto ${PORT}`);
});
