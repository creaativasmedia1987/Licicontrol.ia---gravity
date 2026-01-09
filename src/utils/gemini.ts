import { GoogleGenerativeAI } from "@google/generative-ai";

const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000;

export interface GeneratedDocument {
    text: string;
    sources: { uri: string; title: string }[];
}

/**
 * Obtém o modelo Gemini configurado.
 * Usa gemini-2.5-flash como padrão por ser rápido e eficiente.
 */
function getGeminiModel() {
    // Legacy support or sync calls can't use async resolution easily without top-level await or refactor.
    // We will keep this for simple cases but prefer the async resolution below.
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) throw new Error("API Key missing");
    const genAI = new GoogleGenerativeAI(apiKey);
    return genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
}

// Cache do modelo resolvido para evitar múltiplos fetches
let cachedModelName: string | null = null;

async function resolveWorkingModel(genAI: GoogleGenerativeAI): Promise<any> {
    if (cachedModelName) {
        return genAI.getGenerativeModel({ model: cachedModelName });
    }

    const priorityList = [
        "gemini-2.0-flash",
        "gemini-2.0-flash-exp",
        "gemini-1.5-flash-latest",
        "gemini-1.5-pro-latest",
        "gemini-flash-latest",
        "gemini-pro-latest",
        "gemini-1.5-flash-001",
        "gemini-1.5-pro-001",
        "gemini-1.5-flash",
        "gemini-1.5-pro",
        "gemini-1.0-pro",
        "gemini-pro"
    ];

    try {
        const available = await checkAvailableModels();
        // Log all available models for debugging
        console.log("FULL Model List available:", JSON.stringify(available));

        // Tenta encontrar o primeiro da lista de prioridade que existe na disponivel
        const bestMatch = priorityList.find(candidate =>
            available.some(avail => avail === candidate || avail.includes(candidate))
        );

        if (bestMatch) {
            console.log(`Modelo selecionado automaticamente: ${bestMatch}`);
            cachedModelName = bestMatch;
            return genAI.getGenerativeModel({ model: bestMatch });
        }

        // Fallback: try to find ANYTHING that looks like a generative model, excluding embeddings if possible (though some might be chat)
        // Usually models start with "gemini"
        const whatever = available.find(a => a.startsWith("gemini") && !a.includes("embedding"));
        if (whatever) {
            console.log(`Fallback para modelo genérico: ${whatever}`);
            cachedModelName = whatever;
            return genAI.getGenerativeModel({ model: whatever });
        }

    } catch (e) {
        console.error("Falha ao resolver modelo dinamicamente", e);
    }


    // Fallback final
    return genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

export async function checkAvailableModels(): Promise<string[]> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) return [];
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        if (data.error) {
            console.error("API Error listing models:", data.error);
            return [];
        }
        return data.models?.map((m: any) => m.name.replace('models/', '')) || [];
    } catch (e) {
        console.error("Network error listing models", e);
        return [];
    }
}

/**
 * Gera as instruções do sistema específicas para cada tipo de documento.
 */
function getSystemInstruction(docType: string): string {
    const baseInstruction = "Você é um Analista Jurídico e Técnico, especialista em Compras Públicas Brasileiras, focado estritamente na Lei nº 14.133/2021 (Nova Lei de Licitações) e decretos regulamentadores. Sua resposta deve ser um documento técnico fidedigno, completo, estruturado com títulos claros e sub-seções, e pronto para ser copiado. Mantenha a formalidade exigida por documentos oficiais. Cite a Lei 14.133/2021.";

    switch (docType) {
        case 'DFD':
            return `${baseInstruction} Seu objetivo é gerar um Documento de Formalização da Demanda (DFD). O DFD deve conter as seguintes seções obrigatórias: 1. Justificativa da Necessidade (Vinculação ao Planejamento Estratégico), 2. Requisitos Preliminares (O que se espera da contratação), 3. Estimativa de Quantidade e Prazo, 4. Previsão de Data para Início da Contratação. Use títulos em negrito e Markdown.`;
        case 'ETP':
            return `${baseInstruction} Seu objetivo é gerar um Estudo Técnico Preliminar (ETP). O ETP deve conter as seguintes seções obrigatórias e detalhadas: 1. Descrição da Necessidade, 2. Análise de Soluções e Alternativas (com justificativa da escolha), 3. Requisitos Mínimos e Máximos, 4. Levantamento de Mercado e Fornecedores, 5. Estimativa de Valor (com fontes), 6. Previsão de Contratação (prazos e modalidade), 7. Riscos Identificados e Propostas de Mitigação. Use títulos em negrito e Markdown.`;
        case 'TR':
            return `${baseInstruction} Seu objetivo é gerar um Termo de Referência (TR). O TR deve ser o documento mais completo e final. Ele deve conter as seguintes seções obrigatórias: 1. Objeto e Justificativa (com base no ETP), 2. Especificações Técnicas (detalhadas e precisas), 3. Obrigações da Contratada (incluindo qualificação técnica), 4. Modelo de Execução e Fiscalização do Contrato, 5. Critérios de Aceitação do Objeto (metodologia), 6. Condições de Pagamento e Sanções. Use títulos em negrito e Markdown.`;
        case 'EDITAL':
            return `${baseInstruction} Seu objetivo é gerar um Edital de Licitação completo, fundamentado na Lei nº 14.133/2021. O Edital deve conter: 1. Preâmbulo (com modalidade e critério de julgamento), 2. Objeto da Licitação, 3. Condições de Participação e Habilitação, 4. Critérios de Julgamento das Propostas, 5. Recursos Orçamentários, 6. Sanções Administrativas, 7. Disposições Finais. Garanta a conformidade legal rigorosa. Use títulos em negrito e Markdown.`;
        case 'OFICIO':
            return `${baseInstruction} Seu objetivo é gerar um Ofício formal e administrativo. Estrutura obrigatória: 1. Cabeçalho (Local e Data), 2. Identificação (Número do Ofício - deixe espaço para preencher), 3. Destinatário (Nome/Cargo e Órgão), 4. Assunto (Resumo claro), 5. Corpo do Texto (Linguagem culta, direta e respeitosa), 6. Fecho (Atenciosamente ou Respeitosamente), 7. Espaço para Assinatura. Use títulos em negrito e Markdown para estruturar se necessário.`;
        default:
            return baseInstruction;
    }
}

