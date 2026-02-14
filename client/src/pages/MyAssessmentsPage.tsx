import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { statusColors } from '../lib/i18n';
import { formatDate } from '../lib/utils';
import { AssessmentSession, Case } from '../types';
import { Stethoscope, ArrowRight } from 'lucide-react';

export default function MyAssessmentsPage() {
  const { t, statusLabels } = useLanguage();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [showCaseSelect, setShowCaseSelect] = useState(false);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    api.get('/assessments/my').then(r => setSessions(r.data));
    api.get('/cases').then(r => setCases(r.data));
  }, []);

  const startAssessment = async (caseId: string) => {
    setStarting(true);
    try {
      const res = await api.post('/assessments/start', { caseId });
      navigate(`/assessment/${res.data.id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error');
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="page-shell space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-bold text-surface-900">{t.myAssessments}</h2>
        <button onClick={() => setShowCaseSelect(true)} className="btn-primary flex items-center gap-2 w-full sm:w-auto justify-center">
          <Stethoscope className="w-4 h-4" /> {t.startAssessment}
        </button>
      </div>

      {/* Session list */}
      <div className="cards-stack">
        {sessions.length === 0 && (
          <div className="card text-center py-12 text-surface-600">
            <Stethoscope className="w-12 h-12 mx-auto mb-3 text-surface-300" />
            <p className="font-medium text-surface-700">ยังไม่มีการประเมิน</p>
            <p className="text-sm mt-1">กดปุ่ม "{t.startAssessment}" เพื่อเริ่มต้น</p>
          </div>
        )}
        {sessions.map(s => (
          <Link key={s.id} to={`/assessment/${s.id}`} className="card-hover flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 sm:gap-0 group">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-surface-800 group-hover:text-primary-700 transition-colors truncate">{s.case?.titleTh || s.case?.title}</h3>
              <p className="text-xs sm:text-sm text-surface-500 mt-0.5">{formatDate(s.createdAt)}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto justify-between sm:justify-end">
              <span className={`badge text-xs ${statusColors[s.status]}`}>{statusLabels[s.status]}</span>
              <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>

      {/* Case Selection Modal */}
      {showCaseSelect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl border border-surface-200 p-4 sm:p-6 w-full max-w-lg shadow-xl max-h-[90vh] flex flex-col">
            <h3 className="text-base sm:text-lg font-semibold text-surface-900 mb-3 sm:mb-4">{t.selectCase}</h3>
            <div className="space-y-2 sm:space-y-3 overflow-y-auto flex-1">
              {cases.filter(c => c.active).map(c => (
                <button
                  key={c.id}
                  onClick={() => startAssessment(c.id)}
                  disabled={starting}
                  className="w-full text-left p-3 sm:p-4 bg-surface-50 rounded-lg hover:bg-primary-50 hover:border-primary-300 border border-surface-200 transition-colors"
                >
                  <h4 className="font-medium text-surface-800 text-sm sm:text-base">{c.titleTh || c.title}</h4>
                  <p className="text-sm text-surface-500 line-clamp-2 mt-1">{c.descriptionTh.slice(0, 100)}...</p>
                  <p className="text-xs text-surface-400 mt-1">{c.department?.nameTh || 'ทั่วไป'}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setShowCaseSelect(false)} className="btn-secondary w-full mt-4">{t.cancel}</button>
          </div>
        </div>
      )}
    </div>
  );
}
