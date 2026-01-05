import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import {
    ShieldCheck,
    Bot,
    AlertCircle,
    CheckCircle,
    Info,
    Lock,
    Zap,
    ArrowRight,
    Gavel,
    FileWarning
} from 'lucide-react';
import { toast } from "sonner";

export default function GovAuditor() {
    const [user, setUser] = useState<any>(null);

    const [text, setText] = useState('');
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Real-time Audit State
    const [audit, setAudit] = useState<{
        score: number;
        criticalAlerts: string[];
        risks: string[];
        improvements: string[];
        isAnalyzing: boolean;
    }>({
        score: 0,
        criticalAlerts: [],
        risks: [],
        improvements: [],
        isAnalyzing: false
    });

    // Authentication
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    // AI Auditor Logic (The Silent Observer)
    useEffect(() => {
        if (text.length < 15) {
            setAudit({ score: 0, criticalAlerts: [], risks: [], improvements: [], isAnalyzing: false });
            return;
        }

        setAudit(prev => ({ ...prev, isAnalyzing: true }));

        // Debounce to avoid excessive processing
        const timer = setTimeout(() => {
            const content = text.toLowerCase();
            let score = 10; // Base score
            const alerts: string[] = [];
            const risks: string[] = [];
            const suggs: string[] = [];

            // Validation: Nova Lei de Licitações (14.133)
            if (!content.includes('14.133')) {
                alerts.push("Falta referência à Lei 14.133/2021 (Nova Lei de Licitações).");
            } else {
                score += 40;
            }

            // Validation: Price Research
            if (content.includes('valor') || content.includes('estimado')) {
                if (!content.includes('pesquisa de mercado') && !content.includes('painel de preços')) {
                    risks.push("Risco de sobrepreço: Não detectada metodologia de pesquisa de mercado.");
                } else {
                    score += 25;
                }
            }

            // Validation: Administration Principles
            const principios = ['eficiência', 'moralidade', 'impessoalidade', 'publicidade', 'economicidade'];
            const encontrados = principios.filter(p => content.includes(p));
            if (encontrados.length < 2) {
                suggs.push("Considere reforçar os princípios da economicidade e eficiência no texto.");
            } else {
                score += 25;
            }

            // Validation: Inexigibilidade Justification (if applicable)
            if (content.includes('inexigibilidade') && !content.includes('notória especialização')) {
                alerts.push("Alerta crítico: Falta justificativa de notória especialização para inexigibilidade.");
                score -= 20;
            }

            setAudit({
                score: Math.min(Math.max(score, 0), 100),
                criticalAlerts: alerts,
                risks: risks,
                improvements: suggs,
                isAnalyzing: false
            });
        }, 800);

        return () => clearTimeout(timer);
    }, [text]);

    const handleProtocolar = async () => {
        if (audit.score < 75) {
            toast.error("Pontuação insuficiente para protocolar.");
            return;
        }
        if (!user) {
            toast.error("Você precisa estar logado para protocolar.");
            return;
        }

        setIsSaving(true);
        try {
            const { error } = await (supabase as any).from('legal_opinions').insert({
                title: title || "Parecer sem Título",
                content: text,
                compliance_score: audit.score,
                author_id: user.id
            });

            if (error) throw error;

            toast.success("Parecer protocolado com sucesso!");
            setText('');
            setTitle('');
            setAudit({ score: 0, criticalAlerts: [], risks: [], improvements: [], isAnalyzing: false });
        } catch (e: any) {
            console.error(e);
            toast.error("Erro ao protocolar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };



    return (
        <div className="flex flex-col lg:flex-row font-sans text-slate-900 lg:h-[calc(100vh-4rem)] h-auto min-h-screen">

            {/* WORK AREA (EDITOR) */}
            <section className="flex-1 flex flex-col h-auto lg:h-full bg-white shadow-sm">
                <header className="px-4 md:px-8 py-6 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                    <div className="flex items-center gap-4">
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Gavel className="text-blue-600" size={24} />
                        </div>
                        <div className="w-full">
                            <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Redação Técnica</h2>
                            <input
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                                placeholder="Identificação do Processo (Ex: 23000.001/2024)"
                                className="text-lg font-bold text-slate-800 border-none p-0 focus:ring-0 w-full placeholder:text-slate-300 outline-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleProtocolar}
                        disabled={audit.score < 75 || isSaving}
                        className={`px-8 py-4 rounded-2xl font-bold transition-all flex items-center gap-3 ${audit.score >= 75
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                            }`}
                    >
                        {isSaving ? 'Processando...' : 'Protocolar Parecer'}
                        <CheckCircle size={18} />
                    </button>
                </header>

                <main className="flex-1 p-4 md:p-12 max-w-4xl mx-auto w-full">
                    <textarea
                        className="w-full h-full min-h-[50vh] lg:min-h-[70vh] text-xl text-slate-700 leading-relaxed border-none focus:ring-0 bg-transparent resize-none placeholder:text-slate-200 outline-none"
                        placeholder="Comece a redigir seu parecer. A inteligência de auditoria monitorará os riscos jurídicos em tempo real enquanto você digita..."
                        value={text}
                        onChange={e => setText(e.target.value)}
                    />
                </main>
            </section>

            {/* AUDIT PANEL (RIGHT SIDE) */}
            <aside className="w-full lg:w-[420px] bg-[#f8fafc] border-t lg:border-t-0 lg:border-l border-slate-200 h-auto lg:h-full flex flex-col p-8 lg:overflow-y-auto">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Bot className="text-blue-600" size={24} />
                            {audit.isAnalyzing && (
                                <span className="absolute -top-1 -right-1 w-2 h-2 bg-blue-500 rounded-full animate-ping"></span>
                            )}
                        </div>
                        <h3 className="font-black text-slate-800 uppercase text-[11px] tracking-widest">Auditoria em Tempo Real</h3>
                    </div>
                </div>

                {/* Compliance Meter */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
                    <div className="flex items-end justify-between mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Índice de Segurança Jurídica</span>
                        <span className={`text-4xl font-black ${audit.score >= 75 ? 'text-emerald-600' : 'text-slate-800 opacity-20'}`}>
                            {audit.score}%
                        </span>
                    </div>
                    <div className="w-full h-4 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className={`h-full transition-all duration-1000 ease-out ${audit.score >= 75 ? 'bg-emerald-500' : 'bg-blue-600'
                                }`}
                            style={{ width: `${audit.score}%` }}
                        ></div>
                    </div>
                    {audit.score < 75 && text.length > 50 && (
                        <p className="mt-4 text-[10px] text-orange-600 font-bold bg-orange-50 p-2 rounded-lg flex items-center gap-2">
                            <Info size={12} /> Pontuação insuficiente para protocolar
                        </p>
                    )}
                </div>

                {/* Critical Messages */}
                {audit.criticalAlerts.length > 0 && (
                    <div className="space-y-4 mb-6">
                        <h4 className="text-[10px] font-black text-red-500 uppercase flex items-center gap-2 mb-2 px-1">
                            <FileWarning size={14} /> Violações de Compliance
                        </h4>
                        {audit.criticalAlerts.map((alert, i) => (
                            <div key={i} className="bg-red-50 border border-red-100 p-4 rounded-2xl flex items-start gap-3 group animate-in fade-in slide-in-from-right-4">
                                <div className="mt-1"><Zap size={16} className="text-red-500 fill-red-500" /></div>
                                <p className="text-xs font-bold text-red-900 leading-tight">{alert}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Risks */}
                {audit.risks.length > 0 && (
                    <div className="space-y-4 mb-6">
                        <h4 className="text-[10px] font-black text-orange-500 uppercase flex items-center gap-2 mb-2 px-1">
                            <AlertCircle size={14} /> Riscos de Glosa/Apontamento
                        </h4>
                        {audit.risks.map((risk, i) => (
                            <div key={i} className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm">
                                <p className="text-xs text-orange-900 font-medium leading-relaxed">{risk}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Suggestions */}
                {audit.improvements.length > 0 && (
                    <div className="mt-auto pt-6 border-t border-slate-200">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Recomendações Próximas</h4>
                        <div className="space-y-3">
                            {audit.improvements.map((s, i) => (
                                <div key={i} className="flex gap-3 items-center text-[11px] font-semibold text-slate-600 bg-slate-100/50 p-3 rounded-xl border border-transparent hover:border-blue-200 transition-colors">
                                    <CheckCircle size={14} className="text-blue-500" />
                                    {s}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Footer */}
                <div className="mt-8 flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-2">
                        <Lock size={12} />
                        <span className="text-[9px] font-bold uppercase tracking-widest">Sandbox Seguro</span>
                    </div>
                    <span className="text-[9px] font-bold">CGM-V3</span>
                </div>
            </aside>
        </div>
    );
}
