import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black bg-opacity-50 p-2 sm:items-center sm:p-4">
      <div className="my-2 max-h-[calc(100dvh-1rem)] w-full max-w-md overflow-y-auto rounded-lg bg-white shadow-xl sm:my-4 sm:max-h-[calc(100dvh-2rem)]">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b bg-white p-4">
          <h3 className="min-w-0 break-words text-lg font-semibold">{title}</h3>
          <button onClick={onClose} aria-label="Cerrar" className="shrink-0 px-2 text-2xl leading-none text-gray-400 hover:text-gray-600">&times;</button>
        </div>
        <div className="p-4">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Modal;