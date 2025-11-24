/**
 * IndexedDB wrapper for local inspection storage
 * Provides offline-first data persistence for the inspection app
 */

import type { Inspection, CreateInspectionInput, UpdateInspectionInput } from '../types/inspection'

const DB_NAME = 'InspectionDB'
// Current schema version. Only bump this number forward; lowering it causes IndexedDB VersionError
const DB_VERSION = 2
const STORE_NAME = 'inspections'

/**
 * Initialize IndexedDB database and create object stores
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        // Check if IndexedDB is available
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

                // Add error handler for the database connection
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

                // Create inspections store if it doesn't exist
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    const objectStore = db.createObjectStore(STORE_NAME, { keyPath: 'id' })

                    // Create indexes for efficient querying
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

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0
        const v = c === 'x' ? r : (r & 0x3) | 0x8
        return v.toString(16)
    })
}

/**
 * Get all inspections from the database
 */
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

/**
 * Get a single inspection by ID
 */
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

/**
 * Create a new inspection
 */
export async function createInspection(input: CreateInspectionInput): Promise<Inspection> {
    const db = await openDB()

    const now = new Date().toISOString()
    const inspection: Inspection = {
        ...input,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
        syncStatus: 'not_synced',
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.add(inspection)

        request.onsuccess = () => {
            resolve(inspection)
        }

        request.onerror = () => {
            reject(new Error('Failed to create inspection'))
        }
    })
}

/**
 * Update an existing inspection
 */
export async function updateInspection(id: string, updates: UpdateInspectionInput): Promise<Inspection> {
    const db = await openDB()

    // First, get the existing inspection
    const existing = await getInspectionById(id)
    if (!existing) {
        throw new Error(`Inspection with id ${id} not found`)
    }

    const updated: Inspection = {
        ...existing,
        ...updates,
        id, // Ensure ID doesn't change
        createdAt: existing.createdAt, // Preserve creation time
        updatedAt: new Date().toISOString(),
    }

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.put(updated)

        request.onsuccess = () => {
            resolve(updated)
        }

        request.onerror = () => {
            reject(new Error(`Failed to update inspection with id: ${id}`))
        }
    })
}

/**
 * Delete an inspection
 */
export async function deleteInspection(id: string): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.delete(id)

        request.onsuccess = () => {
            resolve()
        }

        request.onerror = () => {
            reject(new Error(`Failed to delete inspection with id: ${id}`))
        }
    })
}

/**
 * Get inspections by status
 */
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

/**
 * Get inspections by sync status
 */
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

/**
 * Clear all inspections from the database
 * Useful for removing test data or resetting the app
 */
export async function clearAllInspections(): Promise<void> {
    const db = await openDB()

    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite')
        const objectStore = transaction.objectStore(STORE_NAME)
        const request = objectStore.clear()

        request.onsuccess = () => {
            console.log('All inspections cleared from database')
            db.close()
            resolve()
        }

        request.onerror = () => {
            db.close()
            reject(new Error('Failed to clear inspections'))
        }
    })
}

/**
 * Delete the entire IndexedDB database
 * Use this to recover from a corrupted database state
 */
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

/**
 * Check if IndexedDB is available and working
 */
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

        // Try to open the database
        const db = await openDB()
        db.close()

        return { available: true }
    } catch (error) {
        console.error('IndexedDB health check failed:', error)

        const errorMessage = error instanceof Error ? error.message : 'Unknown error'

        // Provide helpful suggestions based on the error
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
