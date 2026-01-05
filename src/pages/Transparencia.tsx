import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSearch, TrendingUp, AlertTriangle, CheckCircle, Loader2, Award, Info, Calculator, CheckSquare, ShieldAlert } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TransparencyReportViewer from "@/components/TransparencyReportViewer";

const complianceMetrics = [
  {
    title: "Portal da Transparência",
    status: "Conforme",
    percentage: 98,
    icon: CheckCircle,
    color: "text-success",
  },
  {
    title: "Publicações Obrigatórias",
    status: "Conforme",
    percentage: 95,
    icon: CheckCircle,
    color: "text-success",
  },
  {
    title: "Prestação de Contas",
    status: "Atenção",
    percentage: 87,
    icon: AlertTriangle,
    color: "text-warning",
  },
  {
    title: "Dados Abertos",
    status: "Conforme",
    percentage: 92,
    icon: CheckCircle,
    color: "text-success",
  },
];

interface TransparencyReport {
  id: string;
  portal_url: string;
  analysis_date: string;
  score: number;
  findings_count: number;
  analysis_summary: string | null;
  detailed_findings: any;
  status: string;
}

// --- PNTP Simulator Data ---

interface CriteriaItem {
  id: string;
  label: string;
  weight: 1 | 2 | 3; // 1=Rec, 2=Obri, 3=Essencial
  isEssential: boolean;
}

interface CriteriaSection {
  id: string;
  title: string;
  items: CriteriaItem[];
}

const pntpCriteria: CriteriaSection[] = [
  {
    id: "receitas",
    title: "Receitas (Essencial)",
    items: [
      { id: "r1", label: "Receita Prevista e Arrecadada (atualizada em tempo real ou D+1)", weight: 3, isEssential: true },
      { id: "r2", label: "Classificação da Receita (Natureza, Fonte)", weight: 3, isEssential: true },
      { id: "r3", label: "Lançamentos e Recebimentos Extras Orçamentários", weight: 3, isEssential: true },
    ]
  },
  {
    id: "despesas",
    title: "Despesas (Essencial)",
    items: [
      { id: "d1", label: "Despesa Empenhada, Liquidada e Paga (detalhada)", weight: 3, isEssential: true },
      { id: "d2", label: "Nome do Credor e CPF/CNPJ (respeitando LGPD)", weight: 3, isEssential: true },
      { id: "d3", label: "Número do Processo e Bem/Serviço Adquirido", weight: 3, isEssential: true },
      { id: "d4", label: "Ordem Cronológica de Pagamentos", weight: 2, isEssential: false },
    ]
  },
  {
    id: "licitacoes",
    title: "Licitações e Contratos",
    items: [
      { id: "l1", label: "Íntegra dos Editais e Anexos", weight: 3, isEssential: true },
      { id: "l2", label: "Resultados e Atas das Sessões", weight: 3, isEssential: true },
      { id: "l3", label: "Contratos na Íntegra e Aditivos", weight: 3, isEssential: true },
      { id: "l4", label: "Estudos Técnicos Preliminares (ETP)", weight: 2, isEssential: false },
      { id: "l5", label: "Mapa de Preços", weight: 2, isEssential: false },
    ]
  },
  {
    id: "gestao_fiscal",
    title: "Gestão Fiscal (LRF)",
    items: [
      { id: "g1", label: "RREO (Relatório Resumido de Execução Orçamentária) - Último Bimestre", weight: 3, isEssential: true },
      { id: "g2", label: "RGF (Relatório de Gestão Fiscal) - Último Quadrimestre", weight: 3, isEssential: true },
      { id: "g3", label: "Parecer Prévio do Tribunal de Contas", weight: 2, isEssential: false },
    ]
  },
  {
    id: "pessoal",
    title: "Pessoal e Administrativo",
    items: [
      { id: "p1", label: "Folha de Pagamento (Nome, Cargo, Lotação, Vencimentos)", weight: 3, isEssential: true },
      { id: "p2", label: "Tabela de Diárias e Passagens", weight: 2, isEssential: false },
      { id: "p3", label: "Estrutura Organizacional e Competências", weight: 1, isEssential: false },
    ]
  },
  {
    id: "acessibilidade",
    title: "Acessibilidade e Usabilidade",
    items: [
      { id: "a1", label: "Ferramenta de Busca", weight: 2, isEssential: false },
      { id: "a2", label: "Acessibilidade (VLibras, Alto Contraste)", weight: 2, isEssential: false },
      { id: "a3", label: "Fale Conosco / e-SIC físico e eletrônico", weight: 3, isEssential: true },
    ]
  }
];