export async function generateDocumentWithGemini(docType: string, context: string): Promise<GeneratedDocument> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = await resolveWorkingModel(genAI);

    const systemInstruction = getSystemInstruction(docType);

    // SDK doesn't support 'systemInstruction' directly in getGenerativeModel for all models in the same way REST does for some versions
    // but we can prepend it to the prompt or use the specific beta methods if needed. 
    // However, gemini-1.5-flash supports system instructions via the configuration or just prompt engineering.
    // For simplicity and compatibility with the standard SDK, we will prepend the system instruction properly.

    const prompt = `${systemInstruction}\n\nDEMANDA DO USUÁRIO:\nGerar o documento ${docType} com base na seguinte demanda: ${context}. Estrutura: Documento Técnico Oficial.`;

    let delay = INITIAL_BACKOFF;

    for (let i = 0; i < MAX_RETRIES; i++) {
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // SDK currently abstracts sources, providing mostly text. 
            // If grounding is needed, we'd check candidates, but basic usage returns text.
            // We'll mimic the source structure for interface compatibility.
            const sources: { uri: string; title: string }[] = [];

            if (!text) throw new Error("A resposta da IA estava vazia.");

            return { text, sources };

        } catch (error: any) {
            console.warn(`Tentativa ${i + 1} falhou:`, error);
            if (i === MAX_RETRIES - 1) throw error;
            await new Promise(resolve => setTimeout(resolve, delay));
            delay *= 2;
        }
    }
    throw new Error("Falha ao se comunicar com a API Gemini após várias tentativas.");
}

export async function analyzeImpugnation(editalText: string, impugnationText: string): Promise<string> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = await resolveWorkingModel(genAI);

    const systemPrompt = "Você é um Consultor Jurídico Especialista em Licitações e Contratos Administrativos (Lei 14.133/2021). Sua tarefa é analisar uma Impugnação ao Edital. Determinar se é PROCEDENTE, IMPROCEDENTE ou PARCIALMENTE PROCEDENTE com fundamentação jurídica.";

    const prompt = `
    ${systemPrompt}

    TEXTO DO EDITAL (TRECHO RELEVANTE):
    "${editalText.substring(0, 30000)}" 
    // Limitando caracteres para evitar estouro de tokens simples, embora flash aguente muito mais.

    TEXTO DA IMPUGNAÇÃO:
    "${impugnationText.substring(0, 30000)}"

    ANÁLISE JURÍDICA:
    `;

    try {
        const result = await model.generateContent(prompt);
        return result.response.text();
    } catch (error) {
        console.error("Erro na análise de impugnação:", error);
        throw new Error("Não foi possível realizar a análise jurídica no momento. Verifique a chave de API.");
    }
}

export async function generateReportInsights(
    docs: any[],
    impugnations: any[]
): Promise<{
    summary: string;
    patterns: { category: string; count: number }[];
    recommendations: string[];
}> {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = await resolveWorkingModel(genAI);

    const prompt = `
    Atue como um Consultor Sênior de Licitações. Analise os dados e retorne APENAS um JSON válido.
    
    DADOS DE PRODUÇÃO:
    ${JSON.stringify(docs.map(d => ({ type: d.type, date: d.created_at })))}

    DADOS DE RISCO:
    ${JSON.stringify(impugnations.map(i => ({ result: i.analysis_result, date: i.created_at })))}

    SAÍDA ESPERADA (JSON):
    {
        "summary": "Resumo executivo.",
        "patterns": [{ "category": "Padrão", "count": 0 }],
        "recommendations": ["Recomendação 1"]
    }
    `;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();
        const jsonStr = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(jsonStr);
    } catch (error) {
        console.error("Error analyzing report:", error);
        return {
            summary: "Não foi possível gerar insights no momento.",
            patterns: [],
            recommendations: ["Verifique a conexão com a IA."]
        };
    }
}
