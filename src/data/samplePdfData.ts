// Base64-encoded valid multi-page PDF for instant preview and guest workspace
export function generateSamplePdfBase64(): string {
  const contentP1 = `BT
/F1 22 Tf
50 730 Td
(AI Podium - SSOT Architecture & Local AI Whitepaper) Tj
/F1 11 Tf
0 -36 Td
(Document ID: AIP-2026-WP01 | Classification: SSOT Technical Specification) Tj
0 -20 Td
(Author: AI Podium Architecture & Research Engineering Team) Tj
/F1 14 Tf
0 -36 Td
(1. Executive Summary) Tj
/F1 10.5 Tf
0 -22 Td
(AI Podium is an advanced knowledge engineering and document orchestration workspace) Tj
0 -17 Td
(designed to synthesize fragmented markdown notes and technical documentation into a verified) Tj
0 -17 Td
(Single Source of Truth [SSOT]. Operating entirely client-side with zero server latency,) Tj
0 -17 Td
(it pairs standard Web standards with native on-device Local AI inference via Ollama.) Tj
/F1 14 Tf
0 -36 Td
(2. Dual-Engine PDF Processing Pipeline) Tj
/F1 10.5 Tf
0 -22 Td
(- Fast Text Parser: Instant layout stream extraction directly via pdfjs-dist.) Tj
0 -17 Td
(- Local AI Parser: Deep structural rewriting using Ollama (http://localhost:11434).) Tj
0 -17 Td
(- Split View Synchronization: High-DPI canvas preview alongside live Markdown editing.) Tj
0 -17 Td
(- Cryptographic Security: Local IndexedDB persistence with AES-256-GCM encryption.) Tj
ET
0.39 0.4 0.95 rg
50 648 512 2 re
f
0.8 0.85 0.9 rg
50 515 512 1 re
f
`;

  const contentP2 = `BT
/F1 22 Tf
50 730 Td
(System Architecture & Specification Matrix) Tj
/F1 11 Tf
0 -36 Td
(Page 2: Core Subsystems, Benchmarks & Local Model Compatibility) Tj
/F1 14 Tf
0 -36 Td
(3. Subsystem Architecture) Tj
/F1 10.5 Tf
0 -22 Td
(1. Ingestion Layer: Drag-and-drop parsing for PDF, DOCX, XLSX, and PPTX documents.) Tj
0 -17 Td
(2. Memory State Engine: Tri-pane reactive sync between Chat, Editor, and Explorer.) Tj
0 -17 Td
(3. High-DPI Canvas Renderer: Native Web Worker rendering with devicePixelRatio scaling.) Tj
0 -17 Td
(4. Vault Security Layer: Client-side AES-256-GCM DRE data-at-rest encryption.) Tj
/F1 14 Tf
0 -36 Td
(4. Recommended Local AI Models (Ollama)) Tj
/F1 10.5 Tf
0 -22 Td
(- llama3.2-vision: Multimodal PDF diagram and image text parsing) Tj
0 -17 Td
(- deepseek-r1: Complex logical reasoning and tabular data synthesis) Tj
0 -17 Td
(- qwen2.5-coder: Code documentation, API schema and markdown formatting) Tj
ET
0.39 0.4 0.95 rg
50 648 512 2 re
f
0.8 0.85 0.9 rg
50 515 512 1 re
f
`;

  const obj1 = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  const obj2 = '2 0 obj\n<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>\nendobj\n';
  const obj3 = '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 6 0 R >>\nendobj\n';
  const obj4 = '4 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 7 0 R >>\nendobj\n';
  const obj5 = '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  
  const byteLenP1 = new TextEncoder().encode(contentP1).length;
  const byteLenP2 = new TextEncoder().encode(contentP2).length;
  const obj6 = `6 0 obj\n<< /Length ${byteLenP1} >>\nstream\n${contentP1}endstream\nendobj\n`;
  const obj7 = `7 0 obj\n<< /Length ${byteLenP2} >>\nstream\n${contentP2}endstream\nendobj\n`;

  const header = '%PDF-1.4\n';
  const objs = [obj1, obj2, obj3, obj4, obj5, obj6, obj7];
  
  let currOffset = new TextEncoder().encode(header).length;
  const offsets = [0];
  let body = '';
  
  for (const obj of objs) {
    offsets.push(currOffset);
    body += obj;
    currOffset += new TextEncoder().encode(obj).length;
  }

  const xrefOffset = currOffset;
  let xref = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) {
    xref += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const fullPdf = header + body + xref + trailer;
  
  // Safe btoa in browser and node
  if (typeof btoa !== 'undefined') {
    return btoa(fullPdf);
  }
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(fullPdf).toString('base64');
  }
  return '';
}

export const SAMPLE_PDF_DATA_URL = `data:application/pdf;base64,${generateSamplePdfBase64()}`;
