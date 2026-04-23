import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase, Exam, Question, ExamQuestion } from '../../lib/supabase';
import { useAuth } from '../../App';
import { 
  Plus, 
  Search, 
  Trash2, 
  Clock, 
  Loader2,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
  X,
  PlusCircle,
  Calendar
} from 'lucide-react';

export default function ExamManagement() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [duration, setDuration] = useState(60);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState<'aktif' | 'nonaktif'>('aktif');
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchQuestions();
  }, []);

  const fetchExams = async () => {
    setLoading(true);
    let query = supabase
      .from('exams')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.role === 'guru') {
      // Guru sees their own OR admin's
      query = query.or(`created_by.eq.${profile.id},role_creator.eq.admin`);
    }

    const { data, error } = await query;

    if (!error && data) {
      setExams(data as Exam[]);
    }
    setLoading(false);
  };

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase.from('questions').select('*').order('created_at', { ascending: false });
      if (error) {
        console.error('Error fetching questions:', error);
        return;
      }
      if (data) setQuestions(data as Question[]);
    } catch (err) {
      console.error('Question fetch crash:', err);
    }
  };

  const toggleQuestion = (id: string) => {
    setSelectedQuestions(prev => 
      prev.includes(id) ? prev.filter(qId => qId !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      alert('Pilih minimal 1 soal.');
      return;
    }

    setSubmitting(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error('Sesi berakhir. Silakan login kembali.');

      // 1. Create Exam
      const { data: examData, error: examError } = await supabase.from('exams').insert({
        title,
        subject,
        duration,
        start_time: startTime || null,
        end_time: endTime || null,
        status,
        created_by: authUser.id,
        role_creator: profile?.role === 'admin' ? 'admin' : 'guru',
        is_active: status === 'aktif'
      }).select().single();

      if (examError) {
        console.error('Exam Error:', examError);
        throw new Error(`Gagal membuat ujian: ${examError.message}`);
      }
      
      if (!examData) throw new Error('Gagal mendapatkan ID ujian baru.');

      // 2. Add Questions to Exam
      const examQuestions = selectedQuestions.map(qId => ({
        exam_id: examData.id,
        question_id: qId
      }));

      const { error: relError } = await supabase.from('exam_questions').insert(examQuestions);
      if (relError) throw relError;

      resetForm();
      setShowModal(false);
      fetchExams();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setSubject('');
    setDuration(60);
    setStartTime('');
    setEndTime('');
    setStatus('aktif');
    setSelectedQuestions([]);
  };

  const toggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'aktif' ? 'nonaktif' : 'aktif';
    const { error } = await supabase.from('exams').update({ 
      status: newStatus,
      is_active: newStatus === 'aktif'
    }).eq('id', id);
    if (!error) fetchExams();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus ujian ini?')) return;
    await supabase.from('exams').delete().eq('id', id);
    fetchExams();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Jadwal Ujian</h1>
          <p className="text-slate-500 text-sm">Kelola daftar ujian yang aktif untuk siswa.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Buat Ujian Baru</span>
        </button>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-slate-100 rounded-3xl animate-pulse" />)
        ) : exams.length === 0 ? (
          <div className="md:col-span-3 bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center">
            <ClipboardList className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-900 font-bold">Belum Ada Ujian Terjadwal</h3>
            <p className="text-slate-400 text-sm">Gunakan tombol di atas untuk membuat jadwal ujian pertama Anda.</p>
          </div>
        ) : exams.map((exam) => (
          <div key={exam.id} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm hover:border-primary transition-all relative group overflow-hidden flex flex-col">
             <div className="absolute top-0 left-0 w-2 h-full bg-primary" />
             
             <div className="flex justify-between items-start mb-2">
                <span className="text-[10px] font-extrabold text-primary uppercase tracking-widest">{exam.subject}</span>
                <button 
                  onClick={() => handleDelete(exam.id)}
                  className="p-1 text-slate-400 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
             </div>
             
             <h3 className="text-lg font-bold text-slate-900 leading-tight mb-4">{exam.title}</h3>

             <div className="space-y-3 mb-6 flex-1">
                <div className="flex items-center gap-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                   <Clock className="w-3.5 h-3.5 text-primary" />
                   {exam.duration} Menit
                </div>
                {exam.start_time && (
                  <div className="flex items-center gap-3 text-slate-500 text-[11px] font-bold uppercase tracking-wider">
                     <Calendar className="w-3.5 h-3.5 text-primary" />
                     {new Date(exam.start_time).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  </div>
                )}
             </div>

             <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                <button 
                  onClick={() => toggleStatus(exam.id, exam.status)}
                  className={`text-[10px] font-bold py-1 px-3 rounded-full uppercase tracking-widest transition-all ${exam.status === 'aktif' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}
                >
                  {exam.status === 'aktif' ? 'Aktif' : 'Nonaktif'}
                </button>
                <button className="text-primary text-xs font-extrabold hover:underline">
                   Hasil →
                </button>
             </div>
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-8 w-full max-w-2xl shadow-2xl relative max-h-[90vh] flex flex-col"
            >
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-slate-400 hover:text-primary transition-colors">
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold mb-6 shrink-0">Bentuk Jadwal Ujian Baru</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6 overflow-y-auto flex-1 pr-2">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Judul Ujian</label>
                  <input required value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="UTS Matematika" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Mata Pelajaran</label>
                  <input required value={subject} onChange={e => setSubject(e.target.value)} className="input-field" placeholder="Matematika" />
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Durasi (Menit)</label>
                  <input type="number" required value={duration} onChange={e => setDuration(parseInt(e.target.value))} className="input-field" placeholder="60" />
                </div>
                <div className="sm:col-span-2">
                   <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Status Awal</label>
                   <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value as any)}
                    className="input-field"
                   >
                     <option value="aktif">Langsung Aktifkan</option>
                     <option value="nonaktif">Simpan sebagai Draft (Nonaktif)</option>
                   </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Waktu Mulai (Opsional)</label>
                  <input type="datetime-local" value={startTime} onChange={e => setStartTime(e.target.value)} className="input-field text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">Waktu Selesai (Opsional)</label>
                  <input type="datetime-local" value={endTime} onChange={e => setEndTime(e.target.value)} className="input-field text-xs" />
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest">Pilih Soal ({selectedQuestions.length} Terpilih)</label>
                  <a href="/app/questions" className="text-[10px] font-bold text-primary hover:underline flex items-center gap-1">
                    <PlusCircle className="w-3 h-3" />
                    Tambah Soal Baru
                  </a>
                </div>
                <div className="space-y-3 max-h-60 overflow-y-auto border border-slate-100 rounded-2xl p-4 bg-slate-50">
                   {questions.length === 0 ? (
                     <p className="text-center text-slate-400 py-4 text-xs">Bank soal kosong. Silakan buat soal terlebih dahulu.</p>
                   ) : questions.map(q => (
                     <label key={q.id} className="flex items-start gap-3 p-3 bg-white rounded-xl border border-slate-200 cursor-pointer hover:border-primary transition-colors">
                        <input 
                          type="checkbox" 
                          checked={selectedQuestions.includes(q.id)}
                          onChange={() => toggleQuestion(q.id)}
                          className="mt-1 accent-primary" 
                        />
                        <span className="text-sm text-slate-700 font-medium leading-relaxed">{q.question}</span>
                     </label>
                   ))}
                </div>
              </div>

              <button disabled={submitting} className="btn-primary w-full h-12 font-bold text-lg sticky bottom-0">
                {submitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Terbitkan Jadwal Ujian'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
