import { createInspection } from '../db/indexedDB'
import type { CreateInspectionInput } from '../types/inspection'

export async function createSampleInspection(
    schoolName: string = 'Demo Primary School',
    eventDate: string = new Date().toISOString(),
    status: 'scheduled' | 'in_progress' | 'completed' = 'scheduled'
) {
    const input: CreateInspectionInput = {
        orgUnit: 'demo-org-unit',
        orgUnitName: schoolName,
        eventDate,
        scheduledStartTime: '16:00',
        scheduledEndTime: '17:30',
        status,
        formData: {
            textbooks: status === 'completed' ? 35 : 0,
            desks: status === 'completed' ? 35 : 0,
            chairs: status === 'completed' ? 35 : 0,
            totalStudents: status === 'completed' ? '120' : '',
            maleStudents: status === 'completed' ? '60' : '',
            femaleStudents: status === 'completed' ? '60' : '',
            staffCount: status === 'completed' ? '12' : '',
            classroomCount: status === 'completed' ? '6' : '',
            testFieldNotes: status === 'completed' ? 'All resources are in good condition.' : '',
        },
    }

    const inspection = await createInspection(input)
    console.log('Created sample inspection:', inspection)
    return inspection
}

export async function createSampleInspections() {
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const nextWeek = new Date(today)
    nextWeek.setDate(nextWeek.getDate() + 7)
    const lastWeek = new Date(today)
    lastWeek.setDate(lastWeek.getDate() - 7)
    const lastMonth = new Date(today)
    lastMonth.setMonth(lastMonth.getMonth() - 1)

    const inspections = await Promise.all([
        createSampleInspection('Demo Primary School', today.toISOString(), 'scheduled'),
        createSampleInspection('Sunrise Elementary', tomorrow.toISOString(), 'scheduled'),
        createSampleInspection('Greenfield Academy', nextWeek.toISOString(), 'scheduled'),
        createSampleInspection('Hillside School', lastWeek.toISOString(), 'completed'),
        createSampleInspection('Valley View School', lastMonth.toISOString(), 'completed'),
    ])

    console.log('Created sample inspections:', inspections)
    return inspections
}

if (process.env.NODE_ENV === 'development') {
    ;(window as any).createSampleInspection = createSampleInspection
    ;(window as any).createSampleInspections = createSampleInspections
}
