/**
 * Sync Service - Handles synchronization of local inspections to DHIS2
 */

import { updateInspection, getInspectionsBySyncStatus } from '../db/indexedDB'

import type { Inspection } from '../types/inspection'
import type { DataEngine } from '@dhis2/app-runtime'

const PROGRAM_UID = 'UxK2o06ScIe' // School Inspection program UID

/**
 * Map inspection form data to DHIS2 data elements
 * TODO: Replace these UIDs with actual data element UIDs from your DHIS2 instance
 */
const DATA_ELEMENT_MAP = {
    textbooks: 'TEXTBOOKS_DE_UID',
    desks: 'DESKS_DE_UID',
    chairs: 'CHAIRS_DE_UID',
    totalStudents: 'TOTAL_STUDENTS_DE_UID',
    maleStudents: 'MALE_STUDENTS_DE_UID',
    femaleStudents: 'FEMALE_STUDENTS_DE_UID',
    staffCount: 'STAFF_COUNT_DE_UID',
    classroomCount: 'CLASSROOM_COUNT_DE_UID',
    testFieldNotes: 'NOTES_DE_UID',
}

/**
 * Convert local inspection to DHIS2 event payload
 */
function inspectionToDHIS2Event(inspection: Inspection) {
    const dataValues = []

    // Add data values from form data
    const formData = inspection.formData
    if (formData.textbooks !== 0) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.textbooks,
            value: formData.textbooks.toString(),
        })
    }
    if (formData.desks !== 0) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.desks,
            value: formData.desks.toString(),
        })
    }
    if (formData.chairs !== 0) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.chairs,
            value: formData.chairs.toString(),
        })
    }
    if (formData.totalStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.totalStudents,
            value: formData.totalStudents,
        })
    }
    if (formData.maleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.maleStudents,
            value: formData.maleStudents,
        })
    }
    if (formData.femaleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.femaleStudents,
            value: formData.femaleStudents,
        })
    }
    if (formData.staffCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.staffCount,
            value: formData.staffCount,
        })
    }
    if (formData.classroomCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.classroomCount,
            value: formData.classroomCount,
        })
    }
    if (formData.testFieldNotes) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.testFieldNotes,
            value: formData.testFieldNotes,
        })
    }

    // Map status
    const statusMap = {
        scheduled: 'SCHEDULE',
        in_progress: 'ACTIVE',
        completed: 'COMPLETED',
    }

    const payload: Record<string, unknown> = {
        program: PROGRAM_UID,
        orgUnit: inspection.orgUnit,
        eventDate: inspection.eventDate.split('T')[0], // YYYY-MM-DD format
        status: statusMap[inspection.status],
        dataValues,
    }

    if (inspection.dhis2EventId) {
        payload.event = inspection.dhis2EventId
    }

    return payload
}

/**
 * Sync a single inspection to DHIS2
 */
export async function syncInspectionToDHIS2(
    inspection: Inspection,
    engine: DataEngine
): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
        const eventPayload = inspectionToDHIS2Event(inspection)
        const isUpdate = Boolean(inspection.dhis2EventId)

        // Use DHIS2 App Runtime engine to make the mutation
        const response = await engine.mutate({
            resource: isUpdate ? `events/${inspection.dhis2EventId}` : 'events',
            type: isUpdate ? 'update' : 'create',
            data: eventPayload,
        })

        // Check if the response contains the event ID (for creates)
        let eventId = inspection.dhis2EventId

        if (!isUpdate) {
            eventId =
                response?.response?.importSummaries?.[0]?.reference ??
                response?.importSummaries?.[0]?.reference ??
                null
        }

        if (!eventId) {
            return {
                success: false,
                error: 'No event ID returned from DHIS2',
            }
        }

        // Update local inspection with DHIS2 event ID and mark as synced
        await updateInspection(inspection.id, {
            dhis2EventId: eventId,
            syncStatus: 'synced',
        })

        return { success: true, eventId }
    } catch (error) {
        console.error('Failed to sync inspection to DHIS2:', error)

        // Update inspection sync status to failed
        await updateInspection(inspection.id, {
            syncStatus: 'sync_failed',
        })

        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        }
    }
}

/**
 * Sync all unsynced inspections to DHIS2
 */
export async function syncAllInspections(engine: DataEngine): Promise<{
    synced: number
    failed: number
    total: number
}> {
    try {
        // Get all inspections that need syncing
        const unsyncedInspections = await getInspectionsBySyncStatus('not_synced')
        const failedInspections = await getInspectionsBySyncStatus('sync_failed')

        const toSync = [...unsyncedInspections, ...failedInspections]
        const total = toSync.length

        if (total === 0) {
            return { synced: 0, failed: 0, total: 0 }
        }

        console.log(`Syncing ${total} inspection(s) to DHIS2...`)

        let synced = 0
        let failed = 0

        // Sync each inspection
        for (const inspection of toSync) {
            const result = await syncInspectionToDHIS2(inspection, engine)
            if (result.success) {
                synced++
                console.log(`✓ Synced inspection ${inspection.id}`)
            } else {
                failed++
                console.error(`✗ Failed to sync inspection ${inspection.id}:`, result.error)
            }
        }

        console.log(`Sync complete: ${synced} synced, ${failed} failed out of ${total} total`)

        return { synced, failed, total }
    } catch (error) {
        console.error('Error during sync:', error)
        return { synced: 0, failed: 0, total: 0 }
    }
}

/**
 * Check if there are any unsynced inspections
 */
export async function hasUnsyncedInspections(): Promise<boolean> {
    try {
        const unsynced = await getInspectionsBySyncStatus('not_synced')
        const failed = await getInspectionsBySyncStatus('sync_failed')
        return unsynced.length > 0 || failed.length > 0
    } catch (error) {
        console.error('Error checking for unsynced inspections:', error)
        return false
    }
}
