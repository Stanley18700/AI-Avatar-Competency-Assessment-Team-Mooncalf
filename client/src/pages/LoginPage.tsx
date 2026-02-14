import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Brain, Sparkles, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard');
    } catch {
      setError(t.loginFailed);
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    { label: 'Admin', email: 'admin@nursemind.ai', icon: '👑', color: 'from-amber-500 to-orange-500' },
    { label: 'Nurse 1', email: 'nurse1@nursemind.ai', icon: '👩‍⚕️', color: 'from-emerald-500 to-teal-500' },
    { label: 'Nurse 2', email: 'nurse2@nursemind.ai', icon: '👨‍⚕️', color: 'from-blue-500 to-cyan-500' },
    { label: 'Reviewer', email: 'reviewer@nursemind.ai', icon: '🔍', color: 'from-purple-500 to-pink-500' },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary-950 via-primary-900 to-accent-900 bg-gradient-animated" />

      {/* Floating Orbs */}
      <div className="absolute top-1/4 -left-20 w-72 h-72 bg-primary-500/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-accent-500/15 rounded-full blur-3xl animate-float-slow" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/10 rounded-full blur-3xl" />

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      {/* Login Card */}
      <div className="relative z-10 w-full max-w-md animate-fade-in-up rounded-3xl bg-primary-900/95 backdrop-blur-xl border border-white/10 shadow-2xl p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="relative inline-flex items-center justify-center mb-5">
            <div className="absolute w-20 h-20 bg-primary-500/20 rounded-2xl blur-xl animate-pulse" />
            <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-400 via-primary-500 to-accent-500 flex items-center justify-center shadow-glow">
              <Brain className="w-8 h-8 text-white" />
            </div>
            <Sparkles className="absolute -top-1 -right-1 w-5 h-5 text-accent-400 animate-pulse" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{t.appName}</h1>
          <p className="text-sm text-primary-100 mt-2 font-medium leading-relaxed">{t.appSubtitle}</p>
          <p className="text-sm text-white/80 mt-1.5 leading-snug">{t.hospital}</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-300 px-4 py-3 rounded-xl text-sm animate-scale-in backdrop-blur-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-white/95 mb-1.5">{t.email}</label>
            <input
              type="email"
              className="w-full px-4 py-3 bg-white/[0.08] border border-white/20 rounded-xl text-white placeholder:text-white/50 
                           focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400/60 focus:bg-white/[0.1]
                           outline-none transition-all duration-200"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@nursemind.ai"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white/95 mb-1.5">{t.password}</label>
            <input
              type="password"
              className="w-full px-4 py-3 bg-white/[0.08] border border-white/20 rounded-xl text-white placeholder:text-white/50 
                           focus:ring-2 focus:ring-primary-400/40 focus:border-primary-400/60 focus:bg-white/[0.1]
                           outline-none transition-all duration-200"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white transition-all duration-300
                         bg-gradient-to-r from-primary-500 to-accent-500 
                         hover:from-primary-400 hover:to-accent-400 hover:shadow-glow
                         active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t.loading}</span>
              </>
            ) : (
              <span>{t.login}</span>
            )}
          </button>
        </form>

        {/* Demo Credentials */}
        <div className="mt-6 pt-5 border-t border-white/20">
          <p className="text-xs text-white/90 text-center mb-3 uppercase tracking-wider font-semibold">
            Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-2">
            {demoAccounts.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => { setEmail(demo.email); setPassword('password123'); }}
                className="group relative px-3 py-2.5 bg-white/[0.06] hover:bg-white/[0.1] rounded-xl 
                             border border-white/20 hover:border-white/30
                             transition-all duration-200 text-left"
              >
                <div className={`absolute inset-0 rounded-xl bg-gradient-to-r ${demo.color} opacity-0 group-hover:opacity-[0.08] transition-opacity duration-300`} />
                <div className="relative flex items-center gap-2">
                  <span className="text-base">{demo.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{demo.label}</p>
                    <p className="text-xs text-white/80 truncate mt-0.5">{demo.email}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Powered by badge */}
        <div className="text-center mt-6">
          <p className="text-xs text-white/70 font-medium">
            Powered by AI · Built for MFU Medical Center
          </p>
        </div>
      </div>
    </div>
  );
}
