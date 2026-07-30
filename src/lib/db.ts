import Dexie, { Table } from 'dexie';
import { HistoryItem } from '../types/converter';

export class AllConvertDatabase extends Dexie {
  history!: Table<HistoryItem, string>;

  constructor() {
    super('AllConvertDB');
    this.version(1).stores({
      history: 'id, timestamp, category, status, fileName'
    });
  }
}

export const db = new AllConvertDatabase();

export async function addHistoryRecord(record: Omit<HistoryItem, 'id'>): Promise<string> {
  const id = 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6);
  const fullRecord: HistoryItem = { ...record, id };
  await db.history.add(fullRecord);
  return id;
}

export async function getAllHistoryRecords(): Promise<HistoryItem[]> {
  return await db.history.orderBy('timestamp').reverse().toArray();
}

export async function clearAllHistoryRecords(): Promise<void> {
  await db.history.clear();
}

export async function deleteHistoryRecord(id: string): Promise<void> {
  await db.history.delete(id);
}
