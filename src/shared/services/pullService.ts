import { getApiBase, getAuthHeader } from '../utils/auth'
import { getAllInspections, saveInspection, updateInspection } from '../db/indexedDB'
import type { Inspection, InspectionFormData } from '../types/inspection'

const DHIS_STATUS_MAP: Record<string, Inspection['status']> = {
    COMPLETED: 'completed',
    ACTIVE: 'in_progress',
    SCHEDULE: 'scheduled',
}

const DATA_ELEMENT_FIELD_MAP: Record<string, keyof InspectionFormData> = {
    xiaOnejpgdY: 'textbooks',
    mAtab30vU5g: 'chairs',
    EaWxWo27lm3: 'totalStudents',
    h4XENZX2UMf: 'maleStudents',
    DM707Od7el4: 'femaleStudents',
    ooYtEgJUuRM: 'staffCount',
    ya5SyA5hej4: 'classroomCount',
    KrijJzaqMAU: 'testFieldNotes',
}

type TrackerEvent = {
    event: string
    orgUnit: string
    orgUnitName?: string
    occurredAt?: string
    status?: string
    dataValues?: Array<{ dataElement: string; value: string | number }>
}

const mapRemoteEventToFormData = (event: TrackerEvent): InspectionFormData => {
    const formData: InspectionFormData = {
        textbooks: 0,
        chairs: 0,
        testFieldNotes: '',
        totalStudents: '',
        maleStudents: '',
        femaleStudents: '',
        staffCount: '',
        classroomCount: '',
    }

    for (const dv of event.dataValues || []) {
        const field = DATA_ELEMENT_FIELD_MAP[dv.dataElement]
        if (!field) continue

        if (field === 'textbooks' || field === 'chairs') {
            formData[field] = Number(dv.value) || 0
        } else {
            formData[field] = String(dv.value ?? '')
        }
    }

    return formData
}

export async function pullRemoteInspections(limit = 100): Promise<{
    fetched: number
    created: number
    updated: number
}> {
    const apiBase = getApiBase()
    const params = new URLSearchParams()
    params.set('program', import.meta.env.VITE_DHIS2_PROGRAM_UID || 'UxK2o06ScIe')
    params.set('fields', 'event,orgUnit,orgUnitName,occurredAt,status,dataValues[dataElement,value]')
    params.set('order', 'occurredAt:desc')
    params.set('pageSize', String(limit))

    const res = await fetch(`${apiBase}/tracker/events?${params.toString()}`, {
        headers: {
            Authorization: getAuthHeader(),
        },
    })

    if (!res.ok) {
        throw new Error(`${res.status} ${res.statusText}`)
    }

    const body = await res.json()
    // Support both shapes: { events: [...] } and { events: { instances: [...] } }
    const events: TrackerEvent[] =
        (Array.isArray(body?.events) ? body.events : body?.events?.instances) ||
        body?.instances ||
        []
    const orgUnitIds = Array.from(new Set(events.map((e) => e.orgUnit))).filter(Boolean)
    const orgUnitMap: Record<string, string> = {}

    if (orgUnitIds.length) {
        const ouParams = new URLSearchParams()
        ouParams.set('paging', 'false')
        ouParams.set('fields', 'id,displayName,name')
        ouParams.set('filter', `id:in:[${orgUnitIds.join(',')}]`)
        const ouRes = await fetch(`${apiBase}/organisationUnits?${ouParams.toString()}`, {
            headers: {
                Authorization: getAuthHeader(),
            },
        })
        if (ouRes.ok) {
            const ouBody = await ouRes.json()
            for (const ou of ouBody?.organisationUnits || []) {
                orgUnitMap[ou.id] = ou.displayName || ou.name || ou.id
            }
        }
    }
    const existing = await getAllInspections()
    const byEventId = new Map<string, Inspection>()
    const byDhId = new Map<string, Inspection>()
    existing.forEach((i) => {
        byEventId.set(i.id, i)
        if (i.dhis2EventId) {
            byDhId.set(i.dhis2EventId, i)
        }
    })

    let created = 0
    let updated = 0

    for (const event of events) {
        const eventId = event.event
        const status = DHIS_STATUS_MAP[event.status || ''] || 'in_progress'
        const formData = mapRemoteEventToFormData(event)
        const occurredAt = event.occurredAt || new Date().toISOString()
        const orgUnitName = orgUnitMap[event.orgUnit] || event.orgUnitName || 'School'
        const existingMatch =
            byEventId.get(eventId) ||
            byDhId.get(eventId) ||
            existing.find((i) => i.dhis2EventId === eventId)

        if (existingMatch) {
            await updateInspection(existingMatch.id, {
                orgUnit: event.orgUnit,
                orgUnitName,
                eventDate: occurredAt,
                status,
                formData,
                dhis2EventId: eventId,
                syncStatus: 'synced',
                source: 'server',
            })
            updated++
        } else {
            const now = new Date().toISOString()
            const inspection: Inspection = {
                id: eventId,
                orgUnit: event.orgUnit,
                orgUnitName,
                eventDate: occurredAt,
                status,
                syncStatus: 'synced',
                formData,
                createdAt: occurredAt || now,
                updatedAt: now,
                dhis2EventId: eventId,
                source: 'server',
            }
            await saveInspection(inspection)
            created++
        }
    }

    return {
        fetched: events.length,
        created,
        updated,
    }
}
