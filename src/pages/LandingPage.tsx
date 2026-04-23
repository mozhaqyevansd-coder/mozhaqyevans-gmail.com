import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Network, 
  Palette, 
  Calculator, 
  Tv, 
  Briefcase, 
  ShoppingCart,
  GraduationCap,
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

const majors = [
  { name: 'TKJ', desc: 'Teknik Komputer & Jaringan', icon: Network, color: 'bg-blue-100 text-blue-600' },
  { name: 'DKV', desc: 'Desain Komunikasi Visual', icon: Palette, color: 'bg-purple-100 text-purple-600' },
  { name: 'AK', desc: 'Akuntansi', icon: Calculator, color: 'bg-green-100 text-green-600' },
  { name: 'BC', desc: 'Broadcasting', icon: Tv, color: 'bg-orange-100 text-orange-600' },
  { name: 'MPLB', desc: 'Manajemen Perkantoran', icon: Briefcase, color: 'bg-cyan-100 text-cyan-600' },
  { name: 'BD', desc: 'Bisnis Digital', icon: ShoppingCart, color: 'bg-rose-100 text-rose-600' },
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
              <GraduationCap className="text-white w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight">SMK PRIMA UNGGUL</h1>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase font-bold">CBT System</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/login')}
            className="btn-primary flex items-center gap-2"
          >
            Login Portal
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 text-primary border border-red-100 rounded-full text-xs font-bold mb-6">
              <ShieldCheck className="w-3 h-3" />
              DIGITAL EXAM SYSTEM
            </div>
            <h2 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6">
              Membangun Generasi <span className="text-primary">Emas</span> Indonesia.
            </h2>
            <p className="text-lg text-slate-600 mb-8 max-w-lg leading-relaxed">
              Platform ujian online terintegrasi untuk mendukung proses penilaian akademik yang transparan, akuntabel, dan efisien bagi seluruh civitas SMK Prima Unggul.
            </p>
            <div className="flex flex-wrap gap-4">
              <button 
                onClick={() => navigate('/login')}
                className="px-8 py-4 bg-primary text-white rounded-2xl font-bold shadow-xl shadow-primary/20 hover:scale-105 transition-transform"
              >
                Mulai Ujian Sekarang
              </button>
            </div>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-primary/5 rounded-3xl -rotate-3 scale-95" />
            <div className="relative bg-slate-100 aspect-video rounded-3xl overflow-hidden border border-slate-200 shadow-2xl">
              <img 
                src="https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=2070&auto=format&fit=crop" 
                alt="Digital Education"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent flex items-end p-8">
                <div className="text-white">
                  <p className="text-sm font-bold opacity-80 uppercase tracking-widest">SMK Prima Unggul</p>
                  <h3 className="text-2xl font-bold">Inovasi Pendidikan Di Era Digital</h3>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Majors Grid */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Program Keahlian</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">
              Beragam pilihan jurusan untuk mempersiapkan siswa menjadi tenaga profesional yang siap kerja di industri modern.
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {majors.map((major, idx) => (
              <motion.div
                key={major.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-primary transition-colors group cursor-pointer"
              >
                <div className={`w-12 h-12 ${major.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <major.icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-lg mb-1">{major.name}</h4>
                <p className="text-xs text-slate-500">{major.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-6">
            <div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center">
              <GraduationCap className="text-white w-5 h-5" />
            </div>
            <span className="font-bold">SMK Prima Unggul</span>
          </div>
          <p className="text-slate-400 text-sm max-w-sm mx-auto">
            © 2024 SMK Prima Unggul. All rights reserved. 
            Designed for excellence in vocational education.
          </p>
        </div>
      </footer>
    </div>
  );
}
