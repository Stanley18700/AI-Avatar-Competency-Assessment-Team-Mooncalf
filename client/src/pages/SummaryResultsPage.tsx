import React, { useEffect, useState } from 'react';
import api from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { getGapClass, getGapDisplay, getScoreColor } from '../lib/utils';
import { Loader2, FileText, Download } from 'lucide-react';

interface CompetencyGroup {
  id: string;
  nameTh: string;
  nameEn: string;
  type: string;
  assessedByAI: boolean;
  criteria: { id: string; nameTh: string; nameEn: string; sortOrder: number }[];
}

interface NurseEntry {
  sessionId: string;
  nurseName: string;
  department: string;
  scores: Record<string, { score: number; gap: number; standard: number }>;
}

export default function SummaryResultsPage() {
  const { t, experienceLevelLabels } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [competencyGroups, setCompetencyGroups] = useState<CompetencyGroup[]>([]);
  const [levelGroups, setLevelGroups] = useState<Record<string, NurseEntry[]>>({});
  const [departments, setDepartments] = useState<any[]>([]);
  const [selectedDept, setSelectedDept] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || (user.role !== 'ADMIN' && user.role !== 'REVIEWER')) return;
    loadData();
    api.get('/departments').then(r => setDepartments(r.data)).catch(() => {});
  }, [selectedDept, user]);

  const loadData = async () => {
    setLoading(true);
    try {
      const q = selectedDept ? `?departmentId=${selectedDept}` : '';
      const res = await api.get(`/analytics/summary-results${q}`);
      setCompetencyGroups(res.data.competencyGroups);
      setLevelGroups(res.data.levelGroups);
    } catch (err) {
      console.error('Load summary error:', err);
    }
    setLoading(false);
  };

  const allCriteria = competencyGroups.flatMap(g => g.criteria.map(c => ({ ...c, groupId: g.id, groupNameTh: g.nameTh, type: g.type })));

  // Group header colors matching the real form
  const typeColors: Record<string, string> = {
    CORE: 'bg-amber-100',
    FUNCTIONAL: 'bg-orange-100',
    SPECIFIC: 'bg-pink-100',
    MANAGERIAL: 'bg-green-100'
  };

  const levelLabels: Record<string, { th: string; en: string }> = {
    LEVEL_1: { th: '0-1 ปี', en: 'Novice' },
    LEVEL_2: { th: '1-2 ปี', en: 'Beginner' },
    LEVEL_3: { th: '2-3 ปี', en: 'Competent' },
    LEVEL_4: { th: '>3 ปี', en: 'Charge Nurse' },
    LEVEL_5: { th: '>5 ปี', en: 'Expert' }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-surface-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-primary-600" />
            สรุปผลการประเมินสมรรถนะ (Summary of Results)
          </h2>
          <p className="text-sm text-surface-500">
            โรงพยาบาลศูนย์การแพทย์มหาวิทยาลัยแม่ฟ้าหลวง · {t.hospital}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            className="input-field text-sm py-1.5 px-3"
            value={selectedDept}
            onChange={e => setSelectedDept(e.target.value)}
          >
            <option value="">ทุกแผนก (All Departments)</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.nameTh}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Matrix Table (matching real Summary of Results sheet) */}
      <div className="card overflow-x-auto">
        <table className="text-xs border-collapse w-full">
          <thead>
            {/* Row 1: Group headers spanning criteria */}
            <tr className="border-b">
              <th rowSpan={3} className="py-2 px-2 text-left border-r min-w-[120px] bg-surface-100 sticky left-0 z-20">
                ระดับมาตรฐาน<br/>(Standard Level)
              </th>
              {competencyGroups.map(group => (
                <th
                  key={group.id}
                  colSpan={group.criteria.length * 2}
                  className={`py-2 px-1 text-center border-r ${typeColors[group.type] || 'bg-surface-100'}`}
                >
                  {group.nameTh}
                </th>
              ))}
            </tr>
            {/* Row 2: Criteria names */}
            <tr className="border-b">
              {allCriteria.map(c => (
                <th key={c.id} colSpan={2} className={`py-1 px-0.5 text-center border-r ${typeColors[c.type] || 'bg-surface-100'}`}>
                  <div className="writing-vertical text-[9px] leading-tight h-24 flex items-end justify-center">
                    {c.nameTh}
                  </div>
                </th>
              ))}
            </tr>
            {/* Row 3: Score + GAP sub-headers per criteria */}
            <tr className="border-b bg-surface-200">
              {allCriteria.flatMap(c => [
                <th key={`std-${c.id}`} className="py-1 px-0.5 text-center border-r text-[10px] font-normal">คะแนน</th>,
                <th key={`gap-${c.id}`} className="py-1 px-0.5 text-center border-r text-[10px] font-normal">GAP</th>
              ])}
            </tr>
          </thead>
          <tbody>
            {/* For each experience level, show rows of nurses */}
            {Object.entries(levelGroups).map(([level, nurses]) => {
              const levelInfo = levelLabels[level] || { th: level, en: level };
              
              return (
                <React.Fragment key={`level-group-${level}`}>
                  {/* Level Header */}
                  <tr className="bg-yellow-100 border-b-2 border-yellow-300">
                    <td className="py-2 px-2 font-bold sticky left-0 z-20 bg-yellow-100">
                      {levelInfo.th} ({levelInfo.en})
                    </td>
                    {allCriteria.map(c => (
                      <td key={`l-${level}-${c.id}`} colSpan={2} className="py-2 px-1 text-center border-r text-[10px] font-medium"></td>
                    ))}
                  </tr>
                  {/* Nurse rows */}
                  {nurses.length > 0 ? nurses.map((nurse, idx) => (
                    <tr key={`nurse-${level}-${idx}`} className="border-b hover:bg-surface-100 cursor-pointer" 
                      onClick={() => navigate(`/idp/${nurse.sessionId}`)}>
                      <td className="py-1.5 px-2 sticky left-0 z-20 bg-white text-[10px]">
                        {nurse.nurseName}
                        <span className="text-surface-400 ml-1">({nurse.department})</span>
                      </td>
                      {allCriteria.flatMap(c => {
                        const scoreData = nurse.scores[c.id];
                        return [
                          <td key={`s-${nurse.sessionId}-${c.id}`} className={`py-1.5 px-0.5 text-center border-r ${scoreData ? getScoreColor(scoreData.score) : 'text-surface-300'}`}>
                            {scoreData?.score || '-'}
                          </td>,
                          <td key={`g-${nurse.sessionId}-${c.id}`} className={`py-1.5 px-0.5 text-center border-r font-semibold ${scoreData ? getGapClass(scoreData.gap) : ''}`}>
                            {scoreData ? getGapDisplay(scoreData.gap) : '-'}
                          </td>
                        ];
                      })}
                    </tr>
                  )) : (
                    <tr key={`empty-${level}`}>
                      <td className="py-2 px-2 text-surface-400 text-center sticky left-0 z-20 bg-white" colSpan={1 + allCriteria.length * 2}>
                        ไม่มีข้อมูล
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="card mt-4">
        <h4 className="font-semibold mb-2">คำอธิบาย (Legend)</h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-100 rounded"></div>
            <span>Core Competency (สมรรถนะหลัก)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-orange-100 rounded"></div>
            <span>Functional (สมรรถนะตามบทบาทหน้าที่)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-pink-100 rounded"></div>
            <span>Specific (ประเด็นสำคัญทางคลินิก)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-100 rounded"></div>
            <span>Managerial (สมรรถนะด้านการบริหาร)</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-sm mt-2">
          <div className="flex items-center gap-2">
            <span className="text-green-600 font-bold">+N</span>
            <span>คะแนนสูงกว่ามาตรฐาน</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-surface-600 font-bold">0</span>
            <span>ได้ตามมาตรฐาน</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-bold">-N</span>
            <span>ต่ำกว่ามาตรฐาน (ต้องพัฒนา)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
