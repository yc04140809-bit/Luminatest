/**
 * BGM用の音楽ファイルをブラウザのIndexedDBに保存する。
 * 音楽ファイルは数MBあるためlocalStorage(約5MB上限・文字列のみ)には入らず、
 * Blobをそのまま保存できるIndexedDBを使う。端末内に残るので再読み込み後も選び直し不要。
 */

const DB_NAME = "chaos-ai-suite";
const STORE_NAME = "bgm";
const TRACK_KEY = "track";

export interface StoredBgmTrack {
  name: string;
  type: string;
  blob: Blob;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBを開けませんでした"));
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDBの操作に失敗しました"));
  });
}

export async function saveBgmTrack(file: File): Promise<void> {
  const db = await openDb();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  const track: StoredBgmTrack = { name: file.name, type: file.type, blob: file };
  await requestToPromise(store.put(track, TRACK_KEY));
  db.close();
}

export async function loadBgmTrack(): Promise<StoredBgmTrack | undefined> {
  try {
    const db = await openDb();
    const store = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME);
    const track = await requestToPromise(store.get(TRACK_KEY) as IDBRequest<StoredBgmTrack | undefined>);
    db.close();
    return track;
  } catch {
    return undefined;
  }
}

export async function clearBgmTrack(): Promise<void> {
  const db = await openDb();
  const store = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME);
  await requestToPromise(store.delete(TRACK_KEY));
  db.close();
}
