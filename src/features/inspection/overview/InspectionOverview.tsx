import React from 'react'
import { Button, InputField, NoticeBox } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

import classes from './InspectionOverview.module.css'

type Category = 'resources' | 'staff' | 'students' | 'facilities'

type FormState = {
    // Resources form fields
    numberOfBooks: string
    numberOfDesks: string

    // Students form fields
    totalStudents: string
    maleStudents: string
    femaleStudents: string

    // Staff form fields (placeholder)
    staffCount: string

    // Facilities form fields (placeholder)
    classroomCount: string
}

// Map each category to its fields
const CATEGORY_FIELDS: Record<Category, Array<keyof FormState>> = {
    resources: ['numberOfBooks', 'numberOfDesks'],
    students: ['totalStudents', 'maleStudents', 'femaleStudents'],
    staff: ['staffCount'],
    facilities: ['classroomCount'],
}

const DEFAULT_FORM: FormState = {
    numberOfBooks: '',
    numberOfDesks: '',
    totalStudents: '',
    maleStudents: '',
    femaleStudents: '',
    staffCount: '',
    classroomCount: '',
}

const InspectionOverview: React.FC = () => {
    const [selectedCategory, setSelectedCategory] = React.useState<Category>('resources')
    const [form, setForm] = React.useState<FormState>(DEFAULT_FORM)
    const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
    const [wasSubmitted, setWasSubmitted] = React.useState(false)

    // Dummy data for display
    const schoolName = 'Demo Primary School'
    const inspectionDate = new Date().toISOString().split('T')[0]

    const handleFieldChange = (field: keyof FormState) =>
        ({ value }: { value?: string }) => {
            setForm((prev) => ({
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
    }, [])

    const validateCategory = (category: Category, state: FormState) => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {}

        if (category === 'resources') {
            if (!state.numberOfBooks) {
                nextErrors.numberOfBooks = i18n.t('Number of books is required')
            } else if (Number(state.numberOfBooks) < 0) {
                nextErrors.numberOfBooks = i18n.t('Enter a non-negative number')
            }

            if (!state.numberOfDesks) {
                nextErrors.numberOfDesks = i18n.t('Number of desks is required')
            } else if (Number(state.numberOfDesks) < 0) {
                nextErrors.numberOfDesks = i18n.t('Enter a non-negative number')
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

            if (total > 0 && male + female !== total) {
                nextErrors.totalStudents = i18n.t(
                    'Total must equal male + female students'
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
    }

    // Validate all categories
    const validateAll = (state: FormState) => {
        const allErrors: Partial<Record<keyof FormState, string>> = {}

        const categories: Category[] = ['resources', 'students', 'staff', 'facilities']
        categories.forEach(category => {
            const categoryErrors = validateCategory(category, state)
            Object.assign(allErrors, categoryErrors)
        })

        return allErrors
    }

    // Check if all categories are complete
    const allCategoriesComplete = React.useMemo(() => {
        const categories: Category[] = ['resources', 'students', 'staff', 'facilities']
        return categories.every(category => isCategoryComplete(category, form))
    }, [form, isCategoryComplete])

    const handleSubmit = () => {
        const validationErrors = validateAll(form)
        setErrors(validationErrors)
        setWasSubmitted(true)

        if (Object.keys(validationErrors).length === 0) {
            console.log('Form submitted successfully:', {
                school: schoolName,
                date: inspectionDate,
                data: form,
            })
        }
    }

    const renderCategoryForm = () => {
        switch (selectedCategory) {
            case 'resources':
                return (
                    <div className={classes.formFields}>
                        <InputField
                            label={i18n.t('Number of Books')}
                            name="numberOfBooks"
                            type="number"
                            min="0"
                            value={form.numberOfBooks}
                            onChange={handleFieldChange('numberOfBooks')}
                            required
                            error={Boolean(errors.numberOfBooks)}
                            validationText={errors.numberOfBooks}
                        />
                        <InputField
                            label={i18n.t('Number of Desks')}
                            name="numberOfDesks"
                            type="number"
                            min="0"
                            value={form.numberOfDesks}
                            onChange={handleFieldChange('numberOfDesks')}
                            required
                            error={Boolean(errors.numberOfDesks)}
                            validationText={errors.numberOfDesks}
                        />
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

    const submissionSucceeded = wasSubmitted && Object.keys(errors).length === 0

    return (
        <section className={classes.page}>
            <div className={classes.header}>
                <div className={classes.headerInfo}>
                    <h2 className={classes.schoolName}>{schoolName}</h2>
                    <p className={classes.inspectionDate}>
                        {i18n.t('Inspection Date: {{date}}', { date: inspectionDate })}
                    </p>
                </div>

                <div className={classes.categories}>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'resources' ? classes.active : ''
                        } ${isCategoryComplete('resources', form) ? classes.completed : ''}`}
                        onClick={() => setSelectedCategory('resources')}
                    >
                        <span className={classes.categoryLabel}>{i18n.t('Resources')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'staff' ? classes.active : ''
                        } ${isCategoryComplete('staff', form) ? classes.completed : ''}`}
                        onClick={() => setSelectedCategory('staff')}
                    >
                        <span className={classes.categoryLabel}>{i18n.t('Staff')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'students' ? classes.active : ''
                        } ${isCategoryComplete('students', form) ? classes.completed : ''}`}
                        onClick={() => setSelectedCategory('students')}
                    >
                        <span className={classes.categoryLabel}>{i18n.t('Students')}</span>
                    </button>
                    <button
                        type="button"
                        className={`${classes.categoryButton} ${
                            selectedCategory === 'facilities' ? classes.active : ''
                        } ${isCategoryComplete('facilities', form) ? classes.completed : ''}`}
                        onClick={() => setSelectedCategory('facilities')}
                    >
                        <span className={classes.categoryLabel}>{i18n.t('Facilities')}</span>
                    </button>
                </div>
            </div>

            <div className={classes.form}>
                <div className={classes.formSection}>
                    <h3 className={classes.sectionTitle}>
                        {i18n.t('{{category}} Information', {
                            category:
                                selectedCategory.charAt(0).toUpperCase() +
                                selectedCategory.slice(1),
                        })}
                    </h3>
                    {renderCategoryForm()}
                </div>

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

            <div className={classes.submitButtonContainer}>
                <Button
                    primary
                    onClick={handleSubmit}
                    disabled={!allCategoriesComplete}
                >
                    {i18n.t('Submit Report')}
                </Button>
            </div>
        </section>
    )
}

export default InspectionOverview
