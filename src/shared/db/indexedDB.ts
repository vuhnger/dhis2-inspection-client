/**
 * IndexedDB wrapper for local inspection storage
 * Provides offline-first data persistence for the inspection app
 */

import type { Inspection, CreateInspectionInput, UpdateInspectionInput } from '../types/inspection'

const DB_NAME = 'InspectionDB'
const DB_VERSION = 1
const STORE_NAME = 'inspections'

/**
 * Initialize IndexedDB database and create object stores
 */
function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION)

        request.onerror = () => {
            reject(new Error('Failed to open IndexedDB'))
        }

        request.onsuccess = () => {
            resolve(request.result)
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
