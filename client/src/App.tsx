import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import UsersPage from './pages/UsersPage';
import DepartmentsPage from './pages/DepartmentsPage';
import CasesPage from './pages/CasesPage';
import RubricsPage from './pages/RubricsPage';
import MyAssessmentsPage from './pages/MyAssessmentsPage';
import AssessmentPage from './pages/AssessmentPage';
import ReviewsListPage from './pages/ReviewsListPage';
import ReviewDetailPage from './pages/ReviewDetailPage';
import AnalyticsPage from './pages/AnalyticsPage';
import IDPPage from './pages/IDPPage';
import SummaryResultsPage from './pages/SummaryResultsPage';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" />;
  return children;
}

export default function App() {
  const { user } = useAuth();

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        
        {/* Admin only */}
        <Route path="/users" element={<ProtectedRoute roles={['ADMIN']}><UsersPage /></ProtectedRoute>} />
        <Route path="/departments" element={<ProtectedRoute roles={['ADMIN']}><DepartmentsPage /></ProtectedRoute>} />
        <Route path="/rubrics" element={<ProtectedRoute roles={['ADMIN']}><RubricsPage /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute roles={['ADMIN']}><AnalyticsPage /></ProtectedRoute>} />
        <Route path="/summary-results" element={<ProtectedRoute roles={['ADMIN', 'REVIEWER']}><SummaryResultsPage /></ProtectedRoute>} />
        
        {/* Admin + Reviewer */}
        <Route path="/cases" element={<ProtectedRoute roles={['ADMIN', 'REVIEWER']}><CasesPage /></ProtectedRoute>} />
        <Route path="/reviews" element={<ProtectedRoute roles={['ADMIN', 'REVIEWER']}><ReviewsListPage /></ProtectedRoute>} />
        <Route path="/reviews/:sessionId" element={<ProtectedRoute roles={['ADMIN', 'REVIEWER']}><ReviewDetailPage /></ProtectedRoute>} />
        
        {/* Nurse */}
        <Route path="/my-assessments" element={<ProtectedRoute roles={['NURSE']}><MyAssessmentsPage /></ProtectedRoute>} />
        <Route path="/assessment/:id" element={<ProtectedRoute roles={['NURSE']}><AssessmentPage /></ProtectedRoute>} />
        
        {/* IDP - accessible by Nurse (own), Reviewer, Admin */}
        <Route path="/idp/:sessionId" element={<ProtectedRoute roles={['NURSE', 'REVIEWER', 'ADMIN']}><IDPPage /></ProtectedRoute>} />
        
        <Route path="/login" element={<Navigate to="/" />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Layout>
  );
}
