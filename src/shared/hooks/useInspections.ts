import { useState, useEffect, useCallback } from 'react'
import type { Inspection, CreateInspectionInput, UpdateInspectionInput } from '../types/inspection'
import * as db from '../db/indexedDB'
import { INSPECTIONS_CHANGED_EVENT } from '../db/indexedDB'

export function useInspections() {
    const [inspections, setInspections] = useState<Inspection[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    const loadInspections = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await db.getAllInspections()
            setInspections(data)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load inspections'))
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        loadInspections()
    }, [loadInspections])

    useEffect(() => {
        if (typeof window === 'undefined') {
            return
        }
        const handler = () => {
            loadInspections()
        }
        window.addEventListener(INSPECTIONS_CHANGED_EVENT, handler)
        return () => {
            window.removeEventListener(INSPECTIONS_CHANGED_EVENT, handler)
        }
    }, [loadInspections])

    const createInspection = useCallback(async (input: CreateInspectionInput): Promise<Inspection> => {
        try {
            setError(null)
            const newInspection = await db.createInspection(input)
            setInspections((prev) => [...prev, newInspection])
            return newInspection
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to create inspection')
            setError(error)
            throw error
        }
    }, [])

    const updateInspection = useCallback(async (id: string, updates: UpdateInspectionInput): Promise<Inspection> => {
        try {
            setError(null)
            const updated = await db.updateInspection(id, updates)
            setInspections((prev) =>
                prev.map((inspection) => (inspection.id === id ? updated : inspection))
            )
            return updated
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to update inspection')
            setError(error)
            throw error
        }
    }, [])

    const deleteInspection = useCallback(async (id: string): Promise<void> => {
        try {
            setError(null)
            await db.deleteInspection(id)
            setInspections((prev) => prev.filter((inspection) => inspection.id !== id))
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to delete inspection')
            setError(error)
            throw error
        }
    }, [])

    const getInspection = useCallback(async (id: string): Promise<Inspection | null> => {
        try {
            setError(null)
            return await db.getInspectionById(id)
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to get inspection')
            setError(error)
            throw error
        }
    }, [])

    return {
        inspections,
        loading,
        error,
        createInspection,
        updateInspection,
        deleteInspection,
        getInspection,
        refetch: loadInspections,
    }
}

export function useInspection(id: string | null) {
    const [inspection, setInspection] = useState<Inspection | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        if (!id) {
            setInspection(null)
            setLoading(false)
            return
        }

        const loadInspection = async () => {
            try {
                setLoading(true)
                setError(null)
                const data = await db.getInspectionById(id)
                setInspection(data)
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Failed to load inspection'))
            } finally {
                setLoading(false)
            }
        }

        loadInspection()
    }, [id])

    const updateInspection = useCallback(async (updates: UpdateInspectionInput): Promise<Inspection> => {
        if (!id) {
            throw new Error('No inspection ID provided')
        }

        try {
            setError(null)
            const updated = await db.updateInspection(id, updates)
            setInspection(updated)
            return updated
        } catch (err) {
            const error = err instanceof Error ? err : new Error('Failed to update inspection')
            setError(error)
            throw error
        }
    }, [id])

    return {
        inspection,
        loading,
        error,
        updateInspection,
    }
}
