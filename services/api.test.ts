import { describe, expect, it } from 'vitest';
import { getUserFacingSyncError, isAuthenticationSessionError, parseImportedClients, reconcileClients, reconcileVisits } from './api';
import { Client, SyncAction, Visit } from '../types';

const makeClient = (id: number, name = 'Cliente'): Client => ({
    id,
    name,
    farmName: 'Finca',
    address: '',
    coords: { lat: -17.7, lon: -63.1 },
    contactPerson: name,
    phone: '',
    accountStatus: 'OK',
    leadStatus: 'Prospect',
    priority: 'Medium',
    crops: [],
    vendedorId: 'V001',
});

const makeVisit = (id: number, notes = ''): Visit => ({
    id,
    clientId: 1,
    date: '2026-07-18',
    timeSlot: '09:00 - 10:00',
    status: 'Planned',
    notes,
    photos: [],
    tasks: [],
    commitments: '',
    vendedorId: 'V001',
    campaignId: 'C-2026-V',
});

const makeAction = (
    id: string,
    type: SyncAction['type'],
    payload: SyncAction['payload'],
): SyncAction => ({
    id,
    type,
    payload,
    timestamp: 1,
});

describe('reconcileClients', () => {
    it('conserva un cliente creado offline aunque todavía no exista en la nube', () => {
        const offlineClient = makeClient(20, 'Creado offline');
        const result = reconcileClients(
            [makeClient(1, 'Remoto')],
            [makeAction('create-20', 'CREATE_CLIENT', offlineClient)],
        );

        expect(result).toEqual([
            makeClient(1, 'Remoto'),
            offlineClient,
        ]);
    });

    it('mantiene la edición local pendiente por encima de una versión remota antigua', () => {
        const updatedClient = makeClient(1, 'Nombre actualizado offline');
        const result = reconcileClients(
            [makeClient(1, 'Nombre remoto antiguo')],
            [makeAction('update-1', 'UPDATE_CLIENT', updatedClient)],
        );

        expect(result).toEqual([updatedClient]);
    });

    it('no restaura un cliente cuya eliminación sigue pendiente', () => {
        const result = reconcileClients(
            [makeClient(1), makeClient(2)],
            [makeAction('delete-1', 'DELETE_CLIENT', 1)],
        );

        expect(result.map((client) => client.id)).toEqual([2]);
    });
});

describe('reconcileVisits', () => {
    it('conserva una visita creada offline cuando la descarga remota está vacía', () => {
        const offlineVisit = makeVisit(50, 'Registrada sin conexión');
        const result = reconcileVisits(
            [],
            [makeAction('create-50', 'CREATE_VISIT', offlineVisit)],
        );

        expect(result).toEqual([offlineVisit]);
    });

    it('mantiene notas y cierre offline por encima del estado remoto anterior', () => {
        const completedVisit: Visit = {
            ...makeVisit(1, 'Nota offline'),
            status: 'Completed',
            checkOut: { time: 123456 },
        };
        const result = reconcileVisits(
            [makeVisit(1, 'Versión remota antigua')],
            [makeAction('update-1', 'UPDATE_VISIT', completedVisit)],
        );

        expect(result).toEqual([completedVisit]);
    });

    it('no altera visitas remotas que no tienen cambios pendientes', () => {
        const remoteVisit = makeVisit(1, 'Sin cambios');
        expect(reconcileVisits([remoteVisit], [])).toEqual([remoteVisit]);
    });
});

describe('parseImportedClients', () => {
    it('mapea coordenadas y campos de la plantilla sin alterarlos', () => {
        const [client] = parseImportedClients([{
            codigo_erp: 'C001',
            nombre_finca: 'Finca El Sol',
            nombre_dueno: 'Carlos Ruiz',
            latitud: '-17.516',
            longitud: '-63.167',
            vendedor_codigo: 'V001',
            cultivos: 'Soya|Maiz',
        }], 100);

        expect(client).toMatchObject({
            id: 100,
            erpCode: 'C001',
            name: 'Carlos Ruiz',
            farmName: 'Finca El Sol',
            coords: { lat: -17.516, lon: -63.167 },
            vendedorId: 'V001',
            crops: ['Soya', 'Maiz'],
        });
    });

    it('rechaza filas sin coordenadas en vez de inventar una ubicación', () => {
        expect(() => parseImportedClients([{
            nombre_finca: 'Sin ubicación',
            nombre_dueno: 'Cliente',
        }], 100)).toThrow('Fila 2: falta latitud');
    });

    it('rechaza coordenadas fuera del rango geográfico válido', () => {
        expect(() => parseImportedClients([{
            nombre_finca: 'Fuera de rango',
            nombre_dueno: 'Cliente',
            latitud: '-170',
            longitud: '-63',
        }], 100)).toThrow('Fila 2: latitud inválida');
    });
});

describe('getUserFacingSyncError', () => {
    it('protege los detalles internos de RLS', () => {
        const message = getUserFacingSyncError(new Error('new row violates row-level security policy | 42501'));
        expect(message).toContain('problema de permisos');
        expect(message).not.toContain('row-level security');
    });

    it('explica que los datos offline permanecen guardados', () => {
        expect(getUserFacingSyncError(new Error('Sin conexión a internet')))
            .toContain('siguen guardados');
    });

    it('usa un mensaje seguro para errores desconocidos', () => {
        expect(getUserFacingSyncError(new Error('internal detail'))).not.toContain('internal detail');
    });
});

describe('isAuthenticationSessionError', () => {
    it('detecta un refresh token vencido o inexistente', () => {
        expect(isAuthenticationSessionError(new Error('Invalid Refresh Token: Refresh Token Not Found'))).toBe(true);
    });

    it('no confunde un fallo de red con una sesión inválida', () => {
        expect(isAuthenticationSessionError(new Error('Failed to fetch'))).toBe(false);
    });
});