export default function Transparencia() {
  const [portalUrl, setPortalUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reports, setReports] = useState<TransparencyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TransparencyReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // --- Simulator State ---
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Initialize checks
  useEffect(() => {
    // Optional: could load from local storage
  }, []);

  const handleCheck = (id: string, checked: boolean) => {
    setCheckedItems(prev => ({ ...prev, [id]: checked }));
  };

  const calculateScore = () => {
    let earnedPoints = 0;
    let totalPoints = 0;
    let essentialMissed = false;

    pntpCriteria.forEach(section => {
      section.items.forEach(item => {
        totalPoints += item.weight;
        if (checkedItems[item.id]) {
          earnedPoints += item.weight;
        } else if (item.isEssential) {
          essentialMissed = true;
        }
      });
    });

    const percentage = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

    let level = "Inicial";
    let badgeColor = "bg-gray-500";

    if (essentialMissed) {
      // If essential missed, usually cap logic applies, but let's stick to percentage tiers but maybe warn
      // Based on PNTP, essential 100% is mandatory for seals.
      if (percentage >= 75) level = "Elevado (Pendente Essenciais)"; // Custom status
      else if (percentage >= 50) level = "Intermediário (Pendente Essenciais)";
      else level = "Inicial";
    } else {
      if (percentage >= 95) { level = "Diamante"; badgeColor = "bg-blue-600 border-blue-200 shadow-blue-500/50"; }
      else if (percentage >= 85) { level = "Ouro"; badgeColor = "bg-yellow-500 border-yellow-200 shadow-yellow-500/50"; }
      else if (percentage >= 75) { level = "Prata"; badgeColor = "bg-slate-400 border-slate-200 shadow-slate-500/50"; }
      else if (percentage >= 50) { level = "Intermediário"; badgeColor = "bg-orange-500"; }
      else if (percentage >= 30) { level = "Básico"; badgeColor = "bg-orange-700"; }
      else { level = "Inicial"; badgeColor = "bg-red-600"; }
    }

    return { percentage, earnedPoints, totalPoints, level, badgeColor, essentialMissed };
  };

  const scoreData = calculateScore();

  // Load reports from database
  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    try {
      const { data, error } = await supabase
        .from("transparency_reports")
        .select("*")
        .order("analysis_date", { ascending: false })
        .limit(10);

      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error("Error loading reports:", error);
      toast({
        title: "Erro ao carregar relatórios",
        description: "Não foi possível carregar o histórico de análises",
        variant: "destructive",
      });
    } finally {
      setIsLoadingReports(false);
    }
  };

  const handleAnalyze = async () => {
    if (!portalUrl.trim()) {
      toast({
        title: "URL obrigatória",
        description: "Por favor, insira a URL do portal de transparência",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(portalUrl);
    } catch {
      toast({
        title: "URL inválida",
        description: "Por favor, insira uma URL válida (ex: https://exemplo.com)",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-transparency", {
        body: { portalUrl },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Análise concluída!",
          description: `Portal analisado com score de ${data.report.score}%`,
        });

        await loadReports();
        setPortalUrl("");
      }
    } catch (error: any) {
      console.error("Error analyzing portal:", error);
      toast({
        title: "Erro na análise",
        description: error.message || "Não foi possível realizar a análise. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileSearch className="h-8 w-8 text-primary" />
            Análise de Transparência
          </h1>
          <p className="text-muted-foreground mt-2">
            Monitore a conformidade com a LRF e a Matriz Atricon (PNTP).
          </p>
        </div>
      </div>

      <Tabs defaultValue="auto" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="auto">Análise Automática (IA)</TabsTrigger>
          <TabsTrigger value="manual">Simulador PNTP (Atricon)</TabsTrigger>
        </TabsList>

        <TabsContent value="auto" className="space-y-8">
          {/* Compliance Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {complianceMetrics.map((metric, index) => (
              <Card
                key={metric.title}
                className="shadow-elegant hover:shadow-xl transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {metric.title}
                  </CardTitle>
                  <metric.icon className={`h-4 w-4 ${metric.color}`} />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-2">{metric.percentage}%</div>
                  <Progress value={metric.percentage} className="h-2 mb-2" />
                  <p className={`text-xs ${metric.color}`}>{metric.status}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* AI Analysis Section */}
          <Card className="shadow-elegant border-accent/20 bg-accent/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileSearch className="h-5 w-5 text-primary" />
                Nova Análise com IA
              </CardTitle>
              <CardDescription>
                Insira a URL do portal para análise automatizada via IA.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="url"
                    placeholder="https://portal-transparencia.exemplo.gov.br"
                    value={portalUrl}
                    onChange={(e) => setPortalUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !isAnalyzing) {
                        handleAnalyze();
                      }
                    }}
                    disabled={isAnalyzing}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="gap-2"
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analisando...
                      </>
                    ) : (
                      <>
                        <TrendingUp className="h-4 w-4" />
                        Analisar
                      </>
                    )}
                  </Button>
                </div>

                <div className="rounded-lg border border-border bg-card p-4">
                  <h3 className="font-medium mb-2">Recursos da Análise com IA</h3>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>Verificação de publicações obrigatórias</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="h-4 w-4 text-success mt-0.5 shrink-0" />
                      <span>Sugestões de melhoria baseadas na LRF</span>
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Analysis */}
          <Card className="shadow-elegant">
            <CardHeader>
              <CardTitle>Histórico de Análises</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingReports ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileSearch className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma análise realizada ainda</p>
                  <p className="text-sm">Faça sua primeira análise acima</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between rounded-lg border border-border p-4 hover:bg-accent/5 transition-colors"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" title={report.portal_url}>
                          {report.portal_url}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(report.analysis_date)}
                        </p>
                        {report.analysis_summary && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {report.analysis_summary}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-4 ml-4">
                        <div className="text-right">
                          <p className="text-sm font-bold">Score: {report.score}%</p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedReport(report);
                            setIsDialogOpen(true);
                          }}
                        >
                          Ver Detalhes
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="manual" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Simulator Column - Checklist */}
            <div className="lg:col-span-2 space-y-6">
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CheckSquare className="h-5 w-5 text-indigo-600" />
                    Checklist de Critérios
                  </CardTitle>
                  <CardDescription>
                    Marque os itens presentes no portal para simular a nota.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="multiple" defaultValue={["receitas", "despesas"]} className="w-full">
                    {pntpCriteria.map((section) => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="text-lg font-semibold text-gray-700">
                          {section.title}
                        </AccordionTrigger>
                        <AccordionContent className="space-y-4 pt-2">
                          {section.items.map((item) => (
                            <div key={item.id} className="flex items-start space-x-3 p-3 rounded hover:bg-gray-50 transition-colors">
                              <Switch
                                id={item.id}
                                checked={checkedItems[item.id] || false}
                                onCheckedChange={(checked) => handleCheck(item.id, checked)}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label
                                  htmlFor={item.id}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {item.label}
                                </Label>
                                <p className="text-xs text-muted-foreground flex items-center gap-2">
                                  {item.isEssential && (
                                    <Badge variant="destructive" className="text-[10px] h-4 px-1">Essencial</Badge>
                                  )}
                                  <Badge variant="outline" className="text-[10px] h-4 px-1">Peso {item.weight}</Badge>
                                </p>
                              </div>
                            </div>
                          ))}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </div>

            {/* Score Column - Sticky */}
            <div className="space-y-6">
              <Card className="shadow-elegant sticky top-6 border-indigo-100 bg-gradient-to-br from-white to-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-indigo-800">
                    <Calculator className="h-5 w-5" />
                    Resultado Simulado
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-center py-6">
                    <div className={`inline-flex items-center justify-center p-4 rounded-full mb-4 shadow-lg ${scoreData.badgeColor} text-white transition-all duration-500`}>
                      <Award className="h-10 w-10" />
                    </div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900">
                      {scoreData.level}
                    </h2>
                    {scoreData.essentialMissed && (
                      <p className="text-xs text-red-500 font-medium mt-1 flex items-center justify-center gap-1">
                        <ShieldAlert className="h-3 w-3" />
                        Critérios Essenciais Pendentes
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Índice Geral</span>
                      <span className="font-bold">{scoreData.percentage.toFixed(1)}%</span>
                    </div>
                    <Progress value={scoreData.percentage} className="h-3" />
                  </div>

                  <div className="space-y-2 pt-4 border-t">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Pontos Obtidos</span>
                      <span>{scoreData.earnedPoints}</span>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Pontos Totais Possíveis</span>
                      <span>{scoreData.totalPoints}</span>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg text-xs text-blue-800 leading-relaxed border border-blue-100">
                    <div className="flex gap-2 items-start">
                      <Info className="h-4 w-4 shrink-0 mt-0.5" />
                      <p>
                        Para conquistar os selos Diamante, Ouro ou Prata, é obrigatório atender a 100% dos critérios essenciais, independente da pontuação geral.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Dialog reuse... */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Relatório de Análise de Transparência</DialogTitle>
          </DialogHeader>

          {selectedReport && (
            <TransparencyReportViewer
              portalUrl={selectedReport.portal_url}
              score={selectedReport.score}
              findingsCount={selectedReport.findings_count}
              summary={selectedReport.analysis_summary}
              detailedFindings={selectedReport.detailed_findings}
              analysisDate={selectedReport.analysis_date}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}