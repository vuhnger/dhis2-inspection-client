import type { Inspection, CreateInspectionInput, UpdateInspectionInput } from '../types/inspection'

const DB_NAME = 'InspectionDB'
const DB_VERSION = 4
const STORE_NAME = 'inspections'
export const INSPECTIONS_CHANGED_EVENT = 'inspections:changed'

function emitInspectionsChanged() {
    if (typeof window === 'undefined') {
        return
    }
    window.dispatchEvent(new Event(INSPECTIONS_CHANGED_EVENT))
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (!window.indexedDB) {
            reject(new Error('IndexedDB is not supported in this browser'))
            return
        }

        try {
            const request = indexedDB.open(DB_NAME, DB_VERSION)

            request.onerror = (event) => {
                const error = (event.target as IDBOpenDBRequest).error
                const errorMessage = error ?
                    `Failed to open IndexedDB: ${error.name} - ${error.message}` :
                    'Failed to open IndexedDB: Unknown error'

                console.error('IndexedDB error:', {
                    name: error?.name,
                    message: error?.message,
                    code: (error as any)?.code,
                    suggestion: 'Make sure you are not in Private/Incognito mode and have enough storage space'
                })

                reject(new Error(errorMessage))
            }

            request.onsuccess = () => {
                const db = request.result

                db.onerror = (event) => {
                    console.error('Database error:', event)
                }

                resolve(db)
            }

            request.onblocked = () => {
                console.warn('IndexedDB is blocked - please close other tabs with this app')
                reject(new Error('IndexedDB is blocked - please close other tabs with this app'))
            }

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result

                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

                    objectStore.createIndex('orgUnit', 'orgUnit', { unique: false })
                    objectStore.createIndex('eventDate', 'eventDate', { unique: false })
                    objectStore.createIndex('status', 'status', { unique: false })
                    objectStore.createIndex('syncStatus', 'syncStatus', { unique: false })
                    objectStore.createIndex('dhis2EventId', 'dhis2EventId', { unique: false })
                }
            }
        } catch (error) {
            console.error('Error opening IndexedDB:', error)
            reject(error)
        }
    })
}

function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

export async function getAllInspections(): Promise<Inspection[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.getAll()

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(new Error('Failed to get inspections'))
        }
    })
}

export async function getInspectionById(id: string): Promise<Inspection | null> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.get(id)

        request.onsuccess = () => {
            resolve(request.result || null)
        }

        request.onerror = () => {
            reject(new Error(`Failed to get inspection with id: ${id}`))
        }
    })
}

export async function createInspection(input: CreateInspectionInput): Promise<Inspection> {
    const db = await openDB()

    const now = new Date().toISOString()
    const inspection: Inspection = {
        ...input,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
        syncStatus: 'not_synced',
        formDataByCategory: input.formDataByCategory,
        categorySyncStatus: input.categorySyncStatus,
        categoryEventIds: input.categoryEventIds,
        source: input.source || 'local',
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.add(inspection)

        request.onsuccess = () => {
            resolve(inspection)
            emitInspectionsChanged()
        }

        request.onerror = () => {
            reject(new Error('Failed to create inspection'))
        }
    })
}

export async function saveInspection(inspection: Inspection): Promise<Inspection> {
    const db = await openDB()
    const record: Inspection = {
        ...inspection,
        createdAt: inspection.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.put(record)

        request.onsuccess = () => {
            resolve(record)
            emitInspectionsChanged()
        }

        request.onerror = () => {
            reject(new Error('Failed to save inspection'))
        }
    })
}

export async function updateInspection(id: string, updates: UpdateInspectionInput): Promise<Inspection> {
    const db = await openDB()

    const existing = await getInspectionById(id)
    if (!existing) {
        throw new Error(`Inspection with id ${id} not found`)
    }

    const updated: Inspection = {
        ...existing,
        ...updates,
        id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.put(updated)

        request.onsuccess = () => {
            resolve(updated)
            emitInspectionsChanged()
        }

        request.onerror = () => {
            reject(new Error(`Failed to update inspection with id: ${id}`))
        }
    })
}

export async function deleteInspection(id: string): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.delete(id)

        request.onsuccess = () => {
            resolve()
            emitInspectionsChanged()
        }

        request.onerror = () => {
            reject(new Error(`Failed to delete inspection with id: ${id}`))
        }
    })
}

export async function getInspectionsByStatus(status: string): Promise<Inspection[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const objectStore = transaction.objectStore(STORE_NAME)
        const index = objectStore.index('status')
        const request = index.getAll(status)

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(new Error(`Failed to get inspections with status: ${status}`))
        }
    })
}

export async function getInspectionsBySyncStatus(syncStatus: string): Promise<Inspection[]> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly')
        const objectStore = transaction.objectStore(STORE_NAME)
        const index = objectStore.index('syncStatus')
        const request = index.getAll(syncStatus)

        request.onsuccess = () => {
            resolve(request.result)
        }

        request.onerror = () => {
            reject(new Error(`Failed to get inspections with sync status: ${syncStatus}`))
        }
    })
}

export async function clearAllInspections(): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.clear()

        request.onsuccess = () => {
            console.log('All inspections cleared from database')
            db.close()
            emitInspectionsChanged()
            resolve()
        }

        request.onerror = () => {
            db.close()
            reject(new Error('Failed to clear inspections'))
        }
    })
}

export async function deleteDatabase(): Promise<void> {
    return new Promise((resolve, reject) => {
        console.log('Attempting to delete IndexedDB database...')

        const request = indexedDB.deleteDatabase(DB_NAME)

        request.onsuccess = () => {
            console.log('IndexedDB database deleted successfully')
            resolve()
        }

        request.onerror = (event) => {
            const error = (event.target as IDBOpenDBRequest).error
            console.error('Failed to delete IndexedDB database:', error)
            reject(new Error(`Failed to delete database: ${error?.message || 'Unknown error'}`))
        }

        request.onblocked = () => {
            console.warn('Delete blocked - please close all other tabs with this app open')
            reject(new Error('Database deletion blocked - close all other tabs and try again'))
        }
    })
}

export async function checkIndexedDBHealth(): Promise<{
    available: boolean
    error?: string
    details?: string
}> {
    try {
        if (!window.indexedDB) {
            return {
                available: false,
                error: 'IndexedDB not supported',
                details: 'Your browser does not support IndexedDB'
            }
        }

        const db = await openDB()
        db.close()

        return { available: true }
    } catch (error) {
        console.error('IndexedDB health check failed:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        let details = 'Possible causes:\n'
        if (errorMessage.includes('blocked')) {
            details += '- Close other tabs with this app open\n'
        }
        if (errorMessage.includes('QuotaExceededError')) {
            details += '- Your browser storage is full\n- Clear browser data and try again\n'
        }
        if (errorMessage.includes('UnknownError') || errorMessage.includes('InvalidStateError')) {
            details += '- You may be in Private/Incognito mode\n- IndexedDB may be disabled in browser settings\n- Try a different browser\n'
        }
        details += '- Try deleting the database from DevTools > Application > IndexedDB'

        return {
            available: false,
            error: errorMessage,
            details
        }
    }
}
