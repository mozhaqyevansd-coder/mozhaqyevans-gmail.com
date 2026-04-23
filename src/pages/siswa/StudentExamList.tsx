import { useState, useEffect } from 'react';
import { supabase, Exam } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../App';
import { 
  FileText, 
  ArrowRight, 
  Clock, 
  Calendar,
  Loader2,
  AlertCircle,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentExamList() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<(Exam & { is_finished?: boolean })[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchExams = async () => {
    if (!profile?.id) {
      console.log('Profile ID not found for exam fetch');
      return;
    }
    setLoading(true);
    try {
      // Students see exams filtered by status on frontend, while RLS allows access to history
      const [examsRes, resultsRes] = await Promise.all([
        supabase
          .from('exams')
          .select('*')
          .or('status.eq.aktif,is_active.eq.true')
          .order('created_at', { ascending: false }),
        supabase.from('results').select('exam_id').eq('user_id', profile.id)
      ]);

      if (examsRes.error) {
        console.error('Error fetching exams:', examsRes.error);
        throw examsRes.error;
      }

      const finishedExamIds = new Set((resultsRes.data || []).map(r => r.exam_id));

      if (examsRes.data) {
        const formatted = examsRes.data.map(e => ({
          ...e,
          is_finished: finishedExamIds.has(e.id)
        }));
        setExams(formatted);
      }
    } catch (err) {
      console.error('Fetch exams caught error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExams();
  }, [profile?.id]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-8 rounded-3xl border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Daftar Materi Ujian</h1>
          <p className="text-slate-500 text-sm">Pilih materi ujian yang tersedia untuk mulai mengerjakan.</p>
        </div>
        <button 
          onClick={fetchExams}
          disabled={loading}
          className="p-3 rounded-xl border border-slate-100 text-slate-400 hover:text-primary hover:border-primary transition-all disabled:opacity-50"
          title="Segarkan Daftar"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-56 bg-slate-100 rounded-3xl animate-pulse" />
          ))
        ) : exams.length === 0 ? (
          <div className="md:col-span-3 py-20 text-center bg-white rounded-3xl border border-dashed border-slate-300">
             <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
             <p className="text-slate-500 font-bold">Belum ada ujian aktif saat ini.</p>
             <p className="text-slate-400 text-sm">Silakan hubungi proktor atau guru mata pelajaran Anda.</p>
          </div>
        ) : exams.map((exam, idx) => (
          <motion.div
            key={exam.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className={`group bg-white rounded-3xl border ${exam.is_finished ? 'border-emerald-200 bg-emerald-50/10' : 'border-slate-200'} p-8 hover:border-primary transition-all relative overflow-hidden flex flex-col shadow-sm`}
          >
            <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
              <FileText className="w-24 h-24" />
            </div>
            
            <div className="relative z-10 flex-1">
              <div className="flex justify-between items-start mb-6">
                <span className="text-[10px] font-extrabold py-1 px-2 rounded bg-red-50 text-primary uppercase tracking-widest border border-red-100">{exam.subject}</span>
                {exam.is_finished && (
                  <span className="text-[10px] font-bold py-1 px-2 rounded bg-emerald-100 text-emerald-700 uppercase tracking-widest flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Selesai
                  </span>
                )}
              </div>

              <h3 className="text-xl font-bold text-slate-900 mb-6 leading-tight min-h-[3.5rem]">{exam.title}</h3>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Clock className="w-4 h-4 text-primary" />
                  {exam.duration} Min
                </div>
                <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-primary" />
                  {new Date(exam.created_at).toLocaleDateString('id-ID')}
                </div>
              </div>
            </div>

            {exam.is_finished ? (
              <button 
                onClick={() => navigate('/app/results')}
                className="w-full h-12 rounded-xl bg-emerald-600 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors shadow-lg shadow-emerald-200/50"
              >
                Lihat Hasil Ujian
              </button>
            ) : (
              <button 
                onClick={() => navigate(`/exam/${exam.id}`)}
                className="w-full h-12 rounded-xl bg-slate-900 text-white font-bold text-sm tracking-wide flex items-center justify-center gap-2 hover:bg-primary transition-colors group-hover:shadow-lg group-hover:shadow-primary/20"
              >
                Mulai Mengerjakan
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
