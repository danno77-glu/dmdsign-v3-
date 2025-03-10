import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { ArrowLeft } from 'lucide-react';
import { Logo } from '../components/Logo';
import { Document, Page, pdfjs } from 'react-pdf';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface SignedDocument {
  id: string;
  template_id: string;
  form_values: Record<string, string>;
  created_at: string;
  template: {
    id: string;
    name: string;
    fields: FormField[];
    file_path: string;
  };
}

interface FormField {
  type: 'signature' | 'text' | 'date';
  position: { x: number; y: number; pageNumber: number };
  label: string;
  required: boolean;
}

export const ViewDocument: React.FC = () => {
  const { documentId } = useParams<{ documentId: string }>();
  const [pdfBytes, setPdfBytes] = useState<ArrayBuffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number | null>(null);

  useEffect(() => {
    const loadDocument = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: docData, error: docError } = await supabase
          .from('signed_documents')
          .select(`
            id,
            template_id,
            form_values,
            created_at,
            template:templates (
              id,
              name,
              fields,
              file_path
            )
          `)
          .eq('id', documentId)
          .single();

        if (docError) throw docError;
        if (!docData) throw new Error('Document not found');

        const { data: originalPdfBytes, error: downloadError } = await supabase.storage
          .from('templates')
          .download(docData.template.file_path);

        if (downloadError) throw downloadError;
        if (!originalPdfBytes) throw new Error('Could not download the file');

        const pdfDoc = await PDFDocument.load(await originalPdfBytes.arrayBuffer());
        pdfDoc.registerFontkit(fontkit);
        const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const pages = pdfDoc.getPages();

        for (const field of docData.template.fields) {
          const page = pages[field.position.pageNumber - 1];
          if (!page) continue;

          const value = docData.form_values[field.label] || '';

          if (field.type === 'signature' && value) {
            try {
              const base64Data = value.split(',')[1];
              const signatureBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const signatureImage = await pdfDoc.embedPng(signatureBytes);
              const signatureDims = signatureImage.scale(0.5);

              page.drawImage(signatureImage, {
                x: field.position.x,
                y: page.getHeight() - field.position.y - signatureDims.height,
                width: signatureDims.width,
                height: signatureDims.height,
              });
            } catch (err) {
              console.error('Error embedding signature:', err);
            }
          } else {
            page.drawText(value, {
              x: field.position.x,
              y: page.getHeight() - field.position.y,
              size: 12,
              font,
              color: rgb(0, 0, 0),
            });
          }
        }

        const modifiedPdfBytes = await pdfDoc.save();
        setPdfBytes(modifiedPdfBytes);
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError(err.message || 'Failed to load document.');
      } finally {
        setLoading(false);
      }
    };

    if (documentId) {
      loadDocument();
    }
  }, [documentId]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-gray-900">
                View Document
              </h1>
            </div>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        {loading ? (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        ) : error ? (
          <div className="text-center p-8">
            <div className="mb-4 text-red-600">{error}</div>
          </div>
        ) : pdfBytes ? (
          <div className="w-full h-full max-w-4xl">
            <Document file={{ data: pdfBytes }} onLoadSuccess={onDocumentLoadSuccess}>
              {Array.from(new Array(numPages), (el, index) => (
                <Page key={`page_${index + 1}`} pageNumber={index + 1} />
              ))}
            </Document>
          </div>
        ) : null}
      </main>
    </div>
  );
};
