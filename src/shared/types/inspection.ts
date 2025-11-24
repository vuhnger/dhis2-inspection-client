/**
 * Local inspection data types for IndexedDB storage
 */

export type InspectionStatus = 'scheduled' | 'in_progress' | 'completed'
export type SyncStatus = 'synced' | 'not_synced' | 'sync_failed'

export interface OrgUnitCategory {
    id: string
    name: string
}

/**
 * Form data matching InspectionOverview form structure
 * Based on data-mappings.json - only includes fields that sync to DHIS2
 */
export interface InspectionFormData {
    // Resources
    textbooks: number
    chairs: number
    testFieldNotes: string

    // Students
    totalStudents: string
    maleStudents: string
    femaleStudents: string

    // Staff
    staffCount: string

    // Facilities
    classroomCount: string
}

export interface CategoryFormData {
    formData: InspectionFormData
    syncStatus?: SyncStatus
    dhis2EventId?: string
}

/**
 * Complete inspection record stored in IndexedDB
 */
export interface Inspection {
    // Primary key - auto-generated UUID
    id: string

    // School/org unit information
    orgUnit: string
    orgUnitName: string
    orgUnitCategories?: OrgUnitCategory[]
    source?: 'local' | 'server'

    // Scheduling information
    eventDate: string // ISO 8601 format
    scheduledStartTime?: string // e.g., "16:00"
    scheduledEndTime?: string // e.g., "17:30"

    // Status tracking
    status: InspectionStatus
    syncStatus: SyncStatus

    // Form data - backward compatibility (single form)
    formData: InspectionFormData

    // Per-category forms (keyed by org unit group ID)
    formDataByCategory?: Record<string, CategoryFormData>
    categorySyncStatus?: Record<string, SyncStatus>
    categoryEventIds?: Record<string, string>

    // Metadata
    createdAt: string // ISO 8601 format
    updatedAt: string // ISO 8601 format

    // DHIS2 integration
    dhis2EventId?: string // If synced to DHIS2
}

/**
 * Partial inspection data for creation
 */
export type CreateInspectionInput = Omit<Inspection, 'id' | 'createdAt' | 'updatedAt' | 'syncStatus'>

/**
 * Partial inspection data for updates
 */
export type UpdateInspectionInput = Partial<Omit<Inspection, 'id' | 'createdAt'>>
