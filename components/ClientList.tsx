import React, { useState } from 'react';
import { Client } from '../types';
import Modal from './Modal';
import * as api from '../services/api';
import { getBestEffortCurrentPosition } from '../utils/geolocation';

const statusColorMap = {
  OK: 'bg-green-100 text-green-800',
  Overdue: 'bg-yellow-100 text-yellow-800',
  'At Risk': 'bg-red-100 text-red-800',
};

const WarningIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 ml-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.21 3.03-1.742 3.03H4.42c-1.532 0-2.492-1.696-1.742-3.03l5.58-9.92zM10 13a1 1 0 110-2 1 1 0 010 2zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
)

const LocationPinIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
    </svg>
);


interface AddClientModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateClient: (client: Client) => void;
    isOnline: boolean;
}

const AddClientModal: React.FC<AddClientModalProps> = ({ isOpen, onClose, onCreateClient, isOnline }) => {
    const [name, setName] = useState('');
    const [farmName, setFarmName] = useState('');
    const [address, setAddress] = useState('');
    const [phone, setPhone] = useState('');
    const [sellerCode, setSellerCode] = useState('');
    const [crops, setCrops] = useState('');
    const [priority, setPriority] = useState<Client['priority']>('Medium');
    const [lat, setLat] = useState<number | string>('');
    const [lon, setLon] = useState<number | string>('');
    const [erpCode, setErpCode] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [isGettingLocation, setIsGettingLocation] = useState(false);

    const resetForm = () => {
        setName('');
        setFarmName('');
        setAddress('');
        setPhone('');
        setSellerCode('');
        setCrops('');
        setPriority('Medium');
        setLat('');
        setLon('');
        setErpCode('');
        setLocationMessage('');
        setIsGettingLocation(false);
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };
    
    const handleGetCurrentLocation = () => {
        setIsGettingLocation(true);
        setLocationMessage('Obteniendo ubicación...');
        getBestEffortCurrentPosition({ maxCachedAgeMs: 30 * 60 * 1000 })
            .then((position) => {
                setLat(position.coords.lat.toFixed(6));
                setLon(position.coords.lon.toFixed(6));
                setIsGettingLocation(false);
                setLocationMessage(
                    position.source === 'cached'
                        ? 'Ubicación recuperada desde la última posición guardada.'
                        : 'Ubicación obtenida con éxito.'
                );
                setTimeout(() => setLocationMessage(''), 3000);
            })
            .catch((error: Error) => {
                console.error("Error getting location", error);
                setIsGettingLocation(false);
                setLocationMessage(`Error: ${error.message}. Habilite los permisos.`);
            });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const newClient: Omit<Client, 'id'> = {
            name,
            farmName,
            address,
            coords: { lat: Number(lat), lon: Number(lon) },
            contactPerson: name,
            phone,
            accountStatus: 'OK',
            leadStatus: 'Prospect',
            priority,
            crops: crops.split(',').map((crop) => crop.trim()).filter(Boolean),
            erpCode: erpCode || '',
            vendedorId: sellerCode || undefined,
        };
        const createdClient = await api.createClient(newClient, isOnline);
        onCreateClient(createdClient);
        handleClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={handleClose} title="Registrar Nuevo Cliente">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre del Cliente</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Código ERP (Opcional)</label>
                    <input type="text" value={erpCode} onChange={(e) => setErpCode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: A-100"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Nombre de la Finca</label>
                    <input type="text" value={farmName} onChange={(e) => setFarmName(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                </div>
                 <div>
                    <label className="block text-sm font-medium text-gray-700">Dirección</label>
                    <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Teléfono</label>
                        <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: 70000000"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Vendedor</label>
                        <input type="text" value={sellerCode} onChange={(e) => setSellerCode(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Ej: V001"/>
                    </div>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Cultivos</label>
                        <input type="text" value={crops} onChange={(e) => setCrops(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Soya, Maíz"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Prioridad</label>
                        <select value={priority} onChange={(e) => setPriority(e.target.value as Client['priority'])} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="High">Alta</option>
                            <option value="Medium">Media</option>
                            <option value="Low">Baja</option>
                        </select>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Ubicación de la Finca</label>
                    <button type="button" onClick={handleGetCurrentLocation} disabled={isGettingLocation} className="mt-1 w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:bg-gray-200 disabled:cursor-not-allowed">
                        <LocationPinIcon />
                        {isGettingLocation ? 'Obteniendo...' : 'Obtener Ubicación Actual'}
                    </button>
                    {locationMessage && <p className={`text-xs mt-1 ${locationMessage.startsWith('Error') ? 'text-red-500' : 'text-gray-500'}`}>{locationMessage}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Latitud</label>
                        <input type="number" step="any" value={lat} onChange={(e) => setLat(e.target.value)} required placeholder="-34.123456" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Longitud</label>
                        <input type="number" step="any" value={lon} onChange={(e) => setLon(e.target.value)} required placeholder="-56.123456" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"/>
                    </div>
                </div>

                <div className="flex justify-end space-x-2 pt-2">
                    <button type="button" onClick={handleClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancelar</button>
                    <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700">Guardar Cliente</button>
                </div>
            </form>
        </Modal>
    );
}

interface ClientListProps {
    clients: Client[];
    onCreateClient: (client: Client) => void;
    isOnline: boolean;
    onSelectClient: (client: Client) => void;
}

const ClientList: React.FC<ClientListProps> = ({ clients, onCreateClient, isOnline, onSelectClient }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const needsVisit = (lastVisitDate?: string): boolean => {
      if (!lastVisitDate) return true;
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      return new Date(lastVisitDate) < thirtyDaysAgo;
  }

  const filteredClients = clients.filter(client => 
    client.farmName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.erpCode && client.erpCode.toLowerCase().includes(searchTerm.toLowerCase()))
  );
    
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-semibold text-gray-700">Clientes</h2>
            <p className="text-gray-500">Tu cartera de clientes.</p>
        </div>
        <div className="flex space-x-2">
            <button onClick={() => setIsModalOpen(true)} className="px-4 py-2 font-semibold text-white bg-green-600 rounded-md hover:bg-green-700 whitespace-nowrap">
                + Añadir Cliente
            </button>
        </div>
      </div>

      <div className="relative">
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
            </svg>
        </span>
        <input 
            type="text" 
            placeholder="Buscar finca o cliente..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-green-500 focus:border-green-500 sm:text-sm"
        />
      </div>
      
      <AddClientModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreateClient={onCreateClient} isOnline={isOnline}/>

      <div className="space-y-4">
        {filteredClients.length > 0 ? (
          filteredClients.map(client => (
            <div 
                key={client.id} 
                onClick={() => onSelectClient(client)}
                className="bg-white p-4 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer border-l-4 border-transparent hover:border-green-500"
            >
                <div className="flex justify-between items-start">
                <div className="flex items-center">
                    <div>
                    <p className="font-bold text-lg text-gray-800">{client.farmName}</p>
                    <p className="text-sm text-gray-600">{client.name}</p>
                    <p className="text-xs text-gray-400">{client.address}</p>
                    </div>
                    {needsVisit(client.lastVisit) && <div title="Necesita visita (más de 30 días)"><WarningIcon/></div>}
                </div>
                <div className="flex flex-col items-end">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColorMap[client.accountStatus]}`}>
                        {client.accountStatus}
                    </span>
                    <span className="text-[10px] text-gray-400 mt-2 font-bold uppercase">{client.leadStatus}</span>
                </div>
                </div>
            </div>
          ))
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
            <p className="text-gray-400">No se encontraron clientes que coincidan con "{searchTerm}"</p>
          </div>
        )}
      </div>
    </div>
  );
};


export default ClientList;
