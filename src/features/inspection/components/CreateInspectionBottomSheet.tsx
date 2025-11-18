import { useState, useEffect } from 'react';
import { Button, InputField } from '@dhis2/ui';
import styles from './CreateInspectionBottomSheet.module.css';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export const CreateInspectionBottomSheet = ({ isOpen, onClose, onSuccess }: Props) => {
    const [schoolName, setSchoolName] = useState('');
    const [eventDate, setEventDate] = useState('');
    const [startTime, setStartTime] = useState('16:00');
    const [endTime, setEndTime] = useState('17:30');
    const [errors, setErrors] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

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

        if (!schoolName.trim()) {
            newErrors.schoolName = 'School name is required';
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

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsCreating(true);

        try {
            const db = await openDB();
            const inspection = {
                id: crypto.randomUUID(),
                schoolName,
                eventDate,
                startTime,
                endTime,
                status: 'scheduled',
                createdAt: new Date().toISOString(),
            };

            await addInspection(db, inspection);

            // Reset form
            setSchoolName('');
            setEventDate('');
            setStartTime('16:00');
            setEndTime('17:30');
            setErrors({});

            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating inspection:', error);
            setErrors({ submit: 'Failed to create inspection. Please try again.' });
        } finally {
            setIsCreating(false);
        }
    };

    const openDB = (): Promise<IDBDatabase> => {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('InspectionDB', 1);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains('inspections')) {
                    db.createObjectStore('inspections', { keyPath: 'id' });
                }
            };
        });
    };

    const addInspection = (db: IDBDatabase, inspection: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(['inspections'], 'readwrite');
            const store = transaction.objectStore('inspections');
            const request = store.add(inspection);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
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
                        <InputField
                            label="School Name"
                            type="text"
                            value={schoolName}
                            onChange={({ value }) => {
                                setSchoolName(value || '');
                                if (errors.schoolName) {
                                    setErrors({ ...errors, schoolName: '' });
                                }
                            }}
                            error={!!errors.schoolName}
                            validationText={errors.schoolName}
                            required
                            disabled={isCreating}
                        />

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
                    <Button onClick={onClose} disabled={isCreating}>
                        Cancel
                    </Button>
                    <Button 
                        primary 
                        onClick={handleSubmit} 
                        loading={isCreating}
                        disabled={isCreating}
                    >
                        Create Inspection
                    </Button>
                </div>
            </div>
        </>
    );
};
