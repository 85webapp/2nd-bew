/**
 * Vercel Serverless API Function: /api/estamp/analyze
 * Uses @google/genai (gemini-4-hydrogen) on the server side to inspect an uploaded
 * e-Stamp Paper (image or PDF) and detect the exact blank writing area below the
 * printed certificate header and notice line.
 */

import { GoogleGenAI, Type } from '@google/genai';

function parseDataUri(dataUri) {
  const match = String(dataUri || '').match(/^data:([^;]+);base64,(.+)$/s);
  if (match) {
    return { mimeType: match[1].trim(), data: match[2].replace(/\s+/g, '') };
  }
  return null;
}

export default async function handler(req, res) {
  const reqOrigin = req.headers['origin'] || '*';
  res.setHeader('Access-Control-Allow-Origin', reqOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return res.status(503).json({
      success: false,
      error: 'GEMINI_API_KEY is not configured in server environment.'
    });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const { fileDataUri } = body;
    if (!fileDataUri) {
      return res.status(400).json({ success: false, error: 'fileDataUri is required' });
    }

    const parsed = parseDataUri(fileDataUri);
    if (!parsed) {
      return res.status(400).json({
        success: false,
        error: 'Invalid fileDataUri format. Expected base64 data URI.'
      });
    }

    const ai = new GoogleGenAI({
      apiKey: apiKey.trim(),
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });

    const prompt = `Inspect this Indian e-Stamp Certificate / Non-Judicial Stamp Paper scan carefully.
Identify:
1. Whether this is an official e-Stamp / stamp paper.
2. The exact vertical percentage from the TOP of the page (0 to 100) where the printed e-Stamp certificate header, table, and any notice line (such as "Write down the agreement", "Please write or type below this line", or horizontal divider line) END and the lower blank white area for typing the agreement BEGINS (blankStartPercent). Usually on Indian e-Stamp certificates this is between 42 and 68 percent.
3. Where the usable blank space ends near the bottom margin (blankEndPercent, typically 93 to 96).
4. Any visible notice/divider text, Certificate No / UIN, Stamp Duty Amount, State, Article/Purpose, First Party, and Second Party.`;

    const modelsToTry = ['gemini-4-hydrogen', 'gemini-3.8-flash'];
    let response = null;
    let lastModelErr = null;
    for (const modelName of modelsToTry) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [
              {
                inlineData: {
                  mimeType: parsed.mimeType,
                  data: parsed.data
                }
              },
              { text: prompt }
            ]
          },
          config: {
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isEStampDetected: { type: Type.BOOLEAN },
                blankStartPercent: { type: Type.NUMBER, description: 'Vertical % from top (0-100) where blank agreement space starts below the stamp header and notice line.' },
                blankEndPercent: { type: Type.NUMBER, description: 'Vertical % from top (0-100) where usable bottom margin ends.' },
                noticeLineText: { type: Type.STRING, description: 'Exact text of the notice or instruction line above the blank area, if present.' },
                uin: { type: Type.STRING },
                stampDutyAmount: { type: Type.NUMBER },
                state: { type: Type.STRING },
                article: { type: Type.STRING },
                firstParty: { type: Type.STRING },
                secondParty: { type: Type.STRING },
                reasoning: { type: Type.STRING }
              },
              required: ['isEStampDetected', 'blankStartPercent', 'blankEndPercent']
            }
          }
        });
        break;
      } catch (mErr) {
        lastModelErr = mErr;
      }
    }

    if (!response) {
      throw lastModelErr || new Error('Gemini analysis unavailable');
    }

    const rawText = (response.text || '{}').trim();
    const analysis = JSON.parse(rawText);

    const startPct = Math.min(80, Math.max(20, Number(analysis.blankStartPercent) || 54));
    const endPct = Math.min(97, Math.max(startPct + 12, Number(analysis.blankEndPercent) || 94));
    const topOffsetPt = Math.round((startPct / 100) * 841.89);

    return res.status(200).json({
      success: true,
      analysis: {
        ...analysis,
        blankStartPercent: Math.round(startPct * 10) / 10,
        blankEndPercent: Math.round(endPct * 10) / 10,
        topOffsetPt
      }
    });
  } catch (err) {
    console.error('Gemini e-Stamp analysis error:', err);
    return res.status(500).json({
      success: false,
      error: err?.message || 'Failed to analyze e-Stamp paper with Gemini AI'
    });
  }
}
