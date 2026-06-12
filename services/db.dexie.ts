
import Dexie, { Table } from 'dexie';
import { Client, Visit, Interaction, Task, SyncAction } from '../types';

export class AgroDatabase extends Dexie {
  clients!: Table<Client>;
  visits!: Table<Visit>;
  interactions!: Table<Interaction>;
  tasks!: Table<Task>;
  syncQueue!: Table<SyncAction>;

  constructor() {
    super('AgroFieldCRM');
    this.version(1).stores({
      clients: '++id, name, farmName, leadStatus, priority, erpCode',
      visits: '++id, clientId, date, status',
      interactions: '++id, clientId, date, type',
      tasks: '++id, clientId, visitId, dueDate, completed',
      syncQueue: 'id, type, timestamp'
    });
  }
}

export const db = new AgroDatabase();
