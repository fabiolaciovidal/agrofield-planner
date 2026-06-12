import React, { useState } from 'react';
import { parseCSV, downloadTemplate } from '../utils/csvParser';
import * as api from '../services/api';

interface AdminImportProps {
    onBack: () => void;
    isOnline: boolean;
}

const AdminImport: React.FC<AdminImportProps> = ({ onBack }) => {
    const [importing, setImporting] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string, type: 'success' | 'error' } | null>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'Vendedores' | 'Campañas' | 'Plan de Ventas' | 'Clientes') => {
        const targetElement = e.target;
        const file = targetElement.files?.[0];
        if (!file) return;

        setImporting(type);
        setMessage(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                console.log("Comenzando a procesar archivo...");
                const content = event.target?.result as string;
                const data = parseCSV(content);

                console.log(`Importing ${type}:`, data);
                
                // Mapear el llamado real a la base de datos
                await api.bulkImport(type, data);
                
                console.log(`Finalizó bulkImport`);
                const syncText = type === 'Vendedores'
                    ? `Se procesaron ${data.length} registros para ${type}.`
                    : `¡Éxito! Se procesaron y sincronizaron ${data.length} registros para ${type}.`;
                setMessage({ text: syncText, type: 'success' });
            } catch (error) {
                console.error("Import failed:", error);
                const detail = error instanceof Error ? error.message : "Revisa el formato y tu conexión.";
                setMessage({ text: `Error al procesar el archivo. ${detail}`, type: 'error' });
            } finally {
                setImporting(null);
                targetElement.value = ''; // Reset input de forma segura
            }
        };
        reader.readAsText(file);
    };

    const sections = [
        { title: 'Vendedores', template: 'codigo,nombre,email,password,rol,activo\nV001,Juan Perez,juan@empresa.com,Demo1234,Vendedor,true\nADM,Fabio Admin,admin@empresa.com,Demo1234,Admin,true' },
        { title: 'Campañas', template: 'codigo,nombre,temporada,anio,activa\nC-2026-V,Campaña Verano 2026,Verano,2026,true\nC-2026-I,Campaña Invierno 2026,Invierno,2026,false' },
        { title: 'Plan de Ventas', template: 'id,codigo_vendedor,codigo_campana,monto_objetivo,avance_actual\nplan-v001-2026-v,V001,C-2026-V,500000,125000\nplan-v002-2026-v,V002,C-2026-V,750000,330000' },
        { title: 'Clientes', template: 'codigo_erp,nombre_finca,nombre_dueno,telefono,direccion,latitud,longitud,vendedor_codigo,cultivos,prioridad,estado_lead,estado_cuenta\nC001,Finca El Sol,Carlos Ruiz,70000001,Warnes,-17.516,-63.167,V001,Soya|Maiz,High,Prospect,OK\nC002,Estancia Luna,Ana Paz,70000002,Montero,-17.342,-63.255,V002,Arroz,Medium,Active,OK' }
    ];

    return (
        <div className="space-y-6 animate-fadeIn">
            <header className="flex items-center space-x-4">
                <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Carga de Datos (CSV)</h2>
                    <p className="text-gray-500 text-sm">Configuración de maestros y planes comerciales.</p>
                </div>
            </header>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium ${message.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {sections.map(section => (
                    <div key={section.title} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-gray-800">{section.title}</h3>
                            <button 
                                onClick={() => downloadTemplate(`${section.title.toLowerCase().replace(/ /g, '_')}_template.csv`, section.template)}
                                className="text-xs text-blue-600 hover:text-blue-800 font-bold flex items-center"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Plantilla
                            </button>
                        </div>
                        
                        <div className="relative border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-green-400 transition-colors group">
                            {importing === section.title ? (
                                <div className="flex flex-col items-center">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mb-2"></div>
                                    <p className="text-sm font-medium text-gray-600">Procesando...</p>
                                </div>
                            ) : (
                                <>
                                    <input 
                                        type="file" 
                                        accept=".csv"
                                        onChange={(e) => handleFileUpload(e, section.title as any)}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 mx-auto text-gray-300 group-hover:text-green-500 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                    </svg>
                                    <p className="text-sm text-gray-500 font-medium">Click o arrastra el archivo CSV</p>
                                    <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-wider">
                                        {section.title === 'Vendedores'
                                            ? 'COD, NOMBRE, EMAIL, PASSWORD, ROL'
                                            : section.title === 'Plan de Ventas'
                                                ? 'ID, VENDEDOR, CAMPAÑA, OBJETIVO, AVANCE'
                                                : section.title === 'Campañas'
                                                    ? 'COD, NOMBRE, TEMPORADA, AÑO, ACTIVA'
                                                    : 'FINCA, DUEÑO, VENDEDOR'}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-800 uppercase tracking-widest mb-2">Nota Técnica</h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                    La carga de clientes, campañas y planes comerciales se sincroniza con Supabase. Los vendedores no se crean desde aquí: para una demo multiusuario debes crearlos antes en Supabase Auth y luego usar sus códigos en clientes y planes.
                </p>
            </div>

            <div className="bg-red-50 p-6 rounded-2xl border border-red-100 mt-6 flex justify-between items-center">
                <div>
                    <h4 className="text-sm font-bold text-red-800 tracking-widest mb-1">Peligro: Borrado Masivo</h4>
                    <p className="text-xs text-red-700">Eliminará todos los clientes de tu base de datos local y de la nube.</p>
                </div>
                <button 
                    onClick={async () => {
                        if(window.confirm("¿Estás seguro de eliminar todos los clientes permanentemente?")) {
                            setImporting("Purgando...");
                            try {
                                await api.purgeAllClients();
                                setMessage({ text: "Todos los clientes han sido eliminados.", type: 'success' });
                            } catch (e) {
                                setMessage({ text: "Error al purgar clientes.", type: 'error' });
                            } finally {
                                setImporting(null);
                            }
                        }
                    }}
                    disabled={importing !== null}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm transition-colors"
                >
                    {importing === 'Purgando...' ? 'Borrando...' : 'Borrar Todos los Clientes'}
                </button>
            </div>
        </div>
    );
};

export default AdminImport;
