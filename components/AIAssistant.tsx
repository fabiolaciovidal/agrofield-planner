import React, { useState } from 'react';
import { getAgronomicSuggestion } from '../services/api';
import { marked } from 'marked';

interface AIAssistantProps {
    isOnline: boolean;
}

const AIAssistant: React.FC<AIAssistantProps> = ({ isOnline }) => {
  const [crop, setCrop] = useState('');
  const [stage, setStage] = useState('');
  const [problem, setProblem] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGetSuggestion = async () => {
    setLoading(true);
    setSuggestion('');
    const result = await getAgronomicSuggestion(crop, stage, problem);
    const htmlResult = await marked.parse(result);
    setSuggestion(htmlResult);
    setLoading(false);
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
      <div className="flex items-center space-x-3">
        <div className="bg-green-100 p-2 rounded-full">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
        </div>
        <h3 className="text-xl font-semibold">Asistente Agronómico IA</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Cultivo</label>
          <input type="text" value={crop} onChange={(e) => setCrop(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" placeholder="ej., Soja" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Etapa Fenológica</label>
          <input type="text" value={stage} onChange={(e) => setStage(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" placeholder="ej., R3" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Problema Observado</label>
          <input type="text" value={problem} onChange={(e) => setProblem(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" placeholder="ej., Roya de la hoja" />
        </div>
      </div>
      <button 
        onClick={handleGetSuggestion} 
        disabled={loading || !crop || !stage || !problem || !isOnline}
        className="w-full p-3 font-bold text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
      >
        {loading ? 'Pensando...' : (!isOnline ? 'Se necesita conexión' : 'Obtener Sugerencia')}
      </button>

      {suggestion && (
        <div className="mt-4 p-4 bg-gray-50 rounded-md border border-gray-200">
          <h4 className="font-semibold text-gray-800 mb-2">Recomendación:</h4>
          <div className="prose prose-sm max-w-none text-gray-600" dangerouslySetInnerHTML={{ __html: suggestion }} />
        </div>
      )}
    </div>
  );
};

export default AIAssistant;
