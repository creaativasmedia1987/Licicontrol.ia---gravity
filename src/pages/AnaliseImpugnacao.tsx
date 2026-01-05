import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Scale, Gavel, Save, Loader2, Download, FileText, UploadCloud, AlertCircle, Clock, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { analyzeImpugnation } from "@/utils/gemini";
import { extractTextFromFile } from "@/utils/fileParser";
import { supabase } from "@/integrations/supabase/client";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import jsPDF from "jspdf";
import { Document, Paragraph, TextRun, Packer } from "docx";

interface ImpugnationHistory {
    id: string;
    created_at: string;
    analysis_result: string;
    edital_text?: string; // Optional depending on if we select it
    impugnation_text?: string;
}

export default function AnaliseImpugnacao() {
    const [editalFile, setEditalFile] = useState<File | null>(null);
    const [impugnationFile, setImpugnationFile] = useState<File | null>(null);
    const [analysisResult, setAnalysisResult] = useState("");
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);

    // History State
    const [history, setHistory] = useState<ImpugnationHistory[]>([]);
    const [loadingHistory, setLoadingHistory] = useState(true);

    const { toast } = useToast();

    useEffect(() => {
        fetchHistory();
    }, []);

    const fetchHistory = async () => {
        try {
            const { data, error } = await supabase
                .from('impugnacoes' as any)
                .select('id, created_at, analysis_result')
                .order('created_at', { ascending: false })
                .limit(10);

            if (error) throw error;
            setHistory((data as any) || []);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'edital' | 'impugnation') => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            if (type === 'edital') setEditalFile(file);
            else setImpugnationFile(file);
        }
    };

    const handleAnalyze = async () => {
        if (!editalFile || !impugnationFile) {
            toast({
                title: "Arquivos obrigatórios",
                description: "Faça o upload do Edital e da Impugnação (PDF ou TXT).",
                variant: "destructive",
            });
            return;
        }

        if (!import.meta.env.VITE_GEMINI_API_KEY) {
            toast({
                title: "Configuração Pendente",
                description: "A chave de API do Gemini não foi encontrada. Configure o VITE_GEMINI_API_KEY.",
                variant: "destructive",
            });
            return;
        }

        setIsAnalyzing(true);
        setAnalysisResult("");

        try {
            // Extract text
            toast({
                title: "Lendo documentos...",
                description: "Extraindo texto do Edital e da Impugnação.",
            });

            // Give UI a moment to update
            await new Promise(resolve => setTimeout(resolve, 100));

            const editalText = await extractTextFromFile(editalFile);
            const impugnationText = await extractTextFromFile(impugnationFile);

            if (!editalText.trim() || !impugnationText.trim()) {
                throw new Error("Não foi possível extrair texto legível dos arquivos. Verifique se são PDFs pesquisáveis (OCR).");
            }

            // Analyze
            toast({
                title: "Analisando juridicamente...",
                description: "A IA está cruzando os dados e gerando o parecer.",
            });

            const result = await analyzeImpugnation(editalText, impugnationText);
            setAnalysisResult(result);
            setIsAnalysisOpen(true);

            // Persist
            const { error } = await supabase.from('impugnacoes' as any).insert({
                edital_text: editalText.substring(0, 5000), // Limit text storage if needed
                impugnation_text: impugnationText.substring(0, 5000),
                analysis_result: result,
                created_at: new Date().toISOString()
            });

            if (error) {
                console.error("Erro ao salvar no Supabase:", error);
                // Non-blocking error
            } else {
                fetchHistory(); // Refresh history
            }

            toast({
                title: "Análise concluída!",
                description: "Parecer gerado com sucesso.",
                className: "bg-green-600 text-white",
            });

        } catch (error: any) {
            console.error("Analysis error:", error);
            toast({
                title: "Erro na análise",
                description: error.message || "Falha ao processar arquivos.",
                variant: "destructive",
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const openHistoryItem = (item: ImpugnationHistory) => {
        setAnalysisResult(item.analysis_result);
        setIsAnalysisOpen(true);
    };

    const exportAsDocx = async (content: string, filename: string) => {
        try {
            const doc = new Document({
                sections: [{
                    properties: {},
                    children: content.split('\n').map(line =>
                        new Paragraph({
                            children: [new TextRun(line)],
                        })
                    ),
                }],
            });

            const blob = await Packer.toBlob(doc);
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}_${Date.now()}.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting DOCX:", error);
        }
    };

    const exportAsPdf = (content: string, filename: string) => {
        try {
            const doc = new jsPDF();
            const lines = doc.splitTextToSize(content, 180);
            let cursorY = 15;
            lines.forEach((line: string) => {
                if (cursorY > 280) {
                    doc.addPage();
                    cursorY = 15;
                }
                doc.text(line, 15, cursorY);
                cursorY += 7;
            });
            doc.save(`${filename}_${Date.now()}.pdf`);
        } catch (error) {
            console.error("Error exporting PDF:", error);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Gavel className="h-8 w-8 text-indigo-600" />
                        Análise de Impugnação
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Setor de Controle Interno: Análise jurídica automatizada de conflitos em editais.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="shadow-elegant border-indigo-100">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-indigo-700">
                                <UploadCloud className="h-5 w-5" />
                                Nova Análise
                            </CardTitle>
                            <CardDescription>
                                Envie o Edital e a Impugnação em PDF ou TXT.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <Label>Edital da Licitação</Label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <UploadCloud className="w-8 h-8 mb-4 text-gray-500" />
                                            <p className="text-sm text-gray-500 font-semibold">{editalFile ? editalFile.name : "Clique para selecionar o Edital"}</p>
                                            <p className="text-xs text-gray-400">PDF ou TXT (MAX. 10MB)</p>
                                        </div>
                                        <Input id="dropzone-file-edital" type="file" className="hidden" accept=".pdf,.txt" onChange={(e) => handleFileChange(e, 'edital')} />
                                    </label>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Documento de Impugnação</Label>
                                <div className="flex items-center justify-center w-full">
                                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                            <AlertCircle className="w-8 h-8 mb-4 text-rose-500" />
                                            <p className="text-sm text-gray-500 font-semibold">{impugnationFile ? impugnationFile.name : "Clique para selecionar a Impugnação"}</p>
                                            <p className="text-xs text-gray-400">PDF ou TXT (MAX. 10MB)</p>
                                        </div>
                                        <Input id="dropzone-file-imp" type="file" className="hidden" accept=".pdf,.txt" onChange={(e) => handleFileChange(e, 'impugnation')} />
                                    </label>
                                </div>
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                                onClick={handleAnalyze}
                                disabled={isAnalyzing || !import.meta.env.VITE_GEMINI_API_KEY}
                            >
                                {isAnalyzing ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Processando Arquivos e Analisando...
                                    </>
                                ) : (
                                    <>
                                        <Scale className="h-4 w-4 mr-2" />
                                        Iniciar Análise Jurídica
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </div>

                {/* History Column */}
                <div className="space-y-6">
                    <Card className="shadow-elegant h-full flex flex-col">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-gray-700">
                                <Clock className="h-5 w-5" />
                                Histórico Recente
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto max-h-[600px] pr-2">
                            {loadingHistory ? (
                                <div className="flex justify-center py-8">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : history.length === 0 ? (
                                <div className="text-center py-10 text-muted-foreground">
                                    <Gavel className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                    <p className="text-sm">Nenhuma análise realizada ainda.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {history.map((item) => (
                                        <div
                                            key={item.id}
                                            onClick={() => openHistoryItem(item)}
                                            className="group flex items-center justify-between p-3 rounded-lg border border-transparent hover:border-border hover:bg-accent/50 cursor-pointer transition-all"
                                        >
                                            <div className="space-y-1 overflow-hidden">
                                                <p className="text-sm font-medium truncate text-gray-800">
                                                    Análise de Impugnação
                                                </p>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {new Date(item.created_at).toLocaleDateString()} às {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </p>
                                            </div>
                                            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Analysis Result Modal */}
            <Dialog open={isAnalysisOpen} onOpenChange={setIsAnalysisOpen}>
                <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-2xl">
                            <Gavel className="h-6 w-6 text-indigo-600" />
                            Parecer Jurídico da Impugnação
                        </DialogTitle>
                        <DialogDescription>
                            Análise gerada via IA com base nos documentos enviados.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4 rounded-lg border bg-gray-50 p-6 whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                        {analysisResult}
                    </div>

                    <div className="flex justify-end gap-3 mt-4">
                        <Button variant="outline" onClick={() => exportAsDocx(analysisResult, "parecer_impugnacao")}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar DOCX
                        </Button>
                        <Button variant="default" onClick={() => exportAsPdf(analysisResult, "parecer_impugnacao")}>
                            <FileText className="h-4 w-4 mr-2" />
                            Baixar PDF
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
