import { useEffect, useState } from 'react';
import api from '../lib/api';
import { useLanguage } from '../contexts/LanguageContext';
import { cn } from '../lib/utils';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar } from 'recharts';
import { Loader2, Filter, TrendingDown } from 'lucide-react';

export default function AnalyticsPage() {
  const { t, experienceLevelLabels } = useLanguage();
  const [summary, setSummary] = useState<any>(null);
  const [competencyData, setCompetencyData] = useState<any[]>([]);
  const [weaknesses, setWeaknesses] = useState<any[]>([]);
  const [trends, setTrends] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [deptList, setDeptList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ departmentId: '', experienceLevel: '', dateFrom: '', dateTo: '' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    setLoading(true);
    const q = new URLSearchParams();
    if (filters.departmentId) q.append('departmentId', filters.departmentId);
    if (filters.experienceLevel) q.append('experienceLevel', filters.experienceLevel);
    if (filters.dateFrom) q.append('dateFrom', filters.dateFrom);
    if (filters.dateTo) q.append('dateTo', filters.dateTo);
    const qs = q.toString() ? `?${q.toString()}` : '';

    try {
      const [sum, comp, weak, trend, dept, dList] = await Promise.all([
        api.get(`/analytics/summary${qs}`),
        api.get(`/analytics/competency-by-category${qs}`),
        api.get(`/analytics/weaknesses${qs}`),
        api.get(`/analytics/trends${qs}`),
        api.get(`/analytics/departments${qs}`),
        api.get('/departments'),
      ]);
      setSummary(sum.data);
      setCompetencyData(comp.data);
      setWeaknesses(weak.data);
      setTrends(trend.data);
      setDepartments(dept.data);
      setDeptList(dList.data);
    } catch { }
    setLoading(false);
  };

  if (loading && !summary) {
    return <div className="flex items-center justify-center h-64"><Loader2 className="w-8 h-8 animate-spin text-primary-600" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">{t.analytics}</h2>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="flex items-center gap-4 flex-wrap">
          <Filter className="w-5 h-5 text-gray-400" />
          <select className="input-field w-auto" value={filters.departmentId} onChange={e => setFilters({ ...filters, departmentId: e.target.value })}>
            <option value="">ทุกแผนก</option>
            {deptList.map((d: any) => <option key={d.id} value={d.id}>{d.nameTh}</option>)}
          </select>
          <select className="input-field w-auto" value={filters.experienceLevel} onChange={e => setFilters({ ...filters, experienceLevel: e.target.value })}>
            <option value="">ทุกระดับ</option>
            {Object.entries(experienceLevelLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <input type="date" className="input-field w-auto" value={filters.dateFrom} onChange={e => setFilters({ ...filters, dateFrom: e.target.value })} />
          <span className="text-gray-400">ถึง</span>
          <input type="date" className="input-field w-auto" value={filters.dateTo} onChange={e => setFilters({ ...filters, dateTo: e.target.value })} />
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="card text-center">
            <p className="text-sm text-gray-500">{t.totalAssessments}</p>
            <p className="text-3xl font-bold text-primary-600">{summary.totalSessions}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">คะแนนเฉลี่ย</p>
            <p className="text-3xl font-bold text-primary-600">{summary.averageScore?.toFixed(2) || '-'}</p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">GAP เฉลี่ย</p>
            <p className={cn('text-3xl font-bold', summary.averageGap >= 0 ? 'text-green-600' : 'text-red-600')}>
              {summary.averageGap !== null ? (summary.averageGap >= 0 ? '+' : '') + summary.averageGap?.toFixed(2) : '-'}
            </p>
          </div>
          <div className="card text-center">
            <p className="text-sm text-gray-500">อนุมัติแล้ว</p>
            <p className="text-3xl font-bold text-green-600">{summary.approvedCount || 0}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Competency by Category */}
        <div className="card">
          <h3 className="font-semibold mb-4">คะแนนเฉลี่ยตามกลุ่มสมรรถนะ</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={competencyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="groupName" fontSize={12} />
              <YAxis domain={[0, 5]} />
              <Tooltip />
              <Legend />
              <Bar dataKey="averageScore" fill="#0d9488" name="คะแนนเฉลี่ย" />
              <Bar dataKey="standardAvg" fill="#93c5fd" name="มาตรฐาน" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Trends */}
        <div className="card">
          <h3 className="font-semibold mb-4">แนวโน้มคะแนน</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis yAxisId="left" domain={[0, 5]} />
              <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="averageScore" stroke="#0d9488" name="คะแนนเฉลี่ย" strokeWidth={2} yAxisId="left" />
              <Line type="monotone" dataKey="count" stroke="#93c5fd" name="จำนวนการประเมิน" yAxisId="right" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Weaknesses */}
        <div className="card">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingDown className="w-5 h-5 text-red-500" /> จุดอ่อนที่พบบ่อย
          </h3>
          {weaknesses.length === 0 ? (
            <p className="text-gray-400 text-center py-8">ไม่มีข้อมูล</p>
          ) : (
            <div className="space-y-2">
              {weaknesses.map((w: any, i: number) => (
                <div key={i} className="flex items-center gap-3 p-2 bg-red-50 rounded">
                  <span className="text-2xl font-bold text-red-300">#{i + 1}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{w.criteriaName}</p>
                    <p className="text-xs text-gray-500">{w.groupName}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">GAP: {w.averageGap?.toFixed(2)}</p>
                    <p className="text-xs text-gray-400">{w.count} ครั้ง</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Department Comparison */}
        <div className="card">
          <h3 className="font-semibold mb-4">เปรียบเทียบตามแผนก</h3>
          {departments.length === 0 ? (
            <p className="text-gray-400 text-center py-8">ไม่มีข้อมูล</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departments} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 5]} />
                <YAxis dataKey="departmentName" type="category" width={100} fontSize={12} />
                <Tooltip />
                <Bar dataKey="averageScore" fill="#0d9488" name="คะแนนเฉลี่ย" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
