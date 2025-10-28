import React from 'react'
import {
    Button,
    InputField,
    NoticeBox,
    SingleSelectField,
    SingleSelectOption,
    Tag,
    TextAreaField,
} from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'

import classes from './ToiletCapturePage.module.css'
import { LEARNER_TO_TOILET_MAX_RATIO } from '../../shared/constants/edutopiaStandards'
import type { AccessibleOrgUnit } from '../../shared/hooks/useAccessibleOrgUnits'

type ToiletCapturePageProps = {
    inspectorName?: string
    orgUnits: AccessibleOrgUnit[]
    orgUnitsLoading?: boolean
}

type FormState = {
    orgUnitId: string
    orgUnitName: string
    inspectionDate: string
    learnerCount: string
    totalToilets: string
    workingToilets: string
    femaleFriendlyToilets: string
    accessibleToilets: string
    notes: string
}

type StoredDraft = FormState & {
    lastSavedAt?: string | null
    schoolName?: string
}

const STORAGE_KEY = 'group16:toiletCapture:draft'
const DEFAULT_FORM: FormState = {
    orgUnitId: '',
    orgUnitName: '',
    inspectionDate: '',
    learnerCount: '',
    totalToilets: '',
    workingToilets: '',
    femaleFriendlyToilets: '',
    accessibleToilets: '',
    notes: '',
}

const parseNumber = (value: string): number | null => {
    if (!value) {
        return null
    }

    const parsed = Number(value)

    if (Number.isNaN(parsed)) {
        return null
    }

    return parsed
}

const loadDraft = (): { form: FormState; lastSavedAt: string | null } => {
    if (typeof window === 'undefined') {
        return { form: DEFAULT_FORM, lastSavedAt: null }
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)

        if (!raw) {
            return { form: DEFAULT_FORM, lastSavedAt: null }
        }

        const parsed: StoredDraft = JSON.parse(raw)
        const { lastSavedAt, ...rest } = parsed

        return {
            form: {
                orgUnitId: String(rest.orgUnitId ?? ''),
                orgUnitName: String(rest.orgUnitName ?? rest.schoolName ?? ''),
                inspectionDate: String(rest.inspectionDate ?? ''),
                learnerCount: String(rest.learnerCount ?? ''),
                totalToilets: String(rest.totalToilets ?? ''),
                workingToilets: String(rest.workingToilets ?? ''),
                femaleFriendlyToilets: String(rest.femaleFriendlyToilets ?? ''),
                accessibleToilets: String(rest.accessibleToilets ?? ''),
                notes: String(rest.notes ?? ''),
            },
            lastSavedAt: lastSavedAt ?? null,
        }
    } catch (error) {
        console.warn('Unable to read toilet capture draft from storage', error)
        return { form: DEFAULT_FORM, lastSavedAt: null }
    }
}

