import React, { useState } from 'react';
import { Visit, Client } from '../types';

import Modal from './Modal';
import * as api from '../services/api';

interface AddVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  clients: Client[];
  onCreateVisit: (visit: Visit) => void;
  isOnline: boolean;
}

const AddVisitModal: React.FC<AddVisitModalProps> = ({ isOpen, onClose, clients, onCreateVisit, isOnline }) => {
  const [clientId, setClientId] = useState<number | ''>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [timeSlot, setTimeSlot] = useState('09:00 - 11:00');

  const filteredClients = clients.filter(c => 
    c.farmName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.erpCode?.toLowerCase().includes(searchTerm.toLowerCase())
  ).slice(0, 10); // Limit to 10 for performance

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) {
        alert("Por favor selecciona un cliente de la lista.");
        return;
    }

    const newVisit: Omit<Visit, 'id'> = {
      clientId: Number(clientId),
      date,
      timeSlot,
      status: 'Planned',
      notes: '',
      photos: [],
      tasks: [],
      commitments: '',
    };

    const createdVisit = await api.createVisit(newVisit, isOnline);
    onCreateVisit(createdVisit);
    onClose();
    // Reset state
    setClientId('');
    setSearchTerm('');
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Añadir Nueva Visita">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700">Cliente</label>
          <div className="relative mt-1">
            <input
              type="text"
              placeholder="Escribe nombre, finca o código ERP..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowResults(true);
                if (!e.target.value) setClientId('');
              }}
              onFocus={() => setShowResults(true)}
              required
              className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm pl-10 h-11"
            />
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {showResults && searchTerm.length > 0 && (
            <div className="absolute z-50 mt-1 w-full bg-white shadow-xl rounded-xl border border-gray-100 max-h-60 overflow-y-auto animate-fadeIn">
              {filteredClients.length > 0 ? (
                filteredClients.map(client => (
                  <div 
                    key={client.id} 
                    className="p-3 hover:bg-green-50 cursor-pointer border-b border-gray-50 last:border-0 flex justify-between items-center"
                    onClick={() => {
                        setClientId(client.id);
                        setSearchTerm(client.farmName);
                        setShowResults(false);
                    }}
                  >
                    <div>
                        <p className="text-sm font-bold text-gray-800">{client.farmName}</p>
                        <p className="text-xs text-gray-500">{client.name} • {client.address.substring(0, 30)}...</p>
                    </div>
                    {client.erpCode && <span className="bg-gray-100 text-gray-600 text-[10px] px-2 py-1 rounded font-mono">{client.erpCode}</span>}
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">No se encontraron clientes</div>
              )}
            </div>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fecha</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Horario</label>
          <input
            type="text"
            value={timeSlot}
            onChange={(e) => setTimeSlot(e.target.value)}
            required
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
          />
        </div>
        <div className="flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Visita</button>
        </div>
      </form>
    </Modal>
  );
};

interface PlannerProps {
  visits: Visit[];
  clients: Client[];
  onSelectVisit: (visit: Visit) => void;
  onCreateVisit: (visit: Visit) => void;
  isOnline: boolean;
}

const Planner: React.FC<PlannerProps> = ({ visits, clients, onSelectVisit, onCreateVisit, isOnline }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const getWeekDays = () => {
    const today = new Date();
    const week = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() + i);
      week.push(day);
    }
    return week;
  };

  const weekDays = getWeekDays();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-gray-700">Agenda</h2>
          <p className="text-gray-500">Organiza tus visitas de la semana.</p>
        </div>
        <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap">
          + Nueva visita
        </button>
      </div>

      <AddVisitModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} clients={clients} onCreateVisit={onCreateVisit} isOnline={isOnline} />

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-7 gap-4">
        {weekDays.map(day => {
          const dayString = day.toISOString().split('T')[0];
          const visitsForDay = visits.filter(v => v.date === dayString);

          return (
            <div key={dayString} className="bg-gray-100 p-3 rounded-lg min-h-[200px]">
              <h4 className="font-bold text-center mb-3">
                {day.toLocaleDateString('es-ES', { weekday: 'short' })}
              </h4>
              <p className="text-xs text-gray-500 text-center mb-3">{day.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}</p>
              <div className="space-y-3">
                {visitsForDay.map(visit => {
                  const client = clients.find(c => c.id === visit.clientId);
                  return client ? (
                    <div key={visit.id} className="bg-white p-2 rounded shadow-sm cursor-pointer hover:shadow-md" onClick={() => onSelectVisit(visit)}>
                      <p className="text-sm font-semibold text-green-700">{client.farmName}</p>
                      <p className="text-xs text-gray-500">{visit.timeSlot}</p>
                    </div>
                  ) : null;
                })}
                {visitsForDay.length === 0 && <div className="text-center text-xs text-gray-400 pt-8">Sin visitas</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Planner;
