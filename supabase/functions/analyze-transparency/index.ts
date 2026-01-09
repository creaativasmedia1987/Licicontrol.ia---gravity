import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { portalUrl } = await req.json();
    console.log("Analyzing transparency portal:", portalUrl);

    if (!portalUrl) {
      return new Response(
        JSON.stringify({ error: "Portal URL is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "AI service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // System prompt for transparency analysis based on PNTP 2025 Cartilha
    const systemPrompt = `Você é um auditor rigoroso da Atricon, especialista no Programa Nacional de Transparência Pública (PNTP 2025).
Sua missão é realizar uma auditoria fidedigna do portal de transparência e emitir um selo de qualidade (Prata, Ouro ou Diamante).

REGRAS DE OURO DA AUDITORIA (CRÍTICO):
1. SEJA RIGOROSO: Não atribua scores altos (acima de 80) se houver falhas em itens essenciais como Receita, Despesa ou Licitações.
2. CRITÉRIOS ESSENCIAIS (Peso Máximo): 
   - Receita Arrecadada em tempo real (D+1).
   - Despesa detalhada (Empenho, Liquidação, Pagamento) com favorecido e CPF/CNPJ.
   - Íntegra de Editais e Contratos.
   - Folha de Pagamento nominal individualizada.
   - SIC e e-SIC funcionais.
3. PENALIDADES: Se um item essencial estiver ausente ou desatualizado, o score deve cair drasticamente. Um portal com falhas graves em Despesas jamais deve passar de 50% (Prata).
4. QUALIDADE DOS DADOS: Verifique se os arquivos são legíveis (texto, não imagem) e se os links funcionam.

METODOLOGIA DE PONTUAÇÃO:
- 100-80: Diamante (Apenas se quase impecável, sem falhas essenciais).
- 79-50: Ouro (Conformidade boa, mas com alguns pontos de atenção em transparência ativa).
- 49-0: Prata (Nível básico de transparência ou falhas em itens essenciais).

FORMATO DA ANÁLISE (JSON):
{
  "score": número (0-100),
  "findings_count": número,
  "summary": "Resumo executivo destacando por que o portal recebeu esta nota e o que impede um selo superior.",
  "detailed_findings": [
    {
      "category": "Categoria (ex: Despesa, Receita)",
      "severity": "ALTA|MÉDIA|BAIXA",
      "description": "Detalhe o problema e por que ele fere a regra da Atricon.",
      "recommendation": "O que o portal deve fazer para corrigir."
    }
  ]
}`;

    const userPrompt = `Realize uma auditoria completa no portal: ${portalUrl}
Use o Google Search para validar:
1. A existência de seções obrigatórias (Receitas, Despesas, Licitações, RH).
2. A data da última atualização.
3. A funcionalidade do e-SIC.

Se houver muitos arquivos corrompidos, links quebrados ou falta de transparência em áreas críticas (como o caso de Carira mencionado anteriormente), reduza a nota severamente para refletir a realidade. Queremos uma nota fidedigna aos padrões Atricon.`;

    // Call Lovable AI with Google Search grounding
    console.log("Calling AI for transparency analysis...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // model: "google/gemini-2.0-flash-exp",
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{ google_search: {} }], // Enable grounding with Google Search
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errorText);

      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required. Please add credits to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: "AI analysis failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    console.log("AI analysis completed successfully");

    const aiContent = aiData.choices?.[0]?.message?.content || "";

    // Parse the AI response
    let analysisResult;
    try {
      // Try to extract JSON from the response
      const jsonMatch = aiContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisResult = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback if no JSON found
        analysisResult = {
          score: 45,
          findings_count: 5,
          summary: "Falha ao processar análise detalhada. Score conservador atribuído.",
          detailed_findings: [
            {
              category: "Análise Técnica",
              severity: "alta",
              description: "O sistema não conseguiu processar o formato de resposta da auditoria.",
              recommendation: "Tente realizar a análise novamente."
            }
          ]
        };
      }
    } catch (e) {
      console.error("Error parsing AI response:", e);
      analysisResult = {
        score: 45,
        findings_count: 3,
        summary: "Erro no processamento da análise. Score reduzido para segurança.",
        detailed_findings: [
          {
            category: "Sistema",
            severity: "média",
            description: "Houve um erro no processamento dos dados da IA.",
            recommendation: "Solicite nova análise."
          }
        ]
      };
    }

    // Get user from authorization header
    const authHeader = req.headers.get("authorization");
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("Authentication error:", userError);
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Save analysis to database
    console.log("Saving analysis to database...");
    const { data: report, error: dbError } = await supabaseClient
      .from("transparency_reports")
      .insert({
        user_id: user.id,
        portal_url: portalUrl,
        score: analysisResult.score,
        findings_count: analysisResult.findings_count,
        analysis_summary: analysisResult.summary,
        detailed_findings: analysisResult.detailed_findings,
        status: "completed",
      })
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to save analysis" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Analysis saved successfully:", report.id);

    return new Response(
      JSON.stringify({
        success: true,
        report,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});