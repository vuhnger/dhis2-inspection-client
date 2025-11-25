export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed'
export type SyncStatus = 'synced' | 'not_synced' | 'sync_failed'

export interface OrgUnitCategory {
    id: string
    name: string
}

export interface InspectionFormData {
    textbooks: number
    chairs: number
    testFieldNotes: string

    totalStudents: string
    maleStudents: string
    femaleStudents: string

    staffCount: string

    classroomCount: string
}

export interface CategoryFormData {
    formData: InspectionFormData
    syncStatus?: SyncStatus
    dhis2EventId?: string
}

export interface Inspection {
    id: string

    orgUnit: string
    orgUnitName: string
    orgUnitCategories?: OrgUnitCategory[]
    source?: 'local' | 'server'

    eventDate: string
    scheduledStartTime?: string
    scheduledEndTime?: string

    status: InspectionStatus
    syncStatus: SyncStatus

    formData: InspectionFormData

    formDataByCategory?: Record<string, CategoryFormData>
    categorySyncStatus?: Record<string, SyncStatus>
    categoryEventIds?: Record<string, string>

    createdAt: string
    updatedAt: string

    dhis2EventId?: string
}

export type CreateInspectionInput = Omit<Inspection, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>

export type UpdateInspectionInput = Partial<Omit<Inspection, 'id' | 'createdAt'>>
