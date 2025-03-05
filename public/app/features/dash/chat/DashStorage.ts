import { SerializedDash, Settings } from './types';

export class DashStorage {
  private readonly _dbName = 'dash';
  private readonly _chatStoreName = 'chat';
  private readonly _settingsStoreName = 'settings';
  private readonly _version = 1;

  private static readonly _instance = new DashStorage();

  public static get instance(): DashStorage {
    return DashStorage._instance;
  }

  private constructor() {}

  public async setChat(value: SerializedDash) {
    const db = await this._openDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this._chatStoreName, 'readwrite');
      const store = transaction.objectStore(this._chatStoreName);

      store.clear();

      const request = store.put({ id: 'chat', value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public async getChat(): Promise<SerializedDash | undefined> {
    const db = await this._openDB();

    return new Promise<SerializedDash | undefined>((resolve, reject) => {
      const transaction = db.transaction(this._chatStoreName, 'readonly');
      const store = transaction.objectStore(this._chatStoreName);
      const request = store.getAll();

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result[0]?.value);
    });
  }

  public async setSettingsValue<T extends keyof Settings = keyof Settings>(id: T, value: Settings[T]) {
    const db = await this._openDB();

    return new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(this._settingsStoreName, 'readwrite');
      const store = transaction.objectStore(this._settingsStoreName);
      const request = store.put({ id, value });

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve();
    });
  }

  public async getSettings(): Promise<Settings> {
    const db = await this._openDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this._settingsStoreName, 'readonly');
      const store = transaction.objectStore(this._settingsStoreName);
      const request = store.getAll();

      request.onerror = () =>
        reject({
          codeOverflow: 'scroll',
          mode: 'sidebar',
          showTools: true,
          verbosity: 'concise',
        });

      request.onsuccess = () => {
        const result =
          request.result?.reduce((acc, entry) => {
            acc[entry.id] = entry.value;
          }, {}) ?? {};

        result.codeOverflow = result.codeOverflow ?? 'scroll';
        result.mode = result.mode ?? 'sidebar';
        result.showTools = result.showTools ?? true;
        result.verbosity = result.verbosity ?? 'concise';

        resolve(result);
      };
    });
  }

  private async _openDB(): Promise<IDBDatabase> {
    return new Promise(async (resolve, reject) => {
      const request = await indexedDB.open(this._dbName, this._version);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        if (!db.objectStoreNames.contains(this._chatStoreName)) {
          db.createObjectStore(this._chatStoreName, { keyPath: 'id' });
        }

        if (!db.objectStoreNames.contains(this._settingsStoreName)) {
          db.createObjectStore(this._settingsStoreName, { keyPath: 'id' });
        }
      };
    });
  }
}
