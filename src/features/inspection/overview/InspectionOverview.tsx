import React from 'react'
import { useParams } from 'react-router-dom'
import { Button, InputField, NoticeBox, TextAreaField, Tooltip, CircularLoader } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import { useInspection } from '../../../shared/hooks/useInspections'
import type { InspectionFormData } from '../../../shared/types/inspection'

import classes from './InspectionOverview.module.css'

type Category = 'resources' | 'staff' | 'students' | 'facilities'

// Category metadata
const CATEGORY_ORDER: Category[] = ['staff', 'resources', 'students', 'facilities']

const CATEGORY_LABELS: Record<Category, string> = {
    staff: 'Staff',
    resources: 'Resources',
    students: 'Students',
    facilities: 'Facilities',
}

type FormState = {
    // Resources form fields (using numbers)
    textbooks: number
    desks: number
    chairs: number

    // Students form fields
    totalStudents: string
    maleStudents: string
    femaleStudents: string

    // Staff form fields (placeholder)
    staffCount: string

    // Facilities form fields (placeholder)
    classroomCount: string

    testFieldNotes: string
}

// Map each category to its fields
const CATEGORY_FIELDS: Record<Category, Array<keyof FormState>> = {
    resources: ['textbooks', 'desks', 'chairs'],
    students: ['totalStudents', 'maleStudents', 'femaleStudents'],
    staff: ['staffCount'],
    facilities: ['classroomCount'],
}

const DEFAULT_FORM: FormState = {
    textbooks: 0,
    desks: 0,
    chairs: 0,
    totalStudents: '',
    maleStudents: '',
    femaleStudents: '',
    staffCount: '',
    classroomCount: '',
    testFieldNotes: '',
}

