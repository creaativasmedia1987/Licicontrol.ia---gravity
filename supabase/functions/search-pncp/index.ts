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
    const { searchTerm, startDate, endDate } = await req.json();

    if (!searchTerm || searchTerm.length < 3) {
      throw new Error('Termo de busca deve ter pelo menos 3 caracteres');
    }

    // Formatar datas para a API do PNCP
    const dataInicial = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const dataFinal = endDate || new Date().toISOString().split('T')[0];

    // URL da API do PNCP - Consulta de Contratações
    // Documentação: https://www.gov.br/pncp/pt-br/acesso-a-informacao/dados-abertos
    const pncpUrl = new URL('https://pncp.gov.br/api/consulta/v1/contratacoes/publicacao');
    pncpUrl.searchParams.set('dataInicial', dataInicial);
    pncpUrl.searchParams.set('dataFinal', dataFinal);
    pncpUrl.searchParams.set('codigoModalidadeContratacao', ''); // Todas modalidades
    pncpUrl.searchParams.set('pagina', '1');
    pncpUrl.searchParams.set('tamanhoPagina', '20');

    console.log('Consultando PNCP:', pncpUrl.toString());

    const response = await fetch(pncpUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('Erro na API PNCP:', response.status);
      // Retornar dados simulados caso a API esteja indisponível
      return new Response(
        JSON.stringify({ 
          results: getMockResults(searchTerm, dataInicial, dataFinal),
          source: 'mock',
          message: 'API PNCP indisponível. Exibindo dados de demonstração.'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    
    // Filtrar resultados pelo termo de busca
    const filteredResults = (data.data || [])
      .filter((item: any) => 
        item.objetoCompra?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.orgaoEntidade?.razaoSocial?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .slice(0, 20)
      .map((item: any) => ({
        id: item.numeroControlePNCP || item.id,
        objeto: item.objetoCompra || 'Objeto não especificado',
        modalidade: getModalidadeNome(item.codigoModalidadeContratacao),
        valorEstimado: item.valorTotalEstimado || 0,
        dataPublicacao: item.dataPublicacaoPncp,
        dataAbertura: item.dataAberturaProposta,
        orgaoResponsavel: item.orgaoEntidade?.razaoSocial || 'Órgão não identificado',
        criterioJulgamento: item.tipoCriterioJulgamento || 'Menor Preço',
        cnpj: item.orgaoEntidade?.cnpj,
        uf: item.unidadeOrgao?.ufSigla || item.orgaoEntidade?.ufSigla,
        linkSistemaOrigem: item.linkSistemaOrigem,
        dadosCompletos: JSON.stringify(item)
      }));

    return new Response(
      JSON.stringify({ 
        results: filteredResults,
        source: 'pncp',
        total: data.totalRegistros || filteredResults.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função search-pncp:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function getModalidadeNome(codigo: string | number): string {
  const modalidades: Record<string, string> = {
    '1': 'Leilão - Eletrônico',
    '2': 'Diálogo Competitivo',
    '3': 'Concurso',
    '4': 'Concorrência - Eletrônica',
    '5': 'Concorrência - Presencial',
    '6': 'Pregão - Eletrônico',
    '7': 'Pregão - Presencial',
    '8': 'Dispensa de Licitação',
    '9': 'Inexigibilidade',
    '10': 'Manifestação de Interesse',
    '11': 'Pré-qualificação',
    '12': 'Credenciamento',
    '13': 'Leilão - Presencial',
  };
  return modalidades[String(codigo)] || `Modalidade ${codigo}`;
}

function getMockResults(searchTerm: string, startDate: string, endDate: string) {
  return [
    {
      id: 'PNCP-2024-001',
      objeto: `Contratação de serviços de tecnologia da informação - ${searchTerm}`,
      modalidade: 'Pregão - Eletrônico',
      valorEstimado: 850000.00,
      dataPublicacao: startDate,
      dataAbertura: endDate,
      orgaoResponsavel: 'Secretaria de Administração Municipal',
      criterioJulgamento: 'Menor Preço',
      cnpj: '00.000.000/0001-00',
      uf: 'SP',
      linkSistemaOrigem: 'https://www.gov.br/pncp',
      dadosCompletos: '{}'
    },
    {
      id: 'PNCP-2024-002',
      objeto: `Aquisição de equipamentos de informática - ${searchTerm}`,
      modalidade: 'Concorrência - Eletrônica',
      valorEstimado: 2100000.00,
      dataPublicacao: startDate,
      dataAbertura: endDate,
      orgaoResponsavel: 'Secretaria de Educação',
      criterioJulgamento: 'Melhor Técnica e Preço',
      cnpj: '00.000.000/0002-00',
      uf: 'RJ',
      linkSistemaOrigem: 'https://www.gov.br/pncp',
      dadosCompletos: '{}'
    },
    {
      id: 'PNCP-2024-003',
      objeto: `Serviços de consultoria especializada - ${searchTerm}`,
      modalidade: 'Pregão - Eletrônico',
      valorEstimado: 450000.00,
      dataPublicacao: startDate,
      dataAbertura: endDate,
      orgaoResponsavel: 'Prefeitura Municipal',
      criterioJulgamento: 'Menor Preço',
      cnpj: '00.000.000/0003-00',
      uf: 'MG',
      linkSistemaOrigem: 'https://www.gov.br/pncp',
      dadosCompletos: '{}'
    }
  ];
}
