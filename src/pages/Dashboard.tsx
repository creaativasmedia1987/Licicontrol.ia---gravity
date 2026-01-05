import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, AlertTriangle, DollarSign, AlertCircle, RefreshCw, Flame, Gavel, FileSearch } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Json } from "@/integrations/supabase/types";

interface RiskFactor {
  categoria?: string;
  descricao?: string;
  nivel?: string;
  item?: string;
  status?: string;
}

interface RiskAnalysisData {
  id: string;
  process_id: string;
  risk_level: string;
  risk_score: number;
  risk_factors: Json;
  recommendations: string | null;
}

interface ProcessData {
  id: string;
  process_number: string;
  object: string;
  estimated_value: number;
  modality: string;
  department: string;
}

interface PriorityAlert {
  processNumber: string;
  estimatedValue: number;
  riskLevel: string;
  highAlertCount: number;
}

interface DashboardMetrics {
  totalProcesses: number;
  highRiskPercentage: number;
  valueAtRisk: number;
  topAlertCategory: string;
  riskDistribution: { name: string; value: number; color: string }[];
  topAlerts: { category: string; count: number }[];
  priorityAlerts: PriorityAlert[];
  // New KPIs
  totalImpugnations: number;
  avgTransparencyScore: number;
}

const RISK_COLORS: Record<string, string> = {
  'Crítico': 'hsl(var(--destructive))',
  'Alto': '#ef4444',
  'Médio': 'hsl(var(--warning))',
  'Baixo': 'hsl(var(--success))',
};

const formatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export default function Dashboard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalProcesses: 0,
    highRiskPercentage: 0,
    valueAtRisk: 0,
    topAlertCategory: 'Nenhum',
    riskDistribution: [],
    topAlerts: [],
    priorityAlerts: [],
    totalImpugnations: 0,
    avgTransparencyScore: 0,
  });

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch all risk analyses with their associated processes
      const { data: riskAnalyses, error: riskError } = await supabase
        .from("risk_analysis")
        .select("*");

      if (riskError) throw riskError;

      // Fetch all processes
      const { data: processes, error: processError } = await supabase
        .from("licitation_processes")
        .select("*");

      if (processError) throw processError;

      // Fetch Impugnations Count
      const { count: impugnationCount, error: impError } = await supabase
        .from("impugnacoes")
        .select('*', { count: 'exact', head: true });

      if (impError) throw impError;

      // Fetch Transparency Reports for Avg Score
      const { data: transparencyReports, error: transError } = await supabase
        .from("transparency_reports")
        .select("score");

      if (transError) throw transError;

      // Process the data
      const processedMetrics = processData(
        riskAnalyses || [],
        processes || [],
        impugnationCount || 0,
        transparencyReports || []
      );
      setMetrics(processedMetrics);

    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const processData = (
    riskAnalyses: RiskAnalysisData[],
    processes: ProcessData[],
    impugnationCount: number,
    transparencyReports: { score: number }[]
  ): DashboardMetrics => {
    const totalProcesses = riskAnalyses.length;

    // Calculate Avg Transparency Score
    const totalScore = transparencyReports.reduce((acc, curr) => acc + curr.score, 0);
    const avgTransparencyScore = transparencyReports.length > 0
      ? Math.round(totalScore / transparencyReports.length)
      : 0;

    if (totalProcesses === 0) {
      return {
        totalProcesses: 0,
        highRiskPercentage: 0,
        valueAtRisk: 0,
        topAlertCategory: 'Nenhum',
        riskDistribution: [
          { name: 'Baixo', value: 0, color: RISK_COLORS['Baixo'] },
          { name: 'Médio', value: 0, color: RISK_COLORS['Médio'] },
          { name: 'Alto', value: 0, color: RISK_COLORS['Alto'] },
          { name: 'Crítico', value: 0, color: RISK_COLORS['Crítico'] },
        ],
        topAlerts: [],
        priorityAlerts: [],
        totalImpugnations: impugnationCount,
        avgTransparencyScore: avgTransparencyScore,
      };
    }

    let highRiskCount = 0;
    let valueAtRisk = 0;
    const riskDistribution: Record<string, number> = { 'Baixo': 0, 'Médio': 0, 'Alto': 0, 'Crítico': 0 };
    const alertCategories: Record<string, number> = {};
    const priorityAlerts: PriorityAlert[] = [];

    // Create a map of processes by ID for quick lookup
    const processMap = new Map(processes.map(p => [p.id, p]));

    riskAnalyses.forEach((analysis) => {
      const process = processMap.get(analysis.process_id);
      const riskLevel = analysis.risk_level || 'Baixo';
      const estimatedValue = process?.estimated_value || 0;

      // Normalize risk level
      let normalizedRisk = riskLevel;
      if (riskLevel.toLowerCase().includes('baixo')) normalizedRisk = 'Baixo';
      else if (riskLevel.toLowerCase().includes('médio') || riskLevel.toLowerCase().includes('medio')) normalizedRisk = 'Médio';
      else if (riskLevel.toLowerCase().includes('alto')) normalizedRisk = 'Alto';
      else if (riskLevel.toLowerCase().includes('crítico') || riskLevel.toLowerCase().includes('critico')) normalizedRisk = 'Crítico';

      // Update risk distribution
      if (normalizedRisk in riskDistribution) {
        riskDistribution[normalizedRisk]++;
      }

      // Calculate high risk metrics
      if (normalizedRisk === 'Alto' || normalizedRisk === 'Crítico') {
        highRiskCount++;
        valueAtRisk += estimatedValue;
      }

      // Process risk factors for alerts
      let highAlertCount = 0;
      const riskFactors = analysis.risk_factors as RiskFactor[] | null;

      if (Array.isArray(riskFactors)) {
        riskFactors.forEach((factor) => {
          const category = factor.categoria || factor.item || 'Outros';
          alertCategories[category] = (alertCategories[category] || 0) + 1;

          const nivel = factor.nivel || factor.status || '';
          if (nivel.toLowerCase().includes('alto') || nivel.toLowerCase().includes('crítico') ||
            nivel.toLowerCase().includes('falta') || nivel.toLowerCase().includes('risco')) {
            highAlertCount++;
          }
        });
      }

      // Add to priority alerts if has 3+ high alerts
      if (highAlertCount >= 3 && process) {
        priorityAlerts.push({
          processNumber: process.process_number,
          estimatedValue: estimatedValue,
          riskLevel: normalizedRisk,
          highAlertCount: highAlertCount,
        });
      }
    });

    // Sort alerts by count and get top 5
    const sortedAlerts = Object.entries(alertCategories)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    // Sort priority alerts by value
    priorityAlerts.sort((a, b) => b.estimatedValue - a.estimatedValue);

    const topAlertCategory = sortedAlerts.length > 0
      ? `${sortedAlerts[0].category} (${sortedAlerts[0].count})`
      : 'Nenhum';

    return {
      totalProcesses,
      highRiskPercentage: totalProcesses > 0 ? (highRiskCount / totalProcesses) * 100 : 0,
      valueAtRisk,
      topAlertCategory,
      riskDistribution: [
        { name: 'Crítico', value: riskDistribution['Crítico'], color: RISK_COLORS['Crítico'] },
        { name: 'Alto', value: riskDistribution['Alto'], color: RISK_COLORS['Alto'] },
        { name: 'Médio', value: riskDistribution['Médio'], color: RISK_COLORS['Médio'] },
        { name: 'Baixo', value: riskDistribution['Baixo'], color: RISK_COLORS['Baixo'] },
      ],
      topAlerts: sortedAlerts,
      priorityAlerts,
      totalImpugnations: impugnationCount,
      avgTransparencyScore: avgTransparencyScore,
    };
  };

  useEffect(() => {
    fetchDashboardData();

    // Subscribe to real-time updates for all relevant tables
    const channels = [
      supabase.channel("risk_changes").on("postgres_changes", { event: "*", schema: "public", table: "risk_analysis" }, () => fetchDashboardData()).subscribe(),
      supabase.channel("process_changes").on("postgres_changes", { event: "*", schema: "public", table: "licitation_processes" }, () => fetchDashboardData()).subscribe(),
      supabase.channel("impugnation_changes").on("postgres_changes", { event: "*", schema: "public", table: "impugnacoes" }, () => fetchDashboardData()).subscribe(),
      supabase.channel("transparency_changes").on("postgres_changes", { event: "*", schema: "public", table: "transparency_reports" }, () => fetchDashboardData()).subscribe(),
    ];

    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }, []);

  const getRiskBadgeVariant = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Crítico': return 'destructive';
      case 'Alto': return 'destructive';
      case 'Médio': return 'warning' as any;
      default: return 'success' as any;
    }
  };

  const getRiskBadgeClass = (riskLevel: string) => {
    switch (riskLevel) {
      case 'Crítico': return 'bg-pink-600 text-white';
      case 'Alto': return 'bg-destructive text-destructive-foreground';
      case 'Médio': return 'bg-warning text-warning-foreground';
      default: return 'bg-success text-success-foreground';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary">Dashboard de Controle Interno</h1>
          <p className="text-muted-foreground mt-2">
            Visão Consolidada de Risco, Transparência e Legalidade
          </p>
          <p className="text-sm text-muted-foreground">
            Dados agregados de Auditoria, Impugnações e Portal de Transparência.
          </p>
        </div>
        <Button onClick={fetchDashboardData} variant="outline" className="shadow-lg" disabled={loading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar Dados
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <RefreshCw className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Carregando e processando dados históricos de auditoria...</p>
        </div>
      ) : (
        <>
          {/* KPIs Section */}
          <section>
            <h3 className="text-xl font-bold text-foreground mb-4 border-b pb-2">1. KPIs de Alto Nível</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Total Processes */}
              <Card className="shadow-elegant border-b-4 border-primary bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Processos Auditados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <span className="text-4xl font-extrabold text-primary">{metrics.totalProcesses}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Volume de análises pela Matriz de Risco.</p>
                </CardContent>
              </Card>

              {/* Impugnations */}
              <Card className="shadow-elegant border-b-4 border-indigo-500 bg-indigo-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Análises de Impugnação
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Gavel className="h-5 w-5 text-indigo-600" />
                    <span className="text-4xl font-extrabold text-indigo-600">{metrics.totalImpugnations}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Pareceres jurídicos gerados automaticamente.</p>
                </CardContent>
              </Card>

              {/* Transparency Score */}
              <Card className="shadow-elegant border-b-4 border-emerald-500 bg-emerald-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Transparência Média
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <FileSearch className="h-5 w-5 text-emerald-600" />
                    <span className="text-4xl font-extrabold text-emerald-600">{metrics.avgTransparencyScore}%</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Conformidade média com a LRF/Atricon.</p>
                </CardContent>
              </Card>

              {/* High Risk Percentage */}
              <Card className="shadow-elegant border-b-4 border-destructive bg-destructive/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Taxa de Risco Elevado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                    <span className="text-4xl font-extrabold text-destructive">
                      {metrics.highRiskPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Processos com risco Alto ou Crítico.</p>
                </CardContent>
              </Card>

              {/* Value at Risk */}
              <Card className="shadow-elegant border-b-4 border-warning bg-warning/5 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Valor Financeiro Sob Risco (Alto/Crítico)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-warning" />
                    <span className="text-4xl font-extrabold text-warning">
                      {formatter.format(metrics.valueAtRisk)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Montante financeiro em processos vulneráveis.</p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Charts Section */}
          <section>
            <h3 className="text-xl font-bold text-foreground mb-4 border-b pb-2">2. Distribuição e Tendência de Risco</h3>
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Risk Distribution Pie Chart */}
              <Card className="shadow-elegant">
                <CardHeader>
                  <CardTitle className="text-lg">Distribuição de Risco Geral</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.totalProcesses > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={metrics.riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={85}
                          paddingAngle={5}
                          dataKey="value"
                          label={({ name, value }) => value > 0 ? `${name}` : ''}
                        >
                          {metrics.riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name) => [`${value} processos`, name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum dado disponível
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Top Alerts Bar Chart */}
              <Card className="shadow-elegant lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-lg">Top 5 Fragilidades (Recorrência)</CardTitle>
                </CardHeader>
                <CardContent>
                  {metrics.topAlerts.length > 0 ? (
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metrics.topAlerts} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" hide />
                        <YAxis dataKey="category" type="category" width={150} tick={{ fontSize: 11 }} />
                        <Tooltip cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="count" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} name="Ocorrências" barSize={20}>
                          {
                            metrics.topAlerts.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : 'hsl(var(--primary))'} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                      Nenhum alerta identificado
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Priority Intervention Table */}
          <section>
            <h3 className="text-xl font-bold text-foreground mb-4 border-b pb-2">3. Priorização de Intervenção</h3>
            <Card className="shadow-elegant border-2 border-destructive/20 bg-destructive/5">
              <CardHeader>
                <CardTitle className="text-lg text-destructive flex items-center gap-2">
                  <Flame className="h-5 w-5" />
                  Alertas Ativos de Alta Prioridade (3+ alertas Alto/Crítico)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="bg-destructive/10">
                      <TableHead>Processo</TableHead>
                      <TableHead>Valor Estimado</TableHead>
                      <TableHead>Risco Geral</TableHead>
                      <TableHead>Alertas Alto/Crítico</TableHead>
                      <TableHead>Intervenção</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.priorityAlerts.length > 0 ? (
                      metrics.priorityAlerts.map((alert, index) => (
                        <TableRow key={index} className="hover:bg-destructive/5">
                          <TableCell className="font-medium text-destructive">
                            {alert.processNumber}
                          </TableCell>
                          <TableCell>{formatter.format(alert.estimatedValue)}</TableCell>
                          <TableCell>
                            <Badge className={getRiskBadgeClass(alert.riskLevel)}>
                              {alert.riskLevel.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold text-destructive">
                            {alert.highAlertCount}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Flame className="h-4 w-4 text-destructive" />
                              Auditoria Humana Urgente
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          Nenhum processo exige intervenção imediata.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}
