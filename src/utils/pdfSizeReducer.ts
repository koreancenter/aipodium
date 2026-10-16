import { PDFDocument, PDFName, PDFDict, PDFStream, PDFRawStream, PDFRef } from 'pdf-lib';

export interface PdfReductionStats {
  imageMetadataCount: number;
  jpegSegmentsCount: number;
  xmpStreamCount: number;
  thumbnailStreamCount: number;
}

export interface PdfReductionResult {
  originalSizeBytes: number;
  reducedSizeBytes: number;
  savedBytes: number;
  savedPercentage: number;
  strippedItems: PdfReductionStats;
  reducedPdfBytes: Uint8Array;
  executionTimeMs: number;
  wasOptimized: boolean;
}

export interface PdfReductionOptions {
  /** Strip /Metadata, /PieceInfo, /Photoshop, /Exif from Image XObjects */
  stripImageMetadata?: boolean;
  /** Strip APP1 (Exif/XMP), APP13 (Photoshop IRB), COM from embedded JPEG streams */
  stripJpegSegments?: boolean;
  /** Strip global /Type /Metadata XMP XML streams */
  stripXmpStreams?: boolean;
  /** Strip /Thumb page thumbnails */
  stripThumbnails?: boolean;
  /** Compress objects using PDF 1.5+ Object Streams */
  useObjectStreams?: boolean;
  /** Clear bloated document author/producer/extended info */
  cleanDocumentInfo?: boolean;
}

/**
 * Strips non-essential APP1 (Exif/XMP), APP13 (Photoshop IRB), and COM markers
 * from a raw JPEG stream while leaving image dimensions (SOF) and compressed scan (SOS) 100% intact.
 */
export function stripJpegMetadataSegments(bytes: Uint8Array): {
  data: Uint8Array;
  strippedCount: number;
  savedBytes: number;
} {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) {
    return { data: bytes, strippedCount: 0, savedBytes: 0 };
  }

  let i = 2;
  const chunks: Uint8Array[] = [bytes.slice(0, 2)];
  let strippedCount = 0;
  let savedBytes = 0;

  while (i < bytes.length - 1) {
    if (bytes[i] !== 0xff) break;
    const marker = bytes[i + 1];

    // EOI (End of Image) or SOS (Start of Scan - raw compressed image data begins)
    if (marker === 0xd9 || marker === 0xda) {
      chunks.push(bytes.slice(i));
      break;
    }

    // Standalone markers without length field
    if (marker === 0x00 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) {
      chunks.push(bytes.slice(i, i + 2));
      i += 2;
      continue;
    }

    if (i + 4 > bytes.length) break;
    const segmentLength = (bytes[i + 2] << 8) | bytes[i + 3];
    if (i + 2 + segmentLength > bytes.length) break;

    // Target segments:
    // 0xE1: APP1 (EXIF / XMP metadata)
    // 0xED: APP13 (Photoshop Image Resource Blocks / 8BIM)
    // 0xFE: COM (Comment blocks)
    if (marker === 0xe1 || marker === 0xed || marker === 0xfe) {
      strippedCount++;
      savedBytes += 2 + segmentLength;
      i += 2 + segmentLength;
      continue;
    }

    // Preserve all essential segments (SOF0, SOF2, DHT, DQT, APP0/JFIF, APP14/Adobe)
    chunks.push(bytes.slice(i, i + 2 + segmentLength));
    i += 2 + segmentLength;
  }

  if (strippedCount === 0) {
    return { data: bytes, strippedCount: 0, savedBytes: 0 };
  }

  const totalLength = chunks.reduce((acc, c) => acc + c.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return { data: result, strippedCount, savedBytes };
}

/**
 * Fallback binary metadata sanitizer for PDFs with non-standard syntax or encrypted headers.
 * Directly removes XMP metadata blocks, PieceInfo, and thumbnail references from the byte stream.
 */
