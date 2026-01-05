import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentType, prompt } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Define system prompts based on document type
    const systemPrompts: Record<string, string> = {
      edital: `Você é um especialista em direito administrativo brasileiro, especializado em licitações públicas.
Gere editais de licitação conforme a Lei 14.133/2021 (Nova Lei de Licitações) e normas complementares.
O documento deve ser formal, técnico e completo, incluindo:
- Preâmbulo com fundamentação legal
- Objeto da licitação detalhado
- Condições de participação
- Critérios de julgamento
- Prazos e cronograma
- Disposições gerais
Use linguagem jurídica apropriada e cite os artigos legais pertinentes.`,
      
      oficio: `Você é um especialista em redação oficial brasileira.
Gere ofícios formais seguindo o Manual de Redação da Presidência da República.
O documento deve incluir:
- Cabeçalho com identificação do órgão
- Numeração e data
- Vocativo apropriado
- Texto claro e objetivo
- Fecho formal (Atenciosamente/Respeitosamente)
- Assinatura e identificação
Use linguagem culta, formal e protocolar.`,
      
      analise: `Você é um auditor e especialista em controle interno e compliance.
Realize análises técnicas de processos licitatórios e documentos administrativos.
A análise deve incluir:
- Resumo executivo
- Conformidade legal (Lei 14.133/2021, Lei 8.666/93 quando aplicável)
- Identificação de riscos e irregularidades
- Recomendações e melhorias
- Conclusão fundamentada
Use linguagem técnica-jurídica e cite as normas aplicáveis.`
    };

    const systemPrompt = systemPrompts[documentType] || systemPrompts.analise;

    console.log(`Generating document of type: ${documentType}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Limite de requisições excedido. Tente novamente em alguns instantes." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Créditos insuficientes. Por favor, adicione créditos à sua conta." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      throw new Error(`AI gateway error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const generatedContent = data.choices[0].message.content;

    console.log("Document generated successfully");

    return new Response(
      JSON.stringify({ 
        success: true,
        content: generatedContent,
        documentType 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in generate-document function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Erro ao gerar documento" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});