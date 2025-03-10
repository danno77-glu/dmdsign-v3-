import React, { useState, useEffect } from 'react';
import { Plus, Link as LinkIcon, Trash, FileText, Eye, Download } from 'lucide-react';
import { nanoid } from 'nanoid';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { supabase } from '../lib/supabase';
import { DocumentEditor } from '../components/DocumentEditor';
import { Logo } from '../components/Logo';
import { ShareLinkPopup } from '../components/ShareLinkPopup';

interface Template {
  id: string;
  name: string;
  fields: FormField[];
  created_at: string;
  file_path: string;
}

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

export const AdminDashboard: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [signedDocuments, setSignedDocuments] = useState<SignedDocument[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'templates' | 'signed'>('templates');
  const [sharingTemplate, setSharingTemplate] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [templatesResult, signedDocsResult] = await Promise.all([
        supabase
          .from('templates')
          .select('*')
          .order('created_at', { ascending: false }),
        supabase
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
          .order('created_at', { ascending: false })
      ]);

      if (templatesResult.error) throw templatesResult.error;
      if (signedDocsResult.error) throw signedDocsResult.error;

      setTemplates(templatesResult.data || []);
      setSignedDocuments(signedDocsResult.data || []);
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to load data. Please refresh the page.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        setError('File size must be less than 10MB');
        return;
      }
      setSelectedFile(file);
      setIsCreating(true);
      setError(null);
    }
  };

  const handleSaveTemplate = async (fields: FormField[]) => {
    if (!selectedFile || !templateName.trim()) return;

    setError(null);
    try {
      const templateId = nanoid();
      const filePath = `${templateId}.pdf`;

      const { error: uploadError } = await supabase.storage
        .from('templates')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const { error: dbError } = await supabase
        .from('templates')
        .insert([
          {
            id: templateId,
            name: templateName,
            fields,
            file_path: filePath
          }
        ]);

      if (dbError) {
        await supabase.storage
          .from('templates')
          .remove([filePath]);
        throw dbError;
      }

      setIsCreating(false);
      setSelectedFile(null);
      setTemplateName('');
      await loadData();
    } catch (err) {
      console.error('Error saving template:', err);
      setError('Failed to save template. Please try again.');
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    try {
      setError(null);

      const templateToDelete = templates.find(t => t.id === id);
      if (!templateToDelete) {
        throw new Error('Template not found');
      }

      const { error: deleteError } = await supabase
        .from('templates')
        .delete()
        .eq('id', id);

      if (deleteError) {
        throw deleteError;
      }

      await supabase.storage
        .from('templates')
        .remove([templateToDelete.file_path]);

      await loadData();
    } catch (err) {
      console.error('Error deleting template:', err);
      setError('Failed to delete template. Please try again.');
    }
  };

  const handleDownloadPDF = async (doc: SignedDocument) => {
    try {
      setError(null);
      
      const { data: pdfBytes, error: downloadError } = await supabase.storage
        .from('templates')
        .download(doc.template.file_path);

      if (downloadError) throw downloadError;
      if (!pdfBytes) throw new Error('Could not download the file');

      const pdfDoc = await PDFDocument.load(await pdfBytes.arrayBuffer());
      
      pdfDoc.registerFontkit(fontkit);
      
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      
      const pages = pdfDoc.getPages();

      for (const field of doc.template.fields) {
        const page = pages[field.position.pageNumber - 1];
        if (!page) continue;

        const value = doc.form_values[field.label] || '';
        
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
      
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = `${doc.template.name}_signed_${new Date(doc.created_at).toLocaleDateString('en-US').replace(/\//g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document. Please try again.');
    }
  };

  const getSigningLink = (templateId: string) => {
    return `${window.location.origin}/sign/${templateId}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (isCreating && selectedFile) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full max-w-md rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Enter template name"
          />
        </div>
        <DocumentEditor
          file={selectedFile}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setIsCreating(false);
            setSelectedFile(null);
            setTemplateName('');
            setError(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="mb-8">
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileSelect}
          className="hidden"
          id="template-upload"
        />
        <label
          htmlFor="template-upload"
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Template
        </label>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'templates'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setActiveTab('signed')}
              className={`px-6 py-4 text-sm font-medium ${
                activeTab === 'signed'
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Signed Documents
            </button>
          </nav>
        </div>

        {isLoading ? (
          <div className="p-6 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          </div>
        ) : activeTab === 'templates' ? (
          templates.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No templates created yet
            </div>
          ) : (
            <ul className="divide-y divide-gray-200">
              {templates.map((template) => (
                <li key={template.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium text-gray-900">
                        {template.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {template.fields.length} fields • Created {formatDate(template.created_at)}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <button
                        onClick={() => setSharingTemplate(template.id)}
                        className="text-gray-400 hover:text-gray-500"
                        title="Share template"
                      >
                        <LinkIcon className="h-5 w-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteTemplate(template.id)}
                        className="text-red-400 hover:text-red-500"
                        title="Delete template"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div>
            {signedDocuments.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No signed documents yet
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {signedDocuments.map((doc) => (
                  <li key={doc.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-medium text-gray-900">
                          {doc.template?.name || 'Unknown Template'}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Signed {formatDate(doc.created_at)}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => window.open(`/view/${doc.id}`, '_blank')}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 border border-blue-600 rounded-md hover:bg-blue-50"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </button>
                        <button
                          onClick={() => handleDownloadPDF(doc)}
                          className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 border border-gray-600 rounded-md hover:bg-gray-50"
                          title="Download signed document"
                        >
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      {Object.entries(doc.form_values).map(([key, value]) => (
                        <div key={key} className="text-sm">
                          <span className="font-medium text-gray-500">{key}:</span>
                          {doc.template?.fields.find(f => f.label === key)?.type === 'signature' ? (
                            <img
                              src={value}
                              alt="Signature"
                              className="mt-1 max-h-12 object-contain"
                            />
                          ) : (
                            <span className="ml-2 text-gray-900">{value}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {sharingTemplate && (
        <ShareLinkPopup
          link={getSigningLink(sharingTemplate)}
          onClose={() => setSharingTemplate(null)}
        />
      )}
    </div>
  );
};
