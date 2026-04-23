import { useState, useEffect } from 'react';
import { supabase, Result, Exam, UserProfile } from '../lib/supabase';
import { useAuth } from '../App';
import { 
  FileText, 
  Award, 
  Search, 
  Loader2,
  TrendingUp,
  Download,
  Filter,
  Eye,
  MessageSquare,
  CheckCircle2,
  XCircle,
  X
} from 'lucide-react';

export default function ExamResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState<(Result & { exams: Exam, users: UserProfile })[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedResult, setSelectedResult] = useState<any>(null);
  const [feedback, setFeedback] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  useEffect(() => {
    if (profile) {
      fetchResults();
    }
  }, [profile?.id, profile?.role]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('results')
        .select(`
          *,
          exams:exam_id!inner (*),
          users:user_id (*)
        `)
        .order('created_at', { ascending: false });

      if (profile?.role === 'siswa') {
        query = query.eq('user_id', profile.id);
      } else if (profile?.role === 'guru') {
        // Filter results where the exam was created by this guru
        query = query.eq('exams.created_by', profile.id);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching results:', error);
        throw error;
      }
      
      if (data) {
        setResults(data as any);
      }
    } catch (err: any) {
      console.error('Fetch results crash:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFeedback = async () => {
    if (!selectedResult || isSubmittingFeedback) return;
    setIsSubmittingFeedback(true);
    try {
      const { error } = await supabase
        .from('results')
        .update({ feedback })
        .eq('id', selectedResult.id);
      
      if (error) throw error;
      alert('Feedback berhasil disimpan.');
      setSelectedResult({ ...selectedResult, feedback });
      fetchResults();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const openDetails = (res: any) => {
    setSelectedResult(res);
    setFeedback(res.feedback || '');
  };

  const filteredResults = results.filter(r => 
    r.exams?.title.toLowerCase().includes(search.toLowerCase()) ||
    r.users?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <input 
            type="text"
            placeholder="Cari nama ujian atau siswa..."
            className="input-field pl-11"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        </div>
        
        {profile?.role !== 'siswa' && (
          <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-xl font-bold text-sm text-slate-600 hover:bg-slate-50 transition-colors">
            <Download className="w-4 h-4" />
            Export Excel
          </button>
        )}
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Siswa</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Materi Ujian</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Skor</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Correct</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selesai Pada</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array(5).fill(0).map((_, i) => <tr key={i}><td colSpan={6} className="px-8 py-5 animate-pulse"><div className="h-4 bg-slate-100 rounded w-full"></div></td></tr>)
              ) : filteredResults.length === 0 ? (
                <tr><td colSpan={6} className="px-8 py-20 text-center text-slate-400 font-medium italic">Belum ada data hasil ujian tersedia.</td></tr>
              ) : filteredResults.map((res) => (
                 <tr key={res.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="font-bold text-slate-900">{res.users?.name || 'User Terhapus'}</div>
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">NIS: { (res.users as any)?.nis || '-'}</div>
                  </td>
                  <td className="px-8 py-5">
                    <div className="text-sm font-medium text-slate-700">{res.exams?.title}</div>
                    {res.feedback && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-primary font-bold uppercase tracking-wide">
                        <MessageSquare className="w-3 h-3" />
                        Feedback Tersedia
                      </div>
                    )}
                  </td>
                  <td className="px-8 py-5 text-center">
                    <div className={`inline-flex items-center justify-center min-w-[50px] px-3 py-1 rounded-lg font-mono text-lg font-bold shadow-sm ${res.score >= 75 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-primary'}`}>
                      {res.score}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-center text-sm font-bold text-slate-500 italic">
                    {res.correct_answers} / {res.total_questions}
                  </td>
                  <td className="px-8 py-5 text-xs text-slate-400 whitespace-nowrap">
                    {new Date(res.created_at).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2">
                         <Award className={`w-4 h-4 ${res.score >= 75 ? 'text-amber-400' : 'text-slate-200'}`} />
                         <span className={`text-[10px] font-bold uppercase tracking-wider ${res.score >= 75 ? 'text-emerald-600' : 'text-slate-400'}`}>
                           {res.score >= 75 ? 'Lulus' : 'Belum Lulus'}
                         </span>
                      </div>
                      <button 
                        onClick={() => openDetails(res)}
                        className="p-2 text-slate-400 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Details Modal */}
      {selectedResult && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] p-8 w-full max-w-3xl shadow-2xl relative max-h-[90vh] flex flex-col">
            <button onClick={() => setSelectedResult(null)} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600">
              <X className="w-6 h-6" />
            </button>
            
            <div className="mb-8 pr-12">
               <span className="text-[10px] font-extrabold text-primary uppercase tracking-[0.2em] mb-1 block">Detail Hasil Ujian</span>
               <h3 className="text-2xl font-bold text-slate-900 leading-tight">{selectedResult.exams?.title}</h3>
               <p className="text-slate-500 text-sm font-medium mt-1">Siswa: {selectedResult.users?.name}</p>
            </div>

            <div className="flex-1 overflow-y-auto space-y-6 pr-2 mb-6">
               {(selectedResult.student_answers as any[])?.length > 0 ? (
                 (selectedResult.student_answers as any[]).map((ans, i) => (
                   <div key={i} className="p-5 rounded-2xl border border-slate-100 bg-slate-50/50">
                      <div className="flex items-center justify-between gap-4 mb-3">
                         <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pertanyaan {i + 1}</span>
                         {ans.type === 'pilihan_ganda' ? (
                           ans.is_correct ? (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 uppercase tracking-widest">
                               <CheckCircle2 className="w-3 h-3" /> Benar
                             </span>
                           ) : (
                             <span className="flex items-center gap-1 text-[10px] font-bold text-primary uppercase tracking-widest">
                               <XCircle className="w-3 h-3" /> Salah
                             </span>
                           )
                         ) : (
                           <span className="text-[10px] font-bold text-amber-600 uppercase tracking-widest italic">Perlu Review Guru</span>
                         )}
                      </div>
                      <p className="text-slate-800 font-bold mb-4">{ans.question}</p>
                      <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                         <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Jawaban Siswa:</p>
                         <p className={`text-sm ${ans.type === 'esai' ? 'italic leading-relaxed' : 'font-mono font-bold text-primary'} text-slate-700`}>
                           {ans.answer || '(Kosong)'}
                         </p>
                      </div>
                   </div>
                 ))
               ) : (
                 <div className="text-center py-10">
                    <FileText className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm font-medium">Detail jawaban tidak tersedia (Siswa menggunakan versi aplikasi lama).</p>
                 </div>
               )}
            </div>

            <div className="pt-6 border-t border-slate-100">
               <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Feedback / Catatan Guru</label>
               {profile?.role === 'siswa' ? (
                 <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10">
                    <p className="text-slate-700 text-sm italic">"{selectedResult.feedback || 'Belum ada feedback dari guru.'}"</p>
                 </div>
               ) : (
                 <div className="flex gap-3">
                    <input 
                      type="text" 
                      value={feedback}
                      onChange={e => setFeedback(e.target.value)}
                      placeholder="Contoh: Jawaban esai sangat bagus dan lengkap!"
                      className="flex-1 input-field"
                    />
                    <button 
                      disabled={isSubmittingFeedback}
                      onClick={handleSaveFeedback}
                      className="btn-primary px-6 shrink-0"
                    >
                      {isSubmittingFeedback ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Simpan'}
                    </button>
                 </div>
               )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
