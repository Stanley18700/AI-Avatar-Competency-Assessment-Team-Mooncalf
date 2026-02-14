import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { statusColors } from '../lib/i18n';
import { formatDate } from '../lib/utils';
import api from '../lib/api';
import { AnalyticsSummary, AssessmentSession } from '../types';
import { Link } from 'react-router-dom';
import {
  ClipboardCheck, Users, FileText, CheckCircle, TrendingUp,
  ArrowRight, Stethoscope, Sparkles, BarChart3, Activity, Mic, AlertTriangle
} from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();

  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'REVIEWER') return <ReviewerDashboard />;
  return <NurseDashboard />;
}

function AdminDashboard() {
  const { t } = useLanguage();
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  useEffect(() => {
    api.get('/analytics/summary').then(r => setSummary(r.data)).catch(() => { });
  }, []);

  const stats = summary ? [
    { label: t.totalAssessments, value: summary.totalAssessments, icon: ClipboardCheck, gradient: 'from-blue-500 to-cyan-500' },
    { label: t.completedAssessments, value: summary.completedAssessments, icon: TrendingUp, gradient: 'from-amber-500 to-orange-500' },
    { label: t.approvedAssessments, value: summary.approvedAssessments, icon: CheckCircle, gradient: 'from-emerald-500 to-teal-500' },
    { label: t.totalNurses, value: summary.totalNurses, icon: Users, gradient: 'from-purple-500 to-pink-500' },
    { label: 'AI Scored', value: summary.aiScoredAssessments, icon: Activity, gradient: 'from-indigo-500 to-blue-500' },
    { label: 'AI Failed', value: summary.aiFailedAssessments, icon: AlertTriangle, gradient: 'from-rose-500 to-red-500' },
    { label: 'Voice Assessed', value: summary.totalVoiceAssessments, icon: Mic, gradient: 'from-cyan-500 to-teal-500' },
    { label: 'Avg AI Score', value: `${summary.avgAIWeightedTotal.toFixed(2)}/5`, icon: BarChart3, gradient: 'from-fuchsia-500 to-violet-500' },
  ] : [];

  const quickLinks = [
    { path: '/analytics', label: t.analytics, icon: BarChart3, desc: 'ดูภาพรวมสถิติและแนวโน้ม' },
    { path: '/reviews', label: t.reviews, icon: FileText, desc: 'ตรวจสอบและอนุมัติผลประเมิน' },
    { path: '/cases', label: t.cases, icon: Stethoscope, desc: 'จัดการกรณีศึกษาทางคลินิก' },
  ];

  return (
    <div className="page-shell space-y-8">
      {/* Welcome Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-3xl font-bold text-surface-900 flex items-center gap-2 flex-wrap">
            {t.dashboard}
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary-50 text-primary-700 text-sm rounded-full font-semibold">
              <Sparkles className="w-3.5 h-3.5" /> {t.admin}
            </span>
          </h2>
          <p className="text-surface-600 text-base mt-2 leading-relaxed">ภาพรวมระบบประเมินสมรรถนะพยาบาล</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <div
            key={s.label}
            className={`stat-card bg-gradient-to-br ${s.gradient} animate-fade-in-up`}
            style={{ animationDelay: `${idx * 100}ms` }}
          >
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                  <s.icon className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl font-bold text-white tabular-nums">{s.value}</p>
              <p className="text-sm text-white/90 mt-1 font-medium leading-snug">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {summary && (
        <div className="card flex items-center justify-between gap-4">
          <div>
            <p className="text-sm text-surface-600">ค่าเฉลี่ยความมั่นใจของ AI</p>
            <p className="text-2xl font-bold text-surface-900 mt-1">{(summary.avgAIConfidence * 100).toFixed(0)}%</p>
          </div>
          <div className="text-sm text-surface-500">
            จากผลประเมิน AI ที่ valid
          </div>
        </div>
      )}

      {/* Quick Links */}
      <div>
        <h3 className="text-xl font-semibold text-surface-800 mb-4 tracking-tight">ลิงก์ด่วน</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickLinks.map((link, idx) => (
            <Link
              key={link.path}
              to={link.path}
              className="card-hover group relative overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${(idx + 4) * 100}ms` }}
            >
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-primary-500/5 to-transparent rounded-bl-full" />
              <div className="relative flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center group-hover:bg-primary-100 transition-colors flex-shrink-0">
                  <link.icon className="w-6 h-6 text-primary-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-surface-800 group-hover:text-primary-700 transition-colors text-base">{link.label}</p>
                  <p className="text-sm text-surface-600 mt-0.5 leading-relaxed">{link.desc}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-surface-400 group-hover:text-primary-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function NurseDashboard() {
  const { user } = useAuth();
  const { t, experienceLevelLabels, statusLabels } = useLanguage();
  const [sessions, setSessions] = useState<AssessmentSession[]>([]);

  useEffect(() => {
    api.get('/assessments/my').then(r => setSessions(r.data)).catch(() => { });
  }, []);

  const recent = sessions.slice(0, 5);
  const approved = sessions.filter(s => s.status === 'APPROVED').length;

  return (
    <div className="page-shell space-y-8">
      {/* Welcome */}
      <div className="card-gradient bg-gradient-to-r from-primary-600 via-primary-500 to-accent-500 animate-fade-in-up">
        <div className="relative z-10">
          <p className="text-primary-100/90 text-sm font-medium">สวัสดี 👋</p>
          <h2 className="text-2xl font-bold text-white mt-1 leading-tight">{user?.nameTh || user?.name}</h2>
          <p className="text-primary-100/80 text-sm mt-2 leading-relaxed">{experienceLevelLabels[user?.experienceLevel || 'LEVEL_1']} · {user?.department?.nameTh || ''}</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card text-center animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mx-auto mb-3 shadow-glow-sm">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-surface-900">{sessions.length}</p>
          <p className="text-sm text-surface-600 mt-1 leading-snug">การประเมินทั้งหมด</p>
        </div>
        <div className="card text-center animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-3">
            <CheckCircle className="w-6 h-6 text-white" />
          </div>
          <p className="text-3xl font-bold text-surface-900 tabular-nums">{approved}</p>
          <p className="text-sm text-surface-600 mt-1 leading-snug">{t.approved}</p>
        </div>
        <div className="card text-center animate-fade-in-up flex flex-col items-center justify-center" style={{ animationDelay: '300ms' }}>
          <Link to="/my-assessments" className="btn-primary inline-flex items-center gap-2 text-base px-6 py-3">
            <Stethoscope className="w-5 h-5" />
            {t.startAssessment}
          </Link>
        </div>
      </div>

      {/* Recent Assessments */}
      {recent.length > 0 && (
        <div className="animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <h3 className="text-xl font-semibold text-surface-800 mb-4 tracking-tight">การประเมินล่าสุด</h3>
          <div className="space-y-2">
            {recent.map((s, idx) => (
              <Link
                key={s.id}
                to={`/assessment/${s.id}`}
                className="card-hover flex items-center justify-between group"
                style={{ animationDelay: `${(idx + 5) * 80}ms` }}
              >
                <div>
                  <p className="font-semibold text-surface-800 group-hover:text-primary-700 transition-colors">{s.case?.titleTh || s.case?.title}</p>
                  <p className="text-sm text-surface-500 mt-0.5 leading-snug">{formatDate(s.createdAt)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`badge ${statusColors[s.status]}`}>{statusLabels[s.status]}</span>
                  <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ReviewerDashboard() {
  const { t, experienceLevelLabels, statusLabels } = useLanguage();
  const [pending, setPending] = useState<AssessmentSession[]>([]);

  useEffect(() => {
    api.get('/reviews/pending').then(r => setPending(r.data)).catch(() => { });
  }, []);

  return (
    <div className="page-shell space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-surface-900 flex items-center gap-2 flex-wrap">
          {t.dashboard}
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 text-sm rounded-full font-semibold">
            {t.reviewer}
          </span>
        </h2>
        <p className="text-surface-600 text-base mt-2 leading-relaxed">ตรวจสอบและอนุมัติผลการประเมิน</p>
      </div>

      {/* Pending Reviews */}
      <div className="card animate-fade-in-up">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
            <FileText className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <h3 className="font-semibold text-surface-800 text-base">{t.pendingReviews}</h3>
            <p className="text-sm text-surface-600 mt-0.5">{pending.length} รายการรอดำเนินการ</p>
          </div>
        </div>
        {pending.length === 0 ? (
          <div className="text-center py-12 text-surface-400">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-emerald-200" />
            <p className="font-medium text-surface-600">{t.noData}</p>
            <p className="text-sm text-surface-500 mt-1 leading-relaxed">ไม่มีรายการรอตรวจสอบ</p>
          </div>
        ) : (
          <div className="space-y-2">
            {pending.map((s, idx) => (
              <Link
                key={s.id}
                to={`/reviews/${s.id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-surface-50 hover:bg-primary-50 border border-transparent hover:border-primary-100 transition-all duration-200 group"
                style={{ animationDelay: `${idx * 80}ms` }}
              >
                <div>
                  <p className="font-semibold text-surface-800 group-hover:text-primary-700 transition-colors">
                    {s.nurse?.nameTh || s.nurse?.name} — {s.case?.titleTh || s.case?.title}
                  </p>
                  <p className="text-sm text-surface-600 mt-0.5 leading-snug">
                    {s.nurse?.department?.nameTh} · {experienceLevelLabels[s.experienceLevel]} · {formatDate(s.createdAt)}
                  </p>
                </div>
                <div className="text-right flex items-center gap-3">
                  <div>
                    <span className={`badge ${statusColors[s.status]}`}>{statusLabels[s.status]}</span>
                    {s.aiScore?.confidenceScore && (
                      <p className="text-xs text-surface-500 mt-1">AI: {(s.aiScore.confidenceScore * 100).toFixed(0)}%</p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-surface-300 group-hover:text-primary-500 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
