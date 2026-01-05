import React, { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import {
    ShieldCheck,
    FileText,
    CheckCircle2,
    QrCode,
    LayoutDashboard,
    Settings,
    Users,
    Lock,
    ExternalLink,
    Award,
    AlertTriangle,
    LogOut,
    ChevronRight,
    Fingerprint
} from 'lucide-react';
import { toast } from "sonner";

async function generateHash(text: string) {
    const msgUint8 = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function GovSign() {
    const [user, setUser] = useState<any>(null);
    const [isGovAuthenticated, setIsGovAuthenticated] = useState(false);
    const [govLevel, setGovLevel] = useState<string | null>(null); // 'bronze', 'prata', 'ouro'
    const [loading, setLoading] = useState(false);
    const [docs, setDocs] = useState<any[]>([]);
    const [currentDoc, setCurrentDoc] = useState({ title: '', content: '' });

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

    // Documents Subscription
    useEffect(() => {
        if (!user || !isGovAuthenticated) return;

        // Initial fetch
        const fetchDocs = async () => {
            const { data, error } = await (supabase as any)
                .from('documents')
                .select('*')
                .order('created_at', { ascending: false });

            if (data) setDocs(data);
        };
        fetchDocs();

        // Subscribe to changes
        const channel = supabase
            .channel('public:documents')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'documents' }, (payload) => {
                if (payload.eventType === 'INSERT') {
                    setDocs(prev => [payload.new, ...prev]);
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, isGovAuthenticated]);

    // Simulação de Login GOV.BR
    const handleGovLogin = () => {
        setLoading(true);
        // Em produção, aqui redirecionaria para: https://sso.acesso.gov.br/authorize
        setTimeout(() => {
            setIsGovAuthenticated(true);
            setGovLevel('ouro'); // Simula retorno de conta Ouro (máxima segurança)
            setLoading(false);
        }, 1500);
    };

    const handleSignDocument = async () => {
        if (govLevel === 'bronze') {
            toast.error("Apenas contas Prata ou Ouro podem assinar documentos digitalmente conforme a Lei 14.063/2020.");
            return;
        }
        if (!currentDoc.content || !currentDoc.title) return;
        if (!user) {
            toast.error("Usuário não autenticado");
            return;
        }

        setLoading(true);
        try {
            const timestamp = Date.now();
            // Use real HASH generation instead of random random
            const hash = await generateHash(currentDoc.content + timestamp);

            const docData = {
                title: currentDoc.title,
                content: currentDoc.content,
                department: 'Controle Interno',
                author_id: user.id,
                created_at: timestamp,
                integrity_hash: hash,
                status: 'assinado_gov_br',
                gov_level: govLevel // New field
            };

            const { error } = await (supabase as any).from('documents').insert(docData);

            if (error) throw error;

            toast.success("Documento assinado com sucesso!");
            setCurrentDoc({ title: '', content: '' });
        } catch (error: any) {
            console.error('Error signing document:', error);
            toast.error("Erro ao assinar documento: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // TELA DE LOGIN GOV.BR
    if (!isGovAuthenticated) {
        return (
            <div className="flex-1 min-h-[calc(100vh-4rem)] bg-slate-50 flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-300">
                    <div className="bg-[#004a80] p-8 text-white text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-white p-3 rounded-full">
                                <ShieldCheck className="w-10 h-10 text-[#004a80]" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-bold italic">gov.br</h1>
                        <p className="text-blue-100 text-sm mt-2">Identidade Digital do Governo</p>
                    </div>

                    <div className="p-8 space-y-6">
                        <div className="text-center">
                            <h2 className="text-lg font-semibold text-slate-800">Acesse sua conta</h2>
                            <p className="text-sm text-slate-500">Utilize suas credenciais oficiais para entrar no Painel de Controle Interno</p>
                        </div>

                        <button
                            onClick={handleGovLogin}
                            disabled={loading}
                            className="w-full bg-[#004a80] hover:bg-[#00355c] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-3 transition-all transform hover:scale-[1.02]"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <Fingerprint size={20} />
                                    Entrar com gov.br
                                </>
                            )}
                        </button>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400">Ou use</span></div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button className="p-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
                                Certificado Digital
                            </button>
                            <button className="p-3 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 flex items-center justify-center gap-2 hover:bg-slate-50">
                                QR Code
                            </button>
                        </div>
                    </div>
                    <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                        <a href="#" className="text-xs text-blue-600 hover:underline flex items-center justify-center gap-1">
                            Saiba mais sobre a conta gov.br <ExternalLink size={12} />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    // TELA PRINCIPAL (PÓS-LOGIN GOV.BR)
    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden font-sans">
            <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 shrink-0">
                <div className="flex items-center gap-2 text-slate-500 text-sm">
                    <span>Administração</span>
                    <ChevronRight size={14} />
                    <span className="font-bold text-slate-900">Controle Interno</span>
                </div>

                <div className="flex items-center gap-4">
                    {/* Badge de Nível GOV.BR */}
                    <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${govLevel === 'ouro' ? 'bg-yellow-100 text-yellow-700 border border-yellow-200' : 'bg-slate-100 text-slate-600'
                        }`}>
                        <Award size={14} /> Conta {govLevel}
                    </div>
                    <div className="h-8 w-[1px] bg-slate-200 mx-2"></div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-xs font-bold text-slate-900">USUÁRIO AUTENTICADO</p>
                            <p className="text-[10px] text-emerald-600 font-medium">Autenticado via GOV.BR</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-[#004a80] text-white flex items-center justify-center font-bold">
                            {user?.email?.substring(0, 2).toUpperCase() || 'US'}
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 md:p-8">
                <div className="max-w-4xl mx-auto space-y-6">

                    {/* Aviso de Segurança */}
                    {govLevel !== 'ouro' && (
                        <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex items-start gap-4">
                            <AlertTriangle className="text-amber-600 shrink-0" size={20} />
                            <div>
                                <p className="text-sm font-bold text-amber-800">Atenção ao Nível da Conta</p>
                                <p className="text-xs text-amber-700">Sua conta atual é {govLevel}. Algumas assinaturas de alta criticidade exigem nível Ouro para total validade jurídica.</p>
                            </div>
                        </div>
                    )}

                    {/* Gerador de Documentos */}
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                                <FileText className="text-blue-600" />
                                Assinatura Digital de Documento
                            </h3>
                        </div>
                        <div className="p-6 space-y-4">
                            <input
                                type="text"
                                placeholder="Título do Documento (Ex: Relatório de Auditoria 042/2023)"
                                className="w-full p-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none font-medium"
                                value={currentDoc.title}
                                onChange={(e) => setCurrentDoc({ ...currentDoc, title: e.target.value })}
                            />
                            <textarea
                                rows={6}
                                placeholder="Digite aqui o parecer técnico ou conteúdo do documento..."
                                className="w-full p-4 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                                value={currentDoc.content}
                                onChange={(e) => setCurrentDoc({ ...currentDoc, content: e.target.value })}
                            />
                            <button
                                onClick={handleSignDocument}
                                disabled={loading || !currentDoc.title}
                                className="w-full bg-[#004a80] hover:bg-[#00355c] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-lg shadow-blue-900/10 disabled:opacity-50"
                            >
                                {loading ? 'Assinando via GOV.BR...' : (
                                    <>
                                        <Lock size={18} />
                                        Assinar e Gerar Hash de Integridade
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Lista de Documentos */}
                    <div className="space-y-3">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2 ml-1">
                            <CheckCircle2 size={18} className="text-emerald-500" />
                            Documentos Assinados na Nuvem
                        </h3>
                        {docs.map(d => (
                            <div key={d.id} className="bg-white p-4 rounded-xl border border-slate-200 flex items-center justify-between hover:shadow-md transition group">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600">
                                        <FileText size={20} />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm text-slate-800">{d.title}</h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded font-mono text-slate-500">Hash: {d.integrity_hash?.substring(0, 15)}...</span>
                                            <span className="text-[10px] text-slate-400 italic">via Gov.br {d.gov_level || 'Padrão'}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        <div className="text-[10px] font-bold text-emerald-600 flex items-center gap-1 justify-end">
                                            <Award size={10} /> {d.status?.toUpperCase()?.replace('_', ' ') || 'ASSINADO'}
                                        </div>
                                        <p className="text-[9px] text-slate-400 italic">{new Date(d.created_at).toLocaleString()}</p>
                                    </div>
                                    <div className="p-2 border border-slate-100 rounded bg-slate-50 group-hover:bg-white transition">
                                        <QrCode size={24} className="text-slate-700" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
