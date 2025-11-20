/**
 * Sync Service - Handles synchronization of local inspections to DHIS2
 */

import { updateInspection, getInspectionsBySyncStatus } from '../db/indexedDB'
import { DHIS2_PROGRAM_STAGE_UID, DHIS2_PROGRAM_UID } from '../config/dhis2'
import { getAuthHeader } from '../utils/auth'

import type { Inspection } from '../types/inspection'

// Define the engine type based on useDataEngine return type
type DataEngine = {
    mutate: (mutation: {
        resource: string
        type: 'create' | 'update' | 'delete'
        data?: unknown
        params?: Record<string, unknown>
    }) => Promise<any>
    query: (query: unknown) => Promise<any>
}

/**
 * Map inspection form data to DHIS2 data elements
 * Based on data-mappings.json
 */
const DATA_ELEMENT_MAP = {
    textbooks: 'xiaOnejpgdY', // CHK English Textbooks
    desks: '', // NOT FOUND in DHIS2 - will be skipped during sync
    chairs: 'mAtab30vU5g', // Number of Chairs
    totalStudents: 'EaWxWo27lm3', // Total Students
    maleStudents: 'h4XENZX2UMf', // Male Students
    femaleStudents: 'DM707Od7el4', // Female Students
    staffCount: 'ooYtEgJUuRM', // Staff Count
    classroomCount: 'ya5SyA5hej4', // CHK number of classrooms
    testFieldNotes: 'KrijJzaqMAU', // Inspection Notes
}

/**
 * Convert local inspection to DHIS2 event payload
 */
function inspectionToDHIS2Event(inspection: Inspection) {
    const dataValues = []

    // Add data values from form data
    const formData = inspection.formData

    // Textbooks
    if (formData.textbooks !== 0 && DATA_ELEMENT_MAP.textbooks) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.textbooks,
            value: formData.textbooks.toString(),
        })
    }

    // Desks - SKIP because not found in DHIS2
    // if (formData.desks !== 0 && DATA_ELEMENT_MAP.desks) { ... }

    // Chairs
    if (formData.chairs !== 0 && DATA_ELEMENT_MAP.chairs) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.chairs,
            value: formData.chairs.toString(),
        })
    }

    // Total Students
    if (formData.totalStudents && DATA_ELEMENT_MAP.totalStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.totalStudents,
            value: formData.totalStudents,
        })
    }

    // Male Students
    if (formData.maleStudents && DATA_ELEMENT_MAP.maleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.maleStudents,
            value: formData.maleStudents,
        })
    }

    // Female Students
    if (formData.femaleStudents && DATA_ELEMENT_MAP.femaleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.femaleStudents,
            value: formData.femaleStudents,
        })
    }

    // Staff Count
    if (formData.staffCount && DATA_ELEMENT_MAP.staffCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.staffCount,
            value: formData.staffCount,
        })
    }

    // Classroom Count
    if (formData.classroomCount && DATA_ELEMENT_MAP.classroomCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.classroomCount,
            value: formData.classroomCount,
        })
    }

    // Notes
    if (formData.testFieldNotes && DATA_ELEMENT_MAP.testFieldNotes) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.testFieldNotes,
            value: formData.testFieldNotes,
        })
    }

    // Map status - DHIS2 event program status values
    // Note: SCHEDULE is for scheduled events, but DHIS2 might require ACTIVE or COMPLETED
    // For now, we'll use ACTIVE for scheduled/in_progress, COMPLETED for completed
    const statusMap = {
        scheduled: 'ACTIVE',
        in_progress: 'ACTIVE',
        completed: 'COMPLETED',
    }

    const payload: Record<string, unknown> = {
        program: DHIS2_PROGRAM_UID,
        programStage: DHIS2_PROGRAM_STAGE_UID,
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

        console.log('Syncing inspection to DHIS2:', {
            inspectionId: inspection.id,
            isUpdate,
            payload: eventPayload,
        })

        // Use DHIS2 App Runtime engine to make the mutation
        // App Runtime automatically prepends /api/ to the resource
        // New Tracker API (v2.36+): Use '/api/tracker' endpoint with events wrapped in array
        // This replaces the old /api/events endpoint
        const trackerPayload = {
            events: [eventPayload],
        }

        const response = await engine.mutate({
            resource: 'tracker',
            type: 'create',
            params: {
                async: false, // Synchronous import
            },
            data: trackerPayload,
            headers: {
                Authorization: getAuthHeader(),
            },
        })

        console.log('DHIS2 sync response:', response)

        // Check if the response contains the event ID
        // New tracker API response structure
        let eventId = inspection.dhis2EventId

        if (!isUpdate) {
            // Try multiple possible response paths for new tracker API
            eventId =
                response?.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid ??
                response?.response?.bundleReport?.typeReportMap?.EVENT?.objectReports?.[0]?.uid ??
                null
        }

        if (!eventId) {
            console.error('No event ID in response:', JSON.stringify(response, null, 2))
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

        // Try to extract DHIS2 error details
        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
            errorMessage = error.message
            // Log the full error object to see DHIS2's response
            console.error('Full error object:', JSON.stringify(error, null, 2))
        }

        // Update inspection sync status to failed
        await updateInspection(inspection.id, {
            syncStatus: 'sync_failed',
        })

        return {
            success: false,
            error: errorMessage,
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
