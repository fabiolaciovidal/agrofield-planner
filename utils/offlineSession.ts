import { User } from '../types';

type ReadableStorage = Pick<Storage, 'getItem'>;

export const readOfflineSessionUser = (storage: ReadableStorage, key: string): User | null => {
  try {
    const rawValue = storage.getItem(key);
    if (!rawValue) return null;

    const value = JSON.parse(rawValue) as Partial<User>;
    if (
      !value
      || typeof value.name !== 'string'
      || typeof value.role !== 'string'
      || typeof value.username !== 'string'
      || !value.username
    ) {
      return null;
    }

    return value as User;
  } catch {
    return null;
  }
};
