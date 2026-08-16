import type { AppData } from '../types/domain';

/**
 * データ永続化の抽象インターフェース。
 * 今はlocalStorageで実装するが、将来Supabase/PostgreSQLへ差し替える際は
 * このインターフェースを満たす実装を追加してAppStore側の呼び出しを変えずに済むようにする。
 */
export interface DataRepository {
  load(): Promise<AppData | null>;
  save(data: AppData): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'shiftcare-ai:data:v1';

class LocalStorageRepository implements DataRepository {
  async load(): Promise<AppData | null> {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as AppData;
    } catch (e) {
      console.error('Failed to load data from localStorage', e);
      return null;
    }
  }

  async save(data: AppData): Promise<void> {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save data to localStorage', e);
    }
  }

  async clear(): Promise<void> {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}

export const dataRepository: DataRepository = new LocalStorageRepository();
