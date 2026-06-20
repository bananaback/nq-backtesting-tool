const DB_NAME = 'trading-chart-cache'
const DB_VERSION = 1
const STORE_NAME = 'csv-files'

function openDb(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)
        request.onupgradeneeded = () => {
            const db = request.result
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME)
            }
        }
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
    })
}

interface CsvFileEntry {
    name: string
    text: string
}

/**
 * Save CSV file contents to IndexedDB cache.
 * Stores each file's raw text keyed by filename.
 */
export async function saveCsvCache(files: CsvFileEntry[]): Promise<void> {
    if (files.length === 0) return
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    for (const file of files) {
        store.put(file.text, file.name)
    }
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * Load all cached CSV file contents from IndexedDB.
 * Returns an array of {name, text} entries.
 */
export async function loadCsvCache(): Promise<CsvFileEntry[]> {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.getAll()
    const keysRequest = store.getAllKeys()
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => {
            const texts = request.result as string[]
            const names = keysRequest.result as string[]
            const entries: CsvFileEntry[] = names.map((name, i) => ({
                name,
                text: texts[i] ?? '',
            }))
            resolve(entries)
        }
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * Clear all cached CSV data from IndexedDB.
 */
export async function clearCsvCache(): Promise<void> {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.clear()
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error)
    })
}

/**
 * Check if any cached CSV data exists.
 */
export async function hasCsvCache(): Promise<boolean> {
    const db = await openDb()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const countRequest = store.count()
    return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve(countRequest.result > 0)
        tx.onerror = () => reject(tx.error)
    })
}
