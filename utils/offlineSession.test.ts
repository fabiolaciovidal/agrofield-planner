import { describe, expect, it } from 'vitest';
import { readOfflineSessionUser } from './offlineSession';

const storageWith = (value: string | null) => ({
  getItem: () => value,
});

describe('offline session storage', () => {
  it('recupera un usuario previamente autenticado', () => {
    const user = { name: 'QA Vendedor', role: 'Vendedor', username: 'qa@agrocentro.com.bo', sellerCode: 'QA-V01' };
    expect(readOfflineSessionUser(storageWith(JSON.stringify(user)), 'session')).toEqual(user);
  });

  it('ignora datos dañados o incompletos', () => {
    expect(readOfflineSessionUser(storageWith('{invalido'), 'session')).toBeNull();
    expect(readOfflineSessionUser(storageWith(JSON.stringify({ name: 'Sin usuario', role: 'Vendedor' })), 'session')).toBeNull();
  });

  it('devuelve null cuando el dispositivo nunca fue activado', () => {
    expect(readOfflineSessionUser(storageWith(null), 'session')).toBeNull();
  });
});
