/**
 * Sync Service - Handles synchronization of local inspections to DHIS2
 */

import { DHIS2_PROGRAM_STAGE_UID, DHIS2_PROGRAM_UID } from '../config/dhis2'
import { updateInspection, getInspectionsBySyncStatus, getAllInspections, saveInspection } from '../db/indexedDB'
import { getAuthHeader, getApiBase } from '../utils/auth'

import type { Inspection, InspectionFormData, SyncStatus } from '../types/inspection'

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
const DATA_ELEMENT_FIELD_MAP = Object.entries(DATA_ELEMENT_MAP).reduce<
    Record<string, keyof InspectionFormData>
>((acc, [field, id]) => {
    if (id) {
        acc[id] = field as keyof InspectionFormData
    }
    return acc
}, {})

/**
 * Convert local inspection to DHIS2 event payload
 */
function inspectionToDHIS2Event(
    inspection: Inspection,
    options?: { formDataOverride?: InspectionFormData; dhis2EventIdOverride?: string; categoryLabel?: string }
) {
    const dataValues = []

    // Add data values from form data
    const formData = options?.formDataOverride || inspection.formData

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
    const notesValue = options?.categoryLabel
        ? `${options.categoryLabel}${formData.testFieldNotes ? ` - ${formData.testFieldNotes}` : ''}`
        : formData.testFieldNotes
    if (notesValue && DATA_ELEMENT_MAP.testFieldNotes) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.testFieldNotes,
            value: notesValue,
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
        occurredAt: inspection.eventDate.split('T')[0], // YYYY-MM-DD format (Tracker API uses occurredAt)
        status: statusMap[inspection.status],
        dataValues,
    }

    const eventId = options?.dhis2EventIdOverride || inspection.dhis2EventId
    if (eventId) {
        payload.event = eventId
    }

    return payload
}

/**
 * Sync a single inspection to DHIS2
 */
export async function syncInspectionToDHIS2(
    inspection: Inspection,
    engine: DataEngine,
    options?: {
        formDataOverride?: InspectionFormData
        dhis2EventIdOverride?: string
        categoryLabel?: string
        skipLocalUpdate?: boolean
    }
): Promise<{ success: boolean; eventId?: string; error?: string }> {
    try {
        const eventPayload = inspectionToDHIS2Event(inspection, options)
        const isUpdate = Boolean(options?.dhis2EventIdOverride || inspection.dhis2EventId)

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

        // Use direct fetch() instead of DataEngine to properly include Authorization header
        // DataEngine's mutate() doesn't support custom headers
        const url = `${getApiBase()}/tracker?async=false`
        const fetchResponse = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: getAuthHeader(),
            },
            body: JSON.stringify(trackerPayload),
        })

        let parsedBody: any = null
        const rawBody = await fetchResponse.text()
        try {
            parsedBody = rawBody ? JSON.parse(rawBody) : null
        } catch {
            parsedBody = null
        }

        if (!fetchResponse.ok) {
            const validationMessage =
                parsedBody?.validationReport?.errorReports?.[0]?.message ??
                parsedBody?.message

            let errorMessage = `${fetchResponse.status} ${fetchResponse.statusText}`
            if (validationMessage) {
                errorMessage += `: ${validationMessage}`
            } else if (rawBody) {
                errorMessage += `: ${rawBody}`
            }

            if (validationMessage?.includes('OrganisationUnit') && validationMessage.includes('do not match')) {
                errorMessage = 'Selected school is not assigned to the School Inspection program. Please pick another school and try again.'
            }

            throw new Error(errorMessage)
        }

        const response = parsedBody ?? {}

        console.log('DHIS2 sync response:', response)

        // Check if the response contains the event ID
        // New tracker API response structure
        let eventId = options?.dhis2EventIdOverride || inspection.dhis2EventId

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

        if (!options?.skipLocalUpdate) {
            await updateInspection(inspection.id, {
                dhis2EventId: eventId,
                syncStatus: 'synced',
            })
        }

        return { success: true, eventId }
    } catch (error) {
        console.error('Failed to sync inspection to DHIS2:', error)

        // Try to extract DHIS2 error details
        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
            errorMessage = error.message
            // Log the full error message to see DHIS2's response
            console.error('Sync error details:', error.message)
        }

        if (!options?.skipLocalUpdate) {
            await updateInspection(inspection.id, {
                syncStatus: 'sync_failed',
            })
        }

        return {
            success: false,
            error: errorMessage,
        }
    }
}

