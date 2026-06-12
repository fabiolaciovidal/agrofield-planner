
import React from 'react';
import { Visit, Client } from '../types';

interface VisitCardProps {
  visit: Visit;
  client: Client;
  onSelectVisit: (visit: Visit) => void;
}

const statusStyles: { [key: string]: { bg: string, text: string, border: string } } = {
  Planned: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
  InProgress: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-300' },
  Completed: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
  Cancelled: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300' },
};

export const VisitCard: React.FC<VisitCardProps> = ({ visit, client, onSelectVisit }) => {
  const style = statusStyles[visit.status] || statusStyles['Planned'];

  return (
    <div
      onClick={() => onSelectVisit(visit)}
      className={`bg-white p-4 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer border-l-4 ${style.border}`}
    >
      <div className="flex justify-between items-start">
        <div>
          <p className="font-bold text-gray-800">{client.farmName}</p>
          <p className="text-sm text-gray-500">{client.name}</p>
        </div>
        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${style.bg} ${style.text}`}>
          {visit.status}
        </span>
      </div>
      <div className="mt-2 text-sm text-gray-600 flex items-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        <span>{visit.timeSlot}</span>
      </div>
    </div>
  );
};
