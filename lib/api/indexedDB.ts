import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface IData {
  id?: number;
  src: string;
  translateSrc?: string;
  status: number; // -1. Translation failed. 1. Completed translation. 2. Completed image upload. 3. In queue. 4. Image upload in progress
  requestId?: string;
  message?: string;
  createdAt: string;
}

const DB_NAME = 'ai-image-translation-database';
const STORE_NAME = 'ai-image-translation-store';

// Number of entries per page
const PAGE_SIZE = 50;

interface MyDB extends DBSchema {
  [STORE_NAME]: {
    key: number;
    value: IData
  };
}

export async function initDB(): Promise<IDBPDatabase<MyDB>> {
  const db = await openDB<MyDB>(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    },
  });
  return db;
}

export async function addData(data: IData): Promise<IData> {
  delete data.id;
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const id = await store.add(data);
  await tx.done;
  return { ...data, id };
}

export async function getData(quantity: number = 50): Promise<{ [key: number]: IData }> {
  const db = await initDB();
  const store = db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME);
  const allRecords = await store.getAll();

  //@ts-ignore
  allRecords.sort((a, b) => b.id - a.id);
  const endIndex = quantity + PAGE_SIZE;
  const paginatedData = allRecords.slice(0, endIndex);
   const result = new Map<number, IData>();
   paginatedData.forEach(item => {
     if (item.id !== undefined) {
       result.set(item.id, item);
     }
   });
 
   return Object.fromEntries(result);
}

export async function updateData(id: number, updatedData: Partial<IData>): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);

  const existingData = await store.get(id);

  if (!existingData) {
    throw new Error(`Data with id ${id} not found`);
  }

  const newData = { ...existingData, ...updatedData, id };

  await store.put(newData);
  await tx.done;
}

export async function deleteData(id: number): Promise<void> {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  await tx.objectStore(STORE_NAME).delete(id);
  await tx.done;
}