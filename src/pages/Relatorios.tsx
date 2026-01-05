import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, FileText, TrendingUp, Gavel, Sparkles, Clock, Calendar, CheckCircle, Lightbulb, AlertOctagon, BrainCircuit } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import jsPDF from "jspdf";
import { Document, Paragraph, TextRun, Packer } from "docx";
import { useToast } from "@/hooks/use-toast";
import { generateReportInsights } from "@/utils/gemini";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface GeneratedDoc {
  id: string;
  title: string;
  type: string;
  content: string;
  created_at: string;
}

interface Impugnation {
  id: string;
  edital_text: string;
  impugnation_text: string;
  analysis_result: string;
  created_at: string;
}

interface InsightsData {
  summary: string;
  patterns: { category: string; count: number }[];
  recommendations: string[];
}

export default function Relatorios() {
  const [generatedDocs, setGeneratedDocs] = useState<GeneratedDoc[]>([]);
  const [impugnations, setImpugnations] = useState<Impugnation[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();

    const channels = [
      supabase.channel("docs_changes").on("postgres_changes", { event: "*", schema: "public", table: "documentos_gerados" }, () => fetchData()).subscribe(),
      supabase.channel("imp_changes").on("postgres_changes", { event: "*", schema: "public", table: "impugnacoes" }, () => fetchData()).subscribe(),
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: docs } = await supabase.from("documentos_gerados").select("*").order("created_at", { ascending: false }).limit(50);
      const { data: imps } = await supabase.from("impugnacoes").select("*").order("created_at", { ascending: false }).limit(50);

      setGeneratedDocs(docs || []);
      setImpugnations(imps || []);
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    setAnalyzing(true);
    try {
      const result = await generateReportInsights(generatedDocs, impugnations);
      setInsights(result);
      toast({ title: "Análise Concluída", description: "Insights gerados com sucesso." });
    } catch (error) {
      toast({ title: "Erro", description: "Não foi possível gerar os insights.", variant: "destructive" });
    } finally {
      setAnalyzing(false);
    }
  };

  const exportDocx = async (title: string, content: string) => {
    try {
      const doc = new Document({
        sections: [{ children: content.split('\n').map(line => new Paragraph({ children: [new TextRun(line)] })) }],
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${title}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao baixar DOCX", variant: "destructive" });
    }
  };

  const exportPdf = (title: string, content: string) => {
    try {
      const doc = new jsPDF();
      const lines = doc.splitTextToSize(content, 180);
      let cursorY = 15;
      lines.forEach((line: string) => {
        if (cursorY > 280) { doc.addPage(); cursorY = 15; }
        doc.text(line, 15, cursorY);
        cursorY += 7;
      });
      doc.save(`${title}.pdf`);
    } catch (e) {
      toast({ title: "Erro", description: "Falha ao baixar PDF", variant: "destructive" });
    }
  };

  // Combine activities for timeline
  const activities = [
    ...generatedDocs.map(d => ({ type: 'doc', date: new Date(d.created_at), data: d })),
    ...impugnations.map(i => ({ type: 'imp', date: new Date(i.created_at), data: i }))
  ].sort((a, b) => b.date.getTime() - a.date.getTime());

  // Funnel Data
  const docCounts = generatedDocs.reduce((acc, doc) => {
    acc[doc.type] = (acc[doc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const funnelData = [
    { name: 'DFD', value: docCounts['DFD'] || 0, fill: '#6366f1' },
    { name: 'ETP', value: docCounts['ETP'] || 0, fill: '#8b5cf6' },
    { name: 'TR', value: docCounts['TR'] || 0, fill: '#ec4899' },
    { name: 'EDITAL', value: docCounts['EDITAL'] || 0, fill: '#10b981' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <BarChart3 className="h-8 w-8 text-primary" />
          Relatório Geral de Atividades
        </h1>
        <p className="text-muted-foreground mt-2">
          Painel centralizado de rastreabilidade e inteligência de dados.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="shadow-elegant bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-indigo-800">Total Documentos Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-600" />
              <span className="text-3xl font-bold text-indigo-700">{generatedDocs.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-elegant bg-emerald-50 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-emerald-800">Análises de Conformidade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Gavel className="h-5 w-5 text-emerald-600" />
              <span className="text-3xl font-bold text-emerald-700">{impugnations.length}</span>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-elegant bg-amber-50 border-amber-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-amber-800">
              Taxa de Conversão (DFD &rarr; Edital)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-amber-600" />
              <span className="text-3xl font-bold text-amber-700">
                {docCounts['DFD'] > 0
                  ? Math.round(((docCounts['EDITAL'] || 0) / docCounts['DFD']) * 100)
                  : 0}%
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="insights" className="space-y-6">
        <TabsList>
          <TabsTrigger value="insights" className="gap-2"><Lightbulb className="h-4 w-4" /> Inteligência & Insights</TabsTrigger>
          <TabsTrigger value="timeline" className="gap-2"><Clock className="h-4 w-4" /> Linha do Tempo</TabsTrigger>
          <TabsTrigger value="docs">Documentos Gerados</TabsTrigger>
          <TabsTrigger value="imps">Análises de Impugnação</TabsTrigger>
        </TabsList>

        <TabsContent value="insights">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* AI Executive Summary */}
            <Card className="shadow-elegant col-span-2 border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="flex items-center gap-2 text-purple-700">
                    <BrainCircuit className="h-6 w-6" />
                    Resumo Executivo (IA)
                  </CardTitle>
                  <CardDescription>Análise estratégica baseada em todo o histórico de dados.</CardDescription>
                </div>
                <Button
                  onClick={handleGenerateInsights}
                  disabled={analyzing}
                  className="bg-purple-600 hover:bg-purple-700 text-white"
                >
                  {analyzing ? <Sparkles className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                  {analyzing ? 'Analisando...' : 'Gerar Nova Análise'}
                </Button>
              </CardHeader>
              <CardContent>
                {insights ? (
                  <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                    <div className="p-4 bg-purple-50 rounded-lg text-purple-900 leading-relaxed font-medium">
                      "{insights.summary}"
                    </div>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-gray-700">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          Recomendações Práticas
                        </h4>
                        <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                          {insights.recommendations.map((rec, i) => (
                            <li key={i}>{rec}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="space-y-2">
                        <h4 className="font-semibold flex items-center gap-2 text-gray-700">
                          <AlertOctagon className="h-4 w-4 text-red-500" />
                          Pontos de Atenção (Jurídico)
                        </h4>
                        <ul className="space-y-2">
                          {insights.patterns.map((pat, i) => (
                            <li key={i} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded">
                              <span>{pat.category}</span>
                              <Badge variant="secondary">{pat.count} casos</Badge>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground bg-gray-50 rounded-lg border border-dashed">
                    <BrainCircuit className="h-12 w-12 mx-auto mb-3 opacity-20" />
                    <p>Clique em "Gerar Nova Análise" para processar os dados com Inteligência Artificial.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Production Funnel Chart */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Funil de Produção (Gargalos)</CardTitle>
                <CardDescription>Fluxo de documentos gerados no período.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={60} tick={{ fontWeight: 'bold' }} />
                    <Tooltip cursor={{ fill: 'transparent' }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={40} label={{ position: 'right', fill: '#666' }}>
                      {funnelData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Impugnation Trends (Mock or Real) */}
            <Card className="shadow-elegant">
              <CardHeader>
                <CardTitle>Tendência de Impugnações</CardTitle>
                <CardDescription>Volume de riscos jurídicos identificados.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex items-center justify-center">
                {insights && insights.patterns.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={insights.patterns} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="category" hide />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="count" fill="#ef4444" name="Casos">
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center px-4">
                    Gere a análise para visualizar a distribuição de riscos jurídicos recorrentes.
                  </p>
                )}
              </CardContent>
            </Card>

          </div>
        </TabsContent>

        <TabsContent value="timeline">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico Completo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activities.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">Nenhuma atividade registrada ainda.</p>
              ) : (
                <div className="relative border-l border-gray-200 ml-3 space-y-8 py-4">
                  {activities.map((item, idx) => (
                    <div key={idx} className="mb-8 ml-6 relative">
                      <span className={`absolute -left-[37px] flex items-center justify-center w-8 h-8 rounded-full ring-4 ring-white ${item.type === 'doc' ? 'bg-indigo-100' : 'bg-emerald-100'}`}>
                        {item.type === 'doc' ? <FileText className="h-4 w-4 text-indigo-600" /> : <Gavel className="h-4 w-4 text-emerald-600" />}
                      </span>
                      <h3 className="flex items-center mb-1 text-lg font-semibold text-gray-900">
                        {item.type === 'doc' ? (item.data as GeneratedDoc).title : 'Análise de Impugnação Realizada'}
                        {item.type === 'doc' && <Badge variant="outline" className="ml-2 bg-indigo-50 text-indigo-700 border-indigo-200">{(item.data as GeneratedDoc).type}</Badge>}
                        {item.type === 'imp' && <Badge variant="outline" className="ml-2 bg-emerald-50 text-emerald-700 border-emerald-200">Jurídico</Badge>}
                      </h3>
                      <time className="block mb-2 text-xs font-normal leading-none text-gray-400">
                        {format(item.date, "PPP 'às' HH:mm", { locale: ptBR })}
                      </time>
                      <p className="mb-4 text-sm font-normal text-gray-500 line-clamp-2">
                        {item.type === 'doc'
                          ? `Contexto: ${(item.data as GeneratedDoc).content.substring(0, 100)}...`
                          : `Resultado: ${(item.data as Impugnation).analysis_result.substring(0, 100)}...`
                        }
                      </p>
                      <div className="flex gap-2">
                        {item.type === 'doc' ? (
                          <Button variant="outline" size="sm" onClick={() => exportDocx((item.data as GeneratedDoc).title, (item.data as GeneratedDoc).content)}>
                            <Download className="h-3 w-3 mr-1" /> Baixar
                          </Button>
                        ) : (
                          <Button variant="outline" size="sm" onClick={() => exportPdf("Parecer", (item.data as Impugnation).analysis_result)}>
                            <FileText className="h-3 w-3 mr-1" /> Parecer
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="docs">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Histórico de Documentos (DFD, ETP, TR, Edital)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedDocs.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-indigo-100 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(doc.created_at), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => exportDocx(doc.title, doc.content)}>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="imps">
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Histórico de Impugnações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {impugnations.map((imp) => (
                  <div key={imp.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded bg-emerald-100 flex items-center justify-center">
                        <Gavel className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium">Análise de Impugnação</p>
                        <p className="text-xs text-muted-foreground">{format(new Date(imp.created_at), "dd/MM/yyyy HH:mm")}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => exportPdf("Parecer", imp.analysis_result)}>
                        <FileText className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
