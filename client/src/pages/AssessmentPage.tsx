import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { statusColors } from '../lib/i18n';
import VoiceChatPanel from '../components/VoiceChatPanel';
import VoiceChatErrorBoundary from '../components/VoiceChatErrorBoundary';
import { formatDateTime, getGapClass, getGapDisplay, getScoreColor } from '../lib/utils';
import { AssessmentSession, CompetencyGroup, StandardLevel } from '../types';
import { ArrowLeft, Send, Mic, MicOff, Loader2, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

export default function AssessmentPage() {
  const { t, experienceLevelLabels, statusLabels } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<AssessmentSession | null>(null);
  const [competencies, setCompetencies] = useState<CompetencyGroup[]>([]);
  const [selfScores, setSelfScores] = useState<Record<string, number>>({});
  const [responseText, setResponseText] = useState('');
  const [step, setStep] = useState<'loading' | 'self-assess' | 'respond' | 'evaluating' | 'results'>('loading');
  const [submitting, setSubmitting] = useState(false);
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [useVoiceMode, setUseVoiceMode] = useState(true); // Default to voice mode

  // Load ALL competencies (Core + Functional + Specific + Managerial)
  // per Nursing Council Standards, self-assessment covers all categories
  const [allCompetencies, setAllCompetencies] = useState<CompetencyGroup[]>([]);

  useEffect(() => {
    loadData();
    api.get('/competencies').then(r => {
      const all: CompetencyGroup[] = r.data;
      setAllCompetencies(all);
      // AI-assessed only (for results display columns)
      setCompetencies(all.filter(g => g.assessedByAI));
    });
  }, [id]);

  const loadData = async () => {
    try {
      const res = await api.get(`/assessments/${id}`);
      const s = res.data;
      setSession(s);

      // Set initial self scores if they exist
      if (s.selfScores && s.selfScores.length > 0) {
        const scores: Record<string, number> = {};
        s.selfScores.forEach((ss: any) => { scores[ss.criteriaId] = ss.score; });
        setSelfScores(scores);
      }

      // Determine step
      if (s.status === 'IN_PROGRESS') setStep('self-assess');
      else if (s.status === 'SELF_ASSESSED') setStep('respond');
      else if (s.status === 'AI_SCORED' || s.status === 'REVIEWED' || s.status === 'APPROVED') setStep('results');
      else if (s.status === 'AI_FAILED') setStep('results');
      else setStep('self-assess');
    } catch {
      navigate('/my-assessments');
    }
  };

  const submitSelfScores = async () => {
    setSubmitting(true);
    try {
      const scores = Object.entries(selfScores).map(([criteriaId, score]) => ({ criteriaId, score }));
      await api.post(`/assessments/${id}/self-score`, { scores });
      setStep('respond');
      await loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    } finally {
      setSubmitting(false);
    }
  };

  const submitResponse = async () => {
    if (!responseText.trim()) { alert('กรุณาตอบคำถาม'); return; }
    setSubmitting(true);
    setStep('evaluating');
    try {
      const result = await api.post(`/assessments/${id}/submit`, { text: responseText, inputType: 'TEXT' });
      console.log('Submit response result:', result.data);
      await loadData();
      setStep('results');
    } catch (err: any) {
      console.error('Submit response error:', err);
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'เกิดข้อผิดพลาด';
      alert(errorMsg);
      setStep('respond');
    } finally {
      setSubmitting(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      recorder.ondataavailable = e => chunks.push(e.data);
      recorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        // For now, just show that recording was captured
        // In production, we'd send this to Google Speech-to-Text
        alert('บันทึกเสียงเสร็จสิ้น กรุณาพิมพ์คำตอบแทน (Speech-to-text จะเปิดใช้เมื่อตั้งค่า Google Cloud)');
      };
      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      alert('ไม่สามารถเข้าถึงไมโครโฟนได้');
    }
  };

  const stopRecording = () => {
    mediaRecorder?.stop();
    setRecording(false);
  };

  if (step === 'loading' || !session) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  const standardMap: Record<string, number> = {};
  (session.standardLevels || []).forEach((sl: StandardLevel) => { standardMap[sl.criteriaId] = sl.standardScore; });

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate('/my-assessments')} className="p-1 hover:bg-surface-200 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-surface-900">{session.case?.titleTh || session.case?.title}</h2>
          <p className="text-sm text-surface-500">
            {experienceLevelLabels[session.experienceLevel]} · {formatDateTime(session.createdAt)}
            <span className={`badge ${statusColors[session.status]} ml-2`}>{statusLabels[session.status]}</span>
          </p>
        </div>
      </div>

      {/* Step: Self Assessment */}
      {step === 'self-assess' && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-2">{t.selfAssessment}</h3>
          <p className="text-sm text-surface-500 mb-4">ให้คะแนนตัวเอง 1-5 ในแต่ละสมรรถนะ (1=มือใหม่, 5=เชี่ยวชาญ)</p>

          {allCompetencies.map(group => (
            <div key={group.id} className="mb-6">
              <h4 className="font-medium text-primary-700 mb-1">{group.nameTh}</h4>
              {!group.assessedByAI && (
                <p className="text-xs text-amber-600 mb-2">* ประเมินโดยตนเองและหัวหน้างาน (ไม่มีการประเมินจาก AI)</p>
              )}
              <div className="space-y-2">
                {group.criteria.map(c => (
                  <div key={c.id} className="flex items-center gap-4 p-3 bg-surface-100 rounded-lg border border-surface-200">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{c.nameTh}</p>
                      <p className="text-xs text-surface-400">{c.nameEn}</p>
                      <p className="text-xs text-surface-400">มาตรฐาน: {standardMap[c.id] || '-'}</p>
                    </div>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(score => (
                        <button
                          key={score}
                          onClick={() => setSelfScores({ ...selfScores, [c.id]: score })}
                          className={`w-10 h-10 rounded-lg text-sm font-bold transition-colors
                            ${selfScores[c.id] === score
                              ? 'bg-primary-600 text-white'
                              : 'bg-white border border-surface-300 hover:border-primary-400'}`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <button onClick={submitSelfScores} disabled={submitting} className="btn-primary w-full mt-4">
            {submitting ? t.loading : 'ถัดไป: ตอบกรณีศึกษา →'}
          </button>
        </div>
      )}

      {/* Step: Case Response — Voice Chat or Text */}
      {step === 'respond' && (
        <div className="space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center justify-center gap-2 text-sm">
            <button
              onClick={() => setUseVoiceMode(true)}
              className={`px-4 py-2 rounded-l-lg font-medium transition-colors ${
                useVoiceMode ? 'bg-indigo-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
              }`}
            >
              <span>🎙 สนทนาด้วยเสียง (Voice Chat)</span>
            </button>
            <button
              onClick={() => setUseVoiceMode(false)}
              className={`px-4 py-2 rounded-r-lg font-medium transition-colors ${
                !useVoiceMode ? 'bg-indigo-600 text-white' : 'bg-surface-100 text-surface-700 hover:bg-surface-200'
              }`}
            >
              <span>⌨️ พิมพ์คำตอบ (Text)</span>
            </button>
          </div>

          {/* Voice Chat Mode */}
          {useVoiceMode ? (
            <VoiceChatErrorBoundary>
              <VoiceChatPanel
                sessionId={id!}
                onConversationComplete={async (history) => {
                  setStep('evaluating');
                  setSubmitting(true);
                  try {
                    await api.post(`/assessments/${id}/submit-conversation`, { history });
                    await loadData();
                    setStep('results');
                  } catch (err: any) {
                    console.error('Submit conversation error:', err);
                    alert(err.response?.data?.error || 'เกิดข้อผิดพลาด');
                    setStep('respond');
                  } finally {
                    setSubmitting(false);
                  }
                }}
              />
            </VoiceChatErrorBoundary>
          ) : (
            /* Text Mode (original) */
            <>
              <div className="card">
                <h3 className="text-lg font-semibold mb-2">{t.caseScenario}</h3>
                <div className="prose prose-sm max-w-none bg-blue-50 p-4 rounded-lg whitespace-pre-wrap">
                  {session.case?.descriptionTh}
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold mb-2">{t.yourResponse}</h3>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={recording ? stopRecording : startRecording}
                    className={`btn-secondary flex items-center gap-2 ${recording ? 'text-red-600 border-red-300' : ''}`}
                  >
                    {recording ? <span><MicOff className="w-4 h-4 inline" /> {t.stopRecording}</span> : <span><Mic className="w-4 h-4 inline" /> {t.voiceInput}</span>}
                  </button>
                </div>
                <textarea
                  className="input-field h-64 text-sm"
                  placeholder="พิมพ์คำตอบของคุณที่นี่... อธิบายวิธีจัดการสถานการณ์ตามกรณีศึกษาข้างต้น"
                  value={responseText}
                  onChange={e => setResponseText(e.target.value)}
                />
                <div className="flex justify-between items-center mt-3">
                  <p className="text-xs text-surface-400">{responseText.length} ตัวอักษร</p>
                  <button onClick={submitResponse} disabled={submitting || !responseText.trim()} className="btn-primary flex items-center gap-2">
                    <Send className="w-4 h-4" /> {t.submitResponse}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Step: Evaluating */}
      {step === 'evaluating' && (
        <div className="card text-center py-16">
          <Loader2 className="w-16 h-16 animate-spin text-primary-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t.aiEvaluating}</h3>
          <p className="text-surface-600">กรุณารอสักครู่ ระบบ AI กำลังวิเคราะห์คำตอบของคุณ</p>
        </div>
      )}

      {/* Step: Results */}
      {step === 'results' && session && (
        <div className="space-y-4">
          {/* Status banner */}
          {session.status === 'AI_FAILED' && (
            <div className="card bg-red-50 border-red-200 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500" />
              <div>
                <p className="font-medium text-red-700">{t.aiFailed}</p>
                <p className="text-sm text-red-600">กรุณาติดต่อผู้ดูแลระบบ</p>
              </div>
            </div>
          )}

          {session.status === 'APPROVED' && (
            <div className="card bg-green-50 border-green-200 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              <div>
                <p className="font-medium text-green-700">{t.approved}</p>
                <p className="text-sm text-green-600">ผลประเมินได้รับการอนุมัติแล้ว</p>
              </div>
            </div>
          )}

          {/* Score Table - Matching Nurse Assessment Form (ใบประเมินสมรรถนะพยาบาล) */}
          {(session.aiScore || session.finalScores?.length) && (
            <div className="card overflow-x-auto">
              <h3 className="text-lg font-semibold mb-1">{t.evaluationResults}</h3>
              <p className="text-xs text-surface-500 mb-4">ผลการประเมินสมรรถนะ ตามเกณฑ์สภาการพยาบาล</p>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left bg-surface-100">
                    <th className="py-2 px-2">สมรรถนะ</th>
                    <th className="py-2 px-2 text-center">{t.standardLevel}<br/><span className="text-xs font-normal">(ระดับมาตรฐาน)</span></th>
                    <th className="py-2 px-2 text-center">{t.selfScore}<br/><span className="text-xs font-normal">(ตนเอง)</span></th>
                    <th className="py-2 px-2 text-center">{t.aiScore}<br/><span className="text-xs font-normal">(AI)</span></th>
                    {session.reviewerScore && <th className="py-2 px-2 text-center">{t.reviewerScore}<br/><span className="text-xs font-normal">(หัวหน้า)</span></th>}
                    <th className="py-2 px-2 text-center">{t.finalScore}<br/><span className="text-xs font-normal">(คะแนนที่ได้)</span></th>
                    <th className="py-2 px-2 text-center">{t.gap}<br/><span className="text-xs font-normal">(ส่วนต่าง)</span></th>
                  </tr>
                </thead>
                <tbody>
                  {allCompetencies.flatMap(group => {
                    const groupColor = group.type === 'CORE' ? 'bg-amber-50 text-amber-800'
                      : group.type === 'FUNCTIONAL' ? 'bg-orange-50 text-orange-800'
                      : group.type === 'SPECIFIC' ? 'bg-pink-50 text-pink-800'
                      : 'bg-blue-50 text-blue-800';

                    const rows = [
                      <tr key={`group-${group.id}`} className={groupColor}>
                        <td colSpan={7} className="py-2 px-2 font-semibold">
                          {group.nameTh}
                          <span className="text-xs font-normal ml-2">({group.nameEn})</span>
                          {!group.assessedByAI && <span className="text-xs ml-2">[ไม่ประเมินโดย AI]</span>}
                        </td>
                      </tr>
                    ];

                    group.criteria.forEach(c => {
                      const standard = standardMap[c.id] || 1;
                      const selfS = session.selfScores?.find(s => s.criteriaId === c.id)?.score;
                      const aiS = group.assessedByAI
                        ? (session.aiScore?.criteriaScores as any[])?.find((s: any) => s.criteriaId === c.id)
                        : null;
                      const reviewerS = (session.reviewerScore?.criteriaScores as any[])?.find((s: any) => s.criteriaId === c.id);
                      const finalS = session.finalScores?.find(s => s.criteriaId === c.id);
                      const displayScore = finalS?.score || reviewerS?.score || aiS?.score;
                      const displayGap = finalS ? finalS.gap : (displayScore ? displayScore - standard : null);

                      rows.push(
                        <tr key={`criteria-${group.id}-${c.id}`} className="border-b hover:bg-surface-100">
                          <td className="py-2 px-2">
                            <p>{c.nameTh}</p>
                            <p className="text-xs text-surface-400">{c.nameEn}</p>
                          </td>
                          <td className="py-2 px-2 text-center font-semibold text-primary-700">{standard}</td>
                          <td className="py-2 px-2 text-center">{selfS || '-'}</td>
                          <td className={`py-2 px-2 text-center font-semibold ${aiS ? getScoreColor(aiS.score) : 'text-surface-300'}`}>
                            {group.assessedByAI ? (aiS?.score || '-') : <span className="text-surface-300">—</span>}
                          </td>
                          {session.reviewerScore && (
                            <td className={`py-2 px-2 text-center font-semibold ${reviewerS ? getScoreColor(reviewerS.score) : ''}`}>
                              {reviewerS?.score || '-'}
                            </td>
                          )}
                          <td className={`py-2 px-2 text-center font-bold ${displayScore ? getScoreColor(displayScore) : ''}`}>
                            {displayScore || '-'}
                          </td>
                          <td className={`py-2 px-2 text-center font-bold ${displayGap !== null ? getGapClass(displayGap) : ''}`}>
                            {displayGap !== null ? getGapDisplay(displayGap) : '-'}
                          </td>
                        </tr>
                      );
                    });

                    return rows;
                  })}
                </tbody>
              </table>

              {/* Weighted Total */}
              {session.aiScore?.weightedTotal && (
                <div className="mt-4 p-3 bg-primary-50 rounded-lg text-center">
                  <p className="text-sm text-surface-600">คะแนนเฉลี่ยรวม (AI Assessed)</p>
                  <p className="text-3xl font-bold text-primary-700">{session.aiScore.weightedTotal?.toFixed(2)}/5.00</p>
                  {session.aiScore.confidenceScore && (
                    <p className="text-xs text-surface-400 mt-1">{t.confidence}: {(session.aiScore.confidenceScore * 100).toFixed(0)}%</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Feedback */}
          {session.aiScore && session.aiScore.valid && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card border-l-4 border-green-400">
                <h4 className="font-semibold text-green-700 mb-2">{t.strengths}</h4>
                <p className="text-sm whitespace-pre-wrap">{session.aiScore.strengths || '-'}</p>
              </div>
              <div className="card border-l-4 border-red-400">
                <h4 className="font-semibold text-red-700 mb-2">{t.weaknesses}</h4>
                <p className="text-sm whitespace-pre-wrap">{session.aiScore.weaknesses || '-'}</p>
              </div>
              <div className="card border-l-4 border-blue-400">
                <h4 className="font-semibold text-blue-700 mb-2">{t.recommendations}</h4>
                <p className="text-sm whitespace-pre-wrap">{session.aiScore.recommendations || '-'}</p>
              </div>
            </div>
          )}

          {/* Reviewer feedback */}
          {session.reviewerScore?.feedbackText && (
            <div className="card border-l-4 border-purple-400">
              <h4 className="font-semibold text-purple-700 mb-2">{t.feedback}</h4>
              <p className="text-sm whitespace-pre-wrap">{session.reviewerScore.feedbackText}</p>
            </div>
          )}

          {/* IDP Link - show when assessment is approved */}
          {session.status === 'APPROVED' && (
            <div className="card bg-primary-50 border-primary-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-semibold text-primary-700">แผนพัฒนารายบุคคล (IDP)</p>
                    <p className="text-sm text-primary-600">ดูแผนพัฒนาสมรรถนะตามผลการประเมิน</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/idp/${session.id}`)} className="btn-primary text-sm">
                  ดู IDP →
                </button>
              </div>
            </div>
          )}

          <div className="card">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold text-surface-800">ดูผลวิเคราะห์เรียบร้อยแล้ว</p>
                <p className="text-sm text-surface-500">เลือกขั้นตอนถัดไปเพื่อดำเนินการต่อ</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => navigate('/my-assessments')}
                  className="btn-secondary"
                >
                  กลับไปหน้ารายการประเมิน
                </button>
                <button
                  onClick={() => navigate('/dashboard')}
                  className="btn-primary"
                >
                  ไปที่แดชบอร์ด
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