const InspectionOverview: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const { inspection, loading: inspectionLoading, updateInspection } = useInspection(id || null)

    const [selectedCategory, setSelectedCategory] = React.useState<Category>('resources')
    const [form, setForm] = React.useState<FormState>(DEFAULT_FORM)
    const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
    const [wasSubmitted, setWasSubmitted] = React.useState(false)
    const [showSummary, setShowSummary] = React.useState(false)

    // Load form data from inspection when available
    React.useEffect(() => {
        if (inspection?.formData) {
            setForm(inspection.formData)
        }
    }, [inspection])

    const schoolName = inspection?.orgUnitName || 'School Name'
    const inspectionDate = React.useMemo(
        () => (inspection?.eventDate ? new Date(inspection.eventDate) : new Date()),
        [inspection]
    )
    const formattedInspectionDate = React.useMemo(
        () =>
            inspectionDate
                .toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                })
                .replace(',', ''),
        [inspectionDate]
    )
    const isSynced = inspection?.syncStatus === 'synced'

    const validateCategory = React.useCallback((category: Category, state: FormState) => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {}

        if (category === 'resources') {
            if (state.textbooks < 0) {
                nextErrors.textbooks = i18n.t('Enter a non-negative number')
            }

            if (state.desks < 0) {
                nextErrors.desks = i18n.t('Enter a non-negative number')
            }

            if (state.chairs < 0) {
                nextErrors.chairs = i18n.t('Enter a non-negative number')
            }
        }

        if (category === 'students') {
            if (!state.totalStudents) {
                nextErrors.totalStudents = i18n.t('Total student count is required')
            } else if (Number(state.totalStudents) < 0) {
                nextErrors.totalStudents = i18n.t('Enter a non-negative number')
            }

            if (!state.maleStudents) {
                nextErrors.maleStudents = i18n.t('Male student count is required')
            } else if (Number(state.maleStudents) < 0) {
                nextErrors.maleStudents = i18n.t('Enter a non-negative number')
            }

            if (!state.femaleStudents) {
                nextErrors.femaleStudents = i18n.t('Female student count is required')
            } else if (Number(state.femaleStudents) < 0) {
                nextErrors.femaleStudents = i18n.t('Enter a non-negative number')
            }

            const total = Number(state.totalStudents)
            const male = Number(state.maleStudents)
            const female = Number(state.femaleStudents)

            if (total > 0 && male + female > total) {
                nextErrors.totalStudents = i18n.t(
                    'Total students cannot be less than male + female students'
                )
            }
        }

        if (category === 'staff') {
            if (!state.staffCount) {
                nextErrors.staffCount = i18n.t('Staff count is required')
            } else if (Number(state.staffCount) < 0) {
                nextErrors.staffCount = i18n.t('Enter a non-negative number')
            }
        }

        if (category === 'facilities') {
            if (!state.classroomCount) {
                nextErrors.classroomCount = i18n.t('Classroom count is required')
            } else if (Number(state.classroomCount) < 0) {
                nextErrors.classroomCount = i18n.t('Enter a non-negative number')
            }
        }

        return nextErrors
    }, [])

    // Validate all categories
    const validateAll = React.useCallback((state: FormState) => {
        const allErrors: Partial<Record<keyof FormState, string>> = {}

        const categories: Category[] = ['resources', 'students', 'staff', 'facilities']
        categories.forEach(category => {
            const categoryErrors = validateCategory(category, state)
            Object.assign(allErrors, categoryErrors)
        })

        return allErrors
    }, [validateCategory])

    const updateForm = React.useCallback((updater: (prev: FormState) => FormState) => {
        setForm(prev => {
            const next = updater(prev)
            setErrors(validateAll(next))

            // Auto-save to database on form changes
            if (inspection) {
                updateInspection({
                    formData: next,
                    status: 'in_progress',
                }).catch(error => {
                    console.error('Auto-save failed:', error)
                })
            }

            return next
        })
    }, [validateAll, inspection, updateInspection])

    const handleFieldChange = (field: keyof FormState) =>
        ({ value }: { value?: string }) => {
            updateForm(prev => ({
                ...prev,
                [field]: value ?? '',
            }))
        }

    // Check if a category is complete (all fields filled and valid)
    const isCategoryComplete = React.useCallback((category: Category, state: FormState): boolean => {
        const fields = CATEGORY_FIELDS[category]

        // Check if all fields have values
        const allFieldsFilled = fields.every(field => state[field] !== '')
        if (!allFieldsFilled) return false

        // Validate the fields
        const categoryErrors = validateCategory(category, state)
        return Object.keys(categoryErrors).length === 0
    }, [validateCategory])

    const currentCategoryValid = React.useMemo(
        () => isCategoryComplete(selectedCategory, form),
        [form, selectedCategory, isCategoryComplete]
    )

    // Check if all categories are complete
    const allCategoriesComplete = React.useMemo(() => {
        const categories: Category[] = ['resources', 'students', 'staff', 'facilities']
        return categories.every(category => isCategoryComplete(category, form))
    }, [form, isCategoryComplete])
    const submitDisabled = !allCategoriesComplete
    const currentCategoryIndex = CATEGORY_ORDER.indexOf(selectedCategory)
    const previousCategory = currentCategoryIndex > 0 ? CATEGORY_ORDER[currentCategoryIndex - 1] : null
    const nextCategory = currentCategoryIndex < CATEGORY_ORDER.length - 1 ? CATEGORY_ORDER[currentCategoryIndex + 1] : null

    React.useEffect(() => {
        if (nextCategory) {
            setShowSummary(false)
        }
    }, [nextCategory])

    const handleSubmit = async () => {
        const validationErrors = validateAll(form)
        setErrors(validationErrors)
        setWasSubmitted(true)

        if (Object.keys(validationErrors).length === 0) {
            try {
                // Save form data to the inspection
                await updateInspection({
                    formData: form,
                    status: 'completed',
                    syncStatus: 'not_synced', // Mark as not synced until pushed to DHIS2
                })
                console.log('Form submitted successfully and saved to local database')
            } catch (error) {
                console.error('Failed to save inspection:', error)
            }
        }
    }

    const handleIncrement = (field: 'textbooks' | 'desks' | 'chairs') => {
        updateForm(prev => ({
            ...prev,
            [field]: prev[field] + 1,
        }))
    }

    const handleDecrement = (field: 'textbooks' | 'desks' | 'chairs') => {
        updateForm(prev => ({
            ...prev,
            [field]: Math.max(0, prev[field] - 1),
        }))
    }

    const handleCounterChange = (field: 'textbooks' | 'desks' | 'chairs') =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = parseInt(e.target.value) || 0
            updateForm(prev => ({
                ...prev,
                [field]: Math.max(0, value),
            }))
        }

    const renderCategoryForm = () => {
        switch (selectedCategory) {
            case 'resources':
                return (
                    <div className={classes.formFields}>
                        {/* Textbooks Counter */}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Textbooks')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('textbooks')}
                                    aria-label={i18n.t('Decrease textbooks')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.textbooks}
                                    onChange={handleCounterChange('textbooks')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('textbooks')}
                                    aria-label={i18n.t('Increase textbooks')}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Desks Counter */}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Desks')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('desks')}
                                    aria-label={i18n.t('Decrease desks')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.desks}
                                    onChange={handleCounterChange('desks')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('desks')}
                                    aria-label={i18n.t('Increase desks')}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Chairs Counter */}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Chairs')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('chairs')}
                                    aria-label={i18n.t('Decrease chairs')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.chairs}
                                    onChange={handleCounterChange('chairs')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('chairs')}
                                    aria-label={i18n.t('Increase chairs')}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* Test field section */}
                        <div className={classes.testFieldSection}>
                            <div className={classes.testFieldHeader}>
                                <span className={classes.testFieldLabel}>{i18n.t('Test field')}</span>
                                <span className={classes.testFieldBadge}>{i18n.t('Optional')}</span>
                            </div>
                            <TextAreaField
                                label={i18n.t('Additional notes on resources')}
                                value={form.testFieldNotes}
                                onChange={({ value }: { value?: string }) =>
                                    updateForm(prev => ({ ...prev, testFieldNotes: value ?? '' }))
                                }
                                rows={4}
                            />
                        </div>
                    </div>
                )

            case 'students':
                return (
                    <div className={classes.formFields}>
                        <InputField
                            label={i18n.t('Total Students')}
                            name="totalStudents"
                            type="number"
                            min="0"
                            value={form.totalStudents}
                            onChange={handleFieldChange('totalStudents')}
                            required
                            error={Boolean(errors.totalStudents)}
                            validationText={errors.totalStudents}
                        />
                        <InputField
                            label={i18n.t('Male Students')}
                            name="maleStudents"
                            type="number"
                            min="0"
                            value={form.maleStudents}
                            onChange={handleFieldChange('maleStudents')}
                            required
                            error={Boolean(errors.maleStudents)}
                            validationText={errors.maleStudents}
                        />
                        <InputField
                            label={i18n.t('Female Students')}
                            name="femaleStudents"
                            type="number"
                            min="0"
                            value={form.femaleStudents}
                            onChange={handleFieldChange('femaleStudents')}
                            required
                            error={Boolean(errors.femaleStudents)}
                            validationText={errors.femaleStudents}
                        />
                    </div>
                )

            case 'staff':
                return (
                    <div className={classes.formFields}>
                        <InputField
                            label={i18n.t('Total Staff Count')}
                            name="staffCount"
                            type="number"
                            min="0"
                            value={form.staffCount}
                            onChange={handleFieldChange('staffCount')}
                            required
                            error={Boolean(errors.staffCount)}
                            validationText={errors.staffCount}
                        />
                    </div>
                )

            case 'facilities':
                return (
                    <div className={classes.formFields}>
                        <InputField
                            label={i18n.t('Number of Classrooms')}
                            name="classroomCount"
                            type="number"
                            min="0"
                            value={form.classroomCount}
                            onChange={handleFieldChange('classroomCount')}
                            required
                            error={Boolean(errors.classroomCount)}
                            validationText={errors.classroomCount}
                        />
                    </div>
                )
        }
    }

    // Show loading state while inspection is loading
    if (inspectionLoading) {
        return (
            <div className={classes.page}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    // Show error if no inspection found
    if (!inspection && id) {
        return (
            <div className={classes.page}>
                <NoticeBox error title={i18n.t('Inspection not found')}>
                    {i18n.t('The requested inspection could not be found.')}
                </NoticeBox>
            </div>
        )
    }

    const submissionSucceeded = wasSubmitted && Object.keys(errors).length === 0
    const ensureCurrentCategoryValid = React.useCallback(() => {
        const categoryErrors = validateCategory(selectedCategory, form)
        if (Object.keys(categoryErrors).length > 0) {
            setErrors(prev => ({ ...prev, ...categoryErrors }))
            return false
        }
        return true
    }, [form, selectedCategory, validateCategory])

    const handleCategorySelect = (category: Category) => {
        if (category === selectedCategory) {
            return
        }

        const targetIndex = CATEGORY_ORDER.indexOf(category)

        if (targetIndex > currentCategoryIndex && !ensureCurrentCategoryValid()) {
            return
        }

        setSelectedCategory(category)
    }

    const handleNextCategory = () => {
        if (!nextCategory) {
            return
        }

        if (!ensureCurrentCategoryValid()) {
            return
        }

        setSelectedCategory(nextCategory)
    }
    const handleToggleSummary = () => {
        setShowSummary(prev => !prev)
    }
    const summaryButton = (
        <Button
            className={`${classes.previousButton} ${classes.summaryButton}`}
            onClick={handleToggleSummary}
        >
            {showSummary ? i18n.t('Hide summary') : i18n.t('See summary')}
        </Button>
    )

    const submitButton = (
        <Button
            className={classes.nextButton}
            onClick={handleSubmit}
            disabled={submitDisabled}
        >
            {i18n.t('Submit Report')}
        </Button>
    )

    return (
        <section className={classes.page}>
            <div className={classes.header}>
                <div className={classes.headerTop}>
                    <div className={classes.headerInfo}>
                        <h1 className={classes.inspectionTitle}>
                            {i18n.t('Inspection: {{school}}', { school: schoolName })}
                        </h1>
                        <p className={classes.inspectionDate}>
                            {i18n.t('Date: {{date}}', { date: formattedInspectionDate })}
                        </p>
                    </div>

                    <span className={classes.syncedBadge} style={{ backgroundColor: isSynced ? undefined : '#fef3c7', color: isSynced ? undefined : '#92400e' }}>
                        <svg
                            className={classes.syncedIcon}
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                            role="img"
                            aria-hidden="true"
                        >
                            <path
                                d="M19.5 14.98C19.48 14.98 19.47 14.98 19.45 14.99C19.2 13.3 17.76 12 16 12C14.6 12 13.4 12.83 12.84 14.02C11.26 14.1 10 15.4 10 17C10 18.66 11.34 20 13 20L19.5 19.98C20.88 19.98 22 18.86 22 17.48C22 16.1 20.88 14.98 19.5 14.98ZM19.51 18H13C12.45 18 12 17.55 12 17C12 16.45 12.45 16 13 16H14.25V15.75C14.25 14.78 15.03 14 16 14C16.97 14 17.75 14.78 17.75 15.75V17C17.75 17 19.5 17 19.51 17C19.79 17 20.01 17.22 20.01 17.5C20 17.77 19.78 18 19.51 18ZM8 4.26V6.35C5.67 7.18 4 9.39 4 12C4 13.77 4.78 15.34 6 16.44V14H8V20H2V18H4.73C3.06 16.54 2 14.4 2 12C2 8.27 4.55 5.15 8 4.26ZM18 6H15.27C16.7 7.26 17.68 9.01 17.93 11H15.91C15.68 9.64 14.98 8.45 14 7.56V10H12V4H18V6Z"
                                fill="currentColor"
                            />
                        </svg>
                        <span>{isSynced ? i18n.t('Synced') : i18n.t('Not synced')}</span>
                    </span>
                </div>

                <div className={classes.schoolInfoDropdown}>
                    <select className={classes.infoSelect}>
                        <option>{i18n.t('Information about the school')}</option>
                    </select>
                </div>

                <div className={classes.categories}>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'staff' ? classes.active : ''
                        }`}
                        onClick={() => handleCategorySelect('staff')}
                        aria-label={i18n.t('Staff')}
                    >
                        <div className={classes.categoryIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        </div>
                        <span className={classes.categoryLabel}>{i18n.t('Staff')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'resources' ? classes.active : ''
                        }`}
                        onClick={() => handleCategorySelect('resources')}
                        aria-label={i18n.t('Resources')}
                    >
                        <div className={classes.categoryIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/>
                            </svg>
                        </div>
                        <span className={classes.categoryLabel}>{i18n.t('Resources')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'students' ? classes.active : ''
                        }`}
                        onClick={() => handleCategorySelect('students')}
                        aria-label={i18n.t('Students')}
                    >
                        <div className={classes.categoryIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <circle cx="9" cy="9" r="4"/>
                                <path d="M9 15c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4zm7.76-9.64c1.96.28 3.32 2.12 3.05 4.08-.22 1.57-1.28 2.93-2.73 3.47 1.43.43 3.02 1.19 4.2 2.37l.02.02c.15.15.38.06.38-.14v-2.5c-.01-2.4-1.67-4.47-4.02-4.97-.18-.04-.37.06-.43.23-.07.18.02.39.2.46z"/>
                            </svg>
                        </div>
                        <span className={classes.categoryLabel}>{i18n.t('Students')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'facilities' ? classes.active : ''
                        }`}
                        onClick={() => handleCategorySelect('facilities')}
                        aria-label={i18n.t('Facilities')}
                    >
                        <div className={classes.categoryIcon}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                            </svg>
                        </div>
                        <span className={classes.categoryLabel}>{i18n.t('Facilities')}</span>
                    </button>
                </div>
            </div>

            <div className={classes.form}>
                {renderCategoryForm()}

                {showSummary ? (
                    <div className={classes.summaryCard}>
                        <div className={classes.summaryHeader}>
                            <h3 className={classes.summaryTitle}>{i18n.t('Inspection summary')}</h3>
                            <span className={classes.summaryDate}>{formattedInspectionDate}</span>
                        </div>

                        <div className={classes.summarySection}>
                            <p className={classes.summarySectionTitle}>{i18n.t('Resources')}</p>
                            <dl className={classes.summaryList}>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Textbooks')}</dt>
                                    <dd className={classes.summaryValue}>{form.textbooks}</dd>
                                </div>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Desks')}</dt>
                                    <dd className={classes.summaryValue}>{form.desks}</dd>
                                </div>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Chairs')}</dt>
                                    <dd className={classes.summaryValue}>{form.chairs}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={classes.summarySection}>
                            <p className={classes.summarySectionTitle}>{i18n.t('Students')}</p>
                            <dl className={classes.summaryList}>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Total Students')}</dt>
                                    <dd className={classes.summaryValue}>{form.totalStudents || '—'}</dd>
                                </div>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Male Students')}</dt>
                                    <dd className={classes.summaryValue}>{form.maleStudents || '—'}</dd>
                                </div>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Female Students')}</dt>
                                    <dd className={classes.summaryValue}>{form.femaleStudents || '—'}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className={classes.summarySection}>
                            <p className={classes.summarySectionTitle}>{i18n.t('Staff & facilities')}</p>
                            <dl className={classes.summaryList}>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Total Staff Count')}</dt>
                                    <dd className={classes.summaryValue}>{form.staffCount || '—'}</dd>
                                </div>
                                <div className={classes.summaryItem}>
                                    <dt className={classes.summaryLabel}>{i18n.t('Number of Classrooms')}</dt>
                                    <dd className={classes.summaryValue}>{form.classroomCount || '—'}</dd>
                                </div>
                            </dl>
                        </div>

                        {form.testFieldNotes ? (
                            <div className={classes.summaryNotes}>
                                <p className={classes.summarySectionTitle}>{i18n.t('Additional notes')}</p>
                                <p className={classes.summaryNoteBody}>{form.testFieldNotes}</p>
                            </div>
                        ) : null}
                    </div>
                ) : null}

                {wasSubmitted && !submissionSucceeded ? (
                    <NoticeBox warning title={i18n.t('Validation Required')}>
                        {i18n.t('Please complete all categories before submitting.')}
                    </NoticeBox>
                ) : null}

                {submissionSucceeded ? (
                    <NoticeBox title={i18n.t('Report Submitted')}>
                        {i18n.t('Your inspection report has been submitted successfully.')}
                    </NoticeBox>
                ) : null}
            </div>

            <div className={classes.navigationButtons}>
                {previousCategory ? (
                    <Button
                        className={classes.previousButton}
                        onClick={() => setSelectedCategory(previousCategory)}
                    >
                        {i18n.t('Previous: {{category}}', { category: CATEGORY_LABELS[previousCategory] })}
                    </Button>
                ) : (
                    <div />
                )}

                {nextCategory ? (
                    <Button
                        className={classes.nextButton}
                        onClick={handleNextCategory}
                        disabled={!currentCategoryValid}
                    >
                        {i18n.t('Next: {{category}}', { category: CATEGORY_LABELS[nextCategory] })}
                    </Button>
                ) : (
                    <>
                        <span className={classes.buttonWrapper}>{summaryButton}</span>
                        {submitDisabled ? (
                            <Tooltip
                                content={i18n.t('Please complete all categories before submitting.')}
                                placement="top"
                            >
                                <span className={classes.buttonWrapper}>{submitButton}</span>
                            </Tooltip>
                        ) : (
                            <span className={classes.buttonWrapper}>{submitButton}</span>
                        )}
                    </>
                )}
            </div>
        </section>
    )
}

export default InspectionOverview
