import { useState, useEffect } from 'react';
import { Button, InputField, SingleSelectField, SingleSelectOption } from '@dhis2/ui';
import { useNavigate } from 'react-router-dom';
import { useInspections } from '../../../shared/hooks/useInspections';
import { useAccessibleOrgUnits } from '../../../shared/hooks/useAccessibleOrgUnits';
import styles from './CreateInspectionBottomSheet.module.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateInspectionBottomSheet = ({ isOpen, onClose, onSuccess }: Props) => {
    const [selectedOrgUnit, setSelectedOrgUnit] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('16:00');
    const [endTime, setEndTime] = useState('17:30');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);
    
    const { createInspection } = useInspections();
    const { orgUnits, loading: orgUnitsLoading } = useAccessibleOrgUnits();
    const navigate = useNavigate();

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    // Prevent body scroll when open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!selectedOrgUnit) {
            newErrors.selectedOrgUnit = 'School selection is required';
        }

        if (!eventDate) {
            newErrors.eventDate = 'Date is required';
        } else {
            const selectedDate = new Date(eventDate);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (selectedDate < today) {
                newErrors.eventDate = 'Date cannot be in the past';
            }
        }

        if (!startTime) {
            newErrors.startTime = 'Start time is required';
        }

        if (!endTime) {
            newErrors.endTime = 'End time is required';
        }

        if (startTime && endTime && startTime >= endTime) {
            newErrors.endTime = 'End time must be after start time';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleStartInspection = async () => {
        if (!validateForm()) return;

        setIsCreating(true);

        try {
            const selectedSchool = orgUnits.find(org => org.id === selectedOrgUnit);
            if (!selectedSchool) {
                throw new Error('Selected school not found');
            }

            const inspectionInput = {
                orgUnit: selectedSchool.id,
                orgUnitName: selectedSchool.name,
                eventDate: eventDate + 'T' + startTime + ':00', // ISO 8601 format
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                status: 'scheduled' as const, // Create as scheduled for upcoming inspections
                formData: {
                    textbooks: 0,
                    desks: 0,
                    chairs: 0,
                    testFieldNotes: '',
                    totalStudents: '',
                    maleStudents: '',
                    femaleStudents: '',
                    staffCount: '',
                    classroomCount: '',
                },
            };

            const newInspection = await createInspection(inspectionInput);

            // Reset form
            resetForm();
            onSuccess();
            onClose();
            
            // Navigate to the newly created inspection
            if (newInspection && newInspection.id) {
                navigate(`/inspection/${newInspection.id}`);
            }
        } catch (error) {
            console.error('Error creating inspection:', error);
            setErrors({ submit: 'Failed to start inspection. Please try again.' });
        } finally {
            setIsCreating(false);
        }
    };

    const handleDiscard = () => {
        resetForm();
        onClose();
    };

    const resetForm = () => {
        setSelectedOrgUnit('');
        setEventDate('');
        setStartTime('16:00');
        setEndTime('17:30');
        setErrors({});
    };



    if (!isOpen) return null;

    return (
        <>
            {/* Overlay */}
            <div 
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                onClick={onClose}
            />

            {/* Bottom Sheet */}
            <div className={`${styles.bottomSheet} ${isOpen ? styles.open : ''}`}>
                {/* Drag Handle */}
                <div className={styles.dragHandle} />

                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Create New Inspection</h2>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <SingleSelectField
                            label="Select School"
                            selected={selectedOrgUnit}
                            onChange={({ selected }) => {
                                setSelectedOrgUnit(selected);
                                if (errors.selectedOrgUnit) {
                                    setErrors({ ...errors, selectedOrgUnit: '' });
                                }
                            }}
                            error={!!errors.selectedOrgUnit}
                            validationText={errors.selectedOrgUnit}
                            required
                            disabled={isCreating || orgUnitsLoading}
                            placeholder={orgUnitsLoading ? "Loading schools..." : "Choose a school"}
                        >
                            {orgUnits.map((orgUnit) => (
                                <SingleSelectOption
                                    key={orgUnit.id}
                                    label={orgUnit.name}
                                    value={orgUnit.id}
                                />
                            ))}
                        </SingleSelectField>

                        <InputField
                            label="Date"
                            type="date"
                            value={eventDate}
                            onChange={({ value }) => {
                                setEventDate(value || '');
                                if (errors.eventDate) {
                                    setErrors({ ...errors, eventDate: '' });
                                }
                            }}
                            error={!!errors.eventDate}
                            validationText={errors.eventDate}
                            required
                            disabled={isCreating}
                            min={new Date().toISOString().split('T')[0]}
                        />

                        <div className={styles.timeRow}>
                            <InputField
                                label="Start Time"
                                type="time"
                                value={startTime}
                                onChange={({ value }) => {
                                    setStartTime(value || '16:00');
                                    if (errors.startTime) {
                                        setErrors({ ...errors, startTime: '' });
                                    }
                                }}
                                error={!!errors.startTime}
                                validationText={errors.startTime}
                                required
                                disabled={isCreating}
                            />

                            <InputField
                                label="End Time"
                                type="time"
                                value={endTime}
                                onChange={({ value }) => {
                                    setEndTime(value || '17:30');
                                    if (errors.endTime) {
                                        setErrors({ ...errors, endTime: '' });
                                    }
                                }}
                                error={!!errors.endTime}
                                validationText={errors.endTime}
                                required
                                disabled={isCreating}
                            />
                        </div>

                        {errors.submit && (
                            <div className={styles.infoBox} style={{ background: '#fee', color: '#c33' }}>
                                {errors.submit}
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <Button 
                        onClick={handleDiscard} 
                        disabled={isCreating}
                    >
                        Discard
                    </Button>
                    <Button 
                        primary 
                        onClick={handleStartInspection} 
                        loading={isCreating}
                        disabled={isCreating}
                    >
                        Start Inspection
                    </Button>
                </div>
            </div>
        </>
    );
};
