import React, { useRef, useEffect, useState } from 'react';

interface SignaturePadProps {
  initialValue?: string;
  onSave: (signature: string | null) => void;
  disabled?: boolean;
}

const SignaturePad: React.FC<SignaturePadProps> = ({ initialValue, onSave, disabled = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [signature, setSignature] = useState<string | null>(initialValue || null);

  const getContext = () => canvasRef.current?.getContext('2d');

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        if (initialValue) {
          const image = new Image();
          image.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          };
          image.src = initialValue;
        }
      }
    }
  }, [initialValue]);

  const getCoords = (event: React.MouseEvent | React.TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    if ('touches' in event) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    const ctx = getContext();
    if (ctx) {
      const { x, y } = getCoords(event);
      ctx.beginPath();
      ctx.moveTo(x, y);
      setIsDrawing(true);
    }
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (ctx) {
      const { x, y } = getCoords(event);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    const ctx = getContext();
    if (ctx) {
      ctx.closePath();
      setIsDrawing(false);
      if (canvasRef.current) {
        setSignature(canvasRef.current.toDataURL('image/png'));
      }
    }
  };

  const clearPad = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        setSignature(null);
      }
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">Firma del Cliente</label>
      <div className="mt-1 relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full border border-gray-300 rounded-md bg-gray-50 touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
      <div className="flex justify-end mt-2 space-x-2">
        <button onClick={clearPad} className="text-sm text-gray-600 hover:text-red-600">Limpiar</button>
        <button
          onClick={() => onSave(signature)}
          disabled={disabled || !signature}
          className="text-sm px-4 py-1 bg-green-600 text-white rounded-md disabled:bg-gray-400"
        >
          Guardar Firma
        </button>
      </div>
    </div>
  );
};

export default SignaturePad;
