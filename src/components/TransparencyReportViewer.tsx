import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle, CheckCircle, Info, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface Finding {
  category: string;
  severity: "ALTA" | "MÉDIA" | "BAIXA";
  description: string;
  recommendation: string;
}

interface TransparencyReportViewerProps {
  portalUrl: string;
  score: number;
  findingsCount: number;
  summary: string | null;
  detailedFindings: Finding[] | any;
  analysisDate: string;
}

const getSeverityConfig = (severity: string) => {
  switch (severity) {
    case "ALTA":
      return {
        color: "bg-destructive text-destructive-foreground",
        icon: XCircle,
        label: "Alta Prioridade",
      };
    case "MÉDIA":
      return {
        color: "bg-warning text-warning-foreground",
        icon: AlertTriangle,
        label: "Média Prioridade",
      };
    case "BAIXA":
      return {
        color: "bg-info text-info-foreground",
        icon: Info,
        label: "Baixa Prioridade",
      };
    default:
      return {
        color: "bg-muted text-muted-foreground",
        icon: Info,
        label: "Informação",
      };
  }
};

const getScoreColor = (score: number) => {
  if (score >= 80) return "text-success";
  if (score >= 60) return "text-warning";
  return "text-destructive";
};

export default function TransparencyReportViewer({
  portalUrl,
  score,
  findingsCount,
  summary,
  detailedFindings,
  analysisDate,
}: TransparencyReportViewerProps) {
  // Parse findings if it's a string
  let findings: Finding[] = [];
  if (typeof detailedFindings === "string") {
    try {
      findings = JSON.parse(detailedFindings);
    } catch {
      findings = [];
    }
  } else if (Array.isArray(detailedFindings)) {
    findings = detailedFindings;
  }

  // Group findings by category
  const findingsByCategory = findings.reduce((acc, finding) => {
    const category = finding.category || "Outros";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-1">
            Portal Analisado
          </h3>
          <p className="text-lg font-semibold break-all">{portalUrl}</p>
        </div>

        <div className="text-xs text-muted-foreground flex items-center gap-2">
          <CheckCircle className="h-3 w-3" />
          Análise realizada em {formatDate(analysisDate)}
        </div>
      </div>

      <Separator />

      {/* Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              Pontuação Geral
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className={`text-5xl font-bold ${getScoreColor(score)}`}>
              {score}
              <span className="text-2xl">/100</span>
            </div>
            <Progress value={score} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {score >= 80
                ? "Portal em conformidade com a maioria dos critérios"
                : score >= 60
                ? "Portal necessita de melhorias em alguns aspectos"
                : "Portal requer atenção urgente em múltiplos critérios"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-accent/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm text-muted-foreground font-normal">
              Pontos de Atenção Identificados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-5xl font-bold text-foreground">
              {findingsCount}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {findingsCount === 0
                ? "Nenhum ponto de atenção identificado"
                : findingsCount === 1
                ? "Ponto identificado requer análise"
                : "Pontos identificados requerem análise"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Executive Summary */}
      {summary && (
        <>
          <Separator />
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Sumário Executivo
            </h3>
            <Card className="bg-accent/5 border-accent/20">
              <CardContent className="pt-6">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {summary}
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* Detailed Findings by Category */}
      {findings.length > 0 && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Análise Detalhada por Categoria
            </h3>

            <div className="space-y-6">
              {Object.entries(findingsByCategory).map(
                ([category, categoryFindings]) => (
                  <div key={category} className="space-y-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1 w-1 rounded-full bg-primary" />
                      <h4 className="font-semibold text-base">{category}</h4>
                      <Badge variant="outline" className="ml-auto">
                        {categoryFindings.length}{" "}
                        {categoryFindings.length === 1 ? "item" : "itens"}
                      </Badge>
                    </div>

                    <div className="space-y-3 pl-3 border-l-2 border-border">
                      {categoryFindings.map((finding, index) => {
                        const severityConfig = getSeverityConfig(
                          finding.severity
                        );
                        const SeverityIcon = severityConfig.icon;

                        return (
                          <Card
                            key={`${category}-${index}`}
                            className="hover:shadow-md transition-shadow"
                          >
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-2 flex-1">
                                  <SeverityIcon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                                  <div className="space-y-1 flex-1 min-w-0">
                                    <p className="text-sm font-medium leading-relaxed">
                                      {finding.description}
                                    </p>
                                  </div>
                                </div>
                                <Badge
                                  className={`${severityConfig.color} shrink-0`}
                                >
                                  {severityConfig.label}
                                </Badge>
                              </div>
                            </CardHeader>

                            {finding.recommendation && (
                              <CardContent className="pt-0">
                                <div className="rounded-lg bg-muted/50 p-3 space-y-1">
                                  <p className="text-xs font-medium text-muted-foreground">
                                    Recomendação
                                  </p>
                                  <p className="text-sm leading-relaxed">
                                    {finding.recommendation}
                                  </p>
                                </div>
                              </CardContent>
                            )}
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </>
      )}

      {/* Footer Note */}
      <Separator />
      <div className="rounded-lg bg-muted/30 p-4 text-xs text-muted-foreground space-y-2">
        <p className="font-medium">Nota Importante</p>
        <p className="leading-relaxed">
          Esta análise foi realizada automaticamente com base na Cartilha PNTP
          2025 e legislação vigente (Lei de Acesso à Informação, Lei da
          Transparência, Nova Lei de Licitações, LGPD). Os resultados devem ser
          interpretados como indicadores para orientar melhorias contínuas no
          portal de transparência.
        </p>
      </div>
    </div>
  );
}
