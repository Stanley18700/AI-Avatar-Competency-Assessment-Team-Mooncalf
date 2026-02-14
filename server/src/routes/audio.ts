import { Router } from 'express';
import { synthesizeSpeechGoogle } from '../services/googleTtsService';

const router = Router();

// Google Cloud TTS has a 5000-byte limit per request
const MAX_TEXT_LENGTH = 800;

// POST /api/audio/synthesize
router.post('/synthesize', async (req, res) => {
    try {
        const { text, gender } = req.body;

        if (!text) {
            res.status(400).json({ error: 'Text is required' });
            return;
        }

        // Truncate if too long for TTS
        const safeText = text.length > MAX_TEXT_LENGTH
            ? text.slice(0, MAX_TEXT_LENGTH) + '...'
            : text;

        const audioBuffer = await synthesizeSpeechGoogle({
            text: safeText,
            languageCode: 'th-TH',
            gender: gender || 'FEMALE'
        });

        res.set({
            'Content-Type': 'audio/mpeg',
            'Content-Length': String(audioBuffer.length),
            'Cache-Control': 'no-cache',
        });

        res.send(audioBuffer);
    } catch (error: any) {
        console.error('TTS Route Error:', error.message);
        res.status(500).json({ error: 'TTS synthesis failed', detail: error.message });
    }
});

export default router;
