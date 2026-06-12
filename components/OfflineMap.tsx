import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';

interface OfflineMapProps {
    center: { lat: number, lon: number };
    markerTitle?: string;
    markers?: { lat: number, lon: number, title: string, color?: 'red' | 'green' | 'blue' }[];
    zoom?: number;
}

const OfflineMap: React.FC<OfflineMapProps> = ({ center, markerTitle, markers = [], zoom = 13 }) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<L.Map | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadProgress, setDownloadProgress] = useState(0);

    useEffect(() => {
        if (!mapRef.current) return;

        // Leaflet icon fix for Vite/Webpack
        delete (L.Icon.Default.prototype as any)._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
            iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
        });

        if (!mapInstance.current) {
            mapInstance.current = L.map(mapRef.current).setView([center.lat, center.lon], zoom);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                crossOrigin: true
            }).addTo(mapInstance.current);
        } else {
            mapInstance.current.setView([center.lat, center.lon], zoom);
        }

        // Clear existing markers
        mapInstance.current.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
                mapInstance.current?.removeLayer(layer);
            }
        });

        // Add main marker
        if (markerTitle) {
            L.marker([center.lat, center.lon]).addTo(mapInstance.current).bindPopup(markerTitle);
        }

        // Add extra markers
        markers.forEach(m => {
            const icon = L.divIcon({
                className: 'custom-div-icon',
                html: `<div style="background-color: ${m.color || 'blue'}; width: 12px; height: 12px; border-radius: 50%; border: 2px solid white;"></div>`,
                iconSize: [12, 12],
                iconAnchor: [6, 6]
            });
            L.marker([m.lat, m.lon], { icon }).addTo(mapInstance.current!).bindPopup(m.title);
        });

        return () => {
             // We keep the instance for performance if center changes slightly, 
             // but if component unmounts we should clean up.
             // However, in React strict mode this might be tricky.
        };
    }, [center, markerTitle, markers, zoom]);

    const downloadArea = async () => {
        if (!mapInstance.current) return;
        setIsDownloading(true);
        setDownloadProgress(0);

        const bounds = mapInstance.current.getBounds();
        const zoomLevels = [zoom, zoom + 1, zoom + 2]; // Cache current and two deeper levels
        const cache = await caches.open('map-tiles');
        
        const urls: string[] = [];

        function lon2tile(lon: number, zoom: number) { return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom))); }
        function lat2tile(lat: number, zoom: number) { return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom))); }

        for (const z of zoomLevels) {
            const xMin = lon2tile(bounds.getWest(), z);
            const xMax = lon2tile(bounds.getEast(), z);
            const yMin = lat2tile(bounds.getNorth(), z);
            const yMax = lat2tile(bounds.getSouth(), z);

            for (let x = xMin; x <= xMax; x++) {
                for (let y = yMin; y <= yMax; y++) {
                    urls.push(`https://a.tile.openstreetmap.org/${z}/${x}/${y}.png`);
                    urls.push(`https://b.tile.openstreetmap.org/${z}/${x}/${y}.png`);
                    urls.push(`https://c.tile.openstreetmap.org/${z}/${x}/${y}.png`);
                }
            }
        }

        const total = urls.length;
        let count = 0;

        // Process in chunks to avoid blocking
        const chunkSize = 10;
        for (let i = 0; i < urls.length; i += chunkSize) {
            const chunk = urls.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (url) => {
                try {
                    const response = await fetch(url);
                    if (response.ok) await cache.put(url, response);
                } catch (e) {
                    // Ignore failures
                }
                count++;
            }));
            setDownloadProgress(Math.round((count / total) * 100));
        }

        setIsDownloading(false);
        alert("Mapa de zona descargado para uso offline.");
    };

    return (
        <div className="relative w-full h-full min-h-[300px] rounded-2xl overflow-hidden border border-gray-200 shadow-inner bg-gray-50">
            <div ref={mapRef} className="w-full h-full" />
            <button 
                onClick={downloadArea}
                disabled={isDownloading}
                className="absolute top-4 right-4 z-[1000] bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-lg border border-gray-100 flex items-center space-x-2 text-xs font-bold hover:bg-white transition-all disabled:opacity-50"
            >
                {isDownloading ? (
                    <>
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-green-600"></div>
                        <span className="text-green-700">{downloadProgress}%</span>
                    </>
                ) : (
                    <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span className="text-gray-700 uppercase tracking-tight">Mapa Offline</span>
                    </>
                )}
            </button>
        </div>
    );
};

export default OfflineMap;
