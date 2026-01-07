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
    FileWarning,
    History,
    PenTool,
    Loader2,
    FileText
} from 'lucide-react';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function GovAuditor() {
    const [user, setUser] = useState<any>(null);

    const [text, setText] = useState('');
    const [title, setTitle] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // Signature State
    const [signatureOpen, setSignatureOpen] = useState(false);
    const [signatureData, setSignatureData] = useState({
        name: "",
        role: "",
        oab: "",
        password: ""
    });

    // History State
    const [history, setHistory] = useState<any[]>([]);

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

    // Authentication and History Fetching
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            if (user) fetchHistory(user.id);
        };
        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            if (session?.user) fetchHistory(session.user.id);
        });

        return () => authListener.subscription.unsubscribe();
    }, []);

    const fetchHistory = async (userId: string) => {
        const { data, error } = await (supabase as any)
            .from('legal_opinions')
            .select('*')
            .eq('author_id', userId)
            .order('created_at', { ascending: false });

        if (data) setHistory(data);
    };

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

    const handleOpenSignature = () => {
        if (audit.score < 75) {
            toast.error("Pontuação insuficiente para protocolar.");
            return;
        }
        if (!user) {
            toast.error("Você precisa estar logado para protocolar.");
            return;
        }
        setSignatureOpen(true);
    }

    const handleProtocolar = async () => {
        if (!signatureData.name || !signatureData.role || !signatureData.password) {
            toast.error("Preencha todos os dados da assinatura.");
            return;
        }

        setIsSaving(true);
        try {
            // Mock signature token generation
            const mockToken = btoa(`${user.id}-${Date.now()}-${signatureData.password}`);

            const { error } = await (supabase as any).from('legal_opinions').insert({
                title: title || "Parecer sem Título",
                content: text,
                compliance_score: audit.score,
                author_name: signatureData.name,
                author_role: signatureData.role,
                signature_token: mockToken,
                author_id: user.id
            });

            if (error) throw error;

            toast.success("Parecer assinado e protocolado com sucesso!");
            setText('');
            setTitle('');
            setSignatureData({ name: "", role: "", oab: "", password: "" });
            setSignatureOpen(false);
            setAudit({ score: 0, criticalAlerts: [], risks: [], improvements: [], isAnalyzing: false });

            // Refresh history
            fetchHistory(user.id);
        } catch (e: any) {
            console.error(e);
            toast.error("Erro ao protocolar: " + e.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="font-sans text-slate-900 h-auto min-h-screen bg-slate-50/50">
            <Tabs defaultValue="editor" className="h-full flex flex-col">
                <div className="px-8 pt-4 pb-0">
                    <TabsList className="grid w-[400px] grid-cols-2">
                        <TabsTrigger value="editor" className="gap-2"><PenTool className="h-4 w-4" /> Redação e Auditoria</TabsTrigger>
                        <TabsTrigger value="history" className="gap-2"><History className="h-4 w-4" /> Histórico de Pareceres</TabsTrigger>
                    </TabsList>
                </div>

                <TabsContent value="editor" className="flex-1 mt-0">
                    <div className="flex flex-col lg:flex-row h-full">
                        {/* WORK AREA (EDITOR) */}
                        <section className="flex-1 flex flex-col h-auto lg:h-full bg-white shadow-sm rounded-tr-3xl lg:rounded-none border-t border-r border-slate-200">
                            <header className="px-4 md:px-8 py-6 border-b flex items-center justify-between sticky top-0 bg-white/80 backdrop-blur-md z-10">
                                <div className="flex items-center gap-4 flex-1">
                                    <div className="p-2 bg-blue-50 rounded-lg">
                                        <Gavel className="text-blue-600" size={24} />
                                    </div>
                                    <div className="w-full max-w-md">
                                        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Redação Técnica</h2>
                                        <input
                                            value={title}
                                            onChange={e => setTitle(e.target.value)}
                                            placeholder="Identificação do Processo (Ex: 23000.001/2024)"
                                            className="text-lg font-bold text-slate-800 border-none p-0 focus:ring-0 w-full placeholder:text-slate-300 outline-none"
                                        />
                                    </div>
                                </div>

                                <Button
                                    onClick={handleOpenSignature}
                                    disabled={audit.score < 75 || isSaving}
                                    className={`px-6 py-6 rounded-xl font-bold transition-all flex items-center gap-3 ${audit.score >= 75
                                        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:bg-emerald-700'
                                        : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                                        }`}
                                >
                                    {isSaving ? 'Processando...' : 'Protocolar Parecer'}
                                    <CheckCircle size={18} />
                                </Button>
                            </header>

                            <main className="flex-1 p-4 md:p-12 w-full">
                                <textarea
                                    className="w-full h-full min-h-[50vh] text-xl text-slate-700 leading-relaxed border-none focus:ring-0 bg-transparent resize-none placeholder:text-slate-200 outline-none font-serif"
                                    placeholder="Comece a redigir seu parecer jurídico. A inteligência de auditoria monitorará os riscos e conformidade com a Lei 14.133/21 em tempo real..."
                                    value={text}
                                    onChange={e => setText(e.target.value)}
                                />
                            </main>
                        </section>

                        {/* AUDIT PANEL (RIGHT SIDE) */}
                        <aside className="w-full lg:w-[420px] bg-[#f8fafc] border-l border-slate-200 h-auto lg:h-[calc(100vh-8rem)] flex flex-col p-8 lg:overflow-y-auto">
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
                </TabsContent>

                <TabsContent value="history" className="flex-1 p-8">
                    <Card className="shadow-elegant border-none bg-white/80 backdrop-blur">
                        <CardHeader>
                            <CardTitle>Histórico de Pareceres Protocolados</CardTitle>
                            <CardDescription>Registro imutável de análises jurídicas realizadas e assinadas via token.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {history.length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-xl">
                                    <Gavel className="mx-auto h-12 w-12 opacity-20 mb-4" />
                                    <p>Nenhum parecer protocolado até o momento.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {history.map((item) => (
                                        <div key={item.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-xl shadow-sm hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                                                    <ShieldCheck size={20} />
                                                </div>
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{item.title}</h4>
                                                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                                        <span>Por: {item.author_name} ({item.author_role})</span>
                                                        <span>•</span>
                                                        <span>{format(new Date(item.created_at), "PPP 'às' HH:mm", { locale: ptBR })}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1">
                                                    <CheckCircle size={10} /> Score: {item.compliance_score}%
                                                </Badge>
                                                <Badge variant="secondary" className="font-mono text-[10px] text-slate-500">
                                                    Token: {item.signature_token.substring(0, 12)}...
                                                </Badge>
                                                <Button size="sm" variant="ghost">
                                                    <FileText size={16} className="text-slate-400" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Signature Dialog */}
            <Dialog open={signatureOpen} onOpenChange={setSignatureOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            Assinatura Digital Simplificada
                        </DialogTitle>
                        <DialogDescription>
                            Para protocolar este parecer, confirme sua identidade. Isto gerará um registro imutável no sistema.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome Completo</Label>
                            <Input
                                id="name"
                                placeholder="Dr. João da Silva"
                                value={signatureData.name}
                                onChange={(e) => setSignatureData({ ...signatureData, name: e.target.value })}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="role">Cargo / Função</Label>
                                <Input
                                    id="role"
                                    placeholder="Procurador Jurídico"
                                    value={signatureData.role}
                                    onChange={(e) => setSignatureData({ ...signatureData, role: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="oab">Registro (OAB/CRC)</Label>
                                <Input
                                    id="oab"
                                    placeholder="12345/UF"
                                    value={signatureData.oab}
                                    onChange={(e) => setSignatureData({ ...signatureData, oab: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Senha / Token de Assinatura</Label>
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={signatureData.password}
                                onChange={(e) => setSignatureData({ ...signatureData, password: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground bg-yellow-50 p-2 rounded">
                                * Em ambiente de teste, use qualquer senha para simular o token.
                            </p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setSignatureOpen(false)}>Cancelar</Button>
                        <Button onClick={handleProtocolar} disabled={isSaving} className="bg-emerald-600 hover:bg-emerald-700">
                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <PenTool className="h-4 w-4 mr-2" />}
                            Assinar e Protocolar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