/**
 * Sync all unsynced inspections to DHIS2
 */
const computeSyncStatus = (statusMap: Record<string, SyncStatus>): SyncStatus => {
    const values = Object.values(statusMap)
    if (values.includes('sync_failed')) return 'sync_failed'
    if (values.includes('not_synced')) return 'not_synced'
    return 'synced'
}

const getInspectionCategories = (inspection: Inspection): Array<{ id: string; name: string }> => {
    if (inspection.orgUnitCategories && inspection.orgUnitCategories.length > 0) {
        return inspection.orgUnitCategories
    }
    if (inspection.formDataByCategory) {
        return Object.keys(inspection.formDataByCategory).map((id) => ({ id, name: id }))
    }
    return [{ id: 'default', name: 'General' }]
}

export async function syncAllInspections(engine: DataEngine): Promise<{
    synced: number
    failed: number
    total: number
}> {
    try {
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

        for (const inspection of toSync) {
            const categories = getInspectionCategories(inspection)
            const formDataByCategory = inspection.formDataByCategory || {}
            const categorySyncStatus: Record<string, SyncStatus> = {
                ...inspection.categorySyncStatus,
            }
            const categoryEventIds: Record<string, string> = {
                ...inspection.categoryEventIds,
            }

            let categoryFailed = false

            for (const category of categories) {
                const formData =
                    formDataByCategory[category.id]?.formData || inspection.formData

                const status = categorySyncStatus[category.id] || inspection.syncStatus
                if (status === 'synced') {
                    continue
                }

                const dhis2EventId =
                    formDataByCategory[category.id]?.dhis2EventId ||
                    categoryEventIds[category.id] ||
                    inspection.dhis2EventId

                const result = await syncInspectionToDHIS2(inspection, engine, {
                    formDataOverride: formData,
                    dhis2EventIdOverride: dhis2EventId,
                    categoryLabel: `Category: ${category.name}`,
                    skipLocalUpdate: true,
                })

                if (result.success && result.eventId) {
                    categorySyncStatus[category.id] = 'synced'
                    categoryEventIds[category.id] = result.eventId
                    formDataByCategory[category.id] = {
                        ...(formDataByCategory[category.id] || { formData }),
                        dhis2EventId: result.eventId,
                        syncStatus: 'synced',
                    }
                } else {
                    categorySyncStatus[category.id] = 'sync_failed'
                    formDataByCategory[category.id] = {
                        ...(formDataByCategory[category.id] || { formData }),
                        syncStatus: 'sync_failed',
                    }
                    categoryFailed = true
                }
            }

            const overallSyncStatus = computeSyncStatus(categorySyncStatus)

            await updateInspection(inspection.id, {
                formDataByCategory,
                categorySyncStatus,
                categoryEventIds,
                syncStatus: overallSyncStatus,
            })

            if (categoryFailed) {
                failed++
                console.error(`✗ Failed to sync inspection ${inspection.id}: at least one category failed`)
            } else {
                synced++
                console.log(`✓ Synced inspection ${inspection.id}`)
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
        // Treat missing syncStatus as unsynced to be safe
        const [unsynced, failed, all] = await Promise.all([
            getInspectionsBySyncStatus('not_synced'),
            getInspectionsBySyncStatus('sync_failed'),
            getAllInspections(),
        ])
        const missingStatus = all.filter(
            (inspection) => !inspection.syncStatus || inspection.syncStatus === 'in_progress'
        )
        return unsynced.length > 0 || failed.length > 0 || missingStatus.length > 0
    } catch (error) {
        console.error('Error checking for unsynced inspections:', error)
        return false
    }
}
