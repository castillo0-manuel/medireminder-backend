const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'MediReminder Backend v2' });
});

// Endpoint temporal para ver modelos disponibles
app.get('/models', async (req, res) => {
  try {
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models?key=' + GEMINI_API_KEY);
    const data = await r.json();
    const names = (data.models || []).map(m => m.name);
    res.json({ models: names });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/chat', async (req, res) => {
  try {
    const { system, messages } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'GEMINI_API_KEY no configurada' });
    }

    const lastMessage = messages[messages.length - 1];
    const prevMessages = messages.slice(0, -1);

    const systemPrefix = system ? system + '\n\n---\n\n' : '';

    const geminiHistory = prevMessages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    let contents;
    if (geminiHistory.length === 0) {
      contents = [
        { role: 'user', parts: [{ text: systemPrefix + lastMessage.content }] }
      ];
    } else {
      const first = geminiHistory[0];
      contents = [
        { role: 'user', parts: [{ text: systemPrefix + first.parts[0].text }] },
        ...geminiHistory.slice(1),
        { role: 'user', parts: [{ text: lastMessage.content }] }
      ];
    }

    const body = JSON.stringify({
      contents: contents,
      generationConfig: {
        maxOutputTokens: 1024,
        temperature: 0.7
      }
    });

    const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY;

    const geminiRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body
    });

    const data = await geminiRes.json();

    if (!geminiRes.ok) {
      console.error('Gemini error:', JSON.stringify(data));
      return res.status(500).json({ error: data.error ? data.error.message : 'Error de Gemini' });
    }

    const text = data.candidates &&
                 data.candidates[0] &&
                 data.candidates[0].content &&
                 data.candidates[0].content.parts &&
                 data.candidates[0].content.parts[0] &&
                 data.candidates[0].content.parts[0].text
                 ? data.candidates[0].content.parts[0].text
                 : 'Sin respuesta';

    res.json({ content: [{ type: 'text', text: text }] });

  } catch (error) {
    console.error('Backend error:', error.message);
    res.status(500).json({ error: error.message || 'Error interno' });
  }
});

app.listen(PORT, function() {
  console.log('MediReminder Backend v2 corriendo en puerto ' + PORT);
});
