import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { ArrowRight } from 'lucide-react';
import { QRCode } from 'react-qr-code';
import { supabase } from '../lib/supabase';

export const PublicSigningPage: React.FC = () => {
  const navigate = useNavigate();
  const { templateId } = useParams<{ templateId: string }>();
  const [templateName, setTemplateName] = useState('');

  useEffect(() => {
    if (templateId) {
      // Fetch the template name
      const fetchTemplateName = async () => {
        try {
          const { data, error } = await supabase
            .from('templates')
            .select('name')
            .eq('id', templateId)
            .single();

          if (error) throw error;
          if (data) {
            setTemplateName(data.name);
          }
        } catch (err) {
          console.error('Error fetching template name:', err);
        }
      };

      fetchTemplateName();
    }
  }, [templateId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Logo className="h-10 w-auto" />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                Document Ready for Signing
              </h1>
              <p className="text-gray-600">
                {templateName ? `Template: ${templateName}` : 'Click below to sign'}
              </p>
            </div>

            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4 flex items-start">
                <div className="flex-shrink-0">
                  <svg className="h-6 w-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">
                    What happens next?
                  </h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc pl-5 space-y-1">
                      <li>Review the document</li>
                      <li>Fill in required information</li>
                      <li>Add your signature</li>
                      <li>Submit securely</li>
                    </ul>
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate(`/sign/${templateId}/complete`)}
                className="w-full flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Start Signing
                <ArrowRight className="ml-2 h-5 w-5" />
              </button>

              <div className="text-center text-sm text-gray-500">
                <p>This is a secure signing process.</p>
                <p>Your information is protected and encrypted.</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-8 py-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="h-4 w-4 text-green-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                Secure & Encrypted
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 text-blue-500 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Takes ~2 minutes
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
