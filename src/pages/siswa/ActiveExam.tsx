import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase, Exam, Question, Answer } from '../../lib/supabase';
import { useAuth } from '../../App';
import { 
  Loader2, 
  Clock, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  GraduationCap,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ActiveExam() {
  const { id: examId } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [exam, setExam] = useState<Exam | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0); // seconds
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);

  useEffect(() => {
    fetchExamData();
    // Start warning user about closing tab
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  const fetchExamData = async () => {
    setLoading(true);
    try {
      // Fetch Exam
      const { data: ex } = await supabase.from('exams').select('*').eq('id', examId).single();
      if (!ex) throw new Error('Ujian tidak ditemukan');
      setExam(ex as Exam);

      // Fetch Questions via rel table
      const { data: rels } = await supabase
        .from('exam_questions')
        .select(`
          question:questions (*)
        `)
        .eq('exam_id', examId);
      
      if (rels && rels.length > 0) {
        const qList = rels.map((r: any) => r.question).filter((q: any) => q !== null);
        if (qList.length === 0) {
           console.error("Soal ditemukan di relasi tapi gagal dimuat (cek RLS questions)");
           throw new Error('Gagal memuat detail soal. Silakan hubungi Guru/Admin.');
        }
        setQuestions(qList);
      } else {
        throw new Error('Ujian ini belum memiliki soal. Silakan hubungi Guru/Admin.');
      }

      // Initialize Timer
      setTimeLeft(ex.duration * 60);

    } catch (err: any) {
      alert(err.message);
      navigate('/app/exam-list');
    } finally {
      setLoading(false);
    }
  };

  const handleFinish = useCallback(async () => {
    if (isSubmitting) return;
    
    if (!profile?.id) {
      alert('Sesi Anda telah berakhir. Silakan login kembali.');
      navigate('/');
      return;
    }

    setIsSubmitting(true);
    try {
        // Get fresh user ID from auth session to be certain for RLS
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (!authUser) throw new Error('Sesi autentikasi tidak ditemukan. Silakan login kembali.');
        const userId = authUser.id;

        // Calculate score (only for PG questions)
        const pgQuestions = questions.filter(q => q.type === 'pilihan_ganda');
        let correctCount = 0;
        
        pgQuestions.forEach(q => {
            if (answers[q.id]?.toLowerCase() === q.correct_answer?.toLowerCase()) {
                correctCount++;
            }
        });
        
        const score = pgQuestions.length > 0 ? (correctCount / pgQuestions.length) * 100 : 0;

        // Prepare detailed answers for JSONB
        const studentAnswersDetail = questions.map(q => ({
            question_id: q.id,
            question: q.question,
            type: q.type,
            answer: answers[q.id] || '',
            is_correct: q.type === 'pilihan_ganda' ? answers[q.id] === q.correct_answer : null
        }));

        // 1. Save Result
        const { error: resError } = await supabase.from('results').insert({
            user_id: userId,
            exam_id: examId,
            score: Math.round(score),
            total_questions: questions.length,
            correct_answers: correctCount,
            student_answers: studentAnswersDetail
        });

        if (resError) {
          console.error('Error saving result:', resError);
          throw new Error(`Gagal menyimpan hasil: ${resError.message}`);
        }

        // 2. Save detailed Answers (Log Table)
        const answerPayloads = Object.entries(answers).map(([qId, val]) => ({
            user_id: userId,
            exam_id: examId,
            question_id: qId,
            answer: val
        }));

        if (answerPayloads.length > 0) {
          const { error: ansError } = await supabase.from('answers').insert(answerPayloads);
          if (ansError) {
            console.error('Error saving answers:', ansError);
            throw new Error(`Gagal menyimpan detail jawaban: ${ansError.message}`);
          }
        }

        alert(`Ujian selesai! ${pgQuestions.length > 0 ? `Skor PG Anda: ${Math.round(score)}` : 'Jawaban telah terkirim.'}`);
        navigate('/app/results');
    } catch (err: any) {
        console.error('Submit exam error:', err);
        alert(err.message || 'Terjadi kesalahan saat menyimpan jawaban. Silakan cek koneksi internet Anda atau hubungi admin.');
    } finally {
        setIsSubmitting(false);
    }
  }, [examId, profile, questions, answers, navigate]);

  // Timer Effect
  useEffect(() => {
    if (timeLeft <= 0 && !loading && exam) {
      handleFinish();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, loading, exam, handleFinish]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m < 10 ? '0' + m : m}:${s < 10 ? '0' + s : s}`;
  };

  const handleSelect = (qId: string, value: string) => {
    setAnswers(prev => ({ ...prev, [qId]: value }));
  };

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white">
        <Loader2 className="w-12 h-12 text-primary animate-spin" />
        <p className="font-bold text-slate-500">Mempersiapkan Lembar Ujian...</p>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="h-screen flex flex-col items-center justify-center gap-4 bg-white text-center p-6">
        <AlertTriangle className="w-12 h-12 text-primary mb-2" />
        <h2 className="text-xl font-bold text-slate-900">Gagal Memuat Soal</h2>
        <p className="text-slate-500 max-w-md">Tidak dapat menemukan soal atau Anda tidak memiliki izin untuk melihat soal di ujian ini.</p>
        <button onClick={() => navigate('/app/exam-list')} className="btn-primary mt-4">Kembali ke Daftar</button>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header Baru */}
      <header className="h-20 bg-slate-900 text-white flex items-center justify-between px-4 sm:px-10 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-bold text-sm leading-tight uppercase tracking-tighter">CBT — SMK Prima Unggul</h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{exam?.title}</p>
          </div>
        </div>

        <div className="flex items-center gap-4 sm:gap-8">
           <div className={`px-4 py-2 rounded-xl flex items-center gap-3 font-mono font-bold text-xl ${timeLeft < 300 ? 'bg-primary text-white animate-pulse' : 'bg-white/10 text-primary-light border border-white/10'}`}>
              <Clock className="w-5 h-5 hidden xs:block" />
              {formatTime(timeLeft)}
           </div>
           
           <button 
             onClick={() => setShowConfirmSubmit(true)}
             className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/40 hidden sm:flex items-center gap-2"
           >
             <Send className="w-4 h-4" />
             Selesaikan Ujian
           </button>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full grid lg:grid-cols-4 gap-8 p-4 sm:p-10 overflow-auto h-[calc(100vh-80px)]">
        {/* Main Exam Area */}
        <div className="lg:col-span-3 flex flex-col min-h-0">
          <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-12 relative overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-8">
               <span className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Pertanyaan {currentIndex + 1} / {questions.length}</span>
               <div className="flex gap-2">
                 <button 
                   disabled={currentIndex === 0}
                   onClick={() => setCurrentIndex(prev => prev - 1)}
                   className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all disabled:opacity-20"
                 >
                   <ChevronLeft className="w-6 h-6" />
                 </button>
                 <button 
                   disabled={currentIndex === questions.length - 1}
                   onClick={() => setCurrentIndex(prev => prev + 1)}
                   className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:text-primary hover:border-primary transition-all disabled:opacity-20"
                 >
                   <ChevronRight className="w-6 h-6" />
                 </button>
               </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestion.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <h2 className="text-xl sm:text-2xl font-bold text-slate-900 leading-relaxed mb-10">
                  {currentQuestion.question}
                </h2>

                {currentQuestion.type === 'pilihan_ganda' ? (
                  <div className="grid gap-4">
                    {['a', 'b', 'c', 'd'].map((key) => {
                      const label = (currentQuestion as any)[`option_${key}`];
                      const isSelected = answers[currentQuestion.id] === key;
                      return (
                        <button
                          key={key}
                          onClick={() => handleSelect(currentQuestion.id, key)}
                          className={`group p-6 rounded-2xl border-2 transition-all flex items-center text-left ${isSelected ? 'bg-primary/5 border-primary shadow-lg shadow-primary/5' : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'}`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm uppercase mr-5 transition-all ${isSelected ? 'bg-primary text-white scale-110' : 'bg-slate-50 text-slate-400 group-hover:bg-slate-100'}`}>
                            {key}
                          </div>
                          <span className={`font-medium ${isSelected ? 'text-slate-900' : 'text-slate-600'}`}>{label}</span>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col">
                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Jawaban Esai Anda:</label>
                    <textarea 
                      className="flex-1 w-full p-6 rounded-3xl border-2 border-slate-100 focus:border-primary outline-none transition-all resize-none font-medium text-lg text-slate-700 bg-slate-50"
                      placeholder="Ketik jawaban lengkap Anda di sini..."
                      value={answers[currentQuestion.id] || ''}
                      onChange={(e) => handleSelect(currentQuestion.id, e.target.value)}
                    />
                    <div className="mt-4 flex items-center gap-2 text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                       <AlertTriangle className="w-3.5 h-3.5" />
                       Jawaban esai akan diperiksa secara manual oleh guru.
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Sidebar Navigation */}
        <div className="hidden lg:flex flex-col gap-6">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Navigasi Soal</h3>
            <div className="grid grid-cols-5 gap-3 flex-1 content-start overflow-y-auto pr-2">
              {questions.map((q, idx) => {
                const isAnswered = !!answers[q.id];
                const isCurrent = currentIndex === idx;
                return (
                  <button
                    key={q.id}
                    onClick={() => setCurrentIndex(idx)}
                    className={`aspect-square rounded-xl text-xs font-bold transition-all border ${isCurrent ? 'bg-slate-900 text-white border-slate-900 scale-110 shadow-lg' : isAnswered ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-slate-400 border-slate-100 hover:border-slate-300'}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
            
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  Terjawab: {Object.keys(answers).length}
               </div>
               <div className="flex items-center gap-3 text-xs font-bold text-slate-500 uppercase tracking-wider">
                  <div className="w-3 h-3 rounded bg-white border border-slate-200" />
                  Belum: {questions.length - Object.keys(answers).length}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirm Submit Modal */}
      {showConfirmSubmit && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
           <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             className="bg-white rounded-[32px] p-10 max-w-md w-full text-center shadow-2xl"
           >
              <div className="w-20 h-20 bg-amber-50 rounded-3xl flex items-center justify-center mx-auto mb-8">
                 <AlertTriangle className="w-10 h-10 text-amber-500" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-2">Selesaikan Ujian?</h3>
              <p className="text-slate-500 mb-10 leading-relaxed">
                 Pastikan semua jawaban telah terisi dengan benar. Anda tidak dapat kembali ke lembar ujian setelah klik selesai.
              </p>
              
              <div className="flex flex-col gap-3">
                 <button 
                   disabled={isSubmitting}
                   onClick={handleFinish}
                   className="w-full h-14 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-200 transition-all active:scale-95 flex items-center justify-center"
                 >
                    {isSubmitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Ya, Kirim Sekarang'}
                 </button>
                 <button 
                  onClick={() => setShowConfirmSubmit(false)}
                  className="w-full h-14 bg-slate-100 text-slate-600 rounded-2xl font-bold hover:bg-slate-200 transition-all font-sans"
                 >
                    Kembali Periksa
                 </button>
              </div>
           </motion.div>
        </div>
      )}
    </div>
  );
}
