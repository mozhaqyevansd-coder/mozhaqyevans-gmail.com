import { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { supabase } from '../lib/supabase';
import { useAuth } from '../App';
import { Bot, Send, Loader2, Sparkles, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export default function AICommandCenter() {
  const { profile } = useAuth();
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
    { role: 'bot', content: `Halo ${profile?.name}! Saya asisten AI CBT. Ada yang bisa saya bantu untuk mengelola ujian hari ini?` }
  ]);

  const handleCommand = async () => {
    if (!prompt.trim() || loading) return;

    const userMessage = prompt;
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setPrompt('');
    setLoading(true);

    try {
      const response = await genAI.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          { role: 'user', parts: [{ text: userMessage }] }
        ],
        config: {
          systemInstruction: `
            Anda adalah asisten AI untuk SMK Prima Unggul CBT.
            Role Pengguna: ${profile?.role} (ID: ${profile?.id}).
            
            Tugas Anda adalah membantu pengguna mengelola ujian melalui perintah suara/teks.
            Gunakan function calling untuk melakukan aksi ke database.
            Selalu berikan respon yang profesional dalam Bahasa Indonesia.
            
            Fungsi yang tersedia:
            1. create_exam: Buat ujian baru (judul, mapel, durasi).
            2. list_exams: Tampilkan daftar ujian.
            3. update_exam_status: Aktifkan/nonaktifkan ujian (id, status).
            4. list_results: Tampilkan hasil ujian (milik sendiri jika siswa, semua jika guru/admin).
          `,
          tools: [
            {
              functionDeclarations: [
                {
                  name: "create_exam",
                  description: "Membuat ujian baru di sistem.",
                  parameters: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING, description: "Judul ujian" },
                      subject: { type: Type.STRING, description: "Mata pelajaran" },
                      duration: { type: Type.NUMBER, description: "Durasi dalam menit" }
                    },
                    required: ["title", "subject", "duration"]
                  }
                },
                {
                  name: "list_exams",
                  description: "Mengambil daftar ujian yang tersedia.",
                  parameters: { type: Type.OBJECT, properties: {} }
                },
                {
                   name: "update_exam_status",
                   description: "Mengubah status aktif/nonaktif sebuah ujian.",
                   parameters: {
                     type: Type.OBJECT,
                     properties: {
                       id: { type: Type.STRING, description: "ID Ujian" },
                       status: { type: Type.STRING, enum: ["aktif", "nonaktif"] }
                     },
                     required: ["id", "status"]
                   }
                },
                {
                  name: "list_results",
                  description: "Menampilkan hasil ujian.",
                  parameters: { type: Type.OBJECT, properties: {} }
                }
              ]
            }
          ]
        }
      });

      const functionCalls = response.functionCalls;
      if (functionCalls) {
        for (const call of functionCalls) {
          const result = await executeFunction(call.name, call.args);
          setMessages(prev => [...prev, { role: 'bot', content: result }]);
        }
      } else {
        setMessages(prev => [...prev, { role: 'bot', content: response.text || 'Maaf, saya tidak mengerti perintah tersebut.' }]);
      }
    } catch (err: any) {
      setMessages(prev => [...prev, { role: 'bot', content: `Error: ${err.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const executeFunction = async (name: string, args: any) => {
    switch (name) {
      case 'create_exam':
        const { error: ceErr } = await supabase.from('exams').insert({
          title: args.title,
          subject: args.subject,
          duration: args.duration,
          created_by: profile?.id,
          status: 'nonaktif'
        });
        return ceErr ? `Gagal membuat ujian: ${ceErr.message}` : `Berhasil membuat ujian "${args.title}" untuk mapel ${args.subject}. Ujian disimpan sebagai draft (nonaktif).`;
      
      case 'list_exams':
        const { data: exData } = await supabase.from('exams').select('title, subject, status').order('created_at', { ascending: false }).limit(5);
        if (!exData || exData.length === 0) return "Belum ada ujian yang terdaftar.";
        return `Daftar ujian terbaru:\n` + exData.map(e => `- [${e.status.toUpperCase()}] ${e.subject}: ${e.title}`).join('\n');

      case 'update_exam_status':
        const { error: usErr } = await supabase.from('exams').update({ status: args.status, is_active: args.status === 'aktif' }).eq('id', args.id);
        return usErr ? `Gagal update status: ${usErr.message}` : `Status ujian ID ${args.id} sekarang ${args.status}.`;

      case 'list_results':
        const query = supabase.from('results').select('exams(title), score');
        if (profile?.role === 'siswa') query.eq('user_id', profile.id);
        const { data: resData } = await query.limit(5);
        if (!resData || resData.length === 0) return "Belum ada hasil ujian yang tercatat.";
        return `Hasil ujian terbaru:\n` + resData.map((r: any) => `- ${r.exams?.title}: ${r.score}`).join('\n');

      default:
        return "Fungsi tidak dikenal.";
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-8 right-8 w-14 h-14 bg-slate-900 text-white rounded-full flex items-center justify-center shadow-2xl z-40 hover:scale-110 transition-transform group"
      >
        <Sparkles className="w-6 h-6 group-hover:animate-pulse" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-8 w-96 bg-white rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] z-[60] border border-slate-200 overflow-hidden flex flex-col max-h-[600px]"
          >
            {/* Header */}
            <div className="bg-slate-900 p-6 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                   <h3 className="font-bold text-sm">CBT AI Asisten</h3>
                   <p className="text-[10px] text-slate-400">Siap melayani role {profile?.role}</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50">
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-4 rounded-2xl text-sm font-medium leading-relaxed ${
                    m.role === 'user' 
                      ? 'bg-primary text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none shadow-sm'
                  }`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                   <div className="bg-white p-4 rounded-2xl border border-slate-200 rounded-tl-none shadow-sm flex items-center gap-2">
                     <Loader2 className="w-4 h-4 text-primary animate-spin" />
                     <span className="text-xs text-slate-400 font-bold">AI sedang berpikir...</span>
                   </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
              <input 
                type="text" 
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                onKeyPress={e => e.key === 'Enter' && handleCommand()}
                placeholder="Ketik perintah AI..."
                className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
              />
              <button 
                onClick={handleCommand}
                disabled={loading}
                className="w-11 h-11 bg-slate-900 text-white rounded-xl flex items-center justify-center hover:bg-slate-800 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
