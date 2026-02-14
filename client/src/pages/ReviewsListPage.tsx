import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { statusColors } from '../lib/i18n';
import { formatDateTime } from '../lib/utils';
import { ClipboardCheck, Loader2 } from 'lucide-react';

export default function ReviewsListPage() {
  const { t, experienceLevelLabels, statusLabels } = useLanguage();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/reviews/pending').then(r => { setSessions(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;

  return (
    <div className="page-shell">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-surface-900">{t.reviews}</h2>
        <span className="text-sm text-surface-500">{sessions.length} รายการรอตรวจ</span>
      </div>

      {sessions.length === 0 ? (
        <div className="card text-center py-16">
          <ClipboardCheck className="w-16 h-16 text-surface-300 mx-auto mb-4" />
          <p className="text-surface-600">ไม่มีรายการรอตรวจ</p>
        </div>
      ) : (
        <div className="cards-stack">
          {sessions.map((s: any) => (
            <div key={s.id} className="card-hover cursor-pointer" onClick={() => navigate(`/reviews/${s.id}`)}>
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary-50 rounded-lg flex items-center justify-center">
                  <ClipboardCheck className="w-5 h-5 text-primary-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-surface-800">{s.case?.titleTh || s.case?.title}</h3>
                  <p className="text-sm text-surface-500">
                    พยาบาล: {s.user?.fullName} · {experienceLevelLabels[s.experienceLevel as keyof typeof experienceLevelLabels]} · {s.department?.nameTh}
                  </p>
                  <p className="text-xs text-surface-400">{formatDateTime(s.createdAt)}</p>
                </div>
                <div className="text-right">
                  <span className={`badge ${statusColors[s.status as keyof typeof statusColors]}`}>{statusLabels[s.status as keyof typeof statusLabels]}</span>
                  {s.aiScore?.weightedTotal && (
                    <p className="text-sm font-bold text-primary-600 mt-1">{s.aiScore.weightedTotal.toFixed(2)}/5.00</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