const ToiletCapturePage: React.FC<ToiletCapturePageProps> = ({
    inspectorName,
    orgUnits,
    orgUnitsLoading = false,
}) => {
    const draftRef = React.useRef(loadDraft())
    const [form, setForm] = React.useState<FormState>(() => draftRef.current.form)
    const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(
        () => draftRef.current.lastSavedAt
    )
    const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
    const [persistError, setPersistError] = React.useState<string | null>(null)
    const [wasSubmitted, setWasSubmitted] = React.useState(false)

    const hasHydrated = React.useRef(false)
    const isClearingRef = React.useRef(false)

    React.useEffect(() => {
        if (!hasHydrated.current) {
            hasHydrated.current = true
            return
        }

        if (typeof window === 'undefined') {
            return
        }

        const isEmptyDraft = Object.values(form).every((value) => value === '')

        if (isEmptyDraft) {
            try {
                window.localStorage.removeItem(STORAGE_KEY)
            } catch (error) {
                console.warn('Unable to remove empty toilet capture draft', error)
            }

            setLastSavedAt((previous) => (previous === null ? previous : null))
            isClearingRef.current = false

            return
        }

        if (isClearingRef.current) {
            return
        }

        try {
            const payload: StoredDraft = {
                ...form,
                lastSavedAt: new Date().toISOString(),
            }

            window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
            setLastSavedAt(payload.lastSavedAt ?? null)
            setPersistError(null)
        } catch (error) {
            console.warn('Unable to persist toilet capture draft', error)
            setPersistError(
                i18n.t(
                    'We could not save the draft on this device. Copy your notes before refreshing.'
                )
            )
        }
    }, [form])

    const handleFieldChange = (field: keyof FormState) =>
        ({ value }: { value?: string }) => {
            setForm((prev) => ({
                ...prev,
                [field]: value ?? '',
            }))
        }

    const orgUnitOptions = React.useMemo(
        () =>
            orgUnits.map((orgUnit) => ({
                value: orgUnit.id,
                label: orgUnit.name,
            })),
        [orgUnits]
    )

    const selectOptions = React.useMemo(() => {
        if (!form.orgUnitId) {
            return orgUnitOptions
        }

        const exists = orgUnitOptions.some((option) => option.value === form.orgUnitId)

        if (exists) {
            return orgUnitOptions
        }

        const fallbackLabel = form.orgUnitName
            ? i18n.t('{{name}} (not in current list)', { name: form.orgUnitName })
            : i18n.t('Previously selected school ({{id}})', { id: form.orgUnitId })

        return [
            {
                value: form.orgUnitId,
                label: fallbackLabel,
            },
            ...orgUnitOptions,
        ]
    }, [form.orgUnitId, form.orgUnitName, orgUnitOptions])

    const handleOrgUnitChange = ({
        selected,
    }: {
        selected?: string
    }) => {
        const value = selected ?? ''
        const option = orgUnitOptions.find((item) => item.value === value)

        setForm((prev) => ({
            ...prev,
            orgUnitId: value,
            orgUnitName: option?.label ?? (value ? prev.orgUnitName : ''),
        }))
    }

    const validate = (state: FormState) => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {}

        if (!state.orgUnitId) {
            nextErrors.orgUnitId = i18n.t('Select a school from the list')
        }

        if (!state.inspectionDate) {
            nextErrors.inspectionDate = i18n.t('Select the inspection date')
        }

        const numericFields: Array<keyof FormState> = [
            'learnerCount',
            'totalToilets',
            'workingToilets',
            'femaleFriendlyToilets',
            'accessibleToilets',
        ]

        numericFields.forEach((field) => {
            const value = parseNumber(state[field])

            if (value === null || value < 0) {
                nextErrors[field] = i18n.t('Enter a non-negative number')
            }
        })

        const total = parseNumber(state.totalToilets)
        const working = parseNumber(state.workingToilets)
        const femaleFriendly = parseNumber(state.femaleFriendlyToilets)
        const accessible = parseNumber(state.accessibleToilets)

        if (total !== null && working !== null && working > total) {
            nextErrors.workingToilets = i18n.t('Working toilets cannot exceed total toilets')
        }

        if (total !== null && femaleFriendly !== null && femaleFriendly > total) {
            nextErrors.femaleFriendlyToilets = i18n.t(
                'Female-friendly toilets cannot exceed total toilets'
            )
        }

        if (total !== null && accessible !== null && accessible > total) {
            nextErrors.accessibleToilets = i18n.t(
                'Accessible toilets cannot exceed total toilets'
            )
        }

        return nextErrors
    }

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        const validationErrors = validate(form)
        setErrors(validationErrors)
        setWasSubmitted(true)
    }

    const handleClearDraft = () => {
        isClearingRef.current = true
        setForm(() => ({ ...DEFAULT_FORM }))
        setErrors({})
        setWasSubmitted(false)
        setLastSavedAt(null)

        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(STORAGE_KEY)
            } catch (error) {
                console.warn('Unable to remove stored toilet capture draft', error)
            }
        }
    }

    const learners = parseNumber(form.learnerCount)
    const working = parseNumber(form.workingToilets)
    const ratio =
        learners !== null && working !== null && working > 0
            ? Number((learners / working).toFixed(1))
            : null

    const ratioStatus = React.useMemo(() => {
        if (ratio === null) {
            return 'idle'
        }

        return ratio <= LEARNER_TO_TOILET_MAX_RATIO ? 'ok' : 'alert'
    }, [ratio])

    const ratioMessage = React.useMemo(() => {
        if (ratio === null) {
            return i18n.t('Add learner and working toilet counts to see the ratio')
        }

        if (ratio <= LEARNER_TO_TOILET_MAX_RATIO) {
            return i18n.t('Learner-to-toilet ratio {{ratio}} meets the < {{limit}} target.', {
                ratio,
                limit: LEARNER_TO_TOILET_MAX_RATIO,
            })
        }

        return i18n.t(
            'Learner-to-toilet ratio {{ratio}} is above the < {{limit}} target. Flag for follow-up.',
            {
                ratio,
                limit: LEARNER_TO_TOILET_MAX_RATIO,
            }
        )
    }, [ratio])

    const submissionSucceeded = wasSubmitted && Object.keys(errors).length === 0

    return (
        <section className={classes.page}>
            <div className={classes.card}>
                <h2 className={classes.cardTitle}>{i18n.t('Toilet capture')}</h2>
                <p className={classes.cardCopy}>
                    {inspectorName
                        ? i18n.t(
                              'Log today’s toilet status for {{name}}. We will sync with DHIS2 when connectivity is available.',
                              { name: inspectorName }
                          )
                        : i18n.t(
                              'Log today’s toilet status. Data stays on this device until a sync feature is added.'
                          )}
                </p>
                <NoticeBox
                    className={classes.ratioNotice}
                    success={ratioStatus === 'ok'}
                    warning={ratioStatus === 'alert'}
                    info={ratioStatus === 'idle'}
                    title={i18n.t('Learner-to-toilet ratio')}
                >
                    <div className={classes.ratioContent}>
                        <Tag
                            className={classes.ratioValue}
                            positive={ratioStatus === 'ok'}
                            negative={ratioStatus === 'alert'}
                        >
                            {ratio ?? '—'}
                        </Tag>
                        <p className={classes.ratioMessage}>{ratioMessage}</p>
                    </div>
                </NoticeBox>
            </div>

            <form className={classes.form} onSubmit={handleSubmit} noValidate>
                <section className={classes.formSection} aria-labelledby="section-school">
                    <h3 className={classes.sectionTitle} id="section-school">
                        {i18n.t('School details and context')}
                    </h3>

                    <SingleSelectField
                        label={i18n.t('School')}
                        name="orgUnitId"
                        placeholder={i18n.t('Search school name')}
                        filterable
                        loading={orgUnitsLoading}
                        selected={form.orgUnitId || undefined}
                        onChange={handleOrgUnitChange}
                        clearable
                        noMatchText={i18n.t('No schools match your search')}
                        emptyText={i18n.t('No schools found')}
                        error={Boolean(errors.orgUnitId)}
                        validationText={errors.orgUnitId}
                    >
                        {selectOptions.map((option) => (
                            <SingleSelectOption
                                key={option.value}
                                value={option.value}
                                label={option.label}
                            />
                        ))}
                    </SingleSelectField>

                    <InputField
                        label={i18n.t('Inspection date')}
                        name="inspectionDate"
                        type="date"
                        value={form.inspectionDate}
                        onChange={handleFieldChange('inspectionDate')}
                        required
                        error={Boolean(errors.inspectionDate)}
                        validationText={errors.inspectionDate}
                    />

                    <InputField
                        label={i18n.t('Learners present today')}
                        name="learnerCount"
                        type="number"
                        inputMode="numeric"
                        min="0"
                        value={form.learnerCount}
                        onChange={handleFieldChange('learnerCount')}
                        error={Boolean(errors.learnerCount)}
                        validationText={errors.learnerCount}
                    />
                </section>

                <section className={classes.formSection} aria-labelledby="section-breakdown">
                    <h3 className={classes.sectionTitle} id="section-breakdown">
                        {i18n.t('Toilet breakdown')}
                    </h3>

                    <div className={classes.fieldGrid}>
                        <InputField
                            label={i18n.t('Total toilets on site')}
                            name="totalToilets"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={form.totalToilets}
                            onChange={handleFieldChange('totalToilets')}
                            error={Boolean(errors.totalToilets)}
                            validationText={errors.totalToilets}
                        />

                        <InputField
                            label={i18n.t('Working toilets')}
                            name="workingToilets"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={form.workingToilets}
                            onChange={handleFieldChange('workingToilets')}
                            error={Boolean(errors.workingToilets)}
                            validationText={errors.workingToilets}
                        />

                        <InputField
                            label={i18n.t('Female-friendly toilets')}
                            name="femaleFriendlyToilets"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={form.femaleFriendlyToilets}
                            onChange={handleFieldChange('femaleFriendlyToilets')}
                            error={Boolean(errors.femaleFriendlyToilets)}
                            validationText={errors.femaleFriendlyToilets}
                        />

                        <InputField
                            label={i18n.t('Accessible toilets')}
                            name="accessibleToilets"
                            type="number"
                            inputMode="numeric"
                            min="0"
                            value={form.accessibleToilets}
                            onChange={handleFieldChange('accessibleToilets')}
                            error={Boolean(errors.accessibleToilets)}
                            validationText={errors.accessibleToilets}
                        />
                    </div>
                </section>

                <section className={classes.formSection} aria-labelledby="section-notes">
                    <h3 className={classes.sectionTitle} id="section-notes">
                        {i18n.t('Notes')}
                    </h3>

                    <TextAreaField
                        label={i18n.t('Observations and maintenance needs')}
                        name="notes"
                        value={form.notes}
                        onChange={handleFieldChange('notes')}
                        rows={4}
                        placeholder={i18n.t(
                            'Describe cleanliness, stock levels (soap, water), or any urgent repairs.'
                        )}
                    />
                </section>

                <div className={classes.actions}>
                    <Button primary type="submit">
                        {i18n.t('Mark draft as ready')}
                    </Button>
                    <Button secondary type="button" onClick={handleClearDraft}>
                        {i18n.t('Clear draft')}
                    </Button>
                </div>

                {submissionSucceeded ? (
                    <NoticeBox success title={i18n.t('Draft saved locally')}>
                        {lastSavedAt
                            ? i18n.t('Saved at {{timestamp}}. Ready to sync later.', {
                                  timestamp: new Date(lastSavedAt).toLocaleString(),
                              })
                            : i18n.t('Ready to sync later.')}
                    </NoticeBox>
                ) : wasSubmitted ? (
                    <NoticeBox warning>
                        {i18n.t('Please fix the highlighted fields before finishing the draft.')}
                    </NoticeBox>
                ) : null}

                {persistError ? (
                    <NoticeBox error title={i18n.t('Draft not saved')}>{persistError}</NoticeBox>
                ) : null}

                {lastSavedAt && !submissionSucceeded ? (
                    <p className={classes.helperText}>
                        {i18n.t('Draft auto-saved at {{timestamp}}', {
                            timestamp: new Date(lastSavedAt).toLocaleString(),
                        })}
                    </p>
                ) : null}
            </form>

            <aside className={classes.supportCard}>
                <h3 className={classes.supportTitle}>{i18n.t('Why we capture toilets')}</h3>
                <p className={classes.supportCopy}>
                    {i18n.t(
                        'Edutopia expects fewer than {{limit}} learners per working toilet. These notes will help plan maintenance visits and resource transfers once syncing is available.',
                        {
                            limit: LEARNER_TO_TOILET_MAX_RATIO,
                        }
                    )}
                </p>
                <p className={classes.supportCopy}>
                    {i18n.t(
                        'When online, the app will compare against DHIS2 baselines so you can explain changes to the head teacher in the field.'
                    )}
                </p>
            </aside>
        </section>
    )
}

export default ToiletCapturePage
