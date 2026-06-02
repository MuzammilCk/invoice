import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import multer from 'multer';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const upload = multer({ storage: multer.memoryStorage() });

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  const invoiceSchema = {
    type: Type.OBJECT,
    properties: {
      customerInfo: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING, description: 'Customer Name' },
          email: { type: Type.STRING, description: 'Customer Email' },
          address: { type: Type.STRING, description: 'Customer Address' }
        }
      },
      items: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            description: { type: Type.STRING, description: 'Line item description' },
            quantity: { type: Type.NUMBER, description: 'Quantity (must be a number)' },
            rate: { type: Type.NUMBER, description: 'Rate or price per item (must be a number)' }
          },
          required: ['description', 'quantity', 'rate']
        }
      },
      taxRate: { type: Type.NUMBER, description: 'Tax rate percentage (e.g., 10 for 10% tax)' },
      notes: { type: Type.STRING, description: 'Any extra notes or payment instructions' }
    },
    required: ['customerInfo', 'items']
  };

  // API Route: AI Invoice Generation
  app.post('/api/generate-invoice', async (req, res) => {
    try {
      const { prompt } = req.body;
      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let response;
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: 'You are an AI assistant that generates structured invoice data based on user prompts. Ensure the output strictly follows the required JSON schema.',
              responseMimeType: 'application/json',
              responseSchema: invoiceSchema
            },
          });
          break; // Success
        } catch (error: any) {
          retries--;
          const isUnavailable = error.status === 503 || error.status === 'UNAVAILABLE' || (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('high demand')));
          if (retries === 0 || !isUnavailable) {
            throw error;
          }
          console.warn(`Gemini API unavailable, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        }
      }

      if (!response || !response.text) {
        return res.status(500).json({ error: 'No content generated.' });
      }

      const generatedData = JSON.parse(response.text);
      res.json(generatedData);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to generate invoice' });
    }
  });

  // API Route: AI Audio to Invoice
  app.post('/api/audio-to-invoice', upload.single('audio'), async (req, res) => {
    try {
      const audioFile = req.file;
      const prompt = req.body.prompt || 'Listen to this audio and extract invoice details.';

      if (!audioFile) {
        return res.status(400).json({ error: 'Audio file is required' });
      }

      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

      let response;
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                inlineData: {
                  data: audioFile.buffer.toString("base64"),
                  mimeType: audioFile.mimetype || 'audio/webm'
                }
              },
              prompt
            ],
            config: {
              systemInstruction: 'You are an AI assistant that extracts structured invoice data from audio recordings. Ensure the output strictly follows the required JSON schema.',
              responseMimeType: 'application/json',
              responseSchema: invoiceSchema
            },
          });
          break;
        } catch (error: any) {
          retries--;
          const isUnavailable = error.status === 503 || error.status === 'UNAVAILABLE' || (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('high demand')));
          if (retries === 0 || !isUnavailable) {
            throw error;
          }
          console.warn(`Gemini API unavailable, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      if (!response || !response.text) {
        return res.status(500).json({ error: 'No content generated.' });
      }

      const generatedData = JSON.parse(response.text);
      res.json(generatedData);
    } catch (error: any) {
      console.error('Error in audio-to-invoice:', error);
      res.status(500).json({ error: error.message || 'Failed to process audio' });
    }
  });

  // API Route: AI Rewrite Text
  app.post('/api/rewrite', async (req, res) => {
    try {
      const { text, context } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is missing' });
      }

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const prompt = `Rewrite the following text to sound highly professional, suitable for a large MNC enterprise invoice or billing document. Context about the component: ${context}. Text to rewrite: ${text}`;
      
      let response;
      let retries = 3;
      let delay = 1000;
      
      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
          });
          break;
        } catch (error: any) {
          retries--;
          const isUnavailable = error.status === 503 || error.status === 'UNAVAILABLE' || (error.message && (error.message.includes('503') || error.message.includes('UNAVAILABLE') || error.message.includes('high demand')));
          if (retries === 0 || !isUnavailable) {
            throw error;
          }
          console.warn(`Gemini API unavailable, retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2;
        }
      }

      res.json({ text: response?.text });
    } catch (error: any) {
      console.error('Error rewriting text:', error);
      res.status(500).json({ error: error.message || 'Failed to rewrite text' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production serving
    const distPath = path.join(__dirname, '..', 'dist'); // Because server.cjs will be in dist/
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
