import { useLanguage } from '../contexts/LanguageContext';
import { Languages } from 'lucide-react';

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  return (
    <div className="flex items-center gap-2 bg-surface-100 border border-surface-200 rounded-lg p-1.5">
      <Languages className="w-4 h-4 text-surface-700" />
      <button
        onClick={() => setLanguage('th')}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          language === 'th'
            ? 'bg-white text-primary-800 shadow-sm border border-surface-200'
            : 'text-surface-700 hover:text-surface-900'
        }`}
      >
        ไทย
      </button>
      <button
        onClick={() => setLanguage('en')}
        className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
          language === 'en'
            ? 'bg-white text-primary-800 shadow-sm border border-surface-200'
            : 'text-surface-700 hover:text-surface-900'
        }`}
      >
        EN
      </button>
    </div>
  );
}
