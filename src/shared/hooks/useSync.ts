import { useDataEngine } from '@dhis2/app-runtime'
import { useState, useEffect, useCallback } from 'react'

import { syncAllInspections, hasUnsyncedInspections } from '../services/syncService'

interface SyncState {
    isSyncing: boolean
    hasUnsynced: boolean
    lastSyncTime: Date | null
    syncError: string | null
}

export function useSync() {
    const engine = useDataEngine()
    const [syncState, setSyncState] = useState<SyncState>({
        isSyncing: false,
        hasUnsynced: false,
        lastSyncTime: null,
        syncError: null,
    })

    const checkUnsyncedStatus = useCallback(async () => {
        try {
            const hasUnsynced = await hasUnsyncedInspections()
            setSyncState((prev) => ({ ...prev, hasUnsynced }))
        } catch (error) {
            console.error('Error checking unsynced status:', error)
        }
    }, [])

    const triggerSync = useCallback(async () => {
        if (syncState.isSyncing) {
            console.log('Sync already in progress')
            return
        }

        setSyncState((prev) => ({ ...prev, isSyncing: true, syncError: null }))

        try {
            console.log('Starting sync...')
            const result = await syncAllInspections(engine)

            console.log('Sync result:', result)

            const remainingUnsynced =
                result.failed > 0 ? true : await hasUnsyncedInspections()

            setSyncState({
                isSyncing: false,
                hasUnsynced: remainingUnsynced,
                lastSyncTime: new Date(),
                syncError: result.failed > 0 ? `${result.failed} inspection(s) failed to sync` : null,
            })

            return result
        } catch (error) {
            console.error('Sync error:', error)
            setSyncState((prev) => ({
                ...prev,
                isSyncing: false,
                syncError: error instanceof Error ? error.message : 'Sync failed',
            }))
            throw error
        }
    }, [engine, syncState.isSyncing])

    useEffect(() => {
        const handleOnline = async () => {
            console.log('Network connection restored, checking for unsynced inspections...')
            await checkUnsyncedStatus()

            const hasUnsynced = await hasUnsyncedInspections()
            if (hasUnsynced) {
                console.log('Found unsynced inspections, triggering auto-sync...')
                await triggerSync()
            }
        }

        window.addEventListener('online', handleOnline)

        return () => {
            window.removeEventListener('online', handleOnline)
        }
    }, [checkUnsyncedStatus, triggerSync])

    useEffect(() => {
        checkUnsyncedStatus()
    }, [checkUnsyncedStatus])

    return {
        ...syncState,
        triggerSync,
        checkUnsyncedStatus,
    }
}
