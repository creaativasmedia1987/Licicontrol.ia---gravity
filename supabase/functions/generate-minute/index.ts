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
    const { processId, templateType } = await req.json();
    
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

    // Definir prompts específicos por tipo de documento
    let systemPrompt = '';
    let userPrompt = '';

    switch (templateType) {
      case 'edital':
        systemPrompt = 'Você é um especialista em elaboração de editais de licitação conforme a Lei Federal 14.133/2021. Gere editais completos, detalhados e juridicamente corretos.';
        userPrompt = `
Gere uma MINUTA DE EDITAL completa para o seguinte processo licitatório:

DADOS DO PROCESSO:
- Número do Processo: ${process.process_number}
- Objeto: ${process.object}
- Valor Estimado: R$ ${process.estimated_value?.toLocaleString('pt-BR')}
- Modalidade: ${process.modality}
- Departamento: ${process.department}
- Dotação Orçamentária: ${process.budget_allocation || 'A definir'}
- Data de Abertura Prevista: ${process.opening_date || 'A definir'}

O edital deve incluir:
1. Preâmbulo (identificação do órgão, modalidade, número)
2. Objeto detalhado
3. Condições de participação
4. Documentação de habilitação
5. Proposta de preços
6. Critérios de julgamento
7. Condições de pagamento
8. Prazos e entregas
9. Sanções administrativas
10. Disposições finais

Siga rigorosamente a Lei 14.133/2021 e inclua todos os artigos legais aplicáveis.
`;
        break;

      case 'termo_referencia':
        systemPrompt = 'Você é um especialista em elaboração de Termos de Referência para licitações públicas conforme a Lei 14.133/2021.';
        userPrompt = `
Gere um TERMO DE REFERÊNCIA completo para:

DADOS DO PROCESSO:
- Objeto: ${process.object}
- Valor Estimado: R$ ${process.estimated_value?.toLocaleString('pt-BR')}
- Departamento: ${process.department}
- Modalidade: ${process.modality}

O Termo de Referência deve conter:
1. Definição do objeto
2. Justificativa da contratação
3. Descrição detalhada dos produtos/serviços
4. Especificações técnicas
5. Quantitativos
6. Local e prazo de entrega
7. Condições de recebimento
8. Obrigações do contratado
9. Obrigações do contratante
10. Critérios de aceitabilidade
11. Garantias exigidas
12. Estimativa de preços (pesquisa de mercado)

Base legal: Lei 14.133/2021, Art. 6º, inciso XXIII.
`;
        break;

      case 'contrato':
        systemPrompt = 'Você é um especialista em elaboração de minutas de contratos administrativos conforme a Lei 14.133/2021.';
        userPrompt = `
Gere uma MINUTA DE CONTRATO para:

DADOS DO PROCESSO:
- Processo Nº: ${process.process_number}
- Objeto: ${process.object}
- Valor Total: R$ ${process.estimated_value?.toLocaleString('pt-BR')}
- Modalidade: ${process.modality}
- Dotação Orçamentária: ${process.budget_allocation || 'A definir'}

A minuta deve incluir:
1. Qualificação das partes (CONTRATANTE e CONTRATADA)
2. Fundamentação legal
3. Objeto do contrato
4. Vigência e prazos
5. Valor e forma de pagamento
6. Obrigações do contratado
7. Obrigações do contratante
8. Fiscalização
9. Alterações contratuais
10. Penalidades e multas
11. Rescisão
12. Garantia contratual
13. Publicação
14. Foro
15. Disposições finais

Conforme Lei 14.133/2021 e demais normas aplicáveis.
`;
        break;

      default:
        throw new Error('Tipo de template inválido');
    }

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
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Erro na API Lovable AI:', aiResponse.status, errorText);
      throw new Error(`Erro ao gerar minuta: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const generatedContent = aiData.choices[0].message.content;

    console.log('Minuta gerada com sucesso para processo:', processId);

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        templateType,
        processNumber: process.process_number
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função generate-minute:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});