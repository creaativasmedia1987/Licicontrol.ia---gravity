/**
 * Este código deve ser utilizado dentro da lógica de processamento da IA no Lovable.
 * Ele garante que o output da IA seja envolvido em uma estrutura de documento oficial.
 */

export interface OrgData {
  orgName: string;
  logoUrl?: string | null;
  state?: string;
}

export const formatOfficialDocument = (aiContent: string, orgData: OrgData) => {
  // orgData deve conter { orgName, logoUrl, state }

  const headerHtml = `
      <div style="
        text-align: center; 
        border-bottom: 2px solid #1e3a8a; 
        margin-bottom: 30px; 
        padding-bottom: 15px;
        font-family: 'Arial', sans-serif;
      ">
        ${orgData.logoUrl ? `<img src="${orgData.logoUrl}" alt="Logo" style="max-height: 80px; margin-bottom: 10px;">` : ''}
        <h2 style="margin: 0; text-transform: uppercase; color: #1e3a8a; font-size: 18px;">${orgData.orgName || 'Prefeitura Municipal'}</h2>
        <p style="margin: 5px 0 0; font-size: 12px; color: #666;">Estado de ${orgData.state || 'Brasil'}</p>
      </div>
    `;

  const footerHtml = `
      <div style="margin-top: 60px; text-align: center; font-family: 'Arial', sans-serif;">
        <div style="display: flex; justify-content: space-around; gap: 20px;">
          <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 12px;">Responsável Técnico</div>
          <div style="border-top: 1px solid #000; width: 200px; padding-top: 5px; font-size: 12px;">Gestor Autorizador</div>
        </div>
      </div>
    `;

  // Retorna o documento completo com CSS inline para garantir a estilização no preview
  return `
      <div class="official-paper-container" style="
        background: white; 
        padding: 40px 60px; 
        max-width: 800px; 
        margin: 20px auto; 
        box-shadow: 0 0 10px rgba(0,0,0,0.1);
        color: #000;
        line-height: 1.6;
      ">
        ${orgData.logoUrl ? `
          <div style="
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            width: 70%;
            max-width: 500px;
            opacity: 0.08;
            pointer-events: none;
            z-index: 0;
            display: flex;
            justify-content: center;
            align-items: center;
          ">
            <img src="${orgData.logoUrl}" style="width: 100%; height: auto; object-fit: contain; filter: grayscale(100%);" alt="" />
          </div>
        ` : ''}

        <div style="position: relative; z-index: 1;">
          ${headerHtml}
          
          <div style="
            text-align: justify; 
            font-family: 'Times New Roman', Times, serif; 
            font-size: 14px;
            white-space: pre-line;
          ">
            ${aiContent}
          </div>
    
          ${footerHtml}
        </div>
      </div>
  
      <style>
        @media print {
          body * { visibility: hidden; }
          .official-paper-container, .official-paper-container * { visibility: visible; }
          .official-paper-container { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none; padding: 0; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .official-paper-container { margin: 0; width: 100%; max-width: none; }
        }
        .official-paper-container h1, .official-paper-container h2 { 
          text-align: center; 
          text-transform: uppercase; 
          margin-bottom: 20px;
          color: #1e3a8a;
        }
      </style>
    `;
};

/**
 * Remove formatação Markdown para um texto limpo
 */
export const cleanMarkdown = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/#{1,6}\s?/g, '') // Remove headers
    .replace(/\*\*/g, '')      // Remove bold
    .replace(/\*/g, '')        // Remove bullets/italic
    .replace(/__/g, '')        // Remove bold
    .replace(/_/g, '')         // Remove italic
    .replace(/`{1,3}/g, '')    // Remove code blocks
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links, keep text
    .replace(/^\s*-\s/gm, '')  // Remove list dashes
    .replace(/^\s*\d\.\s/gm, '') // Remove list numbers (optional, maybe keep?)
    .trim();
};

import { Document, Packer, Paragraph, TextRun, ImageRun, AlignmentType, Header, Footer, BorderStyle } from "docx";

/**
 * Gera um arquivo DOCX com a formatação oficial e logo
 */
export const generateDocx = async (content: string, orgData: OrgData): Promise<Blob> => {
  const children = [];

  // Add Logo if exists
  if (orgData.logoUrl) {
    try {
      // Fetch the image to get dimensions or buffer if needed, 
      // but docx needs base64 or buffer. 
      // Assuming logoUrl is base64 data URL from our DB
      const response = await fetch(orgData.logoUrl);
      const blob = await response.blob();
      const buffer = await blob.arrayBuffer();

      children.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new ImageRun({
              data: buffer,
              transformation: {
                width: 100,
                height: 100,
              },
            } as any),
          ],
        })
      );
    } catch (e) {
      console.error("Error adding logo to DOCX", e);
    }
  }

  // Add Org Name
  children.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [
        new TextRun({
          text: orgData.orgName || "Prefeitura Municipal",
          bold: true,
          size: 28, // 14pt
          allCaps: true,
        }),
        new TextRun({
          text: `\nEstado de ${orgData.state || 'Brasil'}`,
          size: 20, // 10pt
          break: 1,
        })
      ],
    })
  );

  // Add Divider
  children.push(
    new Paragraph({
      border: {
        bottom: {
          color: "000000",
          space: 1,
          style: BorderStyle.SINGLE,
          size: 6,
        },
      },
      spacing: { after: 400 },
    })
  );

  // Add Content
  // Split by newlines to create paragraphs
  const lines = content.split('\n');
  lines.forEach(line => {
    if (line.trim()) {
      children.push(
        new Paragraph({
          alignment: AlignmentType.JUSTIFIED,
          spacing: { after: 120 },
          children: [
            new TextRun({
              text: line.trim(),
              size: 24, // 12pt
              font: "Times New Roman"
            }),
          ],
        })
      );
    }
  });

  // Add Signature Lines
  children.push(
    new Paragraph({
      spacing: { before: 800 },
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({ text: "________________________________________________", size: 24 }),
        new TextRun({ text: "\nResponsável Técnico", size: 20, break: 1 }),
      ]
    })
  );


  const doc = new Document({
    sections: [
      {
        properties: {},
        children: children,
      },
    ],
  });

  return await Packer.toBlob(doc);
};
