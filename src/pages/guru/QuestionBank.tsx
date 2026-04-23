import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { supabase, Question } from '../../lib/supabase';
import { useAuth } from '../../App';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  Loader2,
  BookOpen,
  CheckCircle2,
  X,
  PlusCircle
} from 'lucide-react';

export default function QuestionBank() {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form state
  const [type, setType] = useState<'pilihan_ganda' | 'esai'>('pilihan_ganda');
  const [questionText, setQuestionText] = useState('');
  const [optA, setOptA] = useState('');
  const [optB, setOptB] = useState('');
  const [optC, setOptC] = useState('');
  const [optD, setOptD] = useState('');
  const [correct, setCorrect] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    setLoading(true);
    let query = supabase
      .from('questions')
      .select('*')
      .order('created_at', { ascending: false });

    if (profile?.role === 'guru') {
      query = query.eq('created_by', profile.id);
    }

    const { data, error } = await query;

    if (!error && data) {
      setQuestions(data as Question[]);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'pilihan_ganda' && !correct) {
      alert('Pilih satu jawaban yang benar untuk Pilihan Ganda.');
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from('questions').insert({
        question: questionText,
        type,
        option_a: type === 'pilihan_ganda' ? optA : null,
        option_b: type === 'pilihan_ganda' ? optB : null,
        option_c: type === 'pilihan_ganda' ? optC : null,
        option_d: type === 'pilihan_ganda' ? optD : null,
        correct_answer: correct,
        created_by: profile?.id
      });

      if (error) throw error;
      
      resetForm();
      setShowModal(false);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setQuestionText('');
    setOptA('');
    setOptB('');
    setOptC('');
    setOptD('');
    setCorrect('');
    setType('pilihan_ganda');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus soal ini?')) return;
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (!error) {
      setQuestions(questions.filter(q => q.id !== id));
    }
  };

  const openModal = () => {
    resetForm();
    setShowModal(true);
  };

  const filteredQuestions = questions.filter(q => 
    q.question.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text"
            placeholder="Cari kata kunci soal..."
            className="input-field pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        
        <button 
          type="button"
          onClick={(e) => {
            e.preventDefault();
            openModal();
          }}
          className="btn-primary flex items-center gap-2 cursor-pointer relative z-10"
        >
          <PlusCircle className="w-5 h-5" />
          <span>Tambah Soal</span>
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
          </div>
        ) : filteredQuestions.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-20 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-slate-900 font-bold">Bank Soal Kosong</h3>
            <p className="text-slate-400 text-sm">Belum ada soal yang dibuat untuk mata pelajaran ini.</p>
          </div>
        ) : filteredQuestions.map((q) => (
          <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-6 hover:border-primary transition-all group">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${q.type === 'esai' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                    {q.type === 'esai' ? 'Esai' : 'Pilihan Ganda'}
                  </span>
                </div>
                <p className="text-slate-900 font-bold leading-relaxed">{q.question}</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleDelete(q.id)} className="p-2 text-slate-400 hover:text-primary transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            {q.type === 'pilihan_ganda' ? (
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  { key: 'a', val: q.option_a },
                  { key: 'b', val: q.option_b },
                  { key: 'c', val: q.option_c },
                  { key: 'd', val: q.option_d }
                ].map((opt) => (
                  <div key={opt.key} className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${q.correct_answer === opt.key ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-slate-50 border-slate-100 text-slate-600'}`}>
                    <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center font-bold text-[10px] uppercase ${q.correct_answer === opt.key ? 'bg-emerald-500 text-white' : 'bg-white border text-slate-400'}`}>
                      {opt.key}
                    </span>
                    {opt.val}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Kunci Jawaban / Keyword</p>
                <p className="text-sm text-slate-600 italic">"{q.correct_answer}"</p>
              </div>
            )}
          </div>
        ))}
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-[32px] p-8 w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.3)] relative max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowModal(false)} 
                className="absolute top-6 right-6 text-slate-400 hover:text-primary transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
              <h3 className="text-xl font-bold mb-6">Buat Soal Baru</h3>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex gap-4 p-1 bg-slate-100 rounded-xl mb-6">
                <button 
                  type="button" 
                  onClick={() => setType('pilihan_ganda')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'pilihan_ganda' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Pilihan Ganda
                </button>
                <button 
                  type="button" 
                  onClick={() => setType('esai')}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${type === 'esai' ? 'bg-white shadow-sm text-primary' : 'text-slate-500'}`}
                >
                  Esai (Essay)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Pertanyaan</label>
                <textarea 
                  required 
                  value={questionText} 
                  onChange={e => setQuestionText(e.target.value)} 
                  className="input-field min-h-[100px] py-3" 
                  placeholder="Ketik pertanyaan di sini..."
                />
              </div>

              {type === 'pilihan_ganda' ? (
                <div className="grid sm:grid-cols-2 gap-4">
                  {['a', 'b', 'c', 'd'].map((key) => (
                    <div key={key}>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">
                         Pilihan {key.toUpperCase()}
                         <input 
                          type="radio" 
                          name="correct" 
                          checked={correct === key}
                          onChange={() => setCorrect(key as any)}
                          className="ml-auto accent-emerald-500"
                         />
                         <span className="text-[10px] text-emerald-600 font-bold uppercase">Benar?</span>
                      </label>
                      <input 
                        required 
                        value={key === 'a' ? optA : key === 'b' ? optB : key === 'c' ? optC : optD} 
                        onChange={e => {
                          if(key === 'a') setOptA(e.target.value);
                          if(key === 'b') setOptB(e.target.value);
                          if(key === 'c') setOptC(e.target.value);
                          if(key === 'd') setOptD(e.target.value);
                        }} 
                        className="input-field" 
                        placeholder={`Opsi ${key.toUpperCase()}`}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Kunci Jawaban / Keyword Pokok</label>
                  <input 
                    required 
                    value={correct} 
                    onChange={e => setCorrect(e.target.value)} 
                    className="input-field" 
                    placeholder="Contoh: Intelegensia Buatan / AI"
                  />
                </div>
              )}

              <button disabled={submitting} className="btn-primary w-full h-12 font-bold text-lg">
                {submitting ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : 'Simpan ke Bank Soal'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
      </AnimatePresence>
    </div>
  );
}
