import { Button, InputField, SingleSelectField, SingleSelectOption, TextAreaField } from '@dhis2/ui';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAccessibleOrgUnits } from '../../../shared/hooks/useAccessibleOrgUnits';
import { useInspections } from '../../../shared/hooks/useInspections';

import styles from './CreateInspectionBottomSheet.module.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    mode?: "start" | "schedule";
}

export const CreateInspectionBottomSheet = ({ isOpen, onClose, onSuccess, mode = "start" }: Props) => {
    const [selectedOrgUnit, setSelectedOrgUnit] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('16:00');
    const [endTime, setEndTime] = useState('17:30');
    const [notes, setNotes] = useState('');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);
    const [showConfirmStart, setShowConfirmStart] = useState(false);
    
    const { createInspection } = useInspections();
    const { orgUnits, loading: orgUnitsLoading } = useAccessibleOrgUnits();
    const navigate = useNavigate();

    // Check if selected date is today
    const isDateToday = (dateString: string): boolean => {
        if (!dateString) return false;
        const selectedDate = new Date(dateString);
        const today = new Date();
        return selectedDate.toDateString() === today.toDateString();
    };

    const canStartInspection = isDateToday(eventDate);

    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

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

        // Additional validation for starting inspections
        if (mode === "start" && eventDate && !isDateToday(eventDate)) {
            newErrors.eventDate = 'You can only start inspections scheduled for today';
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

    const handleSubmit = async () => {
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
                eventDate: eventDate + 'T' + startTime + ':00',
                scheduledStartTime: startTime,
                scheduledEndTime: endTime,
                status: mode === "schedule" ? 'scheduled' as const : 'in_progress' as const,
                formData: {
                    textbooks: 0,
                    desks: 0,
                    chairs: 0,
                    testFieldNotes: notes,
                    totalStudents: '',
                    maleStudents: '',
                    femaleStudents: '',
                    staffCount: '',
                    classroomCount: '',
                },
            };

            const newInspection = await createInspection(inspectionInput);

            resetForm();
            onSuccess();
            onClose();
            
            if (mode === "start" && newInspection && newInspection.id) {
                navigate(`/inspection/${newInspection.id}`);
            }
        } catch (error) {
            console.error('Error creating inspection:', error);
            setErrors({ submit: mode === "schedule" ? 'Failed to schedule inspection. Please try again.' : 'Failed to start inspection. Please try again.' });
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
        setNotes('');
        setErrors({});
    };



    if (!isOpen) return null;

    return (
        <>
            <div
                className={`${styles.overlay} ${isOpen ? styles.open : ''}`}
                role="button"
                tabIndex={0}
                aria-label="Close inspection sheet"
                onClick={onClose}
            />

            <div className={`${styles.bottomSheet} ${isOpen ? styles.open : ''}`}>
                <div className={styles.dragHandle} />

                <div className={styles.headerBar}>
                    <button className={styles.closeIconButton} onClick={onClose} aria-label="Close">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M7.41 8.29492L12 12.8749L16.59 8.29492L18 9.70492L12 15.7049L6 9.70492L7.41 8.29492Z" fill="black"/>
                        </svg>
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.formGroup}>
                        <SingleSelectField
                            className={styles.selectField}
                            label="Select a school to inspect"
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
                            placeholder={orgUnitsLoading ? "Loading schools..." : "Select school"}
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
                            label="Date of inspection"
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

                        <div className={styles.notesRow}>
                            <TextAreaField
                                label="Additional notes"
                                value={notes}
                                rows={4}
                                onChange={({ value }) => setNotes(value ?? '')}
                            />
                        </div>

                        {mode === "start" && eventDate && !canStartInspection && (
                            <div className={styles.infoBox} style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FCA5A5' }}>
                                You can only start inspections scheduled for today. To work with future dates, use "Schedule inspection" instead.
                            </div>
                        )}

                        {errors.submit && (
                            <div className={styles.infoBox} style={{ background: '#fee', color: '#c33' }}>
                                {errors.submit}
                            </div>
                        )}
                    </div>
                </div>

                <div className={styles.footer}>
                    <Button 
                        onClick={handleDiscard} 
                        disabled={isCreating}
                        className={styles.discardButton}
                        style={{ backgroundColor: '#F8B3B4', color: '#1260BA', border: 'none' }}
                    >
                        <span className={styles.buttonIcon}>
                            <svg width="15" height="15" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                                <path d="M6 12H10M10 12H42M10 12V40C10 41.0609 10.4214 42.0783 11.1716 42.8284C11.9217 43.5786 12.9391 44 14 44H34C35.0609 44 36.0783 43.5786 36.8284 42.8284C37.5786 42.0783 38 41.0609 38 40V12M16 12V8C16 6.93913 16.4214 5.92172 17.1716 5.17157C17.9217 4.42143 18.9391 4 20 4H28C29.0609 4 30.0783 4.42143 30.8284 5.17157C31.5786 5.92172 32 6.93913 32 8V12" stroke="#1260BA" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </span>
                        Discard
                    </Button>
                    <Button
                        type="button"
                        onClick={() => {
                            if (mode === "schedule") {
                                handleSubmit();
                            } else {
                                const isValid = validateForm();
                                if (!isValid) return;
                                setShowConfirmStart(true);
                            }
                        }}
                        loading={isCreating}
                        disabled={isCreating || (mode === "start" && !canStartInspection)}
                        className={styles.startButton}
                        style={{ 
                            backgroundColor: mode === "start" && !canStartInspection ? '#DC2626' : '#1D2B36', 
                            color: '#F1F5F9', 
                            border: 'none',
                            opacity: mode === "start" && !canStartInspection ? 0.7 : 1,
                            cursor: mode === "start" && !canStartInspection ? 'not-allowed' : 'pointer'
                        }}
                    >
                        {mode === "schedule" ? "Schedule inspection" : "Start inspection"}
                    </Button>
                </div>
            </div>

            {showConfirmStart && mode === "start" && (
                <div className={styles.confirmOverlay} role="dialog" aria-modal="true" aria-label="Start inspection?">
                    <div className={styles.confirmModal}>
                        <h3 className={styles.confirmTitle}>Start inspection?</h3>
                        <div className={styles.confirmActions}>
                            <button
                                type="button"
                                className={styles.confirmButtonNo}
                                onClick={() => setShowConfirmStart(false)}
                                disabled={isCreating}
                            >
                                No
                            </button>
                            <button
                                type="button"
                                className={styles.confirmButtonYes}
                                onClick={() => {
                                    setShowConfirmStart(false);
                                    handleSubmit();
                                }}
                                disabled={isCreating}
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
