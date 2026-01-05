import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Save, Upload, Loader2 } from "lucide-react";

export default function Configuracoes() {
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [orgName, setOrgName] = useState("");
    const [orgState, setOrgState] = useState("");
    const [logoData, setLogoData] = useState<string | null>(null);
    const { toast } = useToast();

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const { data, error } = await supabase
                .from('organization_settings' as any)
                .select('*')
                .limit(1)
                .single();

            if (error && error.code !== 'PGRST116') throw error;

            const config = data as any;
            if (config) {
                setOrgName(config.org_name || "");
                setOrgState(config.state || "");
                setLogoData(config.logo_data || null);
            }
        } catch (error) {
            console.error("Error loading settings:", error);
            toast({
                title: "Erro ao carregar",
                description: "Não foi possível carregar as configurações.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            if (file.size > 1024 * 1024 * 2) { // 2MB limit
                toast({
                    title: "Arquivo muito grande",
                    description: "A imagem deve ter no máximo 2MB.",
                    variant: "destructive",
                });
                return;
            }

            const reader = new FileReader();
            reader.onloadend = () => {
                setLogoData(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Check if row exists
            const { data: existing } = await supabase
                .from('organization_settings' as any)
                .select('id')
                .limit(1)
                .maybeSingle();

            const payload = {
                org_name: orgName,
                state: orgState,
                logo_data: logoData,
                updated_at: new Date().toISOString()
            };

            let error;
            const existingRecord = existing as any;
            if (existingRecord) {
                const { error: updateError } = await supabase
                    .from('organization_settings' as any)
                    .update(payload)
                    .eq('id', existingRecord.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('organization_settings' as any)
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast({
                title: "Sucesso",
                description: "Configurações salvas com sucesso!",
            });

            // Force a reload to update the header/sidebar immediately context if we had one, 
            // but for now we might need to rely on the user navigating or a simple window reload if we don't have a context.
            // Or simply let the user see the change on next nav.
            // Ideally we would update a global context. Let's trigger a custom event or just let it be.
            window.dispatchEvent(new Event('org-settings-updated'));

        } catch (error: any) {
            console.error("Error saving settings:", error);
            toast({
                title: "Erro ao salvar",
                description: error.message || "Falha ao salvar configurações.",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
                    <Building2 className="h-8 w-8" />
                    Configurações do Órgão
                </h1>
                <p className="text-muted-foreground mt-2">
                    Gerencie a identidade visual e dados da organização.
                </p>
            </div>

            <Card className="shadow-elegant max-w-2xl">
                <CardHeader>
                    <CardTitle>Identidade Corporativa</CardTitle>
                    <CardDescription>
                        Essas informações aparecerão no cabeçalho e nos documentos gerados.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="orgName">Nome do Órgão / Prefeitura</Label>
                        <Input
                            id="orgName"
                            placeholder="Ex: Prefeitura Municipal de Exemplo"
                            value={orgName}
                            onChange={(e) => setOrgName(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="orgState">Estado / UF</Label>
                        <Input
                            id="orgState"
                            placeholder="Ex: Minas Gerais"
                            value={orgState}
                            onChange={(e) => setOrgState(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Logomarca (Brasão)</Label>
                        <div className="flex items-center gap-6">
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer w-40 h-40 relative">
                                <Input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleLogoChange}
                                />
                                {logoData ? (
                                    <img src={logoData} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                                ) : (
                                    <>
                                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                        <span className="text-xs text-gray-500 text-center">Clique para enviar</span>
                                    </>
                                )}
                            </div>
                            <div className="text-sm text-muted-foreground flex-1">
                                <p>Recomendado: PNG ou JPG com fundo transparente.</p>
                                <p>Tamanho máximo: 2MB.</p>
                                {logoData && (
                                    <Button variant="outline" size="sm" className="mt-2" onClick={() => setLogoData(null)}>
                                        Remover Logo
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>
                </CardContent>
                <CardFooter className="justify-end">
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Salvando...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Salvar Configurações
                            </>
                        )}
                    </Button>
                </CardFooter>
            </Card>
        </div>
    );
}
