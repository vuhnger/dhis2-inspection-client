import i18n from '@dhis2/d2-i18n'
import { Button, InputField, NoticeBox, TextAreaField, Tooltip, CircularLoader, Modal, ModalTitle, ModalContent, ModalActions, ButtonStrip } from '@dhis2/ui'
import React from 'react'
import { useParams, useNavigate } from 'react-router-dom'

import { useInspection } from '../../../shared/hooks/useInspections'
import { useSync } from '../../../shared/hooks/useSync'
import { getApiBase, getAuthHeader } from '../../../shared/utils/auth'

import classes from './InspectionOverview.module.css'

import type { SyncStatus } from '../../../shared/types/inspection'


type Category = 'resources' | 'staff' | 'students' | 'facilities'
const ALLOWED_CATEGORY_GROUP_IDS = new Set([
    'ib40OsG9QAI',
    'SPCm0Ts3SLR',
    'sSgWDKuCrmi',
    'UzSEGuwAfyX',
])

const CATEGORY_ORDER: Category[] = ['staff', 'resources', 'students', 'facilities']

const CATEGORY_LABELS: Record<Category, string> = {
    staff: 'Staff',
    resources: 'Resources',
    students: 'Students',
    facilities: 'Facilities',
}

type FormState = {
    textbooks: number | string
    chairs: number | string

    maleStudents: string | number
    femaleStudents: string | number

    staffCount: string | number

    classroomCount: string | number

    testFieldNotes: string
}

const CATEGORY_FIELDS: Record<Category, Array<keyof FormState>> = {
    resources: ['textbooks', 'chairs'],
    students: ['maleStudents', 'femaleStudents'],
    staff: ['staffCount'],
    facilities: ['classroomCount'],
}

const DEFAULT_FORM: FormState = {
    textbooks: 0,
    chairs: 0,
    totalStudents: 0,
    maleStudents: 0,
    femaleStudents: 0,
    staffCount: 0,
    classroomCount: 0,
    testFieldNotes: '',
}

type CategoryMeta = { id: string; name: string }

const normalizeForm = (form: Partial<FormState> | undefined): FormState => {
    const toNumberOrZero = (value: any) => {
        const num = Number(value)
        return Number.isFinite(num) ? num : 0
    }
    const male = toNumberOrZero(form?.maleStudents)
    const female = toNumberOrZero(form?.femaleStudents)
    const total = male + female
    const rawNotes = typeof form?.testFieldNotes === 'string' ? form?.testFieldNotes : ''
    const cleanedNotes = /^Category:\s*/i.test(rawNotes || '') ? '' : rawNotes
    return {
        textbooks: toNumberOrZero(form?.textbooks),
        chairs: toNumberOrZero(form?.chairs),
        totalStudents: total,
        maleStudents: male,
        femaleStudents: female,
        staffCount: toNumberOrZero(form?.staffCount),
        classroomCount: toNumberOrZero(form?.classroomCount),
        testFieldNotes: cleanedNotes ?? '',
    }
}

