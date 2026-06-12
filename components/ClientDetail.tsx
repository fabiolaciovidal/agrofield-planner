import React, { useState, useEffect } from 'react';
import { Client, Interaction, Task } from '../types';
import * as api from '../services/api';
import Spinner from './Spinner';
import OfflineMap from './OfflineMap';
import { getBestEffortCurrentPosition } from '../utils/geolocation';

interface ClientDetailProps {
    client: Client;
    onBack: () => void;
    isOnline: boolean;
    onUpdateClient: (updatedClient: Client) => void;
    onDeleteClient: (clientId: number) => void;
}

const ClientDetail: React.FC<ClientDetailProps> = ({ client, onBack, isOnline, onUpdateClient, onDeleteClient }) => {
    const [interactions, setInteractions] = useState<Interaction[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [newInteraction, setNewInteraction] = useState({ type: 'Meeting' as any, summary: '', details: '' });
    const [isAddingInteraction, setIsAddingInteraction] = useState(false);
    const [isEditingLocation, setIsEditingLocation] = useState(false);
    const [tempCoords, setTempCoords] = useState({ lat: client.coords.lat, lon: client.coords.lon });
    const [isCapturing, setIsCapturing] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            try {
                const [fetchedInteractions, fetchedTasks] = await Promise.all([
                    api.getInteractions(isOnline, client.id),
                    api.getTasks(isOnline, client.id)
                ]);
                setInteractions(fetchedInteractions);
                setTasks(fetchedTasks);
            } catch (error) {
                console.error("Failed to load CRM data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        loadData();
    }, [client.id, isOnline]);

    const handleUpdateStatus = async (field: 'leadStatus' | 'priority', value: string) => {
        const updatedClient = { ...client, [field]: value };
        const result = await api.updateClient(updatedClient, isOnline);
        onUpdateClient(result);
    };

    const handleAddInteraction = async () => {
        if (!newInteraction.summary) return;
        const interaction = await api.createInteraction({
            clientId: client.id,
            date: new Date().toISOString(),
            ...newInteraction
        }, isOnline);
        setInteractions([interaction, ...interactions]);
        setNewInteraction({ type: 'Meeting', summary: '', details: '' });
        setIsAddingInteraction(false);
    };

    const handleToggleTask = async (task: Task) => {
        const updatedTask = { ...task, completed: !task.completed };
        await api.upsertTask(updatedTask, isOnline);
        setTasks(tasks.map(t => t.id === task.id ? updatedTask : t));
    };

    const handleCaptureLocation = () => {
        setIsCapturing(true);
        getBestEffortCurrentPosition({ maxCachedAgeMs: 30 * 60 * 1000 })
            .then((position) => {
                setTempCoords(position.coords);
                setIsCapturing(false);
                alert(
                    position.source === 'cached'
                        ? "Se recuperó la última ubicación guardada. No olvides Guardar."
                        : "Ubicación capturada con éxito. No olvides Guardar."
                );
            })
            .catch((error: Error) => {
                console.error("Geolocation error:", error);
                setIsCapturing(false);
                alert(`No se pudo obtener la ubicación. ${error.message}`);
            });
    };

    const handleSaveLocation = async () => {
        const updatedClient = { ...client, coords: tempCoords };
        const result = await api.updateClient(updatedClient, isOnline);
        onUpdateClient(result);
        setIsEditingLocation(false);
    };

    if (isLoading) return <div className="flex justify-center p-12"><Spinner /></div>;

    return (
        <div className="space-y-6">
            <header className="flex items-center space-x-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">{client.farmName}</h2>
                    <p className="text-gray-500">{client.name} • {client.phone}</p>
                </div>
            </header>

            {/* Quick Actions Bar */}
            <div className="flex gap-4">
                <a 
                    href={`tel:${client.phone}`} 
                    className="flex-1 bg-green-50 text-green-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-green-100 transition-colors border border-green-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C10.119 18 2 9.881 2 2z" />
                    </svg>
                    <span>Llamar</span>
                </a>
                <a 
                    href={`https://www.google.com/maps/search/?api=1&query=${client.coords.lat},${client.coords.lon}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex-1 bg-blue-50 text-blue-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-blue-100 transition-colors border border-blue-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Navegar</span>
                </a>
                <button 
                    onClick={() => setIsEditingLocation(!isEditingLocation)}
                    className="flex-1 bg-purple-50 text-purple-700 font-bold py-3 px-4 rounded-xl flex items-center justify-center space-x-2 hover:bg-purple-100 transition-colors border border-purple-200"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span>Ubicación</span>
                </button>
            </div>

            {/* Interactive Map Section */}
            <div className="h-64 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <OfflineMap 
                    center={client.coords} 
                    markerTitle={client.farmName} 
                    markers={[{ lat: client.coords.lat, lon: client.coords.lon, title: client.farmName, color: 'green' }]}
                />
            </div>

            {/* Location Edit Form */}
            {isEditingLocation && (
                <div className="bg-purple-50 p-6 rounded-xl border border-purple-100 animate-fadeIn">
                    <h3 className="text-sm font-bold text-purple-800 uppercase tracking-wider mb-4">Ajustar Ubicación de Finca</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-xs text-purple-600 mb-1">Latitud</label>
                            <input 
                                type="number" 
                                value={tempCoords.lat}
                                onChange={(e) => setTempCoords({...tempCoords, lat: parseFloat(e.target.value)})}
                                className="w-full text-sm border-purple-200 rounded-lg focus:ring-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-purple-600 mb-1">Longitud</label>
                            <input 
                                type="number" 
                                value={tempCoords.lon}
                                onChange={(e) => setTempCoords({...tempCoords, lon: parseFloat(e.target.value)})}
                                className="w-full text-sm border-purple-200 rounded-lg focus:ring-purple-500"
                            />
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button 
                            onClick={handleCaptureLocation}
                            disabled={isCapturing}
                            className="flex-1 py-2 px-4 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center"
                        >
                            {isCapturing ? "Capturando..." : "Capturar GPS Actual"}
                        </button>
                        <button 
                            onClick={handleSaveLocation}
                            className="flex-1 py-2 px-4 bg-green-600 text-white rounded-lg text-sm font-bold hover:bg-green-700 transition-colors"
                        >
                            Guardar Ubicación
                        </button>
                        <button 
                            onClick={() => setIsEditingLocation(false)}
                            className="py-2 px-4 bg-white text-gray-500 border border-gray-200 rounded-lg text-sm font-bold hover:bg-gray-50 transition-colors"
                        >
                            Cancelar
                        </button>
                    </div>
                    <p className="text-[10px] text-purple-400 mt-3 italic text-center">
                        * Capturar GPS guardará tu posición exacta en este momento.
                    </p>
                </div>
            )}


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Status Sidebar */}
                <div className="md:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Estado del Cliente</h3>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Estatus de Lead</label>
                                <select 
                                    value={client.leadStatus} 
                                    onChange={(e) => handleUpdateStatus('leadStatus', e.target.value)}
                                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="Prospect">Prospecto</option>
                                    <option value="Active">Activo</option>
                                    <option value="Inactive">Inactivo</option>
                                    <option value="Lost">Perdido</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs text-gray-500 mb-1">Prioridad</label>
                                <select 
                                    value={client.priority} 
                                    onChange={(e) => handleUpdateStatus('priority', e.target.value)}
                                    className="w-full text-sm border-gray-200 rounded-lg focus:ring-green-500 focus:border-green-500"
                                >
                                    <option value="High">Alta</option>
                                    <option value="Medium">Media</option>
                                    <option value="Low">Baja</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">Información</h3>
                        <div className="text-sm space-y-2">
                            <p><span className="text-gray-500">Dirección:</span><br/>{client.address}</p>
                            {client.erpCode && <p><span className="text-gray-500">Código ERP:</span><br/>{client.erpCode}</p>}
                            <p><span className="text-gray-500">Cultivos:</span><br/>{client.crops.join(', ')}</p>
                            <p><span className="text-gray-500">Última Visita:</span><br/>{client.lastVisit || 'Ninguna'}</p>
                        </div>
                    </div>

                    <button 
                        onClick={async () => {
                            if (window.confirm(`¿Estás seguro de eliminar a ${client.farmName}? Se borrarán todas las visitas e interacciones asociadas.`)) {
                                await api.deleteClient(client.id, isOnline);
                                onDeleteClient(client.id);
                                onBack();
                            }
                        }}
                        className="w-full py-2 px-4 border border-red-200 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors"
                    >
                        Eliminar Cliente
                    </button>
                </div>

                {/* Main CRM Content */}
                <div className="md:col-span-2 space-y-6">
                    {/* Tasks */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-bold text-gray-800">Tareas Pendientes</h3>
                        </div>
                        <div className="space-y-2">
                            {tasks.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No hay tareas pendientes.</p>
                            ) : (
                                tasks.map(task => (
                                    <div key={task.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-lg group">
                                        <input 
                                            type="checkbox" 
                                            checked={task.completed} 
                                            onChange={() => handleToggleTask(task)}
                                            className="h-4 w-4 text-green-600 border-gray-300 rounded focus:ring-green-500"
                                        />
                                        <span className={`text-sm flex-grow ${task.completed ? 'line-through text-gray-400' : 'text-gray-700'}`}>
                                            {task.description}
                                        </span>
                                        <span className="text-xs text-gray-400">{task.dueDate}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    {/* Interaction Log */}
                    <section className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Notas del cliente</h3>
                            {!isAddingInteraction && (
                                <button 
                                    onClick={() => setIsAddingInteraction(true)}
                                    className="text-sm font-semibold text-green-600 hover:text-green-700"
                                >
                                    + Nueva nota
                                </button>
                            )}
                        </div>

                        {isAddingInteraction && (
                            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                                <div className="flex gap-4">
                                    <select 
                                        value={newInteraction.type} 
                                        onChange={(e) => setNewInteraction({...newInteraction, type: e.target.value as any})}
                                        className="text-sm border-gray-200 rounded-lg"
                                    >
                                        <option value="Call">Llamada</option>
                                        <option value="Email">Correo</option>
                                        <option value="Meeting">Reunión</option>
                                        <option value="Note">Nota</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        placeholder="Resumen rápido..."
                                        value={newInteraction.summary}
                                        onChange={(e) => setNewInteraction({...newInteraction, summary: e.target.value})}
                                        className="flex-grow text-sm border-gray-200 rounded-lg"
                                    />
                                </div>
                                <textarea 
                                    placeholder="Detalles adicionales..."
                                    value={newInteraction.details}
                                    onChange={(e) => setNewInteraction({...newInteraction, details: e.target.value})}
                                    className="w-full text-sm border-gray-200 rounded-lg h-20"
                                />
                                <div className="flex justify-end space-x-2">
                                    <button onClick={() => setIsAddingInteraction(false)} className="text-xs text-gray-500 px-3 py-1 hover:bg-gray-100 rounded">Cancelar</button>
                                    <button onClick={handleAddInteraction} className="text-xs text-white bg-green-600 px-3 py-1 hover:bg-green-700 rounded font-semibold">Guardar</button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {interactions.length === 0 ? (
                                <p className="text-sm text-gray-400 italic">No hay notas registradas.</p>
                            ) : (
                                interactions.map(interaction => (
                                    <div key={interaction.id} className="relative pl-6 pb-6 border-l border-gray-100 last:pb-0">
                                        <div className="absolute left-[-5px] top-1 h-2.5 w-2.5 rounded-full bg-green-500 shadow-[0_0_0_4px_white]"></div>
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="text-xs font-bold text-green-600 uppercase tracking-wide">{interaction.type}</span>
                                            <span className="text-xs text-gray-400">{new Date(interaction.date).toLocaleDateString()}</span>
                                        </div>
                                        <h4 className="text-sm font-bold text-gray-800">{interaction.summary}</h4>
                                        <p className="text-sm text-gray-600 mt-1">{interaction.details}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default ClientDetail;
