import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import {
  LayoutDashboard, FileText, Users, Building2, ClipboardCheck,
  BarChart3, LogOut, Menu, X, Brain, Stethoscope, Shield, Table2,
  Sparkles, ChevronRight
} from 'lucide-react';
import { useState } from 'react';
import LanguageSelector from './LanguageSelector';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const { t, experienceLevelLabels } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = getNavItems(user?.role || 'NURSE', t);

  return (
    <div className="h-screen flex bg-mesh overflow-hidden">
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 transform transition-all duration-300 ease-out
        lg:relative lg:translate-x-0 lg:h-screen lg:flex-shrink-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar inner with guaranteed dark background */}
        <div className="flex flex-col h-full sidebar-surface">
          {/* Logo Section */}
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-accent-500 flex items-center justify-center shadow-glow-sm">
                  <Brain className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -top-0.5 -right-0.5 w-3 h-3">
                  <Sparkles className="w-3 h-3 text-accent-400 animate-pulse" />
                </div>
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-base text-white tracking-tight leading-tight">{t.appName}</h1>
                <p className="text-xs text-primary-100 truncate font-medium mt-0.5 leading-snug">{t.appSubtitle}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item, index) => {
              const isActive = location.pathname === item.path ||
                (item.path !== '/dashboard' && location.pathname.startsWith(item.path + '/'));
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`
                    nav-item group animate-fade-in
                    ${isActive ? 'nav-item-active' : 'nav-item-inactive'}
                  `}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <item.icon className={`w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200
                    ${isActive ? 'text-primary-200' : 'text-primary-200 group-hover:scale-110'}
                  `} />
                  <span className="flex-1 leading-snug">{item.label}</span>
                  {isActive && (
                    <ChevronRight className="w-3.5 h-3.5 text-primary-400 animate-fade-in" />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Section */}
          <div className="p-4 border-t border-white/5">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-bold text-white shadow-sm">
                {(user?.nameTh || user?.name || '?')[0]}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate leading-tight">{user?.nameTh || user?.name}</p>
                <p className="text-xs text-primary-100 mt-0.5 leading-snug">
                  {user?.role === 'ADMIN' ? t.admin : user?.role === 'REVIEWER' ? t.reviewer : t.nurse}
                  {user?.experienceLevel && ` · ${experienceLevelLabels[user.experienceLevel]}`}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-primary-100 hover:text-red-300 w-full px-1 py-1 rounded-lg transition-colors duration-200"
            >
              <LogOut className="w-4 h-4" />
              {t.logout}
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 bg-transparent border-0 px-4 py-3 flex items-center justify-between lg:px-6">
          <button
            className="lg:hidden p-1.5 rounded-lg hover:bg-surface-100 transition-colors"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <LanguageSelector />
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto content-pane">
          <div className="animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

function getNavItems(role: string, t: ReturnType<typeof useLanguage>['t']) {
  const items = [];

  if (role === 'ADMIN') {
    items.push(
      { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
      { path: '/users', label: t.users, icon: Users },
      { path: '/departments', label: t.departments, icon: Building2 },
      { path: '/cases', label: t.cases, icon: FileText },
      { path: '/rubrics', label: t.rubrics, icon: ClipboardCheck },
      { path: '/assessments', label: t.assessments, icon: Stethoscope },
      { path: '/reviews', label: t.reviews, icon: Shield },
      { path: '/summary-results', label: 'สรุปผล', icon: Table2 },
      { path: '/analytics', label: t.analytics, icon: BarChart3 },
    );
  } else if (role === 'NURSE') {
    items.push(
      { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
      { path: '/my-assessments', label: t.myAssessments, icon: Stethoscope },
      { path: '/cases', label: t.cases, icon: FileText },
    );
  } else if (role === 'REVIEWER') {
    items.push(
      { path: '/dashboard', label: t.dashboard, icon: LayoutDashboard },
      { path: '/reviews', label: t.pendingReviews, icon: Shield },
      { path: '/assessments', label: t.assessments, icon: Stethoscope },
      { path: '/summary-results', label: 'สรุปผล', icon: Table2 },
    );
  }

  return items;
}
