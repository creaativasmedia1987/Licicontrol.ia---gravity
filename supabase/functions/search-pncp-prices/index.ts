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

    console.log(`Buscando cotações PNCP para: ${searchTerm}, período: ${startDate} - ${endDate}`);

    // TODO: Integrar com API real do PNCP para preços
    // Por enquanto, retorna dados simulados baseados no termo de busca

    const mockQuotations = [
      {
        id: `PNCP-PRICE-${Date.now()}-1`,
        itemDescription: `${searchTerm} - Fornecedor A (Pregão Eletrônico)`,
        unitPrice: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        source: "Pregão Eletrônico 001/2025",
        orgao: "Secretaria de Administração - SP",
        date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: Math.floor(Math.random() * 100) + 10,
        unidade: "UN"
      },
      {
        id: `PNCP-PRICE-${Date.now()}-2`,
        itemDescription: `${searchTerm} - Fornecedor B (Dispensa de Licitação)`,
        unitPrice: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        source: "Dispensa 010/2025",
        orgao: "Prefeitura Municipal de Campinas - SP",
        date: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: Math.floor(Math.random() * 50) + 5,
        unidade: "UN"
      },
      {
        id: `PNCP-PRICE-${Date.now()}-3`,
        itemDescription: `${searchTerm} - Fornecedor C (SRP)`,
        unitPrice: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        source: "Ata SRP 005/2025",
        orgao: "Tribunal de Justiça - MG",
        date: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: Math.floor(Math.random() * 200) + 20,
        unidade: "UN"
      },
      {
        id: `PNCP-PRICE-${Date.now()}-4`,
        itemDescription: `${searchTerm} - Fornecedor D (Concorrência)`,
        unitPrice: parseFloat((Math.random() * 200 + 100).toFixed(2)),
        source: "Concorrência 002/2025",
        orgao: "Universidade Federal - RJ",
        date: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantity: Math.floor(Math.random() * 150) + 25,
        unidade: "UN"
      }
    ];

    // Filtrar por data se fornecidas
    let filteredQuotations = mockQuotations;
    if (startDate || endDate) {
      filteredQuotations = mockQuotations.filter(q => {
        const qDate = new Date(q.date);
        const start = startDate ? new Date(startDate) : new Date(0);
        const end = endDate ? new Date(endDate) : new Date(8640000000000000);
        return qDate >= start && qDate <= end;
      });
    }

    // Calcular média
    const averagePrice = filteredQuotations.length > 0 
      ? filteredQuotations.reduce((sum, q) => sum + q.unitPrice, 0) / filteredQuotations.length 
      : 0;

    console.log(`Encontradas ${filteredQuotations.length} cotações. Média: R$ ${averagePrice.toFixed(2)}`);

    return new Response(
      JSON.stringify({ 
        quotations: filteredQuotations,
        averagePrice: parseFloat(averagePrice.toFixed(2)),
        count: filteredQuotations.length,
        source: 'mock',
        message: 'Dados de demonstração - Integração PNCP em desenvolvimento'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Erro na função search-pncp-prices:', error);
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
