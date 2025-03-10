import React, { useState } from 'react';
import { Check, Copy, X } from 'lucide-react';

interface ShareLinkPopupProps {
  link: string;
  onClose: () => void;
}

export const ShareLinkPopup: React.FC<ShareLinkPopupProps> = ({ link, onClose }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = link;
    tempInput.style.position = 'absolute'; // Make it invisible
    tempInput.style.left = '-9999px';     // Move it off-screen
    document.body.appendChild(tempInput);

    // Select the text
    tempInput.select();
    tempInput.setSelectionRange(0, 99999); // For mobile devices

    try {
      // Attempt to copy using the deprecated (but sometimes more permissive) method
      document.execCommand('copy');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // You could display an error message to the user here.
    } finally {
      // Remove the temporary input
      document.body.removeChild(tempInput);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg p-6 max-w-lg w-full space-y-4">
        <div className="flex justify-between items-start">
          <h3 className="text-lg font-semibold text-gray-900">Share Document</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="border border-gray-200 rounded-lg p-4">
            <a href={link} className="block text-center">
              <img
                src="https://fvvdqinsqguilxjjszcz.supabase.co/storage/v1/object/public/audit-photos/asset/sign-here.jpg"
                alt="Sign Here"
                className="w-[80px] mx-auto rounded-md shadow-sm"
              />
              <p className="mt-1 text-xs text-gray-600">
                Click here to sign the document
              </p>
            </a>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={link}
              readOnly
              className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            />
            <button
              onClick={handleCopy}
              className={`inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md ${
                copied
                  ? 'bg-green-100 text-green-800'
                  : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
              }`}
            >
              {copied ? (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </>
              )}
            </button>
          </div>

          <p className="text-sm text-gray-500">
            Copy and paste this link into your email to share the signing link.
          </p>
        </div>
      </div>
    </div>
  );
};
