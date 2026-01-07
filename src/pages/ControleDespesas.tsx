import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Wallet, Search, CheckCircle, XCircle, Loader2, Settings, Link } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ControleDespesas() {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<"success" | "error" | null>(null);
    const [apiConfigOpen, setApiConfigOpen] = useState(false);
    const [apiSettings, setApiSettings] = useState({
        url: "https://api.gestaopublica.gov.br/v1",
        token: "",
        systemType: "generic"
    });

    // Form state
    const [formData, setFormData] = useState({
        ano: new Date().getFullYear().toString(),
        unidade: "",
        elemento: "",
        valor: ""
    });

    const handleInputChange = (field: string, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Reset result when input changes
        if (result) setResult(null);
    };

    const handleSaveApiSettings = () => {
        // Mock validation
        if (!apiSettings.url || !apiSettings.token) {
            toast({
                title: "Configuração Incompleta",
                description: "Por favor, informe a URL e o Token de acesso da API.",
                variant: "destructive"
            });
            return;
        }

        // Simulate saving
        toast({
            title: "Conexão Estabelecida",
            description: "Integração com o sistema de gestão pública configurada com sucesso.",
        });
        setApiConfigOpen(false);
    };

    const handleCheck = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.unidade || !formData.elemento || !formData.valor) {
            toast({
                title: "Campos obrigatórios",
                description: "Por favor, preencha todos os campos para realizar a verificação.",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        setResult(null);

        // Simulate API call to external system
        setTimeout(() => {
            setLoading(false);

            // Mock logic: values > 100000 fail for demonstration if unit is "rh"
            // Random success/fail for others or based on deterministic rule
            const numericValor = parseFloat(formData.valor.replace(/[^0-9.]/g, ''));
            const isAvailable = Math.random() > 0.3; // 70% success rate mock

            if (isAvailable) {
                setResult("success");
                toast({
                    title: "Dotação Disponível",
                    description: "O valor solicitado está dentro do limite orçamentário.",
                    variant: "default"
                });
            } else {
                setResult("error");
                toast({
                    title: "Saldo Insuficiente",
                    description: "Não há dotação orçamentária suficiente para esta despesa.",
                    variant: "destructive"
                });
            }
        }, 1500);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Wallet className="h-8 w-8 text-primary" />
                        Controle de Despesas
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Verifique a disponibilidade orçamentária integrando com o sistema de gestão pública.
                    </p>
                </div>
                <Dialog open={apiConfigOpen} onOpenChange={setApiConfigOpen}>
                    <DialogTrigger asChild>
                        <Button variant="outline" className="gap-2">
                            <Settings className="h-4 w-4" />
                            Configurar Integração
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle>Integração com Sistema de Gestão</DialogTitle>
                            <DialogDescription>
                                Configure as credenciais de acesso para conectar o LiciControl à base de dados orçamentária do município.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label htmlFor="systemType">Sistema de Origem</Label>
                                <Select
                                    value={apiSettings.systemType}
                                    onValueChange={(val) => setApiSettings({ ...apiSettings, systemType: val })}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione o sistema" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="generic">API Genérica (REST)</SelectItem>
                                        <SelectItem value="govbr">Gov.br (SIAFI/SIASG)</SelectItem>
                                        <SelectItem value="betha">Betha Sistemas</SelectItem>
                                        <SelectItem value="ipm">IPM Sistemas</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apiUrl">Endpoint da API</Label>
                                <Input
                                    id="apiUrl"
                                    value={apiSettings.url}
                                    onChange={(e) => setApiSettings({ ...apiSettings, url: e.target.value })}
                                    placeholder="https://api.exemplo.gov.br/v1"
                                />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="apiToken">Token de Acesso / Chave de API</Label>
                                <Input
                                    id="apiToken"
                                    type="password"
                                    value={apiSettings.token}
                                    onChange={(e) => setApiSettings({ ...apiSettings, token: e.target.value })}
                                    placeholder="Cole seu token de autenticação aqui"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Esta chave será usada para autenticar as consultas de dotação.
                                </p>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setApiConfigOpen(false)}>Cancelar</Button>
                            <Button type="button" onClick={handleSaveApiSettings} className="gap-2">
                                <Link className="h-4 w-4" />
                                Salvar Conexão
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                <Card className="shadow-elegant">
                    <CardHeader>
                        <CardTitle>Verificação de Dotação</CardTitle>
                        <CardDescription>
                            Consulte o saldo disponível para empenho.
                        </CardDescription>
                    </CardHeader>
                    <form onSubmit={handleCheck}>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="ano">Exercício (Ano)</Label>
                                <Select
                                    value={formData.ano}
                                    onValueChange={(val) => handleInputChange("ano", val)}
                                >
                                    <SelectTrigger id="ano">
                                        <SelectValue placeholder="Selecione o ano" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2025">2025</SelectItem>
                                        <SelectItem value="2024">2024</SelectItem>
                                        <SelectItem value="2023">2023</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="unidade">Unidade Orçamentária</Label>
                                <Input
                                    id="unidade"
                                    placeholder="Ex: Secretaria de Saúde"
                                    value={formData.unidade}
                                    onChange={(e) => handleInputChange("unidade", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="elemento">Elemento de Despesa</Label>
                                <Input
                                    id="elemento"
                                    placeholder="Ex: 3.3.90.30 (Material de Consumo)"
                                    value={formData.elemento}
                                    onChange={(e) => handleInputChange("elemento", e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="valor">Valor Previsto (R$)</Label>
                                <Input
                                    id="valor"
                                    type="number"
                                    placeholder="0,00"
                                    value={formData.valor}
                                    onChange={(e) => handleInputChange("valor", e.target.value)}
                                />
                            </div>
                        </CardContent>
                        <CardFooter>
                            <Button type="submit" className="w-full gap-2" disabled={loading}>
                                {loading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <Search className="h-4 w-4" />
                                        Consultar Disponibilidade
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </form>
                </Card>

                <Card className={`shadow-elegant flex flex-col items-center justify-center p-6 border-2 border-dashed ${result === "success" ? "border-green-200 bg-green-50/50" :
                    result === "error" ? "border-red-200 bg-red-50/50" :
                        "border-border bg-accent/5"
                    }`}>
                    {!result && !loading && (
                        <div className="text-center space-y-4 text-muted-foreground opacity-60">
                            <div className="bg-background p-4 rounded-full inline-block shadow-sm">
                                <Search className="h-12 w-12" />
                            </div>
                            <div>
                                <h3 className="text-lg font-medium">Aguardando Consulta</h3>
                                <p className="text-sm">Preencha os dados ao lado para verificar a dotação.</p>
                            </div>
                        </div>
                    )}

                    {loading && (
                        <div className="text-center space-y-4">
                            <div className="flex justify-center">
                                <Loader2 className="h-12 w-12 animate-spin text-primary" />
                            </div>
                            <p className="text-muted-foreground animate-pulse">Conectando ao sistema de gestão...</p>
                        </div>
                    )}

                    {result === "success" && (
                        <div className="text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="bg-green-100 p-4 rounded-full inline-block shadow-sm">
                                <CheckCircle className="h-12 w-12 text-green-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-green-700">Aprovado</h3>
                                <p className="text-green-600 max-w-xs mx-auto">
                                    Existe saldo orçamentário suficiente na dotação informada para cobrir esta despesa.
                                </p>
                                <div className="pt-4">
                                    <div className="text-sm font-medium text-muted-foreground">Código de Autorização</div>
                                    <div className="font-mono bg-background border px-3 py-1 rounded text-xs mt-1">
                                        AUTH-{Math.random().toString(36).substring(2, 10).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {result === "error" && (
                        <div className="text-center space-y-4 animate-in zoom-in-95 duration-300">
                            <div className="bg-red-100 p-4 rounded-full inline-block shadow-sm">
                                <XCircle className="h-12 w-12 text-red-600" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-2xl font-bold text-red-700">Reprovado</h3>
                                <p className="text-red-600 max-w-xs mx-auto">
                                    O saldo atual é insuficiente para esta solicitação.
                                </p>
                                <div className="pt-4">
                                    <Button variant="outline" className="gap-2 border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800">
                                        Ver Detalhes do Orçamento
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </Card>
            </div>
        </div>
    );
}
