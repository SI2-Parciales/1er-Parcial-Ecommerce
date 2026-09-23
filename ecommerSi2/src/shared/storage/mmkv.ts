/**
 * ============================================================================
 * MOTOR DE ALMACENAMIENTO LOCAL UNIVERSAL (appStorage)
 * ============================================================================
 * ¿Por qué existe este archivo?
 * -----------------------------
 * La librería react-native-mmkv v4 requiere módulos nativos C++ (NitroModules),
 * los cuales no están compilados dentro del binario estándar de Expo Go y causan
 * el error "Unable to resolve react-native-nitro-modules".
 * 
 * Este adaptador implementa la misma interfaz síncrona y ultra-rápida (AppStorage)
 * utilizando almacenamiento en memoria de alto rendimiento y persistencia con
 * localStorage en plataformas web.
 * 
 * Ventajas:
 * 1. 100% compatible con Expo Go, emulador Android, iOS y navegador Web.
 * 2. Operaciones síncronas: no requiere 'await' para leer o escribir tokens/sesión.
 * 3. Serialización y deserialización automática de objetos tipados (JSON).
 * ============================================================================
 */

const memoryStore = new Map<string, string>();

const isWeb = typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';

export const storage = {
  getString: (key: string): string | undefined => {
    if (isWeb) {
      try {
        const val = window.localStorage.getItem(key);
        return val !== null ? val : undefined;
      } catch {
        return memoryStore.get(key);
      }
    }
    return memoryStore.get(key);
  },
  set: (key: string, value: string): void => {
    if (isWeb) {
      try {
        window.localStorage.setItem(key, value);
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.set(key, value);
  },
  remove: (key: string): void => {
    if (isWeb) {
      try {
        window.localStorage.removeItem(key);
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.delete(key);
  },
  clearAll: (): void => {
    if (isWeb) {
      try {
        window.localStorage.clear();
      } catch {
        // Fallback to memory
      }
    }
    memoryStore.clear();
  },
};

export interface AppStorage {
  getString: (key: string) => string | undefined;
  setString: (key: string, value: string) => void;
  getObject: <T>(key: string) => T | null;
  setObject: <T>(key: string, value: T) => void;
  removeItem: (key: string) => void;
  clearAll: () => void;
}

export const appStorage: AppStorage = {
  getString: (key: string): string | undefined => {
    return storage.getString(key);
  },

  setString: (key: string, value: string): void => {
    storage.set(key, value);
  },

  getObject: <T>(key: string): T | null => {
    try {
      const raw = storage.getString(key);
      if (!raw) {
        return null;
      }
      return JSON.parse(raw) as T;
    } catch {
      return null;
    }
  },

  setObject: <T>(key: string, value: T): void => {
    try {
      storage.set(key, JSON.stringify(value));
    } catch {
      // Silently catch serializing errors to avoid crash
    }
  },

  removeItem: (key: string): void => {
    storage.remove(key);
  },

  clearAll: (): void => {
    storage.clearAll();
  },
};
