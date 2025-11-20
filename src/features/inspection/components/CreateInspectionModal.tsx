import i18n from '@dhis2/d2-i18n'
import {
    Modal,
    ModalTitle,
    ModalContent,
    ModalActions,
    Button,
    ButtonStrip,
    InputField,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
} from '@dhis2/ui'
import React from 'react'

import { DHIS2_PROGRAM_UID, DHIS2_ROOT_OU_UID } from '../../../shared/config/dhis2'
import { getApiBase, getAuthHeader } from '../../../shared/utils/auth'
import { useInspections } from '../../../shared/hooks/useInspections'

import type { CreateInspectionInput } from '../../../shared/types/inspection'

// School-related organisation unit groups (LBE/UBE/ECD/Tertiary)
const SCHOOL_GROUP_IDS = ['ib40OsG9QAI', 'SPCm0Ts3SLR', 'UzSEGuwAfyX', 'sSgWDKuCrmi']

interface CreateInspectionModalProps {
    isOpen: boolean
    onClose: () => void
    onSuccess?: () => void
}

export const CreateInspectionModal: React.FC<CreateInspectionModalProps> = ({
    isOpen,
    onClose,
    onSuccess,
}) => {
    const { createInspection } = useInspections()
    const [schoolsLoading, setSchoolsLoading] = React.useState(false)
    const [schoolsError, setSchoolsError] = React.useState<string | null>(null)
    const [schoolOptions, setSchoolOptions] = React.useState<Array<{ value: string; label: string }>>([])
    const [schoolsLoadedOnce, setSchoolsLoadedOnce] = React.useState(false)
    const isFetchingRef = React.useRef(false)
    const apiBase = React.useMemo(() => getApiBase(), [])

    const fetchSchools = React.useCallback(async () => {
        if (isFetchingRef.current) {
            return
        }
        isFetchingRef.current = true
        setSchoolsLoading(true)
        setSchoolsError(null)
        try {
            const filters = [
                `organisationUnitGroups.id:in:[${SCHOOL_GROUP_IDS.join(',')}]`,
                'level:ge:4',
            ]
            if (DHIS2_ROOT_OU_UID) {
                filters.push(`path:like:/${DHIS2_ROOT_OU_UID}`)
            }

            const params = new URLSearchParams()
            params.set('paging', 'false')
            params.set('fields', 'id,displayName')
            filters.forEach(f => params.append('filter', f))
            params.set('program', DHIS2_PROGRAM_UID)
            params.set('_', Date.now().toString()) // cache buster to avoid 304

            const url = `${apiBase}/organisationUnits?${params.toString()}`
            const res = await fetch(url, {
                headers: {
                    Authorization: getAuthHeader(),
                    'Cache-Control': 'no-cache',
                    Pragma: 'no-cache',
                },
                cache: 'no-store',
            })

            if (!res.ok) {
                throw new Error(`${res.status} ${res.statusText}`)
            }

            const data = await res.json()
            const list = data?.organisationUnits || []
            setSchoolOptions(
                [...list]
                    .sort((a: any, b: any) => a.displayName.localeCompare(b.displayName))
                    .map((ou: any) => ({
                        value: ou.id,
                        label: ou.displayName,
                    }))
            )
            setSchoolsLoadedOnce(true)
        } catch (err) {
            console.error('Failed to load schools', err)
            setSchoolsError(err instanceof Error ? err.message : 'Unknown error')
            setSchoolOptions([])
        } finally {
            isFetchingRef.current = false
            setSchoolsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        if (isOpen && !schoolsLoadedOnce) {
            fetchSchools()
        }
    }, [isOpen, fetchSchools, schoolsLoadedOnce])

    // Form state
    const [selectedOrgUnit, setSelectedOrgUnit] = React.useState<{
        id: string
        displayName: string
    } | null>(null)
    const [eventDate, setEventDate] = React.useState('')
    const [startTime, setStartTime] = React.useState('16:00')
    const [endTime, setEndTime] = React.useState('17:30')
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    // Validation errors
    const [errors, setErrors] = React.useState<{
        orgUnit?: string
        eventDate?: string
        startTime?: string
        endTime?: string
    }>({})

    // Reset form when modal closes
    React.useEffect(() => {
        if (!isOpen) {
            setSelectedOrgUnit(null)
            setEventDate('')
            setStartTime('16:00')
            setEndTime('17:30')
            setErrors({})
            setError(null)
            setLoading(false)
        }
    }, [isOpen])

    // Validate form
    const validate = (): boolean => {
        const newErrors: typeof errors = {}

        if (!selectedOrgUnit) {
            newErrors.orgUnit = i18n.t('Please select a school')
        }

        if (!eventDate) {
            newErrors.eventDate = i18n.t('Inspection date is required')
        } else {
            const selectedDate = new Date(eventDate)
            const today = new Date()
            today.setHours(0, 0, 0, 0)

            if (selectedDate < today) {
                newErrors.eventDate = i18n.t('Inspection date cannot be in the past')
            }
        }

        if (!startTime) {
            newErrors.startTime = i18n.t('Start time is required')
        }

        if (!endTime) {
            newErrors.endTime = i18n.t('End time is required')
        }

        if (startTime && endTime && startTime >= endTime) {
            newErrors.endTime = i18n.t('End time must be after start time')
        }

        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    // Handle form submission
    const handleSubmit = async () => {
        if (!validate()) {
            return
        }

        setLoading(true)
        setError(null)

        try {
            // Ensure we have a selected org unit (validation should catch this, but double-check)
            if (!selectedOrgUnit) {
                setError(i18n.t('Please select a school'))
                return
            }

            // Combine date and start time into ISO string
            const dateTimeString = `${eventDate}T${startTime}:00`

            const inspectionInput: CreateInspectionInput = {
                orgUnit: selectedOrgUnit.id,
                orgUnitName: selectedOrgUnit.displayName,
                eventDate: dateTimeString,
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                status: 'scheduled',
                formData: {
                    textbooks: 0,
                    chairs: 0,
                    totalStudents: '',
                    maleStudents: '',
                    femaleStudents: '',
                    staffCount: '',
                    classroomCount: '',
                    testFieldNotes: '',
                },
            }

            await createInspection(inspectionInput)

            // Success - close modal and notify parent
            onClose()
            if (onSuccess) {
                onSuccess()
            }
        } catch (err) {
            console.error('Failed to create inspection:', err)
            setError(i18n.t('Failed to create inspection. Please try again.'))
        } finally {
            setLoading(false)
        }
    }

    // Get today's date in YYYY-MM-DD format for min attribute
    const today = new Date().toISOString().split('T')[0]

    return (
        <Modal hide={!isOpen} onClose={onClose} position="middle">
            <ModalTitle>{i18n.t('Schedule New Inspection')}</ModalTitle>
            <ModalContent>
                {error && (
                    <div style={{ marginBottom: '16px' }}>
                        <NoticeBox error title={i18n.t('Error')}>
                            {error}
                        </NoticeBox>
                    </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div>
                        <label
                            style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 500,
                                marginBottom: '8px',
                                color: '#212934',
                            }}
                        >
                            {i18n.t('Select School')} <span style={{ color: '#d32f2f' }}>*</span>
                        </label>
                        <SingleSelectField
                            selected={selectedOrgUnit?.id || ''}
                        filterable
                        clearable
                        loading={schoolsLoading}
                        onFocus={() => {
                                if (schoolsError && !schoolsLoading) {
                                    fetchSchools()
                                }
                        }}
                            onChange={({ selected }: { selected: string }) => {
                                const choice = schoolOptions.find(option => option.value === selected)
                                if (choice) {
                                    setSelectedOrgUnit({
                                        id: choice.value,
                                        displayName: choice.label,
                                    })
                                    if (errors.orgUnit) {
                                        setErrors({ ...errors, orgUnit: undefined })
                                    }
                                }
                            }}
                            placeholder={schoolsLoading ? i18n.t('Loading schools...') : i18n.t('Search schools')}
                            error={Boolean(errors.orgUnit || schoolsError)}
                            validationText={
                                errors.orgUnit ||
                                (schoolsError ? i18n.t('Failed to load schools. Please try again.') : undefined)
                            }
                        >
                            {schoolOptions.map(option => (
                                <SingleSelectOption key={option.value} value={option.value} label={option.label} />
                            ))}
                        </SingleSelectField>
                        {selectedOrgUnit && (
                            <div
                                style={{
                                    marginTop: '8px',
                                    padding: '8px 12px',
                                    backgroundColor: '#f4f6f8',
                                    borderRadius: '4px',
                                    fontSize: '14px',
                                    color: '#4a5568',
                                }}
                            >
                                {i18n.t('Selected: {{school}}', { school: selectedOrgUnit.displayName })}
                            </div>
                        )}
                        {errors.orgUnit && (
                            <div
                                style={{
                                    marginTop: '4px',
                                    fontSize: '12px',
                                    color: '#d32f2f',
                                }}
                            >
                                {errors.orgUnit}
                            </div>
                        )}
                    </div>

                    <InputField
                        label={i18n.t('Inspection Date')}
                        name="eventDate"
                        type="date"
                        value={eventDate}
                        min={today}
                        onChange={({ value }: { value?: string }) => {
                            setEventDate(value || '')
                            if (errors.eventDate) {
                                setErrors({ ...errors, eventDate: undefined })
                            }
                        }}
                        error={Boolean(errors.eventDate)}
                        validationText={errors.eventDate}
                        required
                        disabled={loading}
                    />

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <InputField
                            label={i18n.t('Start Time')}
                            name="startTime"
                            type="time"
                            value={startTime}
                            onChange={({ value }: { value?: string }) => {
                                setStartTime(value || '')
                                if (errors.startTime) {
                                    setErrors({ ...errors, startTime: undefined })
                                }
                            }}
                            error={Boolean(errors.startTime)}
                            validationText={errors.startTime}
                            required
                            disabled={loading}
                        />

                        <InputField
                            label={i18n.t('End Time')}
                            name="endTime"
                            type="time"
                            value={endTime}
                            onChange={({ value }: { value?: string }) => {
                                setEndTime(value || '')
                                if (errors.endTime) {
                                    setErrors({ ...errors, endTime: undefined })
                                }
                            }}
                            error={Boolean(errors.endTime)}
                            validationText={errors.endTime}
                            required
                            disabled={loading}
                        />
                    </div>

                    <div
                        style={{
                            padding: '12px',
                            backgroundColor: '#f4f6f8',
                            borderRadius: '4px',
                            fontSize: '14px',
                            color: '#4a5568',
                        }}
                    >
                        <strong>{i18n.t('Data to be collected during inspection:')}</strong>
                        <ul style={{ marginTop: '8px', marginBottom: 0, paddingLeft: '20px' }}>
                            <li>{i18n.t('Staff: Total staff count')}</li>
                            <li>{i18n.t('Resources: Textbooks and chairs')}</li>
                            <li>{i18n.t('Students: Total, male, and female student counts')}</li>
                            <li>{i18n.t('Facilities: Number of classrooms')}</li>
                            <li>{i18n.t('Additional notes (optional)')}</li>
                        </ul>
                    </div>
                </div>
            </ModalContent>
            <ModalActions>
                <ButtonStrip end>
                    <Button onClick={onClose} disabled={loading}>
                        {i18n.t('Cancel')}
                    </Button>
                    <Button primary onClick={handleSubmit} loading={loading}>
                        {i18n.t('Create Inspection')}
                    </Button>
                </ButtonStrip>
            </ModalActions>
        </Modal>
    )
}
