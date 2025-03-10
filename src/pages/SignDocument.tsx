import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { PDFViewer } from '../components/PDFViewer';
import { SignatureCanvas } from '../components/SignatureCanvas';
import { Save, ArrowLeft, Smartphone, Pen, ArrowRightCircle, Download } from 'lucide-react';
import { Logo } from '../components/Logo';
import { QRCode } from 'react-qr-code';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { MobileSignatureConfirmation } from '../components/MobileSignatureConfirmation';

interface Template {
  id: string;
  name: string;
  fields: FormField[];
  file_path: string;
}

interface FormField {
  type: 'signature' | 'text' | 'date';
  position: { x: number; y: number; pageNumber: number };
  label: string;
  required: boolean;
  id: string;
}

interface FormValues {
  [key: string]: string;
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

// Moved download logic to a separate function OUTSIDE the component
const downloadSignedPdf = async (doc: SignedDocument) => {
    try {
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
      // Consider showing an error to the user.
      throw err; // Re-throw to handle in calling function
    }
};

    const getSignedDocument = async (documentId: string) => {
        const { data, error } = await supabase
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

        if (error) {
            throw error;
        }
        return data;
    }

export const SignDocument: React.FC = () => {
  const { templateId } = useParams<{ templateId: string }>();
  const navigate = useNavigate();
  const [template, setTemplate] = useState<Template | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [formValues, setFormValues] = useState<FormValues>({});
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showQRCode, setShowQRCode] = useState(false);
  const [currentFieldIndex, setCurrentFieldIndex] = useState(0);
  const pdfViewerRef = useRef<any>(null);
    const [signedDocument, setSignedDocument] = useState<any | null>(null); //using any temporarily
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
    const [searchParams] = useSearchParams(); // Get query parameters
    const isSigningMode = searchParams.get('mode') === 'sign';
    const [mobileSignatureComplete, setMobileSignatureComplete] = useState(false); // New state


    useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (templateId) {
      loadTemplate();
    }
  }, [templateId]);

  // useEffect to scroll to the current page whenever currentPage changes
  useEffect(() => {
    if (pdfViewerRef.current && currentPage) {
      pdfViewerRef.current.scrollToPage(currentPage);
    }
  }, [currentPage]);

  const loadTemplate = async () => {
    try {
      const { data: templateData, error: templateError } = await supabase
        .from('templates')
        .select('*')
        .eq('id', templateId)
        .single();

      if (templateError) throw templateError;
      if (!templateData) throw new Error('Template not found');

      setTemplate(templateData);

      const { data: { publicUrl }, error: urlError } = await supabase.storage
        .from('templates')
        .getPublicUrl(templateData.file_path);

      if (urlError) throw urlError;
      setPdfUrl(publicUrl);
    } catch (err: any) {
      console.error('Error loading template:', err);
      setError('Failed to load document. Please try again.');
    }
  };

    const handleFieldClick = (field: FormField, event: React.MouseEvent) => {
        if (field.type === 'signature') {
            setActiveField(field.label);
            // Only show the signature pad if on mobile, otherwise, proceed as before
            if (isMobile) {
                setShowSignaturePad(true);
                setShowQRCode(false);
            } else {
                setShowSignaturePad(false);
                setShowQRCode(false);
            }
            setCurrentPage(field.position.pageNumber);
        }
    };

