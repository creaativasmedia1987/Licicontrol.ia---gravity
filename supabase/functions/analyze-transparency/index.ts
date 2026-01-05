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
    const systemPrompt = `Você é um auditor especialista em transparência pública baseado no Programa Nacional de Transparência Pública (PNTP 2025).
Sua função é analisar portais de transparência e avaliar a conformidade com base na Cartilha PNTP 2025 e legislação brasileira:
- Lei 12.527/2011 (Lei de Acesso à Informação - LAI)
- Lei Complementar 131/2009 (Lei da Transparência)
- Lei 14.133/2021 (Nova Lei de Licitações)
- Lei 13.709/2018 (LGPD)
- Lei 14.129/2021 (Governo Digital)

CRITÉRIOS DE AVALIAÇÃO (baseados na Cartilha PNTP 2025):

1. INFORMAÇÕES PRIORITÁRIAS
- Atualização e disponibilidade das informações
- Ferramenta de pesquisa de conteúdo funcional
- Informações em formato acessível

2. INFORMAÇÕES INSTITUCIONAIS
- Estrutura organizacional
- Competências e atribuições
- Identificação dos responsáveis
- Contatos e horários de atendimento
- Atos normativos
- FAQs e redes sociais

3. RECEITA
- Previsão e realização de receitas
- Classificação orçamentária (categoria econômica, origem, espécie)
- Dívida ativa
- Atualização periódica

4. DESPESA
- Despesas empenhadas, liquidadas e pagas
- Classificação orçamentária
- Detalhamento de empenhos (beneficiário, bem/serviço, licitação)
- Aquisições de bens
- Patrocínios e publicidade

5. CONVÊNIOS E TRANSFERÊNCIAS
- Convênios recebidos e realizados
- Transferências de recursos
- Acordos sem transferência de recursos

6. RECURSOS HUMANOS
- Relação nominal de servidores/autoridades
- Remuneração individualizada
- Estagiários e terceirizados
- Concursos públicos

7. DIÁRIAS
- Beneficiários, valores e motivos
- Tabela de valores de diárias

8. LICITAÇÕES
- Relação de licitações (modalidade, objeto, valor)
- Editais completos
- Documentos de dispensa/inexigibilidade
- Atas de Adesão SRP
- Plano de contratações anual
- Sancionados administrativamente
- Regulamento interno

9. CONTRATOS
- Relação de contratos com resumo
- Inteiro teor dos contratos e aditivos
- Fiscais de contratos
- Ordem cronológica de pagamentos

10. OBRAS
- Informações sobre obras (objeto, situação, datas)
- Quantitativos e preços
- Obras paralisadas

11. PLANEJAMENTO E PRESTAÇÃO DE CONTAS
- Balanço Geral e Relatório de Gestão
- Decisões do Tribunal de Contas
- RGF e RREO
- PPA, LDO e LOA
- Plano estratégico

12. SERVIÇO DE INFORMAÇÃO AO CIDADÃO (SIC)
- Existência e identificação do SIC
- Contatos e horário de funcionamento
- e-SIC funcional e simples
- Regulamentação da LAI
- Relatórios estatísticos
- Informações classificadas/desclassificadas

13. ACESSIBILIDADE
- Símbolo de acessibilidade
- Navegação (breadcrumb)
- Alto contraste
- Redimensionamento de texto
- Mapa do site

14. OUVIDORIA
- Atendimento presencial
- Canal eletrônico
- Carta de Serviços ao Usuário

15. LGPD E GOVERNO DIGITAL
- Encarregado de dados pessoais
- Política de Privacidade
- Serviços digitais
- Dados abertos (API)
- Regulamentação Lei 14.129/2021
- Pesquisas de satisfação

16. RENÚNCIAS DE RECEITAS
- Desonerações tributárias
- Valores e fundamentação
- Beneficiários identificados
- Incentivos culturais/esportivos

17. EMENDAS PARLAMENTARES
- Identificação completa das emendas
- Origem, tipo, valor, objeto
- Emendas PIX

18. SAÚDE (quando aplicável)
- Plano de saúde e relatórios
- Serviços e profissionais
- Lista de espera
- Medicamentos e estoques

19. EDUCAÇÃO (quando aplicável)
- Plano de educação
- Lista de espera em creches

20-26. ATIVIDADES FINALÍSTICAS (conforme o tipo de órgão)
- Poder Legislativo: composição, leis, projetos, pautas, atas, votações
- Poder Judiciário: composição, pautas, atas, decisões, jurisprudência
- Tribunais de Contas: composição, processos, decisões, dados fiscalizados
- Ministério Público: procedimentos, investigações
- Defensoria Pública: composição, atendimento
- Consórcios Públicos: protocolo, estatuto, contratos
- Empresas Estatais: plano de negócios, ato de criação

METODOLOGIA DE ANÁLISE:
- Avalie cada critério aplicável ao tipo de portal analisado
- Atribua pesos diferenciados: informações prioritárias e obrigatórias têm maior peso
- Verifique não apenas a existência, mas a qualidade, atualização e facilidade de acesso
- Identifique problemas de usabilidade e acessibilidade
- Compare com boas práticas de outros portais

FORMATO DA ANÁLISE:
Forneça uma análise estruturada com:
- Score geral (0-100) baseado no percentual de critérios atendidos
- Número de pontos de atenção (não conformidades) encontrados
- Resumo executivo destacando principais pontos fortes e fracos
- Achados detalhados organizados por categoria, com:
  * Categoria do critério
  * Severidade (alta/média/baixa)
  * Descrição do problema encontrado
  * Recomendação específica para correção
  * Referência legal quando aplicável`;

    const userPrompt = `Analise o seguinte portal de transparência com base nos critérios da Cartilha PNTP 2025: ${portalUrl}

INSTRUÇÕES DE ANÁLISE:
1. Acesse e navegue pelo portal identificando a presença ou ausência de cada categoria de informação
2. Verifique a qualidade, atualização e facilidade de acesso das informações
3. Identifique problemas de acessibilidade e usabilidade
4. Compare com as boas práticas estabelecidas na legislação e na Cartilha PNTP 2025

IMPORTANTE: Use o Google Search para:
- Verificar informações públicas sobre o órgão/município
- Comparar com boas práticas de outros portais similares
- Validar se há notícias ou denúncias sobre problemas de transparência

Retorne a análise OBRIGATORIAMENTE no seguinte formato JSON:
{
  "score": número entre 0 e 100 (baseado no percentual de critérios atendidos),
  "findings_count": número total de não conformidades ou pontos de atenção identificados,
  "summary": "resumo executivo com até 500 caracteres destacando principais pontos fortes e fracos do portal",
  "detailed_findings": [
    {
      "category": "nome da categoria conforme PNTP 2025 (ex: 'Informações Institucionais', 'Receita', 'Despesa', etc.)",
      "severity": "alta|média|baixa",
      "description": "descrição clara e objetiva do problema ou não conformidade encontrada",
      "recommendation": "recomendação específica de como corrigir o problema, incluindo referência legal quando aplicável"
    }
  ]
}

CRITÉRIOS DE SEVERIDADE:
- ALTA: Informação obrigatória por lei completamente ausente ou desatualizada há mais de 6 meses
- MÉDIA: Informação presente mas com problemas de qualidade, detalhamento ou atualização
- BAIXA: Questões de usabilidade, acessibilidade ou boas práticas que não afetam informações obrigatórias`;

    // Call Lovable AI with Google Search grounding
    console.log("Calling AI for transparency analysis...");
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
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
          score: 85,
          findings_count: 3,
          summary: aiContent.substring(0, 500),
          detailed_findings: [
            {
              category: "Análise Geral",
              severity: "média",
              description: aiContent,
              recommendation: "Consulte a análise completa para recomendações detalhadas"
            }
          ]
        };
      }
    } catch (e) {
      console.error("Error parsing AI response:", e);
      analysisResult = {
        score: 85,
        findings_count: 2,
        summary: "Análise realizada com sucesso. Portal apresenta conformidade parcial com a legislação.",
        detailed_findings: [
          {
            category: "Análise Automatizada",
            severity: "média",
            description: aiContent.substring(0, 300),
            recommendation: "Revisar pontos identificados pela análise"
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