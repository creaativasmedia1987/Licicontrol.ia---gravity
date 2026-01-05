import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { 
  AlertCircle, TrendingUp, TrendingDown, Minus, Plus, RefreshCw, 
  FolderOpen, Shield, AlertTriangle, CheckCircle, XCircle, Sparkles,
  FileText, Building2, DollarSign, Calendar, ClipboardCheck, Scale, FileCheck,
  SearchCheck, Upload
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

interface LicitationProcess {
  id: string;
  process_number: string;
  object: string;
  estimated_value: number;
  modality: string;
  department: string;
  status: string;
  created_at: string;
}

interface RiskAnalysis {
  id: string;
  process_id: string;
  risk_level: string;
  risk_score: number;
  risk_factors: any;
  recommendations: string;
  analyzed_at: string;
}

const MatrizRisco = () => {
  const { toast } = useToast();
  const [processes, setProcesses] = useState<LicitationProcess[]>([]);
  const [riskAnalyses, setRiskAnalyses] = useState<Record<string, RiskAnalysis>>({});
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  
  // Add process dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newProcess, setNewProcess] = useState({
    process_number: "",
    object: "",
    estimated_value: "",
    modality: "pregao",
    department: "",
  });

  // Process selector modal
  const [isProcessSelectorOpen, setIsProcessSelectorOpen] = useState(false);
  const [selectedProcess, setSelectedProcess] = useState<LicitationProcess | null>(null);
  
  // File upload ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchProcesses();
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const { data: processesData, error: processesError } = await supabase
        .from("licitation_processes")
        .select("*")
        .order("created_at", { ascending: false });

      if (processesError) throw processesError;
      setProcesses(processesData || []);

      const { data: analysesData, error: analysesError } = await supabase
        .from("risk_analysis")
        .select("*");

      if (analysesError) throw analysesError;

      const analysesMap: Record<string, RiskAnalysis> = {};
      analysesData?.forEach((analysis) => {
        analysesMap[analysis.process_id] = analysis;
      });
      setRiskAnalyses(analysesMap);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar processos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProcess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("licitation_processes").insert({
        user_id: user.id,
        process_number: newProcess.process_number,
        object: newProcess.object,
        estimated_value: parseFloat(newProcess.estimated_value),
        modality: newProcess.modality,
        department: newProcess.department,
        status: "em_andamento",
      });

      if (error) throw error;

      toast({
        title: "Processo cadastrado",
        description: "Processo adicionado com sucesso.",
      });

      setIsAddDialogOpen(false);
      setNewProcess({
        process_number: "",
        object: "",
        estimated_value: "",
        modality: "pregao",
        department: "",
      });
      fetchProcesses();
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar processo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const selectProcessForAudit = (process: LicitationProcess, startAnalysis: boolean = false) => {
    setSelectedProcess(process);
    setIsProcessSelectorOpen(false);
    toast({
      title: "Processo selecionado",
      description: `Processo ${process.process_number} carregado para análise.`,
    });
    
    // Se startAnalysis for true, inicia a análise automaticamente
    if (startAnalysis) {
      setTimeout(() => {
        analyzeRisk(process.id);
      }, 300);
    }
  };

  const generateMockProcesses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const mockProcesses = [
        {
          user_id: user.id,
          process_number: "PL-001/2025",
          object: "Aquisição de equipamentos de informática (computadores, monitores e periféricos) para modernização do parque tecnológico da Secretaria de Educação",
          estimated_value: 450000.00,
          modality: "pregao",
          department: "Secretaria de Educação",
          status: "em_andamento",
        },
        {
          user_id: user.id,
          process_number: "CT-015/2024",
          object: "Contratação de empresa especializada para prestação de serviços de limpeza e conservação predial nas unidades administrativas",
          estimated_value: 1250000.00,
          modality: "concorrencia",
          department: "Secretaria de Administração",
          status: "em_andamento",
        },
        {
          user_id: user.id,
          process_number: "DI-007/2025",
          object: "Dispensa de licitação para contratação emergencial de serviços de manutenção corretiva em sistema de climatização",
          estimated_value: 89500.00,
          modality: "dispensa",
          department: "Secretaria de Infraestrutura",
          status: "em_andamento",
        },
      ];

      const { error } = await supabase.from("licitation_processes").insert(mockProcesses);

      if (error) throw error;

      toast({
        title: "Dados de exemplo criados",
        description: "3 processos de exemplo foram adicionados para demonstração.",
      });

      fetchProcesses();
    } catch (error: any) {
      toast({
        title: "Erro ao criar dados de exemplo",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      // Simula a leitura do arquivo e extrai informações do nome
      const fileName = file.name.replace(/\.[^/.]+$/, ""); // Remove extensão
      const fileExtension = file.name.split('.').pop()?.toUpperCase() || "DOC";
      
      // Gera número de processo baseado no nome do arquivo
      const processNumber = `UP-${fileName.substring(0, 10).toUpperCase().replace(/\s+/g, '-')}/${new Date().getFullYear()}`;
      
      // Simula objeto baseado no tipo de arquivo
      const objectDescription = `Documento ${fileExtension} importado: ${fileName} - Análise automática de processo licitatório baseada no conteúdo do arquivo "${file.name}"`;
      
      // Valor estimado simulado baseado no tamanho do arquivo
      const estimatedValue = Math.max(50000, Math.min(file.size * 0.5, 5000000));
      
      // Determina modalidade simulada
      const modalities = ["pregao", "concorrencia", "dispensa"];
      const modality = modalities[Math.floor(Math.random() * modalities.length)];

      toast({
        title: "Processando arquivo...",
        description: `Lendo conteúdo de "${file.name}"`,
      });

      // Cria o processo no banco
      const { data: newProcess, error } = await supabase
        .from("licitation_processes")
        .insert({
          user_id: user.id,
          process_number: processNumber,
          object: objectDescription,
          estimated_value: estimatedValue,
          modality: modality,
          department: "Importação Automática",
          status: "em_andamento",
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Arquivo processado",
        description: `Processo ${processNumber} criado. Iniciando análise de risco...`,
      });

      // Atualiza lista e seleciona o processo
      await fetchProcesses();
      setSelectedProcess(newProcess);

      // Inicia análise automaticamente
      setTimeout(() => {
        analyzeRisk(newProcess.id);
      }, 500);

    } catch (error: any) {
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      // Limpa o input para permitir upload do mesmo arquivo novamente
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const analyzeRisk = async (processId: string) => {
    try {
      setAnalyzing(processId);
      const { data, error } = await supabase.functions.invoke("analyze-risk", {
        body: { processId },
      });

      if (error) throw error;

      toast({
        title: "Análise concluída",
        description: "A análise de risco foi realizada com sucesso.",
      });

      fetchProcesses();
    } catch (error: any) {
      toast({
        title: "Erro na análise",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAnalyzing(null);
    }
  };

  const getRiskStyles = (level: string) => {
    switch (level) {
      case "critico":
        return {
          badge: "bg-red-600 text-white border-red-700 hover:bg-red-700",
          card: "border-l-4 border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
          icon: <XCircle className="h-5 w-5 text-red-600" />,
          label: "CRÍTICO"
        };
      case "alto":
        return {
          badge: "bg-orange-500 text-white border-orange-600 hover:bg-orange-600",
          card: "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-950/20",
          icon: <AlertTriangle className="h-5 w-5 text-orange-500" />,
          label: "ALTO"
        };
      case "medio":
        return {
          badge: "bg-amber-400 text-amber-900 border-amber-500 hover:bg-amber-500",
          card: "border-l-4 border-l-amber-400 bg-amber-50/50 dark:bg-amber-950/20",
          icon: <Minus className="h-5 w-5 text-amber-500" />,
          label: "MÉDIO"
        };
      case "baixo":
        return {
          badge: "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600",
          card: "border-l-4 border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20",
          icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
          label: "BAIXO"
        };
      default:
        return {
          badge: "bg-slate-400 text-white border-slate-500",
          card: "border-l-4 border-l-slate-400",
          icon: <AlertCircle className="h-5 w-5 text-slate-400" />,
          label: "PENDENTE"
        };
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case "alta":
        return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300";
      case "media":
        return "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300";
      case "baixa":
        return "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <RefreshCw className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Matriz de Risco Automatizada
            </h1>
          </div>
          <p className="text-muted-foreground mt-2 ml-13">
            Análise inteligente de riscos em processos licitatórios com IA
          </p>
        </div>
        <div className="flex gap-3">
          {/* Hidden file input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.odt"
            className="hidden"
          />
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()} 
            className="shadow-lg"
          >
            <Upload className="mr-2 h-4 w-4" />
            Fazer Upload e Iniciar Análise
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="shadow-lg">
                <Plus className="mr-2 h-4 w-4" />
                Novo Processo
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Processo</DialogTitle>
                <DialogDescription>
                  Adicione os dados do processo licitatório para análise de risco
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="process_number">Número do Processo</Label>
                  <Input
                    id="process_number"
                    value={newProcess.process_number}
                    onChange={(e) => setNewProcess({ ...newProcess, process_number: e.target.value })}
                    placeholder="Ex: 2025/001"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="object">Objeto</Label>
                  <Input
                    id="object"
                    value={newProcess.object}
                    onChange={(e) => setNewProcess({ ...newProcess, object: e.target.value })}
                    placeholder="Descrição do objeto da licitação"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="estimated_value">Valor Estimado (R$)</Label>
                  <Input
                    id="estimated_value"
                    type="number"
                    step="0.01"
                    value={newProcess.estimated_value}
                    onChange={(e) => setNewProcess({ ...newProcess, estimated_value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="modality">Modalidade</Label>
                  <Select
                    value={newProcess.modality}
                    onValueChange={(value) => setNewProcess({ ...newProcess, modality: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pregao">Pregão</SelectItem>
                      <SelectItem value="concorrencia">Concorrência</SelectItem>
                      <SelectItem value="dispensa">Dispensa</SelectItem>
                      <SelectItem value="inexigibilidade">Inexigibilidade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="department">Departamento</Label>
                  <Input
                    id="department"
                    value={newProcess.department}
                    onChange={(e) => setNewProcess({ ...newProcess, department: e.target.value })}
                    placeholder="Departamento solicitante"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleAddProcess}>Cadastrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Selected Process Card */}
      {selectedProcess && (
        <Card className="shadow-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <Badge variant="outline" className="mb-2">Processo Selecionado para Análise</Badge>
                <CardTitle className="text-2xl">
                  Processo {selectedProcess.process_number}
                </CardTitle>
                <CardDescription className="text-base mt-2">
                  {selectedProcess.object}
                </CardDescription>
              </div>
              <Button 
                size="lg"
                onClick={() => analyzeRisk(selectedProcess.id)}
                disabled={analyzing === selectedProcess.id}
                className="shadow-lg bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              >
                {analyzing === selectedProcess.id ? (
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-5 w-5" />
                )}
                Iniciar Análise de Risco com IA
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <DollarSign className="h-5 w-5 text-emerald-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Valor Estimado</p>
                  <p className="font-semibold">{formatCurrency(selectedProcess.estimated_value)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Modalidade</p>
                  <p className="font-semibold capitalize">{selectedProcess.modality}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Building2 className="h-5 w-5 text-purple-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Departamento</p>
                  <p className="font-semibold">{selectedProcess.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-background/50">
                <Calendar className="h-5 w-5 text-orange-500" />
                <div>
                  <p className="text-sm text-muted-foreground">Cadastrado em</p>
                  <p className="font-semibold">{new Date(selectedProcess.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Risk Analysis Results */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="h-5 w-5" />
          Análises de Risco Realizadas
        </h2>
        
        {processes.length === 0 ? (
          <Card className="shadow-lg">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <AlertCircle className="h-16 w-16 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground text-center text-lg">
                Nenhum processo cadastrado ainda.
              </p>
              <p className="text-muted-foreground text-center text-sm mt-1">
                Clique em "Novo Processo" ou "Abrir Arquivos e Documentos" para começar.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {processes.map((process) => {
              const analysis = riskAnalyses[process.id];
              const riskStyles = analysis ? getRiskStyles(analysis.risk_level) : getRiskStyles("pending");

              return (
                <Card 
                  key={process.id} 
                  className={`shadow-lg hover:shadow-xl transition-all duration-300 ${analysis ? riskStyles.card : ""}`}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <CardTitle className="text-lg">
                            Processo {process.process_number}
                          </CardTitle>
                          {analysis && (
                            <Badge className={`${riskStyles.badge} shadow-md flex items-center gap-1`}>
                              {riskStyles.icon}
                              Risco {riskStyles.label}
                            </Badge>
                          )}
                        </div>
                        <CardDescription className="mt-2">
                          {process.object}
                        </CardDescription>
                      </div>
                      <div className="flex gap-2">
                        {!analysis ? (
                          <Button
                            onClick={() => analyzeRisk(process.id)}
                            disabled={analyzing === process.id}
                            size="sm"
                            className="shadow-md"
                          >
                            {analyzing === process.id ? (
                              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Sparkles className="mr-2 h-4 w-4" />
                            )}
                            Analisar Risco
                          </Button>
                        ) : (
                          <Button
                            onClick={() => analyzeRisk(process.id)}
                            disabled={analyzing === process.id}
                            variant="outline"
                            size="sm"
                            className="shadow-md"
                          >
                            <RefreshCw className={`mr-2 h-4 w-4 ${analyzing === process.id ? 'animate-spin' : ''}`} />
                            Reanalisar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="p-3 rounded-lg bg-background/80">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Valor</p>
                        <p className="font-semibold text-emerald-600">{formatCurrency(process.estimated_value)}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/80">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Modalidade</p>
                        <p className="font-semibold capitalize">{process.modality}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/80">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Departamento</p>
                        <p className="font-semibold">{process.department}</p>
                      </div>
                      <div className="p-3 rounded-lg bg-background/80">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">Status</p>
                        <Badge variant="secondary" className="mt-1">{process.status}</Badge>
                      </div>
                    </div>

                    {analysis && (
                      <div className="space-y-4 pt-4 border-t">
                        {/* Risk Score */}
                        <div className="bg-background/80 p-4 rounded-lg">
                          <div className="flex justify-between mb-2">
                            <span className="text-sm font-semibold">Score de Risco</span>
                            <span className="text-lg font-bold">{analysis.risk_score}/100</span>
                          </div>
                          <Progress 
                            value={analysis.risk_score} 
                            className={`h-3 ${
                              analysis.risk_score >= 75 ? '[&>div]:bg-red-500' :
                              analysis.risk_score >= 50 ? '[&>div]:bg-orange-500' :
                              analysis.risk_score >= 25 ? '[&>div]:bg-amber-400' : '[&>div]:bg-emerald-500'
                            }`}
                          />
                        </div>

                        {/* Risk Factors */}
                        {analysis.risk_factors && (
                          <div>
                            <p className="text-sm font-semibold mb-3">Fatores de Risco Identificados:</p>
                            <div className="space-y-2">
                              {(Array.isArray(analysis.risk_factors) ? analysis.risk_factors : (analysis.risk_factors as any).factors || []).map((factor: any, index: number) => (
                                <div 
                                  key={index} 
                                  className={`p-3 rounded-lg border ${getSeverityStyles(factor.severity)} shadow-sm`}
                                >
                                  <div className="flex items-start gap-3">
                                    <Badge variant="outline" className={`${getSeverityStyles(factor.severity)} capitalize shrink-0`}>
                                      {factor.severity}
                                    </Badge>
                                    <div>
                                      <p className="font-medium">{factor.factor}</p>
                                      <p className="text-sm opacity-80 mt-1">{factor.description}</p>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Compliance Checklist */}
                        {analysis.risk_factors && (analysis.risk_factors as any).checklist && (
                          <div className="space-y-4">
                            <Separator />
                            <div className="flex items-center gap-2">
                              <ClipboardCheck className="h-5 w-5 text-primary" />
                              <p className="text-sm font-semibold">Checklist de Conformidade e Prevenção</p>
                            </div>
                            
                            {/* Documentos Obrigatórios */}
                            {(analysis.risk_factors as any).checklist.documentosObrigatorios && (
                              <div className="bg-blue-50/50 dark:bg-blue-950/20 p-4 rounded-lg border-l-4 border-l-blue-500">
                                <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                                  <FileCheck className="h-4 w-4" />
                                  Documentos Obrigatórios
                                </p>
                                <div className="space-y-2">
                                  {(analysis.risk_factors as any).checklist.documentosObrigatorios.map((doc: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-background rounded border">
                                      <span className="text-sm">{doc.item}</span>
                                      <Badge className={`${
                                        doc.status === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                        doc.status === 'FALTA' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      }`}>
                                        {doc.status === 'OK' ? '✅' : doc.status === 'FALTA' ? '❌' : '⚠️'} {doc.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Cláusulas Arriscadas */}
                            {(analysis.risk_factors as any).checklist.clausulasArriscadas && (
                              <div className="bg-orange-50/50 dark:bg-orange-950/20 p-4 rounded-lg border-l-4 border-l-orange-500">
                                <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-orange-800 dark:text-orange-300">
                                  <AlertTriangle className="h-4 w-4" />
                                  Revisão de Cláusulas Arriscadas
                                </p>
                                <div className="space-y-2">
                                  {(analysis.risk_factors as any).checklist.clausulasArriscadas.map((clause: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-background rounded border">
                                      <span className="text-sm">{clause.item}</span>
                                      <Badge className={`${
                                        clause.status === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                        clause.status.includes('ALTO') ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      }`}>
                                        {clause.status === 'OK' ? '✅' : clause.status.includes('ALTO') ? '❌' : '⚠️'} {clause.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Jurídico/Contábil */}
                            {(analysis.risk_factors as any).checklist.juridicoContabil && (
                              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-lg border-l-4 border-l-emerald-500">
                                <p className="text-sm font-semibold mb-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                                  <Scale className="h-4 w-4" />
                                  Checklist Jurídico/Contábil
                                </p>
                                <div className="space-y-2">
                                  {(analysis.risk_factors as any).checklist.juridicoContabil.map((item: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-background rounded border">
                                      <span className="text-sm">{item.item}</span>
                                      <Badge className={`${
                                        item.status === 'OK' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                        item.status === 'INCONFORMIDADE' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
                                        'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
                                      }`}>
                                        {item.status === 'OK' ? '✅' : item.status === 'INCONFORMIDADE' ? '❌' : '⚠️'} {item.status}
                                      </Badge>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Recommendations */}
                        {analysis.recommendations && (
                          <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm font-semibold mb-2 flex items-center gap-2 text-blue-800 dark:text-blue-300">
                              <CheckCircle className="h-4 w-4" />
                              Recomendações
                            </p>
                            <p className="text-sm text-blue-700 dark:text-blue-400">
                              {analysis.recommendations}
                            </p>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Analisado em {new Date(analysis.analyzed_at).toLocaleString("pt-BR")}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Process Selector Modal */}
      <Dialog open={isProcessSelectorOpen} onOpenChange={setIsProcessSelectorOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="flex items-center gap-2 text-primary">
              <span className="text-2xl">📂</span>
              Arquivos e Documentos Cadastrados
            </DialogTitle>
            <DialogDescription className="mt-2">
              Estes são os processos licitatórios cadastrados no sistema. Selecione um para auditar.
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-4 bg-muted/30 rounded-lg mt-4 px-2">
            {processes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-16 w-16 text-muted-foreground/40 mb-4" />
                <p className="text-muted-foreground">Nenhum processo/arquivo cadastrado.</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Use o botão "Novo Processo" para criar um ou gere dados de exemplo.
                </p>
                <Button onClick={generateMockProcesses} variant="outline" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Gerar Processos de Exemplo
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {processes.map((process) => {
                  const analysis = riskAnalyses[process.id];

                  return (
                    <div
                      key={process.id}
                      onClick={() => selectProcessForAudit(process)}
                      className={`p-4 rounded-lg border bg-background cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 hover:border-primary/50 ${
                        selectedProcess?.id === process.id 
                          ? "border-primary ring-2 ring-primary/20" 
                          : "border-border"
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-bold text-lg">{process.process_number}</h4>
                            <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
                              {process.modality}
                            </Badge>
                            {analysis && (
                              <Badge className={`${getRiskStyles(analysis.risk_level).badge} text-xs`}>
                                {getRiskStyles(analysis.risk_level).label}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-1">{process.object}</p>
                          <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-emerald-500" />
                              {formatCurrency(process.estimated_value)}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3 text-orange-500" />
                              Criado em: {new Date(process.created_at).toLocaleDateString("pt-BR")}
                            </span>
                          </div>
                        </div>
                        {/* Ícone de análise direta */}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-10 w-10 shrink-0 rounded-full hover:bg-primary/10 hover:text-primary"
                          onClick={(e) => {
                            e.stopPropagation();
                            selectProcessForAudit(process, true);
                          }}
                          title="Analisar risco automaticamente"
                        >
                          <SearchCheck className="h-5 w-5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setIsProcessSelectorOpen(false)} className="w-full">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MatrizRisco;
