import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';

const MAX_ZIP_ITEMS = 1000;
const MAX_ITEM_BASE64_LENGTH = 35 * 1024 * 1024; // 35 MB base64

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const certificates = body?.certificates;

    if (!Array.isArray(certificates) || certificates.length === 0) {
      return NextResponse.json({ error: 'No certificates provided for packaging' }, { status: 400 });
    }

    if (certificates.length > MAX_ZIP_ITEMS) {
      return NextResponse.json(
        { error: `Batch size exceeds maximum allowed safety limit of ${MAX_ZIP_ITEMS} certificates.` },
        { status: 400 }
      );
    }

    const zip = new JSZip();

    for (let i = 0; i < certificates.length; i++) {
      const cert = certificates[i];
      if (cert && cert.dataUrl && typeof cert.dataUrl === 'string') {
        if (cert.dataUrl.length > MAX_ITEM_BASE64_LENGTH) {
          continue; // Skip oversized certificate payload to prevent OOM
        }

        const commaIdx = cert.dataUrl.indexOf(',');
        const base64Data = commaIdx !== -1 ? cert.dataUrl.slice(commaIdx + 1) : cert.dataUrl;

        // Security: Defend against Zip Slip path traversal
        const rawName = String(cert.filename || `Certificate_${i + 1}.pdf`);
        const safeFilename = rawName
          .replace(/^.*[\\\/]/, '') // Strip any directory paths
          .replace(/[^a-zA-Z0-9_.-]/g, '_') // Allow only alphanumeric, dash, dot, underscore
          .replace(/^\.+/, ''); // Strip leading dots

        zip.file(safeFilename || `Certificate_${i + 1}.pdf`, base64Data, { base64: true });
      }
    }

    const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
    const zipBase64 = buffer.toString('base64');
    const zipFilename = `Certificates-Batch-${Date.now()}.zip`;
    const dataUrl = `data:application/zip;base64,${zipBase64}`;

    return NextResponse.json({
      success: true,
      downloadUrl: dataUrl,
      filename: zipFilename,
      totalCount: certificates.length,
      sizeBytes: buffer.length
    });

  } catch (err: any) {
    console.error('ZIP packaging error:', err);
    return NextResponse.json({ error: 'Failed to create zip archive securely.' }, { status: 500 });
  }
}

