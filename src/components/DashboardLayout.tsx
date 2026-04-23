import { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../App';
import AICommandCenter from './AICommandCenter';
import { 
  LayoutDashboard, 
  Users, 
  BookOpen, 
  FileText, 
  LogOut, 
  Menu, 
  X, 
  User,
  GraduationCap,
  ClipboardList
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const menuItems = [
    { name: 'Dashboard', icon: LayoutDashboard, path: '/app/dashboard', roles: ['admin', 'guru', 'siswa'] },
    { name: 'Manajemen User', icon: Users, path: '/app/users', roles: ['admin'] },
    { name: 'Bank Soal', icon: BookOpen, path: '/app/questions', roles: ['admin', 'guru'] },
    { name: 'Manajemen Ujian', icon: ClipboardList, path: '/app/exams', roles: ['admin', 'guru'] },
    { name: 'Daftar Ujian', icon: FileText, path: '/app/exam-list', roles: ['siswa'] },
    { name: 'Hasil Ujian', icon: FileText, path: '/app/results', roles: ['siswa'] },
    { name: 'Rekap Hasil', icon: FileText, path: '/app/results', roles: ['admin', 'guru'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(profile?.role || ''));

  return (
    <div className="h-screen bg-slate-50 flex overflow-hidden">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 w-(--sidebar-w) bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 ease-in-out lg:translate-x-0",
        sidebarOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 h-20 flex items-center gap-3">
            <div className="w-9 h-9 bg-primary rounded-lg flex items-center justify-center font-bold text-white shadow-sm">
              PU
            </div>
            <div>
              <h1 className="font-bold text-sm leading-tight text-slate-900">SMK PRIMA</h1>
              <p className="text-[10px] text-text-muted font-medium">Computer Based Test</p>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-4 space-y-1">
            {filteredMenu.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) => cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-[0.9rem]",
                  isActive 
                    ? "nav-item-active" 
                    : "text-text-muted hover:bg-slate-50 hover:text-text-main"
                )}
              >
                <item.icon className="w-5 h-5" />
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-4 border-t border-slate-200 mt-auto">
            <div className="text-[0.75rem] text-text-muted">v1.0.4 &copy; 2024 Admin Panel</div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-500 hover:bg-slate-50 rounded-lg"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div>
              <h2 className="font-bold text-slate-900 capitalize">
                {location.pathname.split('/').pop()?.replace('-', ' ')}
              </h2>
              <p className="text-xs text-slate-500 font-medium tracking-wide">
                SMK Prima Unggul — Core Portal
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-right">
              <div>
                <p className="font-bold text-sm text-text-main leading-tight truncate">{profile?.name || 'User'}</p>
                <p className="text-[10px] text-text-muted font-bold uppercase tracking-widest">{profile?.role}</p>
              </div>
            </div>
            <button 
              onClick={handleSignOut}
              className="px-4 py-2 bg-red-50 text-primary border border-red-100 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors"
            >
              Keluar
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 md:p-10 relative">
          <Outlet />
          <AICommandCenter />
        </main>
      </div>
    </div>
  );
}
