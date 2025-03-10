import React, { useRef, useEffect, useState } from 'react';

interface SignatureCanvasProps {
  onSave: (signature: string) => void;
  width?: number;
  height?: number;
  onCancel?: () => void;
}

export const SignatureCanvas: React.FC<SignatureCanvasProps> = ({
  onSave,
  width = 500,
  height = 200,
  onCancel
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [name, setName] = useState('');
  const [lastPoint, setLastPoint] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000';
    ctx.fillStyle = '#000';
    setContext(ctx);

    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#000';

    const handleResize = () => {
        const canvas = canvasRef.current;
        if(!canvas) return;
        // Clear the canvas
        context?.clearRect(0, 0, canvas.width, canvas.height);
    }

    window.addEventListener('resize', handleResize);
        return () => {
        window.removeEventListener('resize', handleResize);
    }
  }, [context]);

  const getPointFromEvent = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      // Touch event
      if (e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        return null; // No touches
      }
    } else {
      // Mouse event
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling on touch devices
    if (!context) return;

    setIsDrawing(true);
    const point = getPointFromEvent(e);
    if (point) {
      setLastPoint(point);
      context.beginPath();
      context.moveTo(point.x, point.y);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault(); // Prevent scrolling
    if (!isDrawing || !context || !lastPoint) return;

    const point = getPointFromEvent(e);
    if (!point) return;

    const midPoint = {
      x: lastPoint.x + (point.x - lastPoint.x) * 0.5,
      y: lastPoint.y + (point.y - lastPoint.y) * 0.5
    };

    context.beginPath();
    context.moveTo(lastPoint.x, lastPoint.y);
    context.quadraticCurveTo(
      midPoint.x,
      midPoint.y,
      point.x,
      point.y
    );
    context.stroke();

    setLastPoint(point);
  };

  const stopDrawing = () => {
    if (!context) return;
    setIsDrawing(false);
    setLastPoint(null);
    context.closePath();
  };

  const clear = () => {
    if (!context || !canvasRef.current) return;

    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    context.fillStyle = '#000';
  };

  const generateSignature = () => {
    if (!context || !canvasRef.current || !name.trim()) return;

    clear();

    const fontSize = Math.min(50, canvasRef.current.width / (name.length * 0.7));
    context.font = `italic ${fontSize}px "Brush Script MT", "Dancing Script", cursive`;
    context.fillStyle = '#000';

    const textMetrics = context.measureText(name);
    const x = (canvasRef.current.width - textMetrics.width) / 2;
    const y = canvasRef.current.height / 2;

    context.fillText(name, x, y);
  };

  const saveSignature = () => {
    if (!canvasRef.current) return;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvasRef.current.width;
    tempCanvas.height = canvasRef.current.height;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) return;

    tempCtx.fillStyle = '#fff';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(canvasRef.current, 0, 0);

    const dataUrl = tempCanvas.toDataURL('image/png');
    onSave(dataUrl);
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div className="w-full max-w-md">
        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
          Enter your name
        </label>
        <div className="flex space-x-2">
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            placeholder="Type your name"
          />
          <button
            onClick={generateSignature}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
            disabled={!name.trim()}
          >
            Generate
          </button>
        </div>
      </div>

      <div className="text-sm text-gray-500 text-center">
        Draw your signature below or generate it from your name
      </div>

      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className="cursor-crosshair"
        />
      </div>

      <div className="flex space-x-4">
        <button
          onClick={clear}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          Clear
        </button>
        <button
          onClick={saveSignature}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Save Signature
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
};
