import { useState, useCallback, useRef, useEffect } from 'react';
import AIAvatar from './AIAvatar';
import { useVoiceChat } from '../hooks/useVoiceChat';
import { Volume2, VolumeX, Loader2, Mic, Send, Sparkles } from 'lucide-react';
import api from '../lib/api';

interface ConversationMessage {
  role: 'ai' | 'nurse';
  text: string;
}

interface VoiceChatPanelProps {
  sessionId: string;
  onConversationComplete: (history: ConversationMessage[]) => void;
  disabled?: boolean;
}

export default function VoiceChatPanel({ sessionId, onConversationComplete, disabled }: VoiceChatPanelProps) {
  const [history, setHistory] = useState<ConversationMessage[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState('');
  const [started, setStarted] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const isProcessing = useRef(false);
  const turnTokenRef = useRef(0);

  const {
    state: voiceState,
    isSupported,
    interimText,
    startListening,
    stopListening,
    speak,
    cancelSpeech,
  } = useVoiceChat({
    lang: 'th-TH',
    rate: 0.95,
    onError: (message: string) => {
      setError(message);
      isProcessing.current = false;
    },
    onTranscript: (text: string) => {
      if (text.trim() && !isProcessing.current) {
        handleNurseResponse(text.trim());
      }
    },
  });

  const avatarState = isLoading ? 'thinking' : voiceState === 'speaking' ? 'speaking' : voiceState === 'listening' ? 'listening' : 'idle';

  // Auto-scroll to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, interimText]);

  // Call AI for next turn
  const getAIResponse = useCallback(async (currentHistory: ConversationMessage[]) => {
    setIsLoading(true);
    setError('');
    isProcessing.current = true;
    const currentTurnToken = Date.now();
    turnTokenRef.current = currentTurnToken;
    try {
      const res = await api.post(`/assessments/${sessionId}/chat`, {
        history: currentHistory,
      });

      const { message, isComplete: done } = res.data;
      const safeMessage = typeof message === 'string' && message.trim()
        ? message.trim()
        : 'ขออภัยค่ะ ระบบตอบกลับไม่สมบูรณ์ กรุณาลองพูดอีกครั้ง';

      const safeDone = typeof done === 'boolean' ? done : false;

      const newHistory: ConversationMessage[] = [
        ...currentHistory,
        { role: 'ai' as const, text: safeMessage },
      ];
      setHistory(newHistory);

      if (safeDone) {
        setIsComplete(true);
        if (!isMuted) {
          await speak(safeMessage);
        }
        onConversationComplete(newHistory);
      } else {
        if (!isMuted) {
          await speak(safeMessage);
        }
        if (turnTokenRef.current === currentTurnToken) {
          isProcessing.current = false;
          startListening();
        }
      }
    } catch (err: any) {
      console.error('AI chat error:', err);
      setError(err.response?.data?.error || 'เกิดข้อผิดพลาดในการสนทนา');
      isProcessing.current = false;
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, speak, startListening, isMuted, onConversationComplete]);

  // Start conversation
  const handleStart = useCallback(async () => {
    setStarted(true);
    await getAIResponse([]);
  }, [getAIResponse]);

  // Handle nurse's spoken response
  const handleNurseResponse = useCallback(async (text: string) => {
    if (isComplete || isProcessing.current) return;
    isProcessing.current = true;
    stopListening();

    const newHistory: ConversationMessage[] = [
      ...history,
      { role: 'nurse' as const, text },
    ];
    setHistory(newHistory);

    setTimeout(() => getAIResponse(newHistory), 300);
  }, [history, isComplete, stopListening, getAIResponse]);

  // Manual stop listening
  const handleStopAndSubmit = useCallback(() => {
    stopListening();
  }, [stopListening]);

  // Skip TTS
  const handleSkipSpeech = useCallback(() => {
    cancelSpeech();
    if (!isComplete) {
      isProcessing.current = false;
      startListening();
    }
  }, [cancelSpeech, isComplete, startListening]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    setIsMuted(m => {
      if (!m) cancelSpeech();
      return !m;
    });
  }, [cancelSpeech]);

  // Manual text input
  const [manualText, setManualText] = useState('');
  const handleManualSubmit = useCallback(() => {
    if (!manualText.trim() || isComplete || isProcessing.current) return;
    handleNurseResponse(manualText.trim());
    setManualText('');
  }, [manualText, isComplete, handleNurseResponse]);

  const handleCompleteAndAssess = useCallback(async () => {
    if (isComplete || isLoading) return;
    stopListening();
    cancelSpeech();
    const nurseTurns = history.filter((item) => item.role === 'nurse' && item.text.trim()).length;
    if (nurseTurns === 0) {
      setError('กรุณาตอบอย่างน้อย 1 ครั้งก่อนจบการสนทนา');
      return;
    }
    isProcessing.current = true;
    setIsComplete(true);
    await onConversationComplete(history);
  }, [history, isComplete, isLoading, stopListening, cancelSpeech, onConversationComplete]);

  if (!isSupported) {
    return (
      <div className="card bg-amber-50 border-amber-200 text-center p-8">
        <p className="font-semibold text-amber-700">เบราว์เซอร์ไม่รองรับ Web Speech API</p>
        <p className="text-sm text-amber-600 mt-1">กรุณาใช้ Google Chrome เวอร์ชันล่าสุด</p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden !p-0">
      {/* Header */}
      <div className="relative overflow-hidden px-5 py-4 bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white rounded-full blur-3xl" />
        </div>
        <div className="relative flex items-center justify-between">
          <h3 className="text-white font-bold flex items-center gap-2 text-base">
            <Sparkles className="w-5 h-5 text-accent-200" />
            AI Avatar — สนทนาประเมินสมรรถนะ
          </h3>
          <button
            onClick={toggleMute}
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all backdrop-blur-sm"
            title={isMuted ? 'เปิดเสียง' : 'ปิดเสียง'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="p-5">
        {/* Avatar */}
        <div className="flex justify-center py-3">
          <AIAvatar state={avatarState} size={160} />
        </div>

        {/* Not started */}
        {!started && (
          <div className="text-center py-6 animate-fade-in-up">
            <p className="text-surface-600 mb-2 font-medium">
              AI Avatar จะสนทนากับคุณเพื่อประเมินสมรรถนะทางการพยาบาล
            </p>
            <p className="text-sm text-surface-400 mb-5">
              ระบบจะถาม 3-4 คำถามเกี่ยวกับกรณีศึกษา แล้วประเมินจากคำตอบของคุณ
            </p>

            {/* Tips */}
            <div className="mb-6 p-4 bg-primary-50 text-primary-700 text-sm rounded-2xl text-left inline-block border border-primary-100">
              <p className="font-semibold mb-2 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary-500" />
                คำแนะนำ
              </p>
              <ul className="space-y-1.5 text-primary-600/80">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                  ควรใช้ <strong>Google Chrome</strong> หรือ <strong>Microsoft Edge</strong> บน PC
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                  กรุณาใช้ <strong>ไมโครโฟน/หูฟัง</strong> ในสภาพแวดล้อมที่เงียบ
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5 w-1 h-1 rounded-full bg-primary-400 flex-shrink-0" />
                  พูดภาษาไทยด้วยน้ำเสียงปกติ ชัดเจน
                </li>
              </ul>
            </div>

            <button
              onClick={handleStart}
              disabled={disabled}
              className="btn-primary text-lg px-8 py-3.5 shadow-glow hover:shadow-glow-lg transition-all"
            >
              <span className="flex items-center gap-2">
                <Mic className="w-5 h-5" />
                เริ่มสนทนากับ AI Avatar
              </span>
            </button>
          </div>
        )}

        {/* Conversation */}
        {started && (
          <>
            <div className="h-80 overflow-y-auto px-1 py-2 space-y-3 mt-2">
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === 'nurse' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}
                  style={{ animationDelay: '50ms' }}
                >
                  <div
                    className={`max-w-[80%] min-w-0 rounded-2xl px-4 py-3 text-sm leading-relaxed shadow-sm ${msg.role === 'ai'
                      ? 'bg-surface-50 border border-surface-100 text-surface-800 rounded-bl-md'
                      : 'bg-gradient-to-r from-primary-600 to-primary-500 text-white rounded-br-md shadow-glow-sm'
                      }`}
                  >
                    <p className="text-[10px] font-semibold mb-1 opacity-50 uppercase tracking-wider">
                      {msg.role === 'ai' ? '🤖 AI Avatar' : '👩‍⚕️ คุณ'}
                    </p>
                    <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                  </div>
                </div>
              ))}

              {/* Interim speech text */}
              {voiceState === 'listening' && interimText && (
                <div className="flex justify-end animate-fade-in">
                  <div className="max-w-[80%] min-w-0 rounded-2xl px-4 py-3 text-sm bg-primary-50 text-primary-700 rounded-br-md italic border border-primary-100 whitespace-pre-wrap break-words">
                    {interimText}...
                  </div>
                </div>
              )}

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex justify-start animate-fade-in">
                  <div className="bg-surface-50 border border-surface-100 rounded-2xl px-4 py-3 rounded-bl-md">
                    <div className="flex items-center gap-2 text-sm text-surface-400">
                      <Loader2 className="w-4 h-4 animate-spin text-primary-500" />
                      <span>กำลังคิด...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatEndRef} />
            </div>

            {/* Controls */}
            {!isComplete && (
              <div className="mt-4 space-y-3">
                {/* Voice control button */}
                <div className="flex items-center justify-center">
                  {!isLoading && (
                    <button
                      onClick={() => {
                        if (voiceState === 'listening') {
                          handleStopAndSubmit();
                          return;
                        }
                        if (voiceState === 'speaking') {
                          handleSkipSpeech();
                          return;
                        }
                        isProcessing.current = false;
                        startListening();
                      }}
                      className={`
                        flex items-center gap-2 px-8 py-3.5 text-white rounded-2xl font-semibold transition-all duration-300
                        ${voiceState === 'listening'
                          ? 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25 animate-pulse scale-105'
                          : voiceState === 'speaking'
                            ? 'bg-surface-400 hover:bg-surface-500'
                            : 'bg-gradient-to-r from-primary-600 to-primary-500 hover:shadow-glow active:scale-[0.98]'
                        }`}
                    >
                      {voiceState === 'listening' ? (
                        <>
                          <div className="w-3 h-3 bg-white rounded-sm" />
                          <span>หยุดพูด & ส่งคำตอบ</span>
                        </>
                      ) : voiceState === 'speaking' ? (
                        <span>⏭️ ข้ามเสียงพูด</span>
                      ) : (
                        <>
                          <Mic className="w-5 h-5" />
                          <span>กดเพื่อพูด</span>
                        </>
                      )}
                    </button>
                  )}
                </div>

                {/* Manual text fallback */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="input-field flex-1 text-sm !rounded-xl"
                    placeholder="หรือพิมพ์คำตอบที่นี่..."
                    value={manualText}
                    onChange={e => setManualText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleManualSubmit()}
                    disabled={isLoading || voiceState === 'speaking'}
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={!manualText.trim() || isLoading || voiceState === 'speaking'}
                    className="btn-primary !px-4 !rounded-xl"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex justify-center">
                  <button
                    onClick={handleCompleteAndAssess}
                    disabled={isLoading || history.filter((item) => item.role === 'nurse' && item.text.trim()).length === 0}
                    className="btn-secondary text-sm"
                  >
                    จบการสนทนาและประเมินผล
                  </button>
                </div>
              </div>
            )}

            {/* Conversation complete */}
            {isComplete && (
              <div className="mt-5 text-center py-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border border-emerald-100 animate-scale-in">
                <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-sm">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <p className="font-semibold text-emerald-700">สนทนาเสร็จสิ้น</p>
                <p className="text-sm text-emerald-600 mt-1">กำลังประมวลผลคะแนนจากบทสนทนา...</p>
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="mt-3 p-4 bg-red-50 border border-red-100 rounded-2xl animate-scale-in">
                <p className="text-sm text-red-700 font-medium">{error}</p>
                <button
                  onClick={() => { setError(''); isProcessing.current = false; }}
                  className="text-xs text-red-500 hover:text-red-700 font-semibold mt-2 transition-colors"
                >
                  ลองอีกครั้ง
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
