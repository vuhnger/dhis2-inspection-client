import { DHIS2_PROGRAM_STAGE_UID, DHIS2_PROGRAM_UID } from '../config/dhis2'
import { updateInspection, getInspectionsBySyncStatus, getAllInspections } from '../db/indexedDB'
import { getAuthHeader, getApiBase } from '../utils/auth'

import type { Inspection, InspectionFormData, SyncStatus } from '../types/inspection'

type DataEngine = {
    mutate: (mutation: {
        resource: string
        type: 'create' | 'update' | 'delete'
        data?: unknown
        params?: Record<string, unknown>
    }) => Promise<any>
    query: (query: unknown) => Promise<any>
}

const DATA_ELEMENT_MAP = {
    textbooks: 'xiaOnejpgdY',
    desks: '',
    chairs: 'mAtab30vU5g',
    totalStudents: 'EaWxWo27lm3',
    maleStudents: 'h4XENZX2UMf',
    femaleStudents: 'DM707Od7el4',
    staffCount: 'ooYtEgJUuRM',
    classroomCount: 'ya5SyA5hej4',
    testFieldNotes: 'KrijJzaqMAU',
}

function inspectionToDHIS2Event(
    inspection: Inspection,
    options?: { formDataOverride?: InspectionFormData; dhis2EventIdOverride?: string; categoryLabel?: string }
) {
    const dataValues = []

    const formData = options?.formDataOverride || inspection.formData

    if (formData.textbooks !== 0 && DATA_ELEMENT_MAP.textbooks) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.textbooks,
            value: formData.textbooks.toString(),
        })
    }

    if (formData.chairs !== 0 && DATA_ELEMENT_MAP.chairs) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.chairs,
            value: formData.chairs.toString(),
        })
    }

    if (formData.totalStudents && DATA_ELEMENT_MAP.totalStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.totalStudents,
            value: formData.totalStudents,
        })
    }

    if (formData.maleStudents && DATA_ELEMENT_MAP.maleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.maleStudents,
            value: formData.maleStudents,
        })
    }

    if (formData.femaleStudents && DATA_ELEMENT_MAP.femaleStudents) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.femaleStudents,
            value: formData.femaleStudents,
        })
    }

    if (formData.staffCount && DATA_ELEMENT_MAP.staffCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.staffCount,
            value: formData.staffCount,
        })
    }

    if (formData.classroomCount && DATA_ELEMENT_MAP.classroomCount) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.classroomCount,
            value: formData.classroomCount,
        })
    }

    const notesValue = options?.categoryLabel
        ? `${options.categoryLabel}${formData.testFieldNotes ? ` - ${formData.testFieldNotes}` : ''}`
        : formData.testFieldNotes
    if (notesValue && DATA_ELEMENT_MAP.testFieldNotes) {
        dataValues.push({
            dataElement: DATA_ELEMENT_MAP.testFieldNotes,
            value: notesValue,
        })
    }

    const statusMap = {
        scheduled: 'ACTIVE',
        in_progress: 'ACTIVE',
        completed: 'COMPLETED',
    }

    const payload: Record<string, unknown> = {
        program: DHIS2_PROGRAM_UID,
        programStage: DHIS2_PROGRAM_STAGE_UID,
        orgUnit: inspection.orgUnit,
        occurredAt: inspection.eventDate.split('T')[0],
        status: statusMap[inspection.status],
        dataValues,
    }

    const eventId = options?.dhis2EventIdOverride || inspection.dhis2EventId
    if (eventId) {
        payload.event = eventId
    }

    return payload
}

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

        const trackerPayload = {
            events: [eventPayload],
        }

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

        let eventId = options?.dhis2EventIdOverride || inspection.dhis2EventId

        if (!isUpdate) {
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

        let errorMessage = 'Unknown error'
        if (error instanceof Error) {
            errorMessage = error.message
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

export async function hasUnsyncedInspections(): Promise<boolean> {
    try {
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
