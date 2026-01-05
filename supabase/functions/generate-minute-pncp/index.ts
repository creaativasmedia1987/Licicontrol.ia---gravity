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
    const { pncpData, templateType } = await req.json();

    if (!pncpData) {
      throw new Error('Dados do PNCP não fornecidos');
    }

    // Definir prompts específicos por tipo de documento
    let systemPrompt = '';
    let userPrompt = '';

    const formatCurrency = (value: number) => {
      return new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL' 
      }).format(value || 0);
    };

    switch (templateType) {
      case 'edital':
        systemPrompt = `Você é um especialista em elaboração de editais de licitação conforme a Lei Federal 14.133/2021 (Nova Lei de Licitações e Contratos Administrativos). 
Gere editais completos, detalhados e juridicamente corretos, utilizando como referência os dados do Portal Nacional de Contratações Públicas (PNCP).`;
        userPrompt = `
Gere uma MINUTA DE EDITAL completa baseada no seguinte edital de referência do PNCP:

DADOS DO EDITAL DE REFERÊNCIA:
- ID PNCP: ${pncpData.id}
- Objeto: ${pncpData.objeto}
- Valor Estimado: ${formatCurrency(pncpData.valorEstimado)}
- Modalidade: ${pncpData.modalidade}
- Órgão Responsável: ${pncpData.orgaoResponsavel}
- Critério de Julgamento: ${pncpData.criterioJulgamento}
- Data de Publicação: ${pncpData.dataPublicacao || 'N/A'}
- Data de Abertura: ${pncpData.dataAbertura || 'N/A'}
- UF: ${pncpData.uf || 'N/A'}

O edital deve incluir:
1. PREÂMBULO - Identificação do órgão, modalidade, número do processo, fundamentação legal
2. OBJETO - Descrição detalhada baseada no edital de referência
3. CONDIÇÕES DE PARTICIPAÇÃO - Requisitos para empresas participantes
4. DOCUMENTAÇÃO DE HABILITAÇÃO - Habilitação jurídica, técnica, econômico-financeira
5. PROPOSTA DE PREÇOS - Formato e requisitos da proposta
6. CRITÉRIOS DE JULGAMENTO - Baseado no critério do edital de referência
7. SESSÃO PÚBLICA - Procedimentos da sessão
8. RECURSOS ADMINISTRATIVOS - Prazos e procedimentos
9. CONDIÇÕES DE CONTRATAÇÃO - Formalização e vigência
10. PAGAMENTO - Condições e prazos
11. SANÇÕES ADMINISTRATIVAS - Penalidades aplicáveis
12. DISPOSIÇÕES FINAIS - Esclarecimentos, impugnações, foro

Siga rigorosamente a Lei 14.133/2021 e inclua todos os artigos legais aplicáveis.
Adapte os valores e especificações conforme o edital de referência.
`;
        break;

      case 'termo_referencia':
        systemPrompt = `Você é um especialista em elaboração de Termos de Referência para licitações públicas conforme a Lei 14.133/2021.
Gere Termos de Referência completos e tecnicamente detalhados.`;
        userPrompt = `
Gere um TERMO DE REFERÊNCIA completo baseado no seguinte edital do PNCP:

DADOS DE REFERÊNCIA:
- Objeto: ${pncpData.objeto}
- Valor Estimado: ${formatCurrency(pncpData.valorEstimado)}
- Modalidade: ${pncpData.modalidade}
- Órgão: ${pncpData.orgaoResponsavel}

O Termo de Referência deve conter:
1. DEFINIÇÃO DO OBJETO - Descrição clara e precisa
2. JUSTIFICATIVA DA CONTRATAÇÃO - Motivação e necessidade
3. DESCRIÇÃO DETALHADA - Especificações técnicas completas
4. QUANTITATIVOS - Estimativas baseadas no valor de referência
5. LOCAL E PRAZO DE ENTREGA/EXECUÇÃO
6. CONDIÇÕES DE RECEBIMENTO - Provisório e definitivo
7. OBRIGAÇÕES DO CONTRATADO
8. OBRIGAÇÕES DO CONTRATANTE
9. CRITÉRIOS DE ACEITABILIDADE - Padrões de qualidade
10. GARANTIAS EXIGIDAS - Se aplicável
11. ESTIMATIVA DE PREÇOS - Pesquisa de mercado
12. CRITÉRIOS DE SUSTENTABILIDADE - Conforme legislação vigente

Base legal: Lei 14.133/2021, Art. 6º, inciso XXIII.
`;
        break;

      case 'contrato':
        systemPrompt = `Você é um especialista em elaboração de minutas de contratos administrativos conforme a Lei 14.133/2021.
Gere minutas de contrato completas e juridicamente válidas.`;
        userPrompt = `
Gere uma MINUTA DE CONTRATO baseada no seguinte edital do PNCP:

DADOS DE REFERÊNCIA:
- Objeto: ${pncpData.objeto}
- Valor Total Estimado: ${formatCurrency(pncpData.valorEstimado)}
- Modalidade: ${pncpData.modalidade}
- Órgão Contratante: ${pncpData.orgaoResponsavel}

A minuta deve incluir:
1. QUALIFICAÇÃO DAS PARTES - CONTRATANTE (órgão) e CONTRATADA (a definir)
2. FUNDAMENTAÇÃO LEGAL - Lei 14.133/2021 e demais normas
3. OBJETO DO CONTRATO - Detalhamento conforme edital
4. VIGÊNCIA E PRAZOS - Início, duração, possibilidade de prorrogação
5. VALOR E FORMA DE PAGAMENTO - Preço, cronograma, reajuste
6. OBRIGAÇÕES DO CONTRATADO - Deveres da empresa
7. OBRIGAÇÕES DO CONTRATANTE - Deveres do órgão
8. FISCALIZAÇÃO - Designação de fiscal e atribuições
9. ALTERAÇÕES CONTRATUAIS - Hipóteses e limites (Art. 124 e 125)
10. PENALIDADES E MULTAS - Advertência, multa, suspensão, declaração de inidoneidade
11. RESCISÃO - Hipóteses e procedimentos
12. GARANTIA CONTRATUAL - Se exigida
13. PUBLICAÇÃO - Forma e prazo
14. FORO - Jurisdição competente
15. DISPOSIÇÕES FINAIS

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

    console.log('Minuta PNCP gerada com sucesso para:', pncpData.id);

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        templateType,
        pncpId: pncpData.id,
        objeto: pncpData.objeto
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função generate-minute-pncp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
