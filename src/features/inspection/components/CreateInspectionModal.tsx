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
    OrganisationUnitTree,
} from '@dhis2/ui'
import React from 'react'

import { DHIS2_ROOT_OU_UID } from '../../../shared/config/dhis2'
import { useInspections } from '../../../shared/hooks/useInspections'

import type { CreateInspectionInput } from '../../../shared/types/inspection'

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
                        <div
                            style={{
                                border: errors.orgUnit ? '1px solid #d32f2f' : '1px solid #a0adba',
                                borderRadius: '4px',
                                padding: '8px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                            }}
                        >
                            <OrganisationUnitTree
                                onChange={(orgUnit: { id: string; displayName?: string; path?: string }) => {
                                    setSelectedOrgUnit({
                                        id: orgUnit.id,
                                        displayName: orgUnit.displayName || orgUnit.path || orgUnit.id,
                                    })
                                    if (errors.orgUnit) {
                                        setErrors({ ...errors, orgUnit: undefined })
                                    }
                                }}
                                selected={selectedOrgUnit ? [selectedOrgUnit.id] : []}
                                singleSelection
                                roots={[DHIS2_ROOT_OU_UID]}
                            />
                        </div>
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
