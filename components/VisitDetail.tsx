
import React, { useState, useEffect, useCallback } from 'react';
import { Visit, Client, Task } from '../types';
import * as api from '../services/api';
import AIAssistant from './AIAssistant';
import SignaturePad from './SignaturePad';
import OfflineMap from './OfflineMap';
import { getBestEffortCurrentPosition } from '../utils/geolocation';

interface VisitDetailProps {
  visit: Visit;
  onBack: () => void;
  onUpdateVisit: (visit: Visit) => void;
  isOnline: boolean;
}

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" /></svg>
);

const LocationIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
);


const VisitDetail: React.FC<VisitDetailProps> = ({ visit: initialVisit, onBack, onUpdateVisit, isOnline }) => {
  const [visit, setVisit] = useState<Visit>(initialVisit);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [photos, setPhotos] = useState<string[]>(initialVisit.photos || []);
  const [showDemoFix, setShowDemoFix] = useState(false);
  const [notesDraft, setNotesDraft] = useState(initialVisit.notes || '');
  
  useEffect(() => {
    setVisit(initialVisit);
    setPhotos(initialVisit.photos || []);
    setNotesDraft(initialVisit.notes || '');
    const fetchClient = async () => {
        const clients = await api.getClients(false); 
        const foundClient = clients.find(c => c.id === initialVisit.clientId);
        setClient(foundClient || null);
    }
    fetchClient();
  }, [initialVisit]);

  const haversineDistance = (coords1: {lat: number, lon: number}, coords2: {lat: number, lon: number}) => {
    const R = 6371e3; // metres
    const φ1 = coords1.lat * Math.PI/180;
    const φ2 = coords2.lat * Math.PI/180;
    const Δφ = (coords2.lat-coords1.lat) * Math.PI/180;
    const Δλ = (coords2.lon-coords1.lon) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };
  
  const handleCheckIn = useCallback(() => {
    if (!client) return;
    setLoading(true);
    setMessage('Obteniendo tu ubicación...');
    setShowDemoFix(false);

    getBestEffortCurrentPosition({ maxCachedAgeMs: 5 * 60 * 1000 })
      .then(async (position) => {
        const userCoords = position.coords;
        const distance = haversineDistance(userCoords, client.coords);

        if (distance <= 200) { // 200m tolerance
          const updatedVisitData = { ...visit, status: 'InProgress' as const, checkIn: { time: Date.now(), coords: userCoords } };
          const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
          onUpdateVisit(updatedVisit);
          let successMsg = `¡Check-in exitoso! Distancia: ${Math.round(distance)}m.`;
          if (position.source === 'cached') successMsg += ' Usando última ubicación guardada.';
          if (!isOnline) successMsg += " (Guardado localmente, se sincronizará más tarde)";
          setMessage(successMsg);
        } else {
          setMessage(`Check-in fallido. Estás a ${Math.round(distance)}m del cliente. (Debes estar a menos de 200m)`);
          setShowDemoFix(true);
        }
        setLoading(false);
      })
      .catch((error: Error) => {
        setMessage(`Error al obtener la ubicación: ${error.message}`);
        setLoading(false);
      });
  }, [client, visit, onUpdateVisit, isOnline]);

  const handleDemoFixLocation = () => {
      setLoading(true);
      getBestEffortCurrentPosition({ maxCachedAgeMs: 30 * 60 * 1000 })
        .then(async (position) => {
            if (client) {
                const updatedClient = { 
                    ...client, 
                    coords: position.coords
                };
                await api.updateClient(updatedClient, isOnline);
                setClient(updatedClient);
                setMessage("✅ Ubicación del cliente actualizada a tu posición actual (Modo Demo). Intenta hacer Check-In de nuevo.");
                setShowDemoFix(false);
            }
            setLoading(false);
        })
        .catch((error: Error) => {
             setMessage(`Error: ${error.message}`);
             setLoading(false);
        });
  };
  
  const handleCheckOut = async () => {
    const updatedVisitData = { ...visit, status: 'Completed' as const, checkOut: { time: Date.now() } };
    const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
    onUpdateVisit(updatedVisit);
    let successMsg = 'Visita completada y finalizada.';
    if (!isOnline) successMsg += " (Guardado localmente, se sincronizará más tarde)";
    setMessage(successMsg);
  };

  const handleAddTask = async () => {
      if (!newTaskDesc.trim()) return;
      const newTask: Task = {
          id: Date.now(),
          description: newTaskDesc,
          dueDate: new Date(new Date().setDate(new Date().getDate() + 7)).toISOString().split('T')[0], // Due in 7 days
          completed: false
      };
      const updatedVisitData = { ...visit, tasks: [...visit.tasks, newTask] };
      const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
      onUpdateVisit(updatedVisit);
      setNewTaskDesc('');
  };

  const handleSaveNotes = async () => {
      const updatedVisitData = { ...visit, notes: notesDraft };
      const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
      onUpdateVisit(updatedVisit);
      setMessage(!isOnline ? 'Notas guardadas localmente. Se sincronizarán más tarde.' : 'Notas guardadas.');
  };

  const handleSaveSignature = async (signature: string | null) => {
      if (!signature) return;
      const updatedVisitData = { ...visit, clientSignature: signature };
      const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
      onUpdateVisit(updatedVisit);
      setMessage(!isOnline ? 'Firma guardada localmente. Se sincronizará más tarde.' : 'Firma guardada.');
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (event.target.files) {
          const filePromises = Array.from(event.target.files).map(fileToBase64);
          const base64Photos = await Promise.all(filePromises);
          const newPhotos = [...photos, ...base64Photos];
          setPhotos(newPhotos);

          const updatedVisitData = { ...visit, photos: newPhotos };
          const updatedVisit = await api.updateVisit(updatedVisitData, isOnline);
          onUpdateVisit(updatedVisit);
          setMessage(`${base64Photos.length} foto(s) añadida(s).`);
      }
  };


  const getDuration = () => {
      if (!visit.checkIn || !visit.checkOut) return 'N/A';
      const durationMs = visit.checkOut.time - visit.checkIn.time;
      const minutes = Math.floor(durationMs / 60000);
      return `${minutes} minutos`;
  }

  if (!client) {
    return <div>Cargando datos del cliente...</div>;
  }

  return (
    <div className="space-y-6">
      <button onClick={onBack} className="text-green-600 hover:underline">&larr; Volver al Panel</button>
      <div className="bg-white p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800">{client.farmName}</h2>
        <p className="text-gray-500">{client.name} - {visit.timeSlot}</p>
        
        {message && <div className={`p-3 my-4 rounded-md text-sm ${message.includes('exitoso') || message.includes('completada') || message.includes('actualizada') ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{message}</div>}

        {showDemoFix && (
            <div className="p-4 mb-4 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-sm text-blue-800 mb-2 font-semibold">Modo Demo Activado:</p>
                <p className="text-xs text-blue-600 mb-3">Parece que estás probando la app lejos del cliente. ¿Quieres actualizar la ubicación de "{client.farmName}" a tu posición actual para probar el Check-In?</p>
                <button 
                    onClick={handleDemoFixLocation}
                    disabled={loading}
                    className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-md shadow-sm"
                >
                    {loading ? 'Actualizando...' : '📍 Mover Cliente a mi Ubicación'}
                </button>
            </div>
        )}

        {visit.checkIn?.coords && (
            <div className="my-4 h-64 border rounded-xl overflow-hidden shadow-inner">
                <OfflineMap 
                    center={visit.checkIn.coords} 
                    markerTitle="Tu ubicación al Check-In"
                    markers={[
                        { lat: client.coords.lat, lon: client.coords.lon, title: `Lugar de Finca: ${client.farmName}`, color: 'red' }
                    ]}
                />
            </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
            <button 
              onClick={handleCheckIn}
              disabled={loading || visit.status !== 'Planned'}
              className="w-full flex items-center justify-center p-3 font-bold text-white bg-green-600 rounded-md hover:bg-green-700 disabled:bg-gray-400 transition-colors"
            >
              <LocationIcon /> {loading ? 'Verificando...' : 'Check-In'}
            </button>
            <button 
              onClick={handleCheckOut}
              disabled={visit.status !== 'InProgress'}
              className="w-full flex items-center justify-center p-3 font-bold text-white bg-red-500 rounded-md hover:bg-red-600 disabled:bg-gray-400 transition-colors"
            >
              <CheckIcon /> Check-Out
            </button>
        </div>
         {visit.status === 'Completed' && (
            <div className="text-center text-green-700 font-semibold">
                Visita Completada. Duración: {getDuration()}
            </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
        <h3 className="text-xl font-semibold">Registro de Visita</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700">Notas</label>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm"
            rows={4}
            placeholder="Ingresa observaciones, conversaciones, etc."
          />
          <div className="mt-2 flex justify-end">
            <button onClick={handleSaveNotes} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm">
              Guardar Notas
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Fotos / Evidencia</label>
          <input type="file" multiple accept="image/*" onChange={handlePhotoUpload} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"/>
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photos.map((photo, index) => (
                <img key={index} src={photo} alt={`Evidencia ${index + 1}`} className="rounded-md object-cover h-24 w-full" />
            ))}
          </div>
        </div>
         <div>
          <label className="block text-sm font-medium text-gray-700">Tareas de Seguimiento</label>
            <ul className="list-disc pl-5 mt-2 text-sm text-gray-600">
                {visit.tasks.map(task => <li key={task.id}>{task.description}</li>)}
            </ul>
           <div className="flex space-x-2 mt-2">
              <input type="text" value={newTaskDesc} onChange={(e) => setNewTaskDesc(e.target.value)} className="block w-full rounded-md border-gray-300 shadow-sm focus:border-green-500 focus:ring-green-500 sm:text-sm" placeholder="Descripción de nueva tarea"/>
              <button onClick={handleAddTask} className="px-4 py-2 bg-green-600 text-white rounded-md text-sm whitespace-nowrap">Añadir Tarea</button>
           </div>
        </div>
      </div>
      
      {import.meta.env.VITE_ENABLE_AI_ASSISTANT === 'true' && (
        <AIAssistant isOnline={isOnline} />
      )}

      {import.meta.env.VITE_ENABLE_SIGNATURE === 'true' && (
        <div className="bg-white p-6 rounded-lg shadow-lg space-y-4">
            <h3 className="text-xl font-semibold">Aceptación de Compromiso</h3>
            <SignaturePad initialValue={visit.clientSignature} onSave={handleSaveSignature} />
        </div>
      )}

    </div>
  );
};

export default VisitDetail;