const handleSignatureSave = (signatureData: string) => {
    setFormValues(prev => ({
      ...prev,
      [activeField!]: signatureData
    }));
    setShowSignaturePad(false);
    setActiveField(null);
    setShowQRCode(false);

    // Call handleSave directly after updating formValues
    handleSave();
};

  const handleInputChange = (field: FormField, value: string) => {
    setFormValues(prev => ({
      ...prev,
      [field.label]: value
    }));
  };

  const validateForm = () => {
    if (!template) return false;

    const missingFields = template.fields.filter(field => {
      const value = formValues[field.label];
      return field.required && (!value || value.trim() === '');
    });

    if (missingFields.length > 0) {
      setError(`Please complete all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return false;
    }

    return true;
  };

const handleSave = async () => {
  if (!template || !templateId) return;
  if (!validateForm()) return;

  setIsSaving(true);
  setError(null);

  try {
    const { data, error: saveError } = await supabase
      .from('signed_documents')
      .insert([{
        template_id: templateId,
        form_values: formValues,
        user_id: null
      }])
      .select();

    if (saveError) throw saveError;

    if (data && data.length > 0 && data[0].id) {
      const documentId = data[0].id;
      const newSignedDocument = await getSignedDocument(documentId);
      setSignedDocument(newSignedDocument);

      // If on mobile, set mobileSignatureComplete to true AFTER successful save
      if (isMobile) {
        setMobileSignatureComplete(true);
      }
    } else {
      throw new Error("Failed to retrieve the signed document ID.");
    }

  } catch (err) {
    console.error('Error saving document:', err);
    setError('Failed to save the document. Please try again.');
  } finally {
    setIsSaving(false);
  }
};

    const handleCancelSignature = () => {
        setShowSignaturePad(false);
        setShowQRCode(false);
        setActiveField(null);
    }

    const handleNextField = () => {
    if (template && currentFieldIndex < template.fields.length - 1) {
        setCurrentFieldIndex(prevIndex => prevIndex + 1);
        const nextPage = template.fields[currentFieldIndex + 1].position.pageNumber;
        if (nextPage) {
          setCurrentPage(nextPage);
          if (pdfViewerRef.current) {
            pdfViewerRef.current.scrollToPage(nextPage);
          }
        }
    }
  };

    // Subscribe to real-time changes on the signed_documents table
    useEffect(() => {
        const channel = supabase
        .channel('public:signed_documents')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'signed_documents' }, async (payload) => {
            // Check if the new record is for the current template
            if (payload.new.template_id === templateId) {
                const updatedDocument = await getSignedDocument(payload.new.id);
                if(updatedDocument) {
                    setSignedDocument(updatedDocument);
                    // Update formValues with the new signature, if present
                    setFormValues(prevFormValues => ({
                        ...prevFormValues,
                        ...updatedDocument.form_values,
                    }));
                    setSuccess(true); // Set success to true when a new document is inserted
                }

            }
        })
        .subscribe()

        return () => {
            supabase.removeChannel(channel);
        };
    }, [templateId]);


    if (isMobile && isSigningMode) {
        return (
          <>
          {mobileSignatureComplete ? (
            <MobileSignatureConfirmation />
          ) : (
            <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center p-4">
              <h2 className="text-lg font-semibold mb-4">Add Your Signature</h2>
              <SignatureCanvas onSave={handleSignatureSave} onCancel={() => navigate(`/sign/${templateId}`)} width={window.innerWidth * 0.8} height={300} />
            </div>
          )}
        </>
        );
    }

  if (!template || !pdfUrl) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        {error ? (
          <div className="text-center p-8">
            <div className="mb-4 text-red-600">{error}</div>
            <button
              onClick={loadTemplate}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        ) : (
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Logo className="h-10 w-auto" />
              <h1 className="text-xl font-semibold text-gray-900">Sign Document</h1>
            </div>
            <button
              onClick={() => navigate(`/sign/${templateId}`)}
              className="inline-flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(error || success) && (
          <div className={`p-4 rounded-lg mb-6 ${
            success
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}>
            {success ? 'Document signed successfully!' : error}
          </div>
        )}

        {success ? (
          <div className="text-center p-8">
            <h2 className="text-2xl font-bold text-green-700 mb-4">Thank You!</h2>
            <p className="text-gray-600 mb-6">Your document has been signed and submitted successfully.</p>
            {signedDocument && (
                <button
                onClick={() => downloadSignedPdf(signedDocument)}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                <Download className="mr-2 h-4 w-4" />
                Download Signed Document
                </button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white rounded-lg shadow-sm">
                  <PDFViewer
                    ref={pdfViewerRef}
                    file={pdfUrl}
                    formFields={template.fields.map((field) => ({
                      ...field,
                      value: formValues[field.label] || "",
                    }))}
                    onSignaturePositionSelect={() => {}}
                    onFieldClick={handleFieldClick}
                    initialPage={currentPage}
                    key={currentPage}
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-white rounded-lg shadow-sm p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Required Fields</h3>
                  <div className="space-y-4">
                    {template.fields.map((field, index) => (
                      <div key={index} className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                          {field.label}
                          {field.required && <span className="text-red-500 ml-1">*</span>}
                        </label>
                        {field.type === 'signature' ? (
                          <>
                            {/* Show options only when the field is active */}
                            {activeField === field.label && !showSignaturePad && !showQRCode && !isMobile && (
                                <div className="flex space-x-2">
                                <button
                                    onClick={() => setShowSignaturePad(true)}
                                    className="flex-1 px-4 py-2 text-sm font-medium border rounded-md text-blue-700 border-blue-300 bg-white hover:bg-blue-50"
                                >
                                    <Pen className="w-4 h-4 mr-1" />
                                    Draw Signature
                                </button>
                                {!isMobile && (
                                  <button
                                      onClick={() => setShowQRCode(true)}
                                      className="flex-1 px-4 py-2 text-sm font-medium border rounded-md text-blue-700 border-blue-300 bg-white hover:bg-blue-50"
                                  >
                                      <Smartphone className="w-4 h-4 mr-1" />
                                      Sign on Mobile (QR Code)
                                  </button>
                                )}
                                </div>
                            )}

                            {/* Show signature preview if available */}
                            
                              <div className='w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm text-gray-600 p-4'>
                                {formValues[field.label] ? <img
                                src={formValues[field.label]}
                                alt="Signature"
                                className="mt-1 max-h-12 object-contain"
                                /> : <span>Click to sign here</span>}
                              </div>
                            
                          </>
                        ) : field.type === 'date' ? (
                          <input
                            type="date"
                            value={formValues[field.label] || ''}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        ) : (
                          <input
                            type="text"
                            value={formValues[field.label] || ''}
                            onChange={(e) => handleInputChange(field, e.target.value)}
                            placeholder={`Enter ${field.label.toLowerCase()}`}
                            className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          />
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="mt-6 pt-6 border-t border-gray-200">
                    {template && currentFieldIndex < template.fields.length -1 ? (
                        <button
                            onClick={handleNextField}
                            disabled={!formValues[template.fields[currentFieldIndex].label]}
                            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                            Next Field
                            <ArrowRightCircle className="w-4 h-4 ml-2" />
                        </button>
                    ) : (
                        <button
                        onClick={handleSave}
                        disabled={isSaving || success}
                        className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
                        >
                        <Save className="w-4 h-4 mr-2" />
                        {isSaving ? 'Saving...' : 'Submit Document'}
                        </button>
                    )}
                    </div>
                </div>
              </div>
            </div>

            {/* Signature Pad Modal (Desktop - Always Visible when triggered)*/}
            {showSignaturePad && activeField && !isMobile && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white rounded-lg p-6 max-w-2xl w-full shadow-xl">
                  <h2 className="text-lg font-semibold mb-4">Add Your Signature</h2>
                  <SignatureCanvas onSave={handleSignatureSave} onCancel={handleCancelSignature} />
                </div>
              </div>
            )}

            {/* QR Code Modal */}
            
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" style={{ display: isMobile || !showQRCode || !activeField ? 'none' : 'flex' }}>
                <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl">
                  <h4 className="text-center text-gray-700 mb-4">Scan to Sign</h4>
                  <div className="flex justify-center">
                    <QRCode value={`https://dmdsign.netlify.app/sign/${templateId}/complete?mode=sign`} size={192} level="H" />
                  </div>
                  <button
                    onClick={() => {
                      setShowQRCode(false);
                      setShowSignaturePad(false);
                    }}
                    className="mt-4 w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            
            
          </>
        )}
      </div>
    </div>
  );
};
