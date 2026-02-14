import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { CompetencyGroup } from '../types';

export default function RubricsPage() {
  const { t, experienceLevelLabels } = useLanguage();
  const [groups, setGroups] = useState<CompetencyGroup[]>([]);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  useEffect(() => {
    api.get('/competencies').then(r => setGroups(r.data));
  }, []);

  const typeColors: Record<string, string> = {
    CORE: 'bg-yellow-100 border-yellow-300',
    FUNCTIONAL: 'bg-orange-100 border-orange-300',
    SPECIFIC: 'bg-red-100 border-red-300',
    MANAGERIAL: 'bg-blue-100 border-blue-300',
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">{t.rubrics}</h2>

      <div className="space-y-4">
        {groups.map(group => (
          <div key={group.id} className={`card border-l-4 ${typeColors[group.type] || 'border-gray-300'}`}>
            <button 
              className="w-full text-left flex items-center justify-between"
              onClick={() => setExpandedGroup(expandedGroup === group.id ? null : group.id)}
            >
              <div>
                <h3 className="font-semibold">{group.nameTh}</h3>
                <p className="text-sm text-gray-500">{group.nameEn}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge ${group.assessedByAI ? 'badge-success' : 'badge-gray'}`}>
                    {group.assessedByAI ? 'AI ประเมิน' : 'ไม่ใช้ AI'}
                  </span>
                  <span className="badge badge-info">{group.criteria.length} เกณฑ์</span>
                </div>
              </div>
              <span className="text-xl">{expandedGroup === group.id ? '▲' : '▼'}</span>
            </button>

            {expandedGroup === group.id && (
              <div className="mt-4 border-t pt-4">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b">
                      <th className="py-2 px-2">#</th>
                      <th className="py-2 px-2">เกณฑ์ (TH)</th>
                      <th className="py-2 px-2">Criteria (EN)</th>
                      {Object.entries(experienceLevelLabels).map(([k, v]) => (
                        <th key={k} className="py-2 px-2 text-center text-xs">{v.split(' ')[0]}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {group.criteria.map((c, i) => {
                      const standardByLevel: Record<string, number> = {};
                      c.standardLevels?.forEach(sl => { standardByLevel[sl.experienceLevel] = sl.standardScore; });
                      return (
                        <tr key={c.id} className="border-b hover:bg-gray-50">
                          <td className="py-2 px-2">{i + 1}</td>
                          <td className="py-2 px-2">{c.nameTh}</td>
                          <td className="py-2 px-2 text-gray-500">{c.nameEn}</td>
                          {Object.keys(experienceLevelLabels).map(level => (
                            <td key={level} className="py-2 px-2 text-center font-semibold">
                              {standardByLevel[level] || '-'}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
