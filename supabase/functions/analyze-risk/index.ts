import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { processId } = await req.json();
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Buscar dados do processo
    const { data: process, error: processError } = await supabaseClient
      .from('licitation_processes')
      .select('*')
      .eq('id', processId)
      .single();

    if (processError || !process) {
      throw new Error('Processo não encontrado');
    }

    // Verificar se já existe análise para este processo
    const { data: existingAnalysis } = await supabaseClient
      .from('risk_analysis')
      .select('*')
      .eq('process_id', processId)
      .maybeSingle();

    if (existingAnalysis) {
      return new Response(
        JSON.stringify({ analysis: existingAnalysis, message: 'Análise já existe' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Preparar contexto para análise
    const analysisContext = `
Analise o seguinte processo de licitação e determine o nível de risco:

DADOS DO PROCESSO:
- Número: ${process.process_number}
- Objeto: ${process.object}
- Valor Estimado: R$ ${process.estimated_value?.toLocaleString('pt-BR')}
- Modalidade: ${process.modality}
- Departamento: ${process.department}
- Status: ${process.status}
- Data de Publicação: ${process.publication_date || 'Não definida'}
- Data de Abertura: ${process.opening_date || 'Não definida'}
- Estudo Técnico Anexado: ${process.technical_study_attached ? 'Sim' : 'Não'}
- Termo de Referência Anexado: ${process.reference_term_attached ? 'Sim' : 'Não'}
- Histórico do Fornecedor: ${JSON.stringify(process.supplier_history || {})}

CRITÉRIOS DE RISCO (Lei 14.133/2021):

ALTO RISCO:
- Valor acima de R$ 1.000.000 E modalidade Dispensa/Inexigibilidade
- Estudo Técnico faltando para processos acima de R$ 500.000
- Fornecedor com mais de 2 multas ou inexecuções graves
- Data de abertura antes do prazo mínimo legal de publicação
- Mais de 5 dispensas/inexigibilidades no departamento nos últimos 12 meses

MÉDIO RISCO:
- Valor entre R$ 200.000 e R$ 1.000.000
- Documentação incompleta (Termo de Referência faltando)
- Fornecedor com 1-2 multas leves
- Prazo de publicação apertado

BAIXO RISCO:
- Valor abaixo de R$ 200.000
- Modalidade Pregão com documentação completa
- Fornecedor sem histórico negativo
- Prazos adequados

Forneça uma análise em formato JSON com:
{
  "risk_level": "baixo" | "medio" | "alto" | "critico",
  "risk_score": 0-100,
  "risk_factors": [
    {
      "factor": "Nome do fator",
      "severity": "baixa" | "media" | "alta",
      "description": "Descrição do problema"
    }
  ],
  "recommendations": "Recomendações para mitigar os riscos identificados",
  "checklist": {
    "documentosObrigatorios": [
      { "item": "Nome do documento obrigatório", "status": "OK" | "FALTA" | "REVISAR" }
    ],
    "clausulasArriscadas": [
      { "item": "Cláusula ou ponto de atenção", "status": "OK" | "RISCO ALTO" | "ATENÇÃO" }
    ],
    "juridicoContabil": [
      { "item": "Item do checklist jurídico/contábil", "status": "OK" | "PENDENTE" | "INCONFORMIDADE" }
    ]
  }
}

REGRAS DO CHECKLIST:
- documentosObrigatorios: Verificar Estudo Técnico Preliminar, Termo de Referência, Pesquisa de Preços, Parecer Jurídico, Dotação Orçamentária
- clausulasArriscadas: Verificar Garantia de Proposta, Prazo de Execução, Penalidades, Subcontratação, Reajuste
- juridicoContabil: Verificar Adequação Orçamentária, Conformidade Lei 14.133, Regularidade Fiscal, Publicação em Tempo Hábil
- Mínimo 4 itens em cada seção
`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY não configurada');
    }

    // Chamar Lovable AI (Gemini)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Você é um especialista em análise de riscos de processos licitatórios brasileiros, com conhecimento da Lei 14.133/2021.'
          },
          {
            role: 'user',
            content: analysisContext
          }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error(`Erro ao processar análise de risco: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const analysisResult = JSON.parse(
      aiData.choices[0].message.content.replace(/```json\n?|\n?```/g, '').trim()
    );

    // Combinar risk_factors com checklist para salvar juntos
    const combinedRiskFactors = {
      factors: analysisResult.risk_factors || [],
      checklist: analysisResult.checklist || null
    };

    // Salvar análise no banco
    const { data: savedAnalysis, error: saveError } = await supabaseClient
      .from('risk_analysis')
      .insert({
        process_id: processId,
        user_id: process.user_id,
        risk_level: analysisResult.risk_level,
        risk_score: analysisResult.risk_score,
        risk_factors: combinedRiskFactors,
        recommendations: analysisResult.recommendations,
      })
      .select()
      .single();

    if (saveError) {
      console.error('Erro ao salvar análise:', saveError);
      throw saveError;
    }

    console.log('Análise de risco criada com sucesso:', savedAnalysis.id);

    return new Response(
      JSON.stringify({ analysis: savedAnalysis }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função analyze-risk:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});