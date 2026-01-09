import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/dotenv@v3.2.0/load.ts";

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const { messages } = await req.json();

        const systemPrompt = `Você é a Assistente IA da Licicontrol, especialista em Licitações, Contratos e Controle Interno na Gestão Pública Brasileira (especialmente sob a Lei 14.133/2021).
Sua missão é ajudar os usuários a:
1. Navegar e usar o sistema Licicontrol.
2. Esclarecer dúvidas jurídicas e técnicas sobre licitações e controle interno.

FAQ DO SISTEMA LICICONTROL:
- **Painel de Controle (Dashboard)**: Visão geral de KPIs, alertas de prazos e resumo de riscos.
- **Repositório de Documentos (Arquivos)**: Local para armazenar e buscar documentos com IA.
- **Geração de Documentos**: Criação de documentos oficiais (ofícios, memorandos) via IA.
- **Análise de Transparência**: Auditoria automatizada de portais (PNTP/Atricon) com selos de qualidade.
- **Gestão de Controle Interno**:
    - **Matriz de Risco**: Identificação e mitigação de riscos em processos licitatórios.
    - **Análise de Impugnação**: IA que analisa editais e peças jurídicas de impugnação.
- **Pesquisa de Preços (PNCP)**: Busca automatizada de preços no Portal Nacional de Contratações Públicas.
- **Sign / Formalização**: Módulo para assinaturas e fluxos de formalização.
- **Minutas PNCP**: Geração de minutas padrão baseadas nas orientações da AGU/PNCP.

DIRETRIZES DE RESPOSTA:
- Seja profissional, técnico e prestativo.
- Use terminologia jurídica adequada (ex: ETP, TR, Edital, Homologação).
- Se não souber algo sobre o sistema, sugira que o usuário procure o suporte técnico.
- Mantenha as respostas concisas e use formatação Markdown para facilitar a leitura.`;

        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${LOVABLE_API_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "google/gemini-2.0-flash",
                messages: [
                    { role: "system", content: systemPrompt },
                    ...messages
                ],
            }),
        });

        const data = await response.json();
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});
