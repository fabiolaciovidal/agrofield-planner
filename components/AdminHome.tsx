import React from 'react';
import { View } from '../types';

interface AdminHomeProps {
  setView: (view: View) => void;
}

const AdminHome: React.FC<AdminHomeProps> = ({ setView }) => {
  const items = [
    {
      title: 'Crear usuarios',
      description: 'Alta de vendedores, gerentes y administradores.',
      action: () => setView(View.ADMIN_USERS),
    },
    {
      title: 'Cargar datos',
      description: 'Importar clientes, campañas y planes desde CSV.',
      action: () => setView(View.ADMIN_IMPORT),
    },
    {
      title: 'Resumen comercial',
      description: 'Ver cumplimiento por vendedor y campaña.',
      action: () => setView(View.ADMIN_COMMERCIAL),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-800">Administrar</h2>
        <p className="text-sm text-gray-500">Opciones internas para preparar y revisar la operación.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <button
            key={item.title}
            onClick={item.action}
            className="rounded-2xl border border-gray-100 bg-white p-6 text-left shadow-sm transition-colors hover:border-green-200 hover:bg-green-50"
          >
            <h3 className="text-lg font-bold text-gray-900">{item.title}</h3>
            <p className="mt-2 text-sm text-gray-500">{item.description}</p>
            <span className="mt-5 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white">
              Abrir
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default AdminHome;
