import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { statusColors } from '../lib/i18n';
import { formatDateTime, getGapClass, getGapDisplay, getScoreColor } from '../lib/utils';
import { AssessmentSession, CompetencyGroup, StandardLevel } from '../types';
import { ArrowLeft, CheckCircle2, Loader2, History, Save, FileText } from 'lucide-react';

export default function ReviewDetailPage() {
  const { t, experienceLevelLabels, statusLabels } = useLanguage();
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<any>(null);
  const [competencies, setCompetencies] = useState<CompetencyGroup[]>([]);
  const [allCompetencies, setAllCompetencies] = useState<CompetencyGroup[]>([]);
  const [reviewerScores, setReviewerScores] = useState<Record<string, number>>({});
  const [feedbackText, setFeedbackText] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    loadAll();
  }, [sessionId]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [sessionRes, comps, hist] = await Promise.all([
        api.get(`/reviews/${sessionId}`),
        api.get('/competencies'),
        api.get(`/reviews/${sessionId}/history`),
      ]);
      const allComps: CompetencyGroup[] = comps.data;
      setSession(sessionRes.data);
      setAllCompetencies(allComps);
      setCompetencies(allComps.filter(g => g.assessedByAI));
      setHistory(hist.data);

      // Pre-fill reviewer scores from AI scores
      const scores: Record<string, number> = {};
      if (sessionRes.data.reviewerScore?.criteriaScores) {
        (sessionRes.data.reviewerScore.criteriaScores as any[]).forEach((s: any) => {
          scores[s.criteriaId] = s.score;
        });
      } else if (sessionRes.data.aiScore?.criteriaScores) {
        (sessionRes.data.aiScore.criteriaScores as any[]).forEach((s: any) => {
          scores[s.criteriaId] = s.score;
        });
      }
      setReviewerScores(scores);
      setFeedbackText(sessionRes.data.reviewerScore?.feedbackText || '');
    } catch {
      navigate('/reviews');
    } finally {
      setLoading(false);
    }
  };

  const saveScores = async () => {
    setSaving(true);
    try {
      const scores = Object.entries(reviewerScores).map(([criteriaId, score]) => ({ criteriaId, score }));
      await api.post(`/reviews/${sessionId}/score`, { scores, feedbackText });
      await loadAll();
      alert('บันทึกคะแนนสำเร็จ');
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    } finally {
      setSaving(false);
    }
  };

  const approveSession = async () => {
    if (!confirm('ยืนยันการอนุมัติผลประเมิน?')) return;
    setApproving(true);
    try {
      await api.post(`/reviews/${sessionId}/approve`);
      await loadAll();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    } finally {
      setApproving(false);
    }
  };

  if (loading || !session) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  const standardMap: Record<string, number> = {};
  (session.standardLevels || []).forEach((sl: StandardLevel) => { standardMap[sl.criteriaId] = sl.standardScore; });
  const isApproved = session.status === 'APPROVED';

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-surface-200 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold text-surface-900">Review: {session.case?.titleTh || session.case?.title}</h2>
          <p className="text-sm text-surface-500">
            พยาบาล: {session.user?.fullName} · {experienceLevelLabels[session.experienceLevel as keyof typeof experienceLevelLabels]} · {formatDateTime(session.createdAt)}
            <span className={`badge ${statusColors[session.status as keyof typeof statusColors]} ml-2`}>{statusLabels[session.status as keyof typeof statusLabels]}</span>
          </p>
        </div>
        <button onClick={() => setShowHistory(!showHistory)} className="btn-secondary flex items-center gap-2">
          <History className="w-4 h-4" /> ประวัติ
        </button>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="card mb-4">
          <h4 className="font-semibold mb-3">ประวัติการเปลี่ยนแปลงคะแนน</h4>
          <div className="space-y-2">
            {history.map((h: any, i: number) => (
              <div key={i} className="flex items-center gap-3 text-sm p-2 bg-surface-100 rounded border border-surface-200">
                <span className="text-surface-400">{formatDateTime(h.changedAt)}</span>
                <span className="font-medium">{h.criteria?.nameTh || h.criteriaId}</span>
                <span className="text-red-500">{h.previousScore}</span> → <span className="text-green-600">{h.newScore}</span>
                <span className="text-surface-400">{h.source}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Transcript */}
        <div className="lg:col-span-1">
          <div className="card h-full">
            <h3 className="font-semibold mb-3">{t.caseScenario}</h3>
            <div className="text-sm bg-blue-50 p-3 rounded-lg whitespace-pre-wrap mb-4">{session.case?.descriptionTh}</div>

            <h3 className="font-semibold mb-2">คำตอบพยาบาล</h3>
            <div className="text-sm bg-surface-100 p-3 rounded-lg whitespace-pre-wrap max-h-64 overflow-y-auto border border-surface-200">
              {session.transcript?.decryptedText || session.transcript?.inputType || 'ไม่มีข้อมูล'}
            </div>
          </div>
        </div>

        {/* Score Table */}
        <div className="lg:col-span-2">
          <div className="card overflow-x-auto">
            <h3 className="font-semibold mb-4">ตารางคะแนน</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left">
                  <th className="py-2 px-1">สมรรถนะ</th>
                  <th className="py-2 px-1 text-center">มาตรฐาน</th>
                  <th className="py-2 px-1 text-center">ตนเอง</th>
                  <th className="py-2 px-1 text-center">AI</th>
                  <th className="py-2 px-1 text-center w-24">หัวหน้า</th>
                </tr>
              </thead>
              <tbody>
                {allCompetencies.map(group => (
                  <>
                    <tr key={group.id} className={
                      group.type === 'CORE' ? 'bg-amber-50' 
                      : group.type === 'FUNCTIONAL' ? 'bg-orange-50'
                      : group.type === 'SPECIFIC' ? 'bg-pink-50'
                      : 'bg-blue-50'
                    }>
                      <td colSpan={5} className="py-2 px-1 font-semibold text-primary-700">
                        {group.nameTh}
                        {!group.assessedByAI && <span className="text-xs text-amber-600 ml-2">[ประเมินโดยหัวหน้าเท่านั้น]</span>}
                      </td>
                    </tr>
                    {group.criteria.map(c => {
                      const standard = standardMap[c.id] || 1;
                      const selfS = session.selfScores?.find((s: any) => s.criteriaId === c.id)?.score;
                      const aiS = group.assessedByAI
                        ? (session.aiScore?.criteriaScores as any[])?.find((s: any) => s.criteriaId === c.id)
                        : null;
                      return (
                        <tr key={c.id} className="border-b">
                          <td className="py-2 px-1">
                            <p className="text-xs">{c.nameTh}</p>
                          </td>
                          <td className="py-2 px-1 text-center">{standard}</td>
                          <td className="py-2 px-1 text-center">{selfS || '-'}</td>
                          <td className={`py-2 px-1 text-center font-semibold ${aiS ? getScoreColor(aiS.score) : 'text-surface-300'}`}>
                            {group.assessedByAI ? (aiS?.score || '-') : '—'}
                          </td>
                          <td className="py-2 px-1 text-center">
                            {isApproved ? (
                              <span className="font-semibold">{reviewerScores[c.id] || aiS?.score || '-'}</span>
                            ) : (
                              <select
                                value={reviewerScores[c.id] || ''}
                                onChange={e => setReviewerScores({ ...reviewerScores, [c.id]: Number(e.target.value) })}
                                className="input-field text-xs py-1 px-2 w-16"
                              >
                                <option value="">-</option>
                                {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>{s}</option>)}
                              </select>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ))}
              </tbody>
            </table>
          </div>

          {/* AI Feedback */}
          {session.aiScore && (
            <div className="card mt-4">
              <h4 className="font-semibold mb-2">AI Feedback</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                <div className="bg-green-50 p-3 rounded"><strong>จุดแข็ง:</strong> {session.aiScore.strengths || '-'}</div>
                <div className="bg-red-50 p-3 rounded"><strong>จุดอ่อน:</strong> {session.aiScore.weaknesses || '-'}</div>
                <div className="bg-blue-50 p-3 rounded"><strong>ข้อเสนอแนะ:</strong> {session.aiScore.recommendations || '-'}</div>
              </div>
            </div>
          )}

          {/* Reviewer Feedback */}
          {!isApproved && (
            <div className="card mt-4">
              <h4 className="font-semibold mb-2">{t.feedback}</h4>
              <textarea
                className="input-field h-24 text-sm"
                placeholder="ความเห็นเพิ่มเติม..."
                value={feedbackText}
                onChange={e => setFeedbackText(e.target.value)}
              />
              <div className="flex gap-3 mt-3">
                <button onClick={saveScores} disabled={saving} className="btn-secondary flex items-center gap-2">
                  <Save className="w-4 h-4" /> {saving ? 'กำลังบันทึก...' : 'บันทึกคะแนน'}
                </button>
                <button onClick={approveSession} disabled={approving} className="btn-primary flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" /> {approving ? 'กำลังอนุมัติ...' : t.approve}
                </button>
              </div>
            </div>
          )}
          {/* IDP Button - show when approved */}
          {isApproved && (
            <div className="card mt-4 bg-primary-50 border-primary-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-primary-600" />
                  <div>
                    <p className="font-semibold text-primary-700">แผนพัฒนารายบุคคล (IDP)</p>
                    <p className="text-sm text-primary-600">จัดทำแผนพัฒนาสมรรถนะสำหรับพยาบาล</p>
                  </div>
                </div>
                <button onClick={() => navigate(`/idp/${sessionId}`)} className="btn-primary text-sm">
                  จัดทำ IDP →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
