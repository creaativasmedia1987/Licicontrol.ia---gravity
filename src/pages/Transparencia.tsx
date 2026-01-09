import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileSearch, TrendingUp, AlertTriangle, CheckCircle, Loader2, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
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

export default function Transparencia() {
  const [portalUrl, setPortalUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [reports, setReports] = useState<TransparencyReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState(true);
  const [selectedReport, setSelectedReport] = useState<TransparencyReport | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

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

  const getSealInfo = (score: number) => {
    if (score >= 80) return { label: "Diamante", color: "bg-blue-600 border-blue-200 shadow-blue-500/50" };
    if (score >= 50) return { label: "Ouro", color: "bg-yellow-500 border-yellow-200 shadow-yellow-500/50" };
    return { label: "Prata", color: "bg-slate-400 border-slate-200 shadow-slate-500/50" };
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
                        <div className="text-right flex flex-col items-end gap-1">
                          <p className="text-sm font-bold">Score: {report.score}%</p>
                          {(() => {
                            const seal = getSealInfo(report.score);
                            return (
                              <Badge className={`${seal.color} text-[10px] h-5 py-0 px-2 text-white`}>
                                <Award className="h-3 w-3 mr-1" /> {seal.label}
                              </Badge>
                            );
                          })()}
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