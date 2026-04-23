import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../App';
import { 
  Users, 
  BookOpen, 
  ClipboardList, 
  CheckCircle2, 
  TrendingUp,
  Activity,
  UserCheck,
  PlusCircle,
  FolderPlus
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    users: 0,
    questions: 0,
    exams: 0,
    results: 0
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    let qQuery = supabase.from('questions').select('*', { count: 'exact', head: true });
    let eQuery = supabase.from('exams').select('*', { count: 'exact', head: true });
    let rQuery = supabase.from('results').select('*', { count: 'exact', head: true });

    if (profile?.role === 'guru') {
      qQuery = qQuery.eq('created_by', profile.id);
      // Guru counts their own exams + admin's exams
      eQuery = supabase.from('exams').select('*', { count: 'exact', head: true }).or(`created_by.eq.${profile.id},role_creator.eq.admin`);
      // Filter results count by guru's exams using inner join syntax
      rQuery = supabase.from('results').select('id, exams!inner(created_by)', { count: 'exact', head: true }).eq('exams.created_by', profile.id);
    }

    const [u, q, e, r] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact', head: true }),
      qQuery,
      eQuery,
      rQuery,
    ]);

    setStats({
      users: u.count || 0,
      questions: q.count || 0,
      exams: e.count || 0,
      results: r.count || 0
    });
  };

  const cards = [
    ...(profile?.role === 'admin' ? [{ title: 'Total User', value: stats.users, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' }] : []),
    { title: 'Bank Soal', value: stats.questions, icon: BookOpen, color: 'text-purple-600', bg: 'bg-purple-50' },
    { title: 'Jadwal Ujian', value: stats.exams, icon: ClipboardList, color: 'text-primary', bg: 'bg-red-50' },
    { title: 'Ujian Selesai', value: stats.results, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ];

  if (profile?.role === 'siswa') {
    return <SiswaQuickStats />;
  }

  return (
    <div className="space-y-10">
      <div className="bento-grid">
        {/* Welcome Card */}
        <div className="bento-card bento-welcome">
          <div className="h-full flex flex-col">
            <span className="text-sm opacity-90 mb-1">Selamat pagi,</span>
            <h2 className="text-2xl font-bold mb-4">Ayo buat ujian baru hari ini!</h2>
            <p className="text-sm opacity-80 mt-auto">Anda login sebagai {profile?.role} di portal SMK Prima Unggul.</p>
          </div>
        </div>

        {/* Dynamic Stats Cards */}
        {cards.map((card, idx) => (
          <motion.div
            key={card.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bento-card bento-stat"
          >
            <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-auto">{card.title}</span>
            <div className="text-3xl font-bold text-text-main leading-tight">{card.value}</div>
            <span className="text-[0.7rem] text-emerald-600 font-bold mt-1 tracking-tight truncate">+12 Bulan ini</span>
          </motion.div>
        ))}

        {/* Results / Activity (Main List Area) */}
        <div className="bento-card bento-main-list overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-widest flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Aktifitas Terbaru
            </h3>
            <button className="text-[0.75rem] font-bold text-primary hover:underline">Lihat Semua</button>
          </div>
          <div className="flex-1 flex flex-col justify-center items-center text-center p-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
             <Activity className="w-8 h-8 text-slate-300 mb-2" />
             <p className="text-text-muted text-xs font-medium">Belum ada aktivitas login atau ujian terbaru yang tercatat.</p>
          </div>
        </div>

        {/* Quick Actions (Bento Sidebar) */}
        <div className="bento-card bento-action">
          <span className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest mb-4 block">Aksi Cepat</span>
          <p className="text-sm text-slate-300 leading-relaxed mb-6">Siapkan materi soal atau mulai penjadwalan ujian sekarang.</p>
          <div className="space-y-2">
            <button 
              onClick={() => navigate('/app/questions')}
              className="w-full bg-primary text-white p-3 rounded-xl font-bold text-xs hover:bg-primary-dark transition-all flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-4 h-4" />
              Buat Soal Baru
            </button>
            <button 
              onClick={() => navigate('/app/exams')}
              className="w-full bg-slate-700 text-white p-3 rounded-xl font-bold text-xs hover:bg-slate-600 transition-all flex items-center justify-center gap-2"
            >
              <FolderPlus className="w-4 h-4" />
              Buat Paket Ujian
            </button>
          </div>
        </div>

        {/* Avg Score (Bento Bottom Area) */}
        <div className="bento-card bento-stat">
          <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-auto">Rata-rata Nilai</span>
          <div className="text-3xl font-bold text-text-main">84.2</div>
          <div className="flex gap-1 mt-2">
            <div className="w-1/5 h-1 bg-primary rounded-full"></div>
            <div className="w-4/5 h-1 bg-slate-100 rounded-full"></div>
          </div>
        </div>

        <div className="bento-card bento-stat">
          <span className="text-[0.75rem] font-bold text-text-muted uppercase tracking-wider mb-auto">Kehadiran</span>
          <div className="text-3xl font-bold text-text-main">98%</div>
          <span className="text-[0.7rem] text-emerald-600 font-bold mt-1 tracking-tight">Sangat Baik</span>
        </div>
      </div>
    </div>
  );
}

function SiswaQuickStats() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ exams: 0, results: 0 });

  useEffect(() => {
    const fetch = async () => {
      const e = await supabase.from('exams').select('*', { count: 'exact', head: true });
      const r = await supabase.from('results').select('*', { count: 'exact', head: true }).eq('user_id', profile?.id);
      setStats({ exams: e.count || 0, results: r.count || 0 });
    };
    fetch();
  }, [profile?.id]);

  return (
    <div className="space-y-10">
      <div className="relative p-8 rounded-3xl bg-primary text-white overflow-hidden shadow-2xl shadow-primary/20">
        <div className="absolute bottom-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-10 -mb-10 blur-2xl" />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">Selamat Belajar, {profile?.name}!</h1>
          <p className="text-white/80 max-w-lg mb-6">
            Ayo persiapkan dirimu untuk ujian hari ini. Tetap jujur dan teliti dalam mengerjakan soal.
          </p>
          <div className="flex gap-4">
            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <p className="text-[10px] font-bold uppercase opacity-60">Ujian Tersedia</p>
              <p className="text-xl font-bold">{stats.exams}</p>
            </div>
            <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-sm border border-white/20">
              <p className="text-[10px] font-bold uppercase opacity-60">Riwayat Ujian</p>
              <p className="text-xl font-bold">{stats.results}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center py-20">
        <UserCheck className="w-16 h-16 text-slate-200 mx-auto mb-6" />
        <h3 className="text-xl font-bold text-slate-900 mb-2">Profil Siswa Terverifikasi</h3>
        <p className="text-slate-500 mb-8 max-w-md mx-auto">Biodata Anda telah terdaftar dalam sistem akademik SMK Prima Unggul.</p>
        <div className="inline-flex flex-col gap-1 text-left bg-slate-50 p-4 rounded-xl border border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Informasi Akun</div>
          <p className="text-sm font-bold text-slate-700">{profile?.name}</p>
          <p className="text-xs text-primary font-bold uppercase italic tracking-tighter">Siswa Aktif</p>
        </div>
      </div>
    </div>
  );
}
