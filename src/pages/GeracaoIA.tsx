import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, FileText, Download, Loader2, Link as LinkIcon, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { generateDocumentWithGemini, GeneratedDocument } from "@/utils/gemini";
import { formatOfficialDocument, OrgData } from "@/utils/documentFormatter";
import jsPDF from "jspdf";
import { Document, Paragraph, TextRun, Packer } from "docx";
import { supabase } from "@/integrations/supabase/client";

type DocType = "DFD" | "ETP" | "TR" | "EDITAL" | "OFICIO";

export default function GeracaoIA() {
  const [docType, setDocType] = useState<DocType | "">("");
  const [context, setContext] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDoc, setGeneratedDoc] = useState<GeneratedDocument | null>(null);
  const [orgData, setOrgData] = useState<OrgData>({ orgName: "" });
  const { toast } = useToast();

  useEffect(() => {
    fetchOrgSettings();
  }, []);

  const fetchOrgSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('organization_settings' as any)
        .select('*')
        .limit(1)
        .maybeSingle();

      if (data) {
        const config = data as any;
        setOrgData({
          orgName: config.org_name || "",
          logoUrl: config.logo_data || null,
          state: config.state || ""
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  };

  const handleGenerate = async () => {
    if (!docType || !context.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Selecione o tipo de documento e descreva a demanda.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedDoc(null);

    try {
      const result = await generateDocumentWithGemini(docType, context);
      setGeneratedDoc(result);

      // Persist to Supabase (saving raw text for now to maintain data clean)
      // Ideally we might want to save the HTML too, or generate it on fly when viewing history.
      const { error } = await supabase.from('documentos_gerados' as any).insert({
        title: `${docType} - ${new Date().toLocaleDateString()}`,
        type: docType,
        content: result.text,
        context: context,
        created_at: new Date().toISOString()
      });

      if (error) {
        console.error("Erro ao salvar documento:", error);
        toast({
          title: "Atenção",
          description: "Documento gerado, mas houve um erro ao salvar no histórico.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Sucesso!",
          description: "Documento gerado e salvo no Relatório Geral.",
        });
      }

    } catch (error: any) {
      console.error("Erro na geração:", error);
      toast({
        title: "Erro na geração",
        description: error.message || "Não foi possível gerar o documento. Verifique sua chave de API.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportAsDocx = async () => {
    if (!generatedDoc) return;

    try {
      const doc = new Document({
        sections: [{
          properties: {},
          children: generatedDoc.text.split('\n').map(line =>
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
      a.download = `${docType}_${Date.now()}.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado!",
        description: "Documento exportado como DOCX.",
      });
    } catch (error) {
      console.error("Error exporting DOCX:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o documento.",
        variant: "destructive",
      });
    }
  };

  const exportAsPdf = () => {
    if (!generatedDoc) return;

    try {
      // For PDF export of the "Official Paper", we would ideally use html2canvas or comparable.
      // For now, continuing to use jsPDF with raw text to ensure reliability.
      // Users can print the HTML view to PDF (Ctrl+P) for the visual version.
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(generatedDoc.text, 180);
      let cursorY = 15;

      lines.forEach((line: string) => {
        if (cursorY > 280) {
          doc.addPage();
          cursorY = 15;
        }
        doc.text(line, 15, cursorY);
        cursorY += 7;
      });

      doc.save(`${docType}_${Date.now()}.pdf`);

      toast({
        title: "Exportado!",
        description: "Documento exportado como PDF (Texto). Para layout oficial, use a impressão do navegador.",
        variant: "default"
      });
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar o documento.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-indigo-600" />
            Geração de Documentos Licitatórios
          </h1>
          <p className="text-muted-foreground mt-2">
            DFD, ETP e TR Fidedignos (Lei nº 14.133/2021) com IA Generativa.
          </p>
        </div>
      </div>

      {!import.meta.env.VITE_GEMINI_API_KEY && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertTriangle className="h-5 w-5 text-yellow-400" aria-hidden="true" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Atenção: A chave da API do Google Gemini não foi configurada.
                Adicione <code>VITE_GEMINI_API_KEY</code> ao seu arquivo <code>.env</code> para utilizar a geração.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-6">
          <Card className="shadow-elegant border-indigo-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-indigo-700">
                <FileText className="h-5 w-5" />
                Contexto da Demanda
              </CardTitle>
              <CardDescription>
                Configure os parâmetros para a geração do documento.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="docType">1. Tipo de Documento</Label>
                <Select value={docType} onValueChange={(val: DocType) => setDocType(val)}>
                  <SelectTrigger id="docType">
                    <SelectValue placeholder="-- Selecionar --" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DFD">DFD - Documento de Formalização da Demanda</SelectItem>
                    <SelectItem value="ETP">ETP - Estudo Técnico Preliminar</SelectItem>
                    <SelectItem value="TR">TR - Termo de Referência</SelectItem>
                    <SelectItem value="EDITAL">Edital (Lei 14.133/2021)</SelectItem>
                    <SelectItem value="OFICIO">Ofício Administrativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="context">2. Descrição e Requisitos</Label>
                <Textarea
                  id="context"
                  rows={8}
                  placeholder="Ex: Contratação de serviço de desenvolvimento de software..."
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Quanto mais detalhes, mais preciso será o documento.
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                onClick={handleGenerate}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                disabled={isGenerating || !import.meta.env.VITE_GEMINI_API_KEY}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando Documento...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Gerar Documento
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Output Section with Official Format */}
        <div className="space-y-6">
          <Card className="shadow-elegant h-full flex flex-col">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-indigo-700">
                  <FileText className="h-5 w-5" />
                  Documento Gerado
                </span>
                {generatedDoc && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="icon" onClick={exportAsDocx} title="Exportar DOCX">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={exportAsPdf} title="Exportar PDF">
                      <FileText className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 min-h-[400px]">
              {generatedDoc ? (
                <div className="space-y-6">
                  <div className="rounded-lg border bg-gray-50 p-1 shadow-inner max-h-[800px] overflow-y-auto">
                    {/* Use the Official Formatter here via dangerouslySetInnerHTML */}
                    <div dangerouslySetInnerHTML={{ __html: formatOfficialDocument(generatedDoc.text, orgData) }} />
                  </div>

                  {generatedDoc.sources.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2 text-gray-600">
                        <LinkIcon className="h-3 w-3" />
                        Fontes de Pesquisa (Grounding)
                      </h4>
                      <ul className="space-y-1">
                        {generatedDoc.sources.map((source, index) => (
                          <li key={index} className="text-xs">
                            <a
                              href={source.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-indigo-600 hover:underline truncate block"
                            >
                              {source.title || source.uri}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center border-2 border-dashed rounded-lg">
                  <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                  <p>O documento gerado aparecerá aqui.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
