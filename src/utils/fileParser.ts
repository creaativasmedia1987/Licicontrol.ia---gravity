import * as pdfjsLib from 'pdfjs-dist';

// Configuração do Worker para o PDF.js
// Utilizando unpkg para garantir compatibilidade com a versão instalada
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
    try {
        if (file.type === 'application/pdf') {
            return await extractTextFromPdf(file);
        } else if (file.type === 'text/plain') {
            return await extractTextFromTxt(file);
        } else {
            console.warn(`Tentando extrair de formato não padrão: ${file.type}`);
            // Tenta processar como texto se for desconhecido mas pequeno? Não, melhor travar.
            throw new Error('Formato de arquivo não suportado. Por favor, envie arquivos PDF ou TXT.');
        }
    } catch (error: any) {
        console.error("Erro na extração de texto:", error);
        throw new Error(`Falha ao ler o arquivo ${file.name}: ${error.message || error}`);
    }
}

function extractTextFromTxt(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target?.result as string || "");
        reader.onerror = (error) => reject(new Error("Erro ao ler arquivo de texto."));
        reader.readAsText(file);
    });
}

async function extractTextFromPdf(file: File): Promise<string> {
    try {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;

        let fullText = "";

        // Limite de segurança para não travar o navegador em arquivos gigantes
        const maxPages = Math.min(pdf.numPages, 50);

        for (let i = 1; i <= maxPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item: any) => item.str)
                .join(" ");

            fullText += `--- PÁGINA ${i} ---\n${pageText}\n\n`;
        }

        if (pdf.numPages > 50) {
            fullText += `\n[... O documento continua, mas a leitura foi limitada às primeiras 50 páginas para otimização ...]\n`;
        }

        if (!fullText.trim()) {
            console.warn("PDF lido mas retornado vazio. O PDF pode ser uma imagem escaneada.");
            return "AVISO: O conteúdo deste PDF parece estar vazio ou é uma imagem escaneada sem OCR. O sistema pode não conseguir analisar corretamente.";
        }

        return fullText;
    } catch (error) {
        console.error("Erro interno no PDF.js:", error);
        throw new Error("Não foi possível processar o PDF. Verifique se o arquivo não está corrompido ou protegido por senha.");
    }
}
