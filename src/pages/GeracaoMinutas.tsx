import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Download, RefreshCw, FileCheck, Search, ExternalLink, Calendar, Save, Trash2, FolderOpen, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface LicitationProcess {
  id: string;
  process_number: string;
  object: string;
  estimated_value: number;
  modality: string;
  department: string;
}

interface PNCPResult {
  id: string;
  objeto: string;
  modalidade: string;
  valorEstimado: number;
  dataPublicacao: string;
  dataAbertura: string;
  orgaoResponsavel: string;
  criterioJulgamento: string;
  cnpj?: string;
  uf?: string;
  linkSistemaOrigem?: string;
  dadosCompletos: string;
}

interface SavedMinuta {
  id: string;
  title: string;
  template_type: string;
  pncp_id: string | null;
  pncp_objeto: string | null;
  generated_content: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const GeracaoMinutas = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("processos");
  
  const [processes, setProcesses] = useState<LicitationProcess[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [templateType, setTemplateType] = useState<string>("edital");
  const [generatedContent, setGeneratedContent] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [pncpResults, setPncpResults] = useState<PNCPResult[]>([]);
  const [searchingPncp, setSearchingPncp] = useState(false);
  const [selectedPncpItem, setSelectedPncpItem] = useState<PNCPResult | null>(null);
  const [pncpTemplateType, setPncpTemplateType] = useState<string>("edital");

  // Save modal state
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [minutaTitle, setMinutaTitle] = useState("");
  const [savingMinuta, setSavingMinuta] = useState(false);

  // Saved minutas
  const [savedMinutas, setSavedMinutas] = useState<SavedMinuta[]>([]);
  const [loadingMinutas, setLoadingMinutas] = useState(false);

  useEffect(() => {
    fetchProcesses();
    fetchSavedMinutas();
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const fetchProcesses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("licitation_processes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProcesses(data || []);
    } catch (error: any) {
      toast({ title: "Erro ao carregar processos", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedMinutas = async () => {
    try {
      setLoadingMinutas(true);
      const { data, error } = await supabase
        .from("saved_minutas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setSavedMinutas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar minutas:", error);
    } finally {
      setLoadingMinutas(false);
    }
  };

  const searchPNCP = async () => {
    if (searchTerm.length < 3) {
      toast({ title: "Termo de busca inválido", description: "Digite pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      toast({ title: "Datas inválidas", description: "A data inicial não pode ser posterior à data final.", variant: "destructive" });
      return;
    }
    try {
      setSearchingPncp(true);
      setPncpResults([]);
      setSelectedPncpItem(null);
      const { data, error } = await supabase.functions.invoke("search-pncp", { body: { searchTerm, startDate, endDate } });
      if (error) throw error;
      setPncpResults(data.results || []);
      toast({ title: data.source === 'mock' ? "Dados de demonstração" : "Busca concluída", description: data.source === 'mock' ? data.message : `${data.results?.length || 0} resultados encontrados.` });
    } catch (error: any) {
      toast({ title: "Erro na busca PNCP", description: error.message, variant: "destructive" });
    } finally {
      setSearchingPncp(false);
    }
  };

  const generateMinute = async () => {
    if (!selectedProcess) {
      toast({ title: "Selecione um processo", description: "É necessário selecionar um processo.", variant: "destructive" });
      return;
    }
    try {
      setGenerating(true);
      const { data, error } = await supabase.functions.invoke("generate-minute", { body: { processId: selectedProcess, templateType } });
      if (error) throw error;
      setGeneratedContent(data.content);
      setActiveTab("resultado");
      toast({ title: "Minuta gerada", description: "A minuta foi gerada com sucesso." });
    } catch (error: any) {
      toast({ title: "Erro ao gerar minuta", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const generateMinuteFromPNCP = async (item: PNCPResult) => {
    try {
      setGenerating(true);
      setSelectedPncpItem(item);
      const { data, error } = await supabase.functions.invoke("generate-minute-pncp", { body: { pncpData: item, templateType: pncpTemplateType } });
      if (error) throw error;
      setGeneratedContent(data.content);
      setActiveTab("resultado");
      toast({ title: "Minuta gerada", description: "Minuta gerada com base no edital do PNCP." });
    } catch (error: any) {
      toast({ title: "Erro ao gerar minuta", description: error.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  const openSaveModal = () => {
    if (!generatedContent) {
      toast({ title: "Nenhuma minuta", description: "Gere uma minuta primeiro.", variant: "destructive" });
      return;
    }
    const defaultTitle = selectedPncpItem 
      ? `${getTemplateLabel(pncpTemplateType)} - ${selectedPncpItem.objeto.substring(0, 50)}`
      : `${getTemplateLabel(templateType)} - ${processes.find(p => p.id === selectedProcess)?.object.substring(0, 50) || 'Documento'}`;
    setMinutaTitle(defaultTitle);
    setSaveModalOpen(true);
  };

  const saveMinuta = async () => {
    if (minutaTitle.trim().length < 5) {
      toast({ title: "Título muito curto", description: "O título deve ter pelo menos 5 caracteres.", variant: "destructive" });
      return;
    }

    try {
      setSavingMinuta(true);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({ title: "Não autenticado", description: "Faça login para salvar minutas.", variant: "destructive" });
        return;
      }

      const { error } = await supabase.from("saved_minutas").insert({
        user_id: user.id,
        title: minutaTitle.trim(),
        template_type: selectedPncpItem ? pncpTemplateType : templateType,
        pncp_id: selectedPncpItem?.id || null,
        pncp_objeto: selectedPncpItem?.objeto || null,
        pncp_data: selectedPncpItem as any || null,
        generated_content: generatedContent,
        status: 'Rascunho'
      });
      if (error) throw error;

      toast({ title: "Minuta salva!", description: `"${minutaTitle}" foi salva com sucesso.` });
      setSaveModalOpen(false);
      setMinutaTitle("");
      fetchSavedMinutas();
    } catch (error: any) {
      toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    } finally {
      setSavingMinuta(false);
    }
  };

  const loadSavedMinuta = (minuta: SavedMinuta) => {
    setGeneratedContent(minuta.generated_content);
    setActiveTab("resultado");
    toast({ title: "Minuta carregada", description: `"${minuta.title}" foi carregada.` });
  };

  const deleteSavedMinuta = async (id: string) => {
    try {
      const { error } = await supabase.from("saved_minutas").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Minuta excluída" });
      fetchSavedMinutas();
    } catch (error: any) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    }
  };

  const downloadMinute = () => {
    if (!generatedContent) return;
    const process = processes.find((p) => p.id === selectedProcess);
    const fileName = selectedPncpItem ? `${pncpTemplateType}_PNCP_${selectedPncpItem.id}.txt` : `${templateType}_${process?.process_number || "documento"}.txt`;
    const blob = new Blob([generatedContent], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Download iniciado", description: "A minuta está sendo baixada." });
  };

  const getTemplateLabel = (type: string) => {
    const labels: Record<string, string> = { edital: "Minuta de Edital", termo_referencia: "Termo de Referência", contrato: "Minuta de Contrato" };
    return labels[type] || "Documento";
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR') : 'N/A';
  const formatDateTime = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleString('pt-BR') : 'N/A';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Sparkles className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Geração com IA: Minutas via PNCP</h1>
        </div>
        <p className="text-muted-foreground mt-2">Consulte o PNCP por data e objeto para encontrar editais de referência e gerar minutas personalizadas com IA.</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="processos">Processos Internos</TabsTrigger>
          <TabsTrigger value="pncp">Consulta PNCP</TabsTrigger>
          <TabsTrigger value="resultado">Resultado</TabsTrigger>
          <TabsTrigger value="salvos">Minutas Salvas</TabsTrigger>
        </TabsList>

        <TabsContent value="processos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Gerar a partir de Processos Cadastrados</CardTitle>
              <CardDescription>Selecione um processo existente e o tipo de documento</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Processo Licitatório</label>
                  <Select value={selectedProcess} onValueChange={setSelectedProcess}>
                    <SelectTrigger><SelectValue placeholder="Selecione um processo" /></SelectTrigger>
                    <SelectContent>
                      {processes.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.process_number} - {p.object.substring(0, 50)}{p.object.length > 50 ? "..." : ""}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tipo de Documento</label>
                  <Select value={templateType} onValueChange={setTemplateType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="edital">Minuta de Edital</SelectItem>
                      <SelectItem value="termo_referencia">Termo de Referência</SelectItem>
                      <SelectItem value="contrato">Minuta de Contrato</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={generateMinute} disabled={generating || !selectedProcess}>
                {generating ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                {generating ? "Gerando..." : "Gerar Minuta"}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pncp" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" />Filtros de Busca PNCP</CardTitle>
              <CardDescription>Consulte o Portal Nacional de Contratações Públicas para encontrar editais de referência</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-4 w-4" />Data de Início</label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-1"><Calendar className="h-4 w-4" />Data de Fim</label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-medium">Objeto ou CNPJ (Obrigatório)</label>
                  <Input type="text" placeholder="Ex: Serviços de engenharia, equipamentos..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchPNCP()} />
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={searchPNCP} disabled={searchingPncp} className="flex-1">
                  {searchingPncp ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Search className="mr-2 h-4 w-4" />}
                  {searchingPncp ? "Buscando..." : "Buscar Edital no PNCP"}
                </Button>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Minuta a Gerar</label>
                <Select value={pncpTemplateType} onValueChange={setPncpTemplateType}>
                  <SelectTrigger className="w-full md:w-64"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="edital">Minuta de Edital</SelectItem>
                    <SelectItem value="termo_referencia">Termo de Referência</SelectItem>
                    <SelectItem value="contrato">Minuta de Contrato</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {pncpResults.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-xl font-semibold">Resultados Encontrados ({pncpResults.length})</h3>
              {pncpResults.map((item) => (
                <Card key={item.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-primary">{item.objeto}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{item.orgaoResponsavel}</p>
                      </div>
                      <Badge variant="secondary">{item.modalidade}</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mb-4">
                      <div><span className="text-muted-foreground">Valor Estimado:</span><p className="font-semibold text-success">{formatCurrency(item.valorEstimado)}</p></div>
                      <div><span className="text-muted-foreground">Publicação:</span><p>{formatDate(item.dataPublicacao)}</p></div>
                      <div><span className="text-muted-foreground">Abertura:</span><p>{formatDate(item.dataAbertura)}</p></div>
                      <div><span className="text-muted-foreground">UF:</span><p>{item.uf || 'N/A'}</p></div>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => generateMinuteFromPNCP(item)} disabled={generating} className="flex-1">
                        {generating && selectedPncpItem?.id === item.id ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <FileCheck className="mr-2 h-4 w-4" />}
                        Gerar e Salvar Minuta
                      </Button>
                      {item.linkSistemaOrigem && (
                        <Button variant="outline" asChild><a href={item.linkSistemaOrigem} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-4 w-4" /></a></Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {pncpResults.length === 0 && !searchingPncp && searchTerm && (
            <Card className="bg-warning/10 border-warning">
              <CardContent className="p-6 text-center">
                <p className="font-semibold">Nenhum resultado encontrado.</p>
                <p className="text-sm text-muted-foreground mt-1">Verifique os filtros de data e o termo de busca.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resultado" className="space-y-6">
          {generatedContent ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{getTemplateLabel(selectedPncpItem ? pncpTemplateType : templateType)}</span>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={openSaveModal}><Save className="mr-2 h-4 w-4" />Salvar</Button>
                    <Button variant="outline" onClick={downloadMinute}><Download className="mr-2 h-4 w-4" />Baixar</Button>
                  </div>
                </CardTitle>
                <CardDescription>Documento gerado automaticamente - Revise antes de utilizar</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea value={generatedContent} onChange={(e) => setGeneratedContent(e.target.value)} className="min-h-[600px] font-mono text-sm" />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground text-center">Selecione um processo ou busque no PNCP<br />para gerar documentos automaticamente</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="salvos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><FolderOpen className="h-5 w-5" />Minutas Salvas</CardTitle>
              <CardDescription>Acesse suas minutas geradas anteriormente para reutilização</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMinutas ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : savedMinutas.length > 0 ? (
                <div className="space-y-3">
                  {savedMinutas.map((minuta) => (
                    <div key={minuta.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{minuta.title}</h4>
                          <Badge variant="outline">{getTemplateLabel(minuta.template_type)}</Badge>
                          <Badge variant={minuta.status === 'Rascunho' ? 'secondary' : 'default'}>{minuta.status}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          Criado em {formatDateTime(minuta.created_at)}
                          {minuta.pncp_objeto && <span> • PNCP: {minuta.pncp_objeto.substring(0, 40)}...</span>}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => loadSavedMinuta(minuta)}>
                          <FileText className="h-4 w-4 mr-1" />Abrir
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => deleteSavedMinuta(minuta.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Nenhuma minuta salva ainda.</p>
                  <p className="text-sm text-muted-foreground">Gere uma minuta e clique em "Salvar" para armazená-la.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Salvamento */}
      <Dialog open={saveModalOpen} onOpenChange={setSaveModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Salvar Minuta Gerada</DialogTitle>
            <DialogDescription>Dê um título descritivo para identificar esta minuta no futuro.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="minuta-title">Título para Referência (Obrigatório)</Label>
              <Input 
                id="minuta-title" 
                placeholder="Ex: Minuta de Pregão - Serviço de TI" 
                value={minutaTitle} 
                onChange={(e) => setMinutaTitle(e.target.value)} 
              />
            </div>
            <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
              <p className="text-xs text-muted-foreground font-mono">{generatedContent.substring(0, 300)}...</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveMinuta} disabled={savingMinuta}>
              {savingMinuta ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              {savingMinuta ? "Salvando..." : "Salvar e Concluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeracaoMinutas;
