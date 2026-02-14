interface TTSRequest {
    text: string;
    languageCode?: string;
    name?: string;
    gender?: 'MALE' | 'FEMALE' | 'NEUTRAL';
}

const TTS_API_URL = 'https://texttospeech.googleapis.com/v1/text:synthesize';

// Voices to try in order of preference
const VOICE_PREFERENCES = [
    'th-TH-Neural2-C',   // Premium female neural voice
    'th-TH-Standard-A',  // Standard female voice (always available)
];

export async function synthesizeSpeechGoogle(params: TTSRequest): Promise<Buffer> {
    const apiKey = process.env.GOOGLE_CLOUD_API_KEY;
    if (!apiKey) {
        throw new Error('GOOGLE_CLOUD_API_KEY not configured');
    }

    const url = `${TTS_API_URL}?key=${apiKey}`;
    const voiceName = params.name || VOICE_PREFERENCES[0];

    const payload = {
        input: { text: params.text },
        voice: {
            languageCode: params.languageCode || 'th-TH',
            name: voiceName,
            ssmlGender: params.gender || 'FEMALE'
        },
        audioConfig: {
            audioEncoding: 'MP3' as const,
            speakingRate: 0.95,  // Slightly slower for clarity
        }
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error('Google TTS API error:', errorBody);

            // If Neural voice fails (billing), retry with Standard voice
            if (voiceName === VOICE_PREFERENCES[0] && VOICE_PREFERENCES.length > 1) {
                console.log('[TTS] Neural voice failed, retrying with Standard voice...');
                return synthesizeSpeechGoogle({
                    ...params,
                    name: VOICE_PREFERENCES[1],
                });
            }

            throw new Error(`Google TTS API returned ${response.status}: ${errorBody}`);
        }

        const data: { audioContent?: string } = await response.json();
        if (data && data.audioContent) {
            return Buffer.from(data.audioContent, 'base64');
        }
        throw new Error('No audio content received from Google TTS');
    } catch (error: any) {
        // Don't double-wrap errors from retry
        if (error.message?.startsWith('Google TTS API returned')) throw error;
        console.error('Google TTS Error:', error.message);
        throw new Error(`Google TTS failed: ${error.message}`);
    }
}
