import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface FormField {
  type: 'signature' | 'text' | 'date';
  position: { x: number; y: number; pageNumber: number };
  value: string;
  selected?: boolean;
  id?: string;
  label?: string;
}

interface PDFViewerProps {
  file: File | string;
  onSignaturePositionSelect: (position: { x: number; y: number; pageNumber: number }) => void;
  formFields: FormField[];
  scale?: number;
  onFieldSelect?: (fieldId: string) => void;
  onFieldMove?: (fieldId: string, position: { x: number; y: number; pageNumber: number }) => void;
  initialPage?: number;
  onFieldClick?: (field: FormField, event: React.MouseEvent) => void; // Corrected type
}

// Use forwardRef to expose methods to the parent component
export const PDFViewer = forwardRef<any, PDFViewerProps>(({
  file,
  onSignaturePositionSelect,
  formFields,
  scale = 1,
  onFieldSelect,
  onFieldMove,
  initialPage = 1,
  onFieldClick
}, ref) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState({ x: 0, y: 0 });
  const [dragFieldId, setDragFieldId] = useState<string | null>(null);
    const [pageRefs, setPageRefs] = useState<any[]>([]);

    useEffect(() => {
    setPageNumber(initialPage);
  }, [initialPage]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPageRefs(Array(numPages).fill(null).map(() => React.createRef()));
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    onSignaturePositionSelect({ x, y, pageNumber });
  };

  const handleDragStart = (e: React.MouseEvent, fieldId: string) => {
    e.stopPropagation();
    setIsDragging(true);
    setDragFieldId(fieldId);
    setDragStartPos({ x: e.clientX, y: e.clientY });
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (!isDragging || !dragFieldId || !onFieldMove) return;

    const container = containerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    onFieldMove(dragFieldId, { x, y, pageNumber });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDragFieldId(null);
  };

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => handleDragMove(e as unknown as React.MouseEvent);
      const handleMouseUp = () => handleDragEnd();

      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

    const scrollToPage = (page: number) => {
        if (pageRefs[page -1] && pageRefs[page - 1].current) {
            pageRefs[page - 1].current.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // Expose the scrollToPage method to the parent component
    useImperativeHandle(ref, () => ({
        scrollToPage
    }));

  const renderField = (field: FormField, index: number) => {
    if (field.position.pageNumber !== pageNumber) return null;

    const isSignature = field.type === 'signature';
    const hasValue = field.value && field.value.trim() !== '';

    const handleFieldClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (onFieldClick) {
        onFieldClick(field, e); // Pass the event object!
      } else if (onFieldSelect && field.id) {
        onFieldSelect(field.id);
      }
    };

    return (
      <div
        key={field.id || index}
        onMouseDown={(e) => field.id && handleDragStart(e, field.id)}
        onClick={handleFieldClick}
        style={{
          position: 'absolute',
          left: field.position.x * scale,
          top: field.position.y * scale,
          transform: `scale(${scale})`,
          transformOrigin: 'top left',
          cursor: isDragging ? 'grabbing' : onFieldClick ? 'pointer' : 'grab',
          maxWidth: isSignature ? '200px' : '150px',
          minWidth: isSignature ? '150px' : 'auto',
          minHeight: isSignature ? '40px' : 'auto',
          backgroundColor: hasValue ? 'transparent' : 'rgba(255, 255, 255, 0.5)',
          backdropFilter: hasValue ? 'none' : 'blur(2px)',
          transition: 'all 0.2s ease',
          padding: hasValue ? 0 : '4px',
          border: hasValue ? 'none' : '1px dashed rgba(59, 130, 246, 0.5)',
          borderRadius: '2px',
          zIndex: field.selected ? 20 : 10,
        }}
        className={`
          ${field.selected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
          ${isDragging && field.id === dragFieldId ? 'opacity-75' : ''}
          hover:border-blue-500
        `}
      >
        {isSignature && field.value ? (
          <img
            src={field.value}
            alt="Signature"
            className="max-h-12 object-contain"
            style={{
              filter: 'contrast(1.2) brightness(0.95)',
              maxWidth: '100%',
            }}
          />
        ) : hasValue ? (
          <div className="text-sm font-medium text-gray-900 py-0.5">
            {field.value}
          </div>
        ) : (
          <div className="text-xs text-blue-600 whitespace-nowrap">
            {field.type === 'signature' ? 'Click to sign here' : `Enter ${field.type}`}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <Document
        file={file}
        onLoadSuccess={onDocumentLoadSuccess}
        className="border border-gray-200 rounded-lg shadow-sm"
      >
        <div
          ref={containerRef}
          onClick={handleClick}
          style={{ position: 'relative' }}
          className="cursor-crosshair"
        >
          <Page
            pageNumber={pageNumber}
            scale={scale}
            className="rounded-lg"
            renderAnnotationLayer={false}
            renderTextLayer={false}
            ref={pageRefs[pageNumber - 1]}
          />

          {formFields.map((field, index) => renderField(field, index))}
        </div>
      </Document>

      {numPages && numPages > 1 && (
        <div className="flex items-center space-x-4">
          <button
            disabled={pageNumber <= 1}
            onClick={() => setPageNumber(pageNumber - 1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Previous
          </button>
          <p className="text-sm text-gray-600">
            Page {pageNumber} of {numPages}
          </p>
          <button
            disabled={pageNumber >= numPages}
            onClick={() => setPageNumber(pageNumber + 1)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
});