function fallbackBinaryStripMetadata(bytes: Uint8Array): {
  data: Uint8Array;
  strippedCount: number;
} {
  try {
    const textDecoder = new TextDecoder('latin1');
    const textEncoder = new TextEncoder();
    let text = textDecoder.decode(bytes);
    let strippedCount = 0;

    // 1. Remove XML/XMP metadata packets <?xpacket ... ?>...<?xpacket end=...?>
    const xpacketRegex = /<\?xpacket begin=[\s\S]*?<\?xpacket end=['"][wr]['"]\?>/g;
    if (xpacketRegex.test(text)) {
      text = text.replace(xpacketRegex, () => {
        strippedCount++;
        return '';
      });
    }

    // 2. Remove <x:xmpmeta>...</x:xmpmeta> blocks
    const xmpmetaRegex = /<x:xmpmeta[\s\S]*?<\/x:xmpmeta>/g;
    if (xmpmetaRegex.test(text)) {
      text = text.replace(xmpmetaRegex, () => {
        strippedCount++;
        return '';
      });
    }

    if (strippedCount > 0) {
      return { data: textEncoder.encode(text), strippedCount };
    }
  } catch (err) {
    console.warn('Binary metadata strip fallback skipped:', err);
  }
  return { data: bytes, strippedCount: 0 };
}

/**
 * Core PDF Size Reducer Utility.
 * Strips embedded high-resolution image metadata, XMP streams, and redundant thumbnails
 * during the document parsing/import phase to drastically reduce memory footprint.
 */
export async function reducePdfSizeAndStripImageMetadata(
  pdfBytes: Uint8Array,
  options: PdfReductionOptions = {}
): Promise<PdfReductionResult> {
  const startTime = performance.now();
  const originalSizeBytes = pdfBytes.byteLength;

  const {
    stripImageMetadata = true,
    stripJpegSegments = true,
    stripXmpStreams = true,
    stripThumbnails = true,
    useObjectStreams = true,
    cleanDocumentInfo = true,
  } = options;

  const stats: PdfReductionStats = {
    imageMetadataCount: 0,
    jpegSegmentsCount: 0,
    xmpStreamCount: 0,
    thumbnailStreamCount: 0,
  };

  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      ignoreEncryption: true,
      parseSpeed: 1000,
    });

    const context = pdfDoc.context;
    const indirectObjects = context.enumerateIndirectObjects();

    // 1. Inspect all indirect objects (detect Image XObjects, XMP Streams, Thumbnails)
    for (const [ref, obj] of indirectObjects) {
      // Check for dictionary or stream with dict
      let dict: PDFDict | undefined;
      let rawStream: PDFRawStream | undefined;

      if (obj instanceof PDFDict) {
        dict = obj;
      } else if (obj instanceof PDFStream) {
        dict = obj.dict;
        if (obj instanceof PDFRawStream) {
          rawStream = obj;
        }
      }

      if (!dict) continue;

      const typeName = dict.get(PDFName.of('Type'))?.toString();
      const subtypeName = dict.get(PDFName.of('Subtype'))?.toString();

      // Case A: Embedded Image XObject (/Subtype /Image)
      if (subtypeName === '/Image') {
        if (stripImageMetadata) {
          // Strip heavy image metadata properties
          const metadataKeys = ['Metadata', 'PieceInfo', 'Photoshop', 'Exif', 'Thumb'];
          for (const key of metadataKeys) {
            const pdfKey = PDFName.of(key);
            if (dict.has(pdfKey)) {
              dict.delete(pdfKey);
              stats.imageMetadataCount++;
            }
          }
        }

        // Deep strip embedded JPEG markers (APP1 Exif/XMP, APP13 Photoshop IRB)
        if (stripJpegSegments && rawStream) {
          const filter = dict.get(PDFName.of('Filter'))?.toString();
          if (filter === '/DCTDecode') {
            try {
              const streamContents = rawStream.getContents();
              const jpegStripResult = stripJpegMetadataSegments(streamContents);
              if (jpegStripResult.strippedCount > 0) {
                stats.jpegSegmentsCount += jpegStripResult.strippedCount;
                // Replace stream with stripped content
                const updatedStream = PDFRawStream.of(dict, jpegStripResult.data);
                context.assign(ref, updatedStream);
              }
            } catch (jpegErr) {
              console.warn('JPEG segment strip error on image:', jpegErr);
            }
          }
        }
      }

      // Case B: Global /Type /Metadata or XML metadata stream
      if (stripXmpStreams && (typeName === '/Metadata' || subtypeName === '/XML')) {
        stats.xmpStreamCount++;
        context.delete(ref);
      }
    }

    // 2. Clean Catalog level metadata and structure
    if (stripXmpStreams && pdfDoc.catalog.has(PDFName.of('Metadata'))) {
      pdfDoc.catalog.delete(PDFName.of('Metadata'));
      stats.xmpStreamCount++;
    }
    if (pdfDoc.catalog.has(PDFName.of('PieceInfo'))) {
      pdfDoc.catalog.delete(PDFName.of('PieceInfo'));
    }

    // 3. Clean Page level thumbnails and metadata
    const pages = pdfDoc.getPages();
    for (const page of pages) {
      if (stripThumbnails && page.node.has(PDFName.of('Thumb'))) {
        page.node.delete(PDFName.of('Thumb'));
        stats.thumbnailStreamCount++;
      }
      if (stripImageMetadata && page.node.has(PDFName.of('PieceInfo'))) {
        page.node.delete(PDFName.of('PieceInfo'));
      }
      if (stripXmpStreams && page.node.has(PDFName.of('Metadata'))) {
        page.node.delete(PDFName.of('Metadata'));
        stats.xmpStreamCount++;
      }
    }

    // 4. Clean document info dictionary
    if (cleanDocumentInfo) {
      try {
        pdfDoc.setTitle('');
        pdfDoc.setAuthor('');
        pdfDoc.setSubject('');
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer('');
        pdfDoc.setCreator('');
      } catch {}
    }

    // 5. Serialize with object streams for maximum memory efficiency
    const reducedPdfBytes = await pdfDoc.save({
      useObjectStreams,
    });

    const reducedSizeBytes = reducedPdfBytes.byteLength;
    const savedBytes = Math.max(0, originalSizeBytes - reducedSizeBytes);
    const savedPercentage =
      originalSizeBytes > 0 ? Math.round((savedBytes / originalSizeBytes) * 100) : 0;
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      originalSizeBytes,
      reducedSizeBytes,
      savedBytes,
      savedPercentage,
      strippedItems: stats,
      reducedPdfBytes: savedBytes > 0 ? reducedPdfBytes : pdfBytes,
      executionTimeMs,
      wasOptimized: savedBytes > 0 || stats.imageMetadataCount > 0,
    };
  } catch (err) {
    console.warn('PDF-Lib optimization error, falling back to binary sanitizer:', err);

    // Fallback: Binary metadata sanitization
    const fallbackResult = fallbackBinaryStripMetadata(pdfBytes);
    const reducedPdfBytes = fallbackResult.data;
    const reducedSizeBytes = reducedPdfBytes.byteLength;
    const savedBytes = Math.max(0, originalSizeBytes - reducedSizeBytes);
    const savedPercentage =
      originalSizeBytes > 0 ? Math.round((savedBytes / originalSizeBytes) * 100) : 0;
    const executionTimeMs = Math.round(performance.now() - startTime);

    return {
      originalSizeBytes,
      reducedSizeBytes,
      savedBytes,
      savedPercentage,
      strippedItems: {
        ...stats,
        xmpStreamCount: fallbackResult.strippedCount,
      },
      reducedPdfBytes: savedBytes > 0 ? reducedPdfBytes : pdfBytes,
      executionTimeMs,
      wasOptimized: savedBytes > 0,
    };
  }
}

/**
 * Format bytes into clean human readable string (예: 2.4 MB, 850 KB)
 */
export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
