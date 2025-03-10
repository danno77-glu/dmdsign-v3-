import React, { useState, useRef } from 'react';
import { PDFViewer } from './PDFViewer';
import { Grip, X, ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

interface FormField {
  type: 'signature' | 'text' | 'date';
  position: { x: number; y: number; pageNumber: number };
  label: string;
  required: boolean;
  id: string;
}

interface DocumentEditorProps {
  file: File;
  onSave: (fields: FormField[]) => void;
  onCancel: () => void;
}

export const DocumentEditor: React.FC<DocumentEditorProps> = ({
  file,
  onSave,
  onCancel
}) => {
  const [fields, setFields] = useState<FormField[]>([]);
  const [selectedFieldType, setSelectedFieldType] = useState<'signature' | 'text' | 'date'>('signature');
  const [fieldLabel, setFieldLabel] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [moveAmount, setMoveAmount] = useState(1);

  const handlePositionSelect = (position: { x: number; y: number; pageNumber: number }) => {
    if (!fieldLabel.trim()) return;

    const newField: FormField = {
      type: selectedFieldType,
      position,
      label: fieldLabel,
      required: isRequired,
      id: Math.random().toString(36).substr(2, 9)
    };

    setFields([...fields, newField]);
    setFieldLabel('');
    setSelectedFieldId(newField.id);
  };

  const handleFieldMove = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (!selectedFieldId) return;

    setFields(prevFields => 
      prevFields.map(field => {
        if (field.id !== selectedFieldId) return field;

        const newPosition = { ...field.position };

        switch (direction) {
          case 'up':
            newPosition.y -= moveAmount;
            break;
          case 'down':
            newPosition.y += moveAmount;
            break;
          case 'left':
            newPosition.x -= moveAmount;
            break;
          case 'right':
            newPosition.x += moveAmount;
            break;
        }

        return { ...field, position: newPosition };
      })
    );
  };

  const handleFieldDrag = (fieldId: string, newPosition: { x: number; y: number; pageNumber: number }) => {
    setFields(prevFields =>
      prevFields.map(field =>
        field.id === fieldId
          ? { ...field, position: newPosition }
          : field
      )
    );
  };

  const handleFieldSelect = (fieldId: string) => {
    setSelectedFieldId(fieldId);
  };

  const handleFieldDelete = (fieldId: string) => {
    setFields(fields.filter(f => f.id !== fieldId));
    if (selectedFieldId === fieldId) {
      setSelectedFieldId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-6">
          <div className="space-y-4 w-1/3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Label
              </label>
              <input
                type="text"
                value={fieldLabel}
                onChange={(e) => setFieldLabel(e.target.value)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="Enter field label"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Field Type
              </label>
              <select
                value={selectedFieldType}
                onChange={(e) => setSelectedFieldType(e.target.value as any)}
                className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="signature">Signature</option>
                <option value="text">Text</option>
                <option value="date">Date</option>
              </select>
            </div>
            <div className="flex items-center">
              <input
                type="checkbox"
                id="required"
                checked={isRequired}
                onChange={(e) => setIsRequired(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="required" className="ml-2 text-sm text-gray-700">
                Required field
              </label>
            </div>
          </div>

          {selectedFieldId && (
            <div className="bg-gray-50 p-4 rounded-lg space-y-4">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Fine-tune Position</h4>
              <div className="flex items-center space-x-2 mb-4">
                <label className="text-sm text-gray-600">Step Size:</label>
                <select
                  value={moveAmount}
                  onChange={(e) => setMoveAmount(Number(e.target.value))}
                  className="text-sm border-gray-300 rounded-md"
                >
                  <option value="0.5">0.5px</option>
                  <option value="1">1px</option>
                  <option value="5">5px</option>
                  <option value="10">10px</option>
                </select>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div></div>
                <button
                  onClick={() => handleFieldMove('up')}
                  className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                >
                  <ArrowUp className="w-4 h-4" />
                </button>
                <div></div>
                <button
                  onClick={() => handleFieldMove('left')}
                  className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div className="flex items-center justify-center">
                  <Grip className="w-4 h-4 text-gray-400" />
                </div>
                <button
                  onClick={() => handleFieldMove('right')}
                  className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                >
                  <ArrowRight className="w-4 h-4" />
                </button>
                <div></div>
                <button
                  onClick={() => handleFieldMove('down')}
                  className="p-2 text-gray-700 hover:bg-gray-200 rounded"
                >
                  <ArrowDown className="w-4 h-4" />
                </button>
                <div></div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-medium text-gray-700">
              Click to place or drag to move fields
            </h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setScale(s => Math.max(0.5, s - 0.1))}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                -
              </button>
              <span className="text-sm text-gray-600">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale(s => Math.min(2, s + 0.1))}
                className="p-2 text-gray-700 hover:bg-gray-100 rounded"
              >
                +
              </button>
            </div>
          </div>
          <PDFViewer
            file={file}
            scale={scale}
            onSignaturePositionSelect={handlePositionSelect}
            formFields={fields.map(field => ({
              ...field,
              value: field.label,
              selected: field.id === selectedFieldId
            }))}
            onFieldSelect={handleFieldSelect}
            onFieldMove={handleFieldDrag}
          />
        </div>

        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700 mb-2">Placed Fields</h3>
          <div className="space-y-2">
            {fields.map((field) => (
              <div
                key={field.id}
                className={`flex items-center justify-between p-2 rounded ${
                  field.id === selectedFieldId ? 'bg-blue-50 border border-blue-200' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleFieldSelect(field.id)}
                    className="text-gray-700 hover:text-gray-900"
                  >
                    <Grip className="w-4 h-4" />
                  </button>
                  <span className="text-sm font-medium">{field.label}</span>
                  <span className="text-xs text-gray-500">({field.type})</span>
                </div>
                <button
                  onClick={() => handleFieldDelete(field.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-4">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={() => onSave(fields)}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
          disabled={fields.length === 0}
        >
          Save Template
        </button>
      </div>
    </div>
  );
};