const InspectionOverview: React.FC = () => {
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { inspection, loading: inspectionLoading, updateInspection } = useInspection(id || null)
    const { isSyncing, triggerSync, syncError } = useSync()

    const [selectedCategory, setSelectedCategory] = React.useState<Category>('staff')
    const [schoolCategories, setSchoolCategories] = React.useState<CategoryMeta[]>([])
    const [activeCategoryId, setActiveCategoryId] = React.useState<string>('default')
    const [categoryForms, setCategoryForms] = React.useState<Record<string, FormState>>({
        default: DEFAULT_FORM,
    })
    const [categoryErrors, setCategoryErrors] = React.useState<
        Record<string, Partial<Record<keyof FormState, string>>>
    >({})
    const [wasSubmitted, setWasSubmitted] = React.useState(false)
    const [showSummary, setShowSummary] = React.useState(false)
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    const [showCompleteModal, setShowCompleteModal] = React.useState(false)

    React.useEffect(() => {
        if (!inspection) {
            return
        }

        const fetchedCategories =
            schoolCategories.length > 0
                ? schoolCategories
                : (inspection.orgUnitCategories || []).filter((c) =>
                      ALLOWED_CATEGORY_GROUP_IDS.has(c.id)
                  )

        const categoryList =
            fetchedCategories.length > 0
                ? fetchedCategories
                : [{ id: 'default', name: i18n.t('School type') }]

        setCategoryForms((prev) => {
            const next: Record<string, FormState> = {}
            const sourceMap = inspection.formDataByCategory || {}
            const fallbackForm = inspection.formData || DEFAULT_FORM

            categoryList.forEach((cat) => {
                next[cat.id] = normalizeForm(
                    prev[cat.id] ||
                    sourceMap[cat.id]?.formData ||
                    (categoryList.length === 1 ? fallbackForm : DEFAULT_FORM)
                )
            })

            return next
        })

        if (fetchedCategories.length && (!inspection.orgUnitCategories || inspection.orgUnitCategories.length === 0)) {
            updateInspection({ orgUnitCategories: fetchedCategories }).catch((err) => {
                console.warn('Unable to persist org unit categories on inspection', err)
            })
        }

        setActiveCategoryId((prev) => {
            const exists = categoryList.some((c) => c.id === prev)
            return exists ? prev : categoryList[0].id
        })
    }, [inspection, schoolCategories, updateInspection])

    React.useEffect(() => {
        const fetchCategories = async () => {
            if (!inspection?.orgUnit) {
                setSchoolCategories([])
                return
            }

            if (!isOnline) {
                if (inspection.orgUnitCategories?.length) {
                    setSchoolCategories(inspection.orgUnitCategories)
                }
                return
            }

            try {
                const apiBase = getApiBase()
                const res = await fetch(
                    `${apiBase}/organisationUnits/${inspection.orgUnit}?fields=organisationUnitGroups[id,name,displayName]`,
                    {
                        headers: {
                            Authorization: getAuthHeader(),
                        },
                    }
                )
                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText}`)
                }
                const data = await res.json()
                const categories = (data?.organisationUnitGroups || [])
                    .filter((g: any) => ALLOWED_CATEGORY_GROUP_IDS.has(g.id))
                    .map((g: any) => ({
                        id: g.id,
                        name: g.displayName || g.name,
                    }))
                setSchoolCategories(categories)
            } catch (error) {
                console.warn('Unable to fetch school categories', error)
                if (inspection.orgUnitCategories?.length) {
                    setSchoolCategories(inspection.orgUnitCategories)
                } else {
                    setSchoolCategories([])
                }
            }
        }
        fetchCategories()
    }, [inspection?.orgUnit, inspection?.orgUnitCategories, isOnline])

    React.useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

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

    const categoryList =
        (schoolCategories.length
            ? schoolCategories
            : (inspection?.orgUnitCategories || []).filter((c) => ALLOWED_CATEGORY_GROUP_IDS.has(c.id))) ||
        [{ id: 'default', name: i18n.t('School type') }]

    const validateCategory = React.useCallback((category: Category, state: FormState) => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {}

        if (category === 'resources') {
            if (state.textbooks < 0) {
                nextErrors.textbooks = i18n.t('Enter a non-negative number')
            }

            if (state.chairs < 0) {
                nextErrors.chairs = i18n.t('Enter a non-negative number')
            }
        }

        if (category === 'students') {
            if (state.maleStudents === '' || state.maleStudents === null || state.maleStudents === undefined) {
                nextErrors.maleStudents = i18n.t('Male student count is required')
            } else if (Number(state.maleStudents) < 0) {
                nextErrors.maleStudents = i18n.t('Enter a non-negative number')
            }

            if (state.femaleStudents === '' || state.femaleStudents === null || state.femaleStudents === undefined) {
                nextErrors.femaleStudents = i18n.t('Female student count is required')
            } else if (Number(state.femaleStudents) < 0) {
                nextErrors.femaleStudents = i18n.t('Enter a non-negative number')
            }
        }

        if (category === 'staff') {
            if (state.staffCount === '' || state.staffCount === null || state.staffCount === undefined) {
                nextErrors.staffCount = i18n.t('Staff count is required')
            } else if (Number(state.staffCount) < 0) {
                nextErrors.staffCount = i18n.t('Enter a non-negative number')
            }
        }

        if (category === 'facilities') {
            if (state.classroomCount === '' || state.classroomCount === null || state.classroomCount === undefined) {
                nextErrors.classroomCount = i18n.t('Classroom count is required')
            } else if (Number(state.classroomCount) < 0) {
                nextErrors.classroomCount = i18n.t('Enter a non-negative number')
            }
        }

        return nextErrors
    }, [])

    const validateAll = React.useCallback((state: FormState) => {
        const allErrors: Partial<Record<keyof FormState, string>> = {}

        const categories: Category[] = ['resources', 'students', 'staff', 'facilities']
        categories.forEach(category => {
            const categoryErrors = validateCategory(category, state)
            Object.assign(allErrors, categoryErrors)
        })

        return allErrors
    }, [validateCategory])

    const computeSyncStatus = React.useCallback((statusMap: Record<string, string> | undefined): SyncStatus => {
        if (!statusMap || Object.keys(statusMap).length === 0) {
            return 'not_synced'
        }
        const statuses = Object.values(statusMap)
        if (statuses.includes('sync_failed')) return 'sync_failed'
        if (statuses.includes('not_synced')) return 'not_synced'
        return 'synced'
    }, [])

    const updateForm = React.useCallback(
        (updater: (prev: FormState) => FormState) => {
            const categoryId = activeCategoryId
            setCategoryForms((prev) => {
                const prevForm = prev[categoryId] || DEFAULT_FORM
                const nextForm = updater(prevForm)
                const computedTotal = Number(nextForm.maleStudents || 0) + Number(nextForm.femaleStudents || 0)
                const normalizedNextForm = { ...nextForm, totalStudents: computedTotal }
                const nextForms = { ...prev, [categoryId]: normalizedNextForm }

                setCategoryErrors((prevErrors) => ({
                    ...prevErrors,
                    [categoryId]: validateAll(normalizedNextForm),
                }))

                if (inspection) {
                    const formDataByCategory: Record<
                        string,
                        { formData: FormState; dhis2EventId?: string; syncStatus?: SyncStatus }
                    > = {}
                    const categorySyncStatus: Record<string, SyncStatus> = {
                        ...(inspection.categorySyncStatus || {}),
                    }

                    Object.entries(nextForms).forEach(([catId, formState]) => {
                        const existing = inspection.formDataByCategory?.[catId]
                        formDataByCategory[catId] = {
                            formData: formState,
                            dhis2EventId:
                                inspection.categoryEventIds?.[catId] || existing?.dhis2EventId,
                            syncStatus: catId === categoryId ? 'not_synced' : existing?.syncStatus,
                        }
                        categorySyncStatus[catId] =
                            catId === categoryId ? 'not_synced' : existing?.syncStatus || 'synced'
                    })

                    updateInspection({
                        formData: normalizedNextForm,
                        formDataByCategory,
                        categorySyncStatus,
                        status: 'in_progress',
                        syncStatus: computeSyncStatus(categorySyncStatus),
                    }).catch((error) => {
                        console.error('Auto-save failed:', error)
                    })
                }

                return nextForms
            })
        },
        [activeCategoryId, computeSyncStatus, inspection, updateInspection, validateAll]
    )

    const handleFieldChange = (field: keyof FormState) =>
        ({ value }: { value?: string }) => {
            updateForm((prev) => ({
                ...prev,
                [field]: value ?? '',
            }))
        }

    const isCategoryComplete = React.useCallback((category: Category, state: FormState): boolean => {
        const fields = CATEGORY_FIELDS[category]

        const allFieldsFilled = fields.every(field => state[field] !== '')
        if (!allFieldsFilled) return false

        const categoryErrors = validateCategory(category, state)
        return Object.keys(categoryErrors).length === 0
    }, [validateCategory])

    const currentCategoryValid = React.useMemo(() => {
        const form = categoryForms[activeCategoryId] || DEFAULT_FORM
        return isCategoryComplete(selectedCategory, form)
    }, [activeCategoryId, categoryForms, isCategoryComplete, selectedCategory])

    const submitDisabled = !currentCategoryValid
    const currentCategoryIndex = CATEGORY_ORDER.indexOf(selectedCategory)
    const previousCategory = currentCategoryIndex > 0 ? CATEGORY_ORDER[currentCategoryIndex - 1] : null
    const nextCategory = currentCategoryIndex < CATEGORY_ORDER.length - 1 ? CATEGORY_ORDER[currentCategoryIndex + 1] : null

    React.useEffect(() => {
        if (nextCategory) {
            setShowSummary(false)
        }
    }, [nextCategory])

    const ensureCurrentCategoryValid = React.useCallback(() => {
        const form = categoryForms[activeCategoryId] || DEFAULT_FORM
        const nextErrors = validateCategory(selectedCategory, form)
        if (Object.keys(nextErrors).length > 0) {
            setCategoryErrors((prev) => ({ ...prev, [activeCategoryId]: nextErrors }))
            return false
        }
        return true
    }, [activeCategoryId, categoryForms, selectedCategory, validateCategory])

    const handleCategorySelect = React.useCallback((category: Category) => {
        if (category === selectedCategory) {
            return
        }

        setSelectedCategory(category)
    }, [selectedCategory])

    const handleNextCategory = React.useCallback(() => {
        if (!nextCategory) {
            return
        }

        if (!ensureCurrentCategoryValid()) {
            return
        }

        setSelectedCategory(nextCategory)
    }, [nextCategory, ensureCurrentCategoryValid])

    const handleToggleSummary = React.useCallback(() => {
        setShowSummary(prev => !prev)
    }, [])

    const form = categoryForms[activeCategoryId] || DEFAULT_FORM
    const errors = categoryErrors[activeCategoryId] || {}
    const submissionSucceeded =
        wasSubmitted && Object.values(categoryErrors).every((e) => Object.keys(e || {}).length === 0)
    const activeCategorySyncStatus =
        inspection?.categorySyncStatus?.[activeCategoryId] || inspection?.syncStatus
    const activeCategoryEventId =
        inspection?.categoryEventIds?.[activeCategoryId] || inspection?.dhis2EventId
    const missingFieldsText = React.useMemo(() => {
        const missing = Object.keys(errors || {}).filter((key) => (errors as any)?.[key])
        return missing.join(', ')
    }, [errors])

    const handleCompleteInspection = () => {
        setShowCompleteModal(true)
    }

    const handleSeeSubmittedInspection = async () => {
        const nextErrors: Record<string, Partial<Record<keyof FormState, string>>> = {}
        let hasErrors = false

        const activeForm = categoryForms[activeCategoryId] || DEFAULT_FORM
        const errors = validateAll(activeForm)
        if (Object.keys(errors).length > 0) {
            hasErrors = true
        }
        nextErrors[activeCategoryId] = errors

        setCategoryErrors(nextErrors)
        setWasSubmitted(true)

        if (hasErrors) {
            setShowCompleteModal(false)
            return
        }

        try {
            const formDataByCategory: Record<
                string,
                { formData: FormState; dhis2EventId?: string; syncStatus?: SyncStatus }
            > = {}
            const categorySyncStatus: Record<string, SyncStatus> = {}

            const form = categoryForms[activeCategoryId] || DEFAULT_FORM
            const existing = inspection?.formDataByCategory?.[activeCategoryId]
            const existingEvent =
                inspection?.categoryEventIds?.[activeCategoryId] || existing?.dhis2EventId

            formDataByCategory[activeCategoryId] = {
                formData: form,
                dhis2EventId: existingEvent,
                syncStatus: 'not_synced',
            }
            categorySyncStatus[activeCategoryId] = 'not_synced'

            const firstForm = form

            await updateInspection({
                formData: firstForm,
                formDataByCategory,
                categorySyncStatus,
                orgUnitCategories: categoryList,
                status: 'completed',
                syncStatus: computeSyncStatus(categorySyncStatus),
            })
            console.log('Form submitted successfully and saved to local database')
            
            setShowCompleteModal(false)
            navigate(`/summary/${inspection?.id}`)
        } catch (error) {
            console.error('Failed to save inspection:', error)
            setShowCompleteModal(false)
        }
    }

    const handleDiscardInspection = async () => {
        try {
            const inspectionName = inspection?.orgUnitName || 'Inspection'
            const inspectionId = inspection?.id
            
            await updateInspection({
                status: 'scheduled',
                syncStatus: 'not_synced',
                formData: DEFAULT_FORM,
                formDataByCategory: {},
                categorySyncStatus: {},
            })
            console.log('Inspection discarded and reset to scheduled')
            
            setShowCompleteModal(false)
            navigate('/', { 
                state: { 
                    discardedInspection: { 
                        id: inspectionId, 
                        name: inspectionName 
                    } 
                } 
            })
        } catch (error) {
            console.error('Failed to discard inspection:', error)
            setShowCompleteModal(false)
        }
    }

    const handleIncrement = (field: keyof FormState) => {
        updateForm(prev => {
            const currentValue = typeof prev[field] === 'number' ? prev[field] : parseInt(String(prev[field])) || 0
            return {
                ...prev,
                [field]: currentValue + 1,
            }
        })
    }

    const handleDecrement = (field: keyof FormState) => {
        updateForm(prev => {
            const currentValue = typeof prev[field] === 'number' ? prev[field] : parseInt(String(prev[field])) || 0
            return {
                ...prev,
                [field]: Math.max(0, currentValue - 1),
            }
        })
    }

    const handleCounterChange = (field: keyof FormState) =>
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const value = e.target.value
            if (value === '') {
                updateForm(prev => ({
                    ...prev,
                    [field]: '',
                }))
            } else {
                const numValue = parseInt(value)
                if (!isNaN(numValue) && numValue >= 0) {
                    updateForm(prev => ({
                        ...prev,
                        [field]: numValue,
                    }))
                }
            }
        }

    const renderCategoryForm = () => {
        switch (selectedCategory) {
            case 'resources':
                return (
                    <div className={classes.formFields}>
                        {}
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

                        {}
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

                        {}
                        <div className={classes.testFieldSection}>
                            <TextAreaField
                                label={i18n.t('Additional notes on resources')}
                                placeholder={i18n.t('Additional notes on resources')}
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
                        {}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Male Students')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('maleStudents')}
                                    aria-label={i18n.t('Decrease male students')}
                                >
                                    -
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.maleStudents}
                                    onChange={handleCounterChange('maleStudents')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('maleStudents')}
                                    aria-label={i18n.t('Increase male students')}
                                >
                                    +
                                </button>
                            </div>
                            {errors.maleStudents && (
                                <span className={classes.errorText}>{errors.maleStudents}</span>
                            )}
                        </div>

                        {}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Female Students')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('femaleStudents')}
                                    aria-label={i18n.t('Decrease female students')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.femaleStudents}
                                    onChange={handleCounterChange('femaleStudents')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('femaleStudents')}
                                    aria-label={i18n.t('Increase female students')}
                                >
                                    +
                                </button>
                            </div>
                            {errors.femaleStudents && (
                                <span className={classes.errorText}>{errors.femaleStudents}</span>
                            )}
                        </div>
                    </div>
                )

            case 'staff':
                return (
                    <div className={classes.formFields}>
                        {}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Total Staff Count')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('staffCount')}
                                    aria-label={i18n.t('Decrease staff count')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.staffCount}
                                    onChange={handleCounterChange('staffCount')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('staffCount')}
                                    aria-label={i18n.t('Increase staff count')}
                                >
                                    +
                                </button>
                            </div>
                            {errors.staffCount && (
                                <span className={classes.errorText}>{errors.staffCount}</span>
                            )}
                        </div>
                    </div>
                )

            case 'facilities':
                return (
                    <div className={classes.formFields}>
                        {}
                        <div className={classes.counterField}>
                            <label className={classes.counterLabel}>{i18n.t('Number of Classrooms')}</label>
                            <div className={classes.counterControl}>
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleDecrement('classroomCount')}
                                    aria-label={i18n.t('Decrease classroom count')}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    className={classes.counterInput}
                                    value={form.classroomCount}
                                    onChange={handleCounterChange('classroomCount')}
                                    min="0"
                                />
                                <button
                                    type="button"
                                    className={classes.counterButton}
                                    onClick={() => handleIncrement('classroomCount')}
                                    aria-label={i18n.t('Increase classroom count')}
                                >
                                    +
                                </button>
                            </div>
                            {errors.classroomCount && (
                                <span className={classes.errorText}>{errors.classroomCount}</span>
                            )}
                        </div>
                    </div>
                )
        }
    }

    if (inspectionLoading) {
        return (
            <div className={classes.page}>
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                    <CircularLoader />
                </div>
            </div>
        )
    }

    if (!inspection && id) {
        return (
            <div className={classes.page}>
                <NoticeBox error title={i18n.t('Inspection not found')}>
                    {i18n.t('The requested inspection could not be found.')}
                </NoticeBox>
            </div>
        )
    }

    const submitButton = (
        <Button
            className={classes.completeButton}
            onClick={handleCompleteInspection}
            disabled={submitDisabled}
        >
            {i18n.t('Complete inspection')}
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

                    <div className={classes.headerRight}>
                        <button type="button" className={classes.profileIcon} aria-label={i18n.t('User profile')}>
                            <svg
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                                aria-hidden="true"
                            >
                                <path
                                    d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z"
                                    fill="currentColor"
                                />
                                <path
                                    d="M4 20C4 16.6863 6.68629 14 10 14H14C17.3137 14 20 16.6863 20 20V21C20 21.5523 19.5523 22 19 22H5C4.44772 22 4 21.5523 4 21V20Z"
                                    fill="currentColor"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className={classes.schoolInfoDropdown}>
                    <div className={classes.infoPillGroup} aria-label={i18n.t('School type')}>
                        {categoryList.map((cat) => (
                            <button
                                key={cat.id}
                                type="button"
                                className={`${classes.infoPill} ${
                                    cat.id === activeCategoryId ? classes.infoPillActive : ''
                                }`}
                                onClick={() => setActiveCategoryId(cat.id)}
                            >
                                {cat.name}
                            </button>
                        ))}
                    </div>
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
                            <svg className={classes.staffLogo} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M19 4H14.82C14.4 2.84 13.3 2 12 2C10.7 2 9.6 2.84 9.18 4H5C3.9 4 3 4.9 3 6V20C3 21.1 3.9 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM12 3.75C12.22 3.75 12.41 3.85 12.55 4C12.67 4.13 12.75 4.31 12.75 4.5C12.75 4.91 12.41 5.25 12 5.25C11.59 5.25 11.25 4.91 11.25 4.5C11.25 4.31 11.33 4.13 11.45 4C11.59 3.85 11.78 3.75 12 3.75ZM19 20H5V6H19V20ZM12 7C10.35 7 9 8.35 9 10C9 11.65 10.35 13 12 13C13.65 13 15 11.65 15 10C15 8.35 13.65 7 12 7ZM12 11C11.45 11 11 10.55 11 10C11 9.45 11.45 9 12 9C12.55 9 13 9.45 13 10C13 10.55 12.55 11 12 11ZM6 17.47V19H18V17.47C18 14.97 14.03 13.89 12 13.89C9.97 13.89 6 14.96 6 17.47ZM8.31 17C9 16.44 10.69 15.88 12 15.88C13.31 15.88 15.01 16.44 15.69 17H8.31Z" fill="black"/>
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
                            <svg className={classes.resourcesLogo} width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M17 10C18.1 10 19 9.1 19 8V5C19 3.9 18.1 3 17 3H7C5.9 3 5 3.9 5 5V8C5 9.1 5.9 10 7 10H8V12H7C5.9 12 5 12.9 5 14V21H7V18H17V21H19V14C19 12.9 18.1 12 17 12H16V10H17ZM7 8V5H17V8H7ZM17 16H7V14H17V16ZM14 12H10V10H14V12Z" fill="black"/>
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
                            <svg className={classes.studentsLogo} width="91" height="91" viewBox="0 0 91 91" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M38.7003 49.0833C38.7003 51.6885 36.586 53.8029 33.9808 53.8029C31.3756 53.8029 29.2612 51.6885 29.2612 49.0833C29.2612 46.4781 31.3756 44.3638 33.9808 44.3638C36.586 44.3638 38.7003 46.4781 38.7003 49.0833ZM56.6346 44.3638C54.0294 44.3638 51.9151 46.4781 51.9151 49.0833C51.9151 51.6885 54.0294 53.8029 56.6346 53.8029C59.2398 53.8029 61.3542 51.6885 61.3542 49.0833C61.3542 46.4781 59.2398 44.3638 56.6346 44.3638ZM83.0641 45.3077C83.0641 66.1492 66.1492 83.0641 45.3077 83.0641C24.4661 83.0641 7.55127 66.1492 7.55127 45.3077C7.55127 24.4661 24.4661 7.55127 45.3077 7.55127C66.1492 7.55127 83.0641 24.4661 83.0641 45.3077ZM40.2483 15.5556C45.5342 24.3151 55.1243 30.2051 66.0737 30.2051C67.8105 30.2051 69.5095 30.0163 71.1331 29.752C65.8472 20.9926 56.257 15.1026 45.3077 15.1026C43.5709 15.1026 41.8718 15.2913 40.2483 15.5556ZM16.6883 35.7553C23.1447 32.0929 28.1285 26.1274 30.5072 18.9915C24.0508 22.6538 19.067 28.6193 16.6883 35.7553ZM75.5128 45.3077C75.5128 42.3627 75.0597 39.531 74.2669 36.8502C71.6239 37.4166 68.9054 37.7564 66.0737 37.7564C54.256 37.7564 43.7219 32.3195 36.7747 23.8243C32.8103 33.4899 24.9192 41.079 15.1026 44.7791C15.1403 44.9301 15.1026 45.1189 15.1026 45.3077C15.1026 61.9583 28.6571 75.5128 45.3077 75.5128C61.9583 75.5128 75.5128 61.9583 75.5128 45.3077Z" fill="#007DEB"/>
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
                            <svg className={classes.facilitiesLogo} width="124" height="124" viewBox="0 0 124 124" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <circle cx="62" cy="62" r="62" fill="#F1F9FF"/>
                                <path d="M43.1217 55.8397H35.5705V82.2691H43.1217V55.8397ZM65.7756 55.8397H58.2243V82.2691H65.7756V55.8397ZM97.8685 89.8204H26.1313V97.3717H97.8685V89.8204ZM88.4294 55.8397H80.8781V82.2691H88.4294V55.8397ZM61.9999 30.3918L81.671 40.7371H42.3288L61.9999 30.3918ZM61.9999 21.8589L26.1313 40.7371V48.2884H97.8685V40.7371L61.9999 21.8589Z" fill="#007DEB"/>
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
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span>{i18n.t('Please fill the required fields before submitting:')}</span>
                            {Object.entries(categoryErrors).map(([catId, errMap]) => {
                                const missing = Object.keys(errMap || {}).filter((key) => errMap?.[key as keyof FormState])
                                if (!missing.length) return null
                                const catName =
                                    categoryList.find((c) => c.id === catId)?.name || catId || i18n.t('Category')
                                return (
                                    <span key={catId}>
                                        {catName}: {missing.join(', ')}
                                    </span>
                                )
                            })}
                        </div>
                    </NoticeBox>
                ) : null}

                {submissionSucceeded ? (
                    <NoticeBox title={i18n.t('Report Submitted')}>
                        {i18n.t('Your inspection report has been submitted successfully.')}
                    </NoticeBox>
                ) : null}
            </div>

            <div className={classes.navigationButtons}>
                <div className={classes.navLeft}>
                    {previousCategory ? (
                        <Button
                            className={classes.previousButton}
                            onClick={() => setSelectedCategory(previousCategory)}
                        >
                            {i18n.t('← Previous: {{category}}', { category: CATEGORY_LABELS[previousCategory] })}
                        </Button>
                    ) : null}

                    {nextCategory ? (
                        <Button
                            className={classes.nextButton}
                            onClick={handleNextCategory}
                            disabled={!currentCategoryValid}
                        >
                            {i18n.t('Next: {{category}} →', { category: CATEGORY_LABELS[nextCategory] })}
                        </Button>
                    ) : null}
                </div>

                <div className={classes.navRight}>
                    {submitDisabled ? (
                        <Tooltip
                            content={
                                missingFieldsText
                                    ? i18n.t('Missing: {{fields}}', { fields: missingFieldsText })
                                    : i18n.t('Please fill the required fields before submitting.')
                            }
                            placement="top"
                        >
                            <span className={classes.buttonWrapper}>{submitButton}</span>
                        </Tooltip>
                    ) : (
                        <span className={classes.buttonWrapper}>{submitButton}</span>
                    )}
                </div>

                {inspection?.status === 'completed' && inspection?.syncStatus !== 'synced' && (
                    <Button
                        className={classes.nextButton}
                        onClick={async () => {
                            await triggerSync()
                        }}
                        disabled={!isOnline || isSyncing}
                        loading={isSyncing}
                    >
                        {isSyncing
                            ? i18n.t('Syncing...')
                            : isOnline
                            ? i18n.t('Sync to DHIS2')
                            : i18n.t('Offline - Cannot Sync')}
                    </Button>
                )}
                {syncError && (
                    <NoticeBox error title={i18n.t('Sync Error')}>
                        {syncError}
                    </NoticeBox>
                )}
            </div>

            {}
            {showCompleteModal && (
                <>
                    <div className={classes.bottomSheetShell}>
                        <div className={classes.bottomSheetContent}>
                            <p className={classes.bottomSheetText}>
                                {i18n.t('What would you like to do with this inspection?')}
                            </p>
                            <div className={classes.bottomSheetButtons}>
                                <Button 
                                    onClick={handleSeeSubmittedInspection}
                                    className={classes.summaryButton}
                                >
                                    {i18n.t('Submit')}
                                </Button>
                                <Button 
                                    onClick={handleDiscardInspection}
                                    className={classes.discardButton}
                                >
                                    {i18n.t('Discard')}
                                </Button>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </section>
    )
}

export default InspectionOverview
