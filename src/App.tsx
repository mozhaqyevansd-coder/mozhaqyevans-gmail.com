import { useEffect, useState, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { supabase, Role, UserProfile } from './lib/supabase';
import { Loader2 } from 'lucide-react';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './components/DashboardLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import QuestionBank from './pages/guru/QuestionBank';
import ExamManagement from './pages/guru/ExamManagement';
import StudentExamList from './pages/siswa/StudentExamList';
import ActiveExam from './pages/siswa/ActiveExam';
import ExamResults from './pages/ExamResults';

// Auth Context
interface AuthContextType {
  user: any | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Session error:', err);
        setLoading(false);
      });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
      } else if (data) {
        setProfile(data as UserProfile);
      }
    } catch (err) {
      console.error('Profile fetch crash:', err);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="text-slate-500 font-medium font-sans">Menyiapkan Aplikasi Ujian...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, profile, loading, signOut }}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={!user ? <LoginPage /> : <Navigate to="/app/dashboard" />} />
          
          <Route path="/app" element={user ? <DashboardLayout /> : <Navigate to="/login" />}>
            <Route path="dashboard" element={<AdminDashboard />} />
            
            {/* Admin Routes */}
            <Route path="users" element={profile?.role === 'admin' ? <UserManagement /> : <Navigate to="/app/dashboard" />} />
            
            {/* Guru & Admin Routes */}
            <Route path="questions" element={['admin', 'guru'].includes(profile?.role || '') ? <QuestionBank /> : <Navigate to="/app/dashboard" />} />
            <Route path="exams" element={['admin', 'guru'].includes(profile?.role || '') ? <ExamManagement /> : <Navigate to="/app/dashboard" />} />
            <Route path="results" element={<ExamResults />} />

            {/* Siswa Routes */}
            <Route path="exam-list" element={profile?.role === 'siswa' ? <StudentExamList /> : <Navigate to="/app/dashboard" />} />
          </Route>

          <Route path="/exam/:id" element={user && profile?.role === 'siswa' ? <ActiveExam /> : <Navigate to="/login" />} />
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </AuthContext.Provider>
  );
}
