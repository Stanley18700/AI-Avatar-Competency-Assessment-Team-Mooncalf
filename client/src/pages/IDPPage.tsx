import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { formatDateTime, getGapClass, getGapDisplay } from '../lib/utils';
import { ArrowLeft, Save, Loader2, FileText, CheckCircle2 } from 'lucide-react';

interface IDPItem {
  criteriaId: string;
  criteriaNameTh: string;
  criteriaNameEn: string;
  groupNameTh: string;
  groupType: string;
  standardLevel: number;
  score: number;
  gap: number;
  trainingCourse: boolean;
  shortTermTraining: boolean;
  inHouseTraining: boolean;
  coaching: boolean;
  onTheJob: boolean;
  projectAssignment: boolean;
  selfLearning: boolean;
  otherMethod: string;
  coordinator: string;
}

interface IDPData {
  id: string | null;
  sessionId: string;
  items: IDPItem[];
  notes: string | null;
  session: {
    id: string;
    status: string;
    experienceLevel: string;
    nurseName: string;
    department: string;
    assessmentDate: string;
    caseTitle: string;
  };
}

export default function IDPPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, experienceLevelLabels } = useLanguage();
  const [data, setData] = useState<IDPData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const isEditable = user?.role === 'REVIEWER' || user?.role === 'ADMIN';

  useEffect(() => {
    loadIDP();
  }, [sessionId]);

  const loadIDP = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/idp/${sessionId}`);
      setData(res.data);
    } catch (err) {
      console.error('Load IDP error:', err);
    }
    setLoading(false);
  };

  const updateItem = (index: number, field: keyof IDPItem, value: any) => {
    if (!data) return;
    const newItems = [...data.items];
    (newItems[index] as any)[field] = value;
    setData({ ...data, items: newItems });
    setSaved(false);
  };

  const saveIDP = async () => {
    if (!data) return;
    setSaving(true);
    try {
      await api.post(`/idp/${sessionId}`, {
        items: data.items,
        notes: data.notes
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Error saving IDP');
    }
    setSaving(false);
  };

  if (loading || !data) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  // Group items by group type for display (matching real IDP form)
  const groupedItems: Record<string, IDPItem[]> = {};
  data.items.forEach((item, idx) => {
    const key = item.groupNameTh;
    if (!groupedItems[key]) groupedItems[key] = [];
    groupedItems[key].push({ ...item, criteriaId: `${idx}` }); // use idx for update tracking
  });

  // Determine group background colors per the real form
  const groupColors: Record<string, string> = {
    CORE: 'bg-amber-50',
    FUNCTIONAL: 'bg-orange-50',
    SPECIFIC: 'bg-pink-50',
    MANAGERIAL: 'bg-blue-50'
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-200 rounded">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            แผนพัฒนารายบุคคล (Individual Development Plan)
          </h2>
          <p className="text-sm text-gray-500">
            {data.session.nurseName} · {data.session.department} · {experienceLevelLabels[data.session.experienceLevel as keyof typeof experienceLevelLabels]} · {formatDateTime(data.session.assessmentDate)}
          </p>
        </div>
        {isEditable && (
          <button onClick={saveIDP} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'กำลังบันทึก...' : saved ? 'บันทึกแล้ว!' : 'บันทึก IDP'}
          </button>
        )}
      </div>

      {/* IDP Info Card */}
      <div className="card mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div><span className="text-gray-500">ชื่อ-สกุล:</span> <span className="font-medium">{data.session.nurseName}</span></div>
          <div><span className="text-gray-500">แผนก:</span> <span className="font-medium">{data.session.department}</span></div>
          <div><span className="text-gray-500">ระดับ:</span> <span className="font-medium">{experienceLevelLabels[data.session.experienceLevel as keyof typeof experienceLevelLabels]}</span></div>
          <div><span className="text-gray-500">วันที่ประเมิน:</span> <span className="font-medium">{formatDateTime(data.session.assessmentDate)}</span></div>
        </div>
        <p className="text-xs text-gray-400 mt-2">กรณีศึกษา: {data.session.caseTitle}</p>
      </div>

      {/* IDP Table (matching real IDP Nurse form) */}
      <div className="card overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b bg-gray-50">
              <th rowSpan={2} className="py-2 px-2 text-left border-r">
                ความสามารถที่ต้องพัฒนา<br/>
                <span className="font-normal text-gray-400">(Competencies to be improved)</span>
              </th>
              <th rowSpan={2} className="py-2 px-1 text-center border-r w-16">
                ระดับมาตรฐาน<br/>
                <span className="font-normal">(Standard)</span>
              </th>
              <th rowSpan={2} className="py-2 px-1 text-center border-r w-12">Gap</th>
              <th colSpan={2} className="py-1 px-1 text-center border-r bg-green-50">
                หลักสูตรอบรม<br/><span className="font-normal">(Training)</span>
              </th>
              <th colSpan={5} className="py-1 px-1 text-center border-r bg-yellow-50">
                นอกหลักสูตรอบรม<br/><span className="font-normal">(Non-training)</span>
              </th>
              <th rowSpan={2} className="py-2 px-1 text-center w-20">
                ผู้ดูแล<br/><span className="font-normal">(Coordinator)</span>
              </th>
            </tr>
            <tr className="border-b bg-gray-50 text-[10px]">
              <th className="py-1 px-1 text-center border-r bg-green-50 w-16">โควต้า 2 ครั้ง/ปี</th>
              <th className="py-1 px-1 text-center border-r bg-green-50 w-16">อบรมระยะสั้น</th>
              <th className="py-1 px-1 text-center border-r bg-yellow-50 w-14">In-house</th>
              <th className="py-1 px-1 text-center border-r bg-yellow-50 w-14">Coaching</th>
              <th className="py-1 px-1 text-center border-r bg-yellow-50 w-14">On the job</th>
              <th className="py-1 px-1 text-center border-r bg-yellow-50 w-14">Project</th>
              <th className="py-1 px-1 text-center border-r bg-yellow-50 w-14">Self learning</th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((item, idx) => {
              // Show group header when group changes
              const prevItem = idx > 0 ? data.items[idx - 1] : null;
              const showGroupHeader = !prevItem || prevItem.groupNameTh !== item.groupNameTh;
              const bgColor = groupColors[item.groupType] || 'bg-gray-50';

              return (
                <>{showGroupHeader && (
                  <tr key={`group-${item.groupType}-${idx}`} className={bgColor}>
                    <td colSpan={11} className="py-1.5 px-2 font-semibold text-sm">
                      {item.groupNameTh}
                    </td>
                  </tr>
                )}
                <tr key={`item-${idx}`} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2">
                    <p className="text-xs">{item.criteriaNameTh}</p>
                    <p className="text-[10px] text-gray-400">{item.criteriaNameEn}</p>
                  </td>
                  <td className="py-2 px-1 text-center font-semibold text-primary-700 border-r">{item.standardLevel}</td>
                  <td className={`py-2 px-1 text-center font-bold border-r ${getGapClass(item.gap)}`}>
                    {getGapDisplay(item.gap)}
                  </td>
                  {/* Training course checkboxes */}
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.trainingCourse} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'trainingCourse', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.shortTermTraining} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'shortTermTraining', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  {/* Non-training course checkboxes */}
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.inHouseTraining} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'inHouseTraining', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.coaching} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'coaching', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.onTheJob} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'onTheJob', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.projectAssignment} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'projectAssignment', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center border-r">
                    <input type="checkbox" checked={item.selfLearning} disabled={!isEditable}
                      onChange={e => updateItem(idx, 'selfLearning', e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300" />
                  </td>
                  <td className="py-2 px-1 text-center text-[10px]">
                    {isEditable ? (
                      <input type="text" value={item.coordinator} 
                        onChange={e => updateItem(idx, 'coordinator', e.target.value)}
                        className="input-field text-[10px] py-0.5 px-1 w-full" />
                    ) : (
                      item.coordinator
                    )}
                  </td>
                </tr></>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Notes */}
      <div className="card mt-4">
        <h4 className="font-semibold mb-2">หมายเหตุ</h4>
        {isEditable ? (
          <textarea
            className="input-field h-24 text-sm"
            placeholder="หมายเหตุเพิ่มเติม เช่น ข้อตกลงในการพัฒนา..."
            value={data.notes || ''}
            onChange={e => { setData({ ...data, notes: e.target.value }); setSaved(false); }}
          />
        ) : (
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{data.notes || 'ไม่มีหมายเหตุ'}</p>
        )}
        <p className="text-xs text-gray-400 mt-3">
          การประเมินนี้ไม่มีผลต่อการเลื่อนขั้นเงินเดือน<br/>
          (This assessment has no impact on salary advancement or promotion decisions.)
        </p>
      </div>

      {/* Action buttons at bottom */}
      {isEditable && (
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={() => navigate(-1)} className="btn-secondary">กลับ</button>
          <button onClick={saveIDP} disabled={saving} className="btn-primary flex items-center gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? 'กำลังบันทึก...' : 'บันทึก IDP'}
          </button>
        </div>
      )}
    </div>
  );
}
