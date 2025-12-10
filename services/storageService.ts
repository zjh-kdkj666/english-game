import { LessonData } from '../types';

const DB_NAME = 'MagicEnglishDB';
const STORE_NAME = 'lessons';
const DB_VERSION = 1;
const LEGACY_STORAGE_KEY = 'lessons'; // Key used in the previous version

// Helper to open the database
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject("Database failed to open");

    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
};

// Function to migrate old localStorage data to IndexedDB
const migrateLegacyData = async (db: IDBDatabase) => {
  const legacyData = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyData) {
    try {
      const lessons = JSON.parse(legacyData);
      if (Array.isArray(lessons) && lessons.length > 0) {
        console.log(`Migrating ${lessons.length} legacy lessons...`);
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        for (const lesson of lessons) {
          // Ensure every lesson has an ID and timestamp
          if (!lesson.id) lesson.id = crypto.randomUUID();
          if (!lesson.timestamp) lesson.timestamp = Date.now();
          store.put(lesson);
        }
        
        // Wait for transaction to complete
        await new Promise((resolve, reject) => {
            transaction.oncomplete = resolve;
            transaction.onerror = reject;
        });
        
        // Clear legacy storage to prevent re-migration
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        console.log("Migration complete.");
      }
    } catch (e) {
      console.error("Migration failed", e);
    }
  }
};

export const getLessons = async (): Promise<LessonData[]> => {
  try {
    const db = await openDB();
    
    // Check and migrate legacy data first
    await migrateLegacyData(db);

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        // Sort by timestamp descending (newest first)
        const lessons = request.result as LessonData[];
        resolve(lessons.sort((a, b) => b.timestamp - a.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error("Failed to get lessons from DB", error);
    return [];
  }
};

export const saveLesson = async (lesson: LessonData): Promise<boolean> => {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(lesson); // put handles both add and update (upsert)

      request.onsuccess = () => resolve(true);
      request.onerror = () => {
          console.error("Error saving lesson:", request.error);
          reject(false);
      };
    });
  } catch (error) {
    console.error("Database save error", error);
    return false;
  }
};

export const deleteLesson = async (id: string): Promise<LessonData[]> => {
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      
      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
    // Return updated list
    return await getLessons();
  } catch (error) {
    console.error("Delete failed", error);
    return [];
  }
};

export const clearAllLessons = async (): Promise<void> => {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
  } catch (error) {
    console.error("Clear failed", error);
  }
};