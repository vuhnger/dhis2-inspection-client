import i18n from '@dhis2/d2-i18n'
import React from 'react'

import classes from './ToiletCapturePage.module.css'

type ToiletCapturePageProps = {
    inspectorName?: string
}

type FormState = {
    schoolName: string
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
}

const STORAGE_KEY = 'group16:toiletCapture:draft'
const DEFAULT_FORM: FormState = {
    schoolName: '',
    inspectionDate: '',
    learnerCount: '',
    totalToilets: '',
    workingToilets: '',
    femaleFriendlyToilets: '',
    accessibleToilets: '',
    notes: '',
}

const MIN_TOILET_RATIO = 25

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
                schoolName: String(rest.schoolName ?? ''),
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

const ToiletCapturePage: React.FC<ToiletCapturePageProps> = ({ inspectorName }) => {
    const draftRef = React.useRef(loadDraft())
    const [form, setForm] = React.useState<FormState>(() => draftRef.current.form)
    const [lastSavedAt, setLastSavedAt] = React.useState<string | null>(
        () => draftRef.current.lastSavedAt
    )
    const [errors, setErrors] = React.useState<Partial<Record<keyof FormState, string>>>({})
    const [persistError, setPersistError] = React.useState<string | null>(null)
    const [wasSubmitted, setWasSubmitted] = React.useState(false)

    const hasHydrated = React.useRef(false)
    const skipNextPersist = React.useRef(false)

    React.useEffect(() => {
        if (!hasHydrated.current) {
            hasHydrated.current = true
            return
        }

        if (skipNextPersist.current) {
            skipNextPersist.current = false
            return
        }

        if (typeof window === 'undefined') {
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

    const handleChange = (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => {
        const { name, value } = event.target

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }))
    }

    const validate = (state: FormState) => {
        const nextErrors: Partial<Record<keyof FormState, string>> = {}

        if (!state.schoolName.trim()) {
            nextErrors.schoolName = i18n.t('Add the school name')
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
        skipNextPersist.current = true
        setForm(DEFAULT_FORM)
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

        return ratio <= MIN_TOILET_RATIO ? 'ok' : 'alert'
    }, [ratio])

    const ratioMessage = React.useMemo(() => {
        if (ratio === null) {
            return i18n.t('Add learner and working toilet counts to see the ratio')
        }

        if (ratio <= MIN_TOILET_RATIO) {
            return i18n.t('Learner-to-toilet ratio {{ratio}} meets the < {{limit}} target.', {
                ratio,
                limit: MIN_TOILET_RATIO,
            })
        }

        return i18n.t(
            'Learner-to-toilet ratio {{ratio}} is above the < {{limit}} target. Flag for follow-up.',
            {
                ratio,
                limit: MIN_TOILET_RATIO,
            }
        )
    }, [ratio])

    const submissionSucceeded = wasSubmitted && Object.keys(errors).length === 0

    return (
        <section className={classes.page}>
            <div className={classes.summaryCard}>
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
                <div
                    className={
                        ratioStatus === 'alert'
                            ? classes.ratioWarning
                            : ratioStatus === 'ok'
                            ? classes.ratioSuccess
                            : classes.ratioIdle
                    }
                >
                    <span className={classes.ratioLabel}>{i18n.t('Learner-to-toilet ratio')}</span>
                    <strong className={classes.ratioValue}>{ratio ?? '—'}</strong>
                    <p className={classes.ratioMessage}>{ratioMessage}</p>
                </div>
            </div>

            <form className={classes.form} onSubmit={handleSubmit} noValidate>
                <fieldset className={classes.fieldset}>
                    <legend className={classes.sectionTitle}>
                        {i18n.t('School details and context')}
                    </legend>

                    <label className={classes.label} htmlFor="schoolName">
                        {i18n.t('School name')}
                    </label>
                    <input
                        className={classes.input}
                        id="schoolName"
                        name="schoolName"
                        value={form.schoolName}
                        onChange={handleChange}
                        placeholder={i18n.t('e.g. Campama LBS')}
                        autoComplete="organization"
                    />
                    {errors.schoolName ? (
                        <p className={classes.error}>{errors.schoolName}</p>
                    ) : null}

                    <label className={classes.label} htmlFor="inspectionDate">
                        {i18n.t('Inspection date')}
                    </label>
                    <input
                        className={classes.input}
                        type="date"
                        id="inspectionDate"
                        name="inspectionDate"
                        value={form.inspectionDate}
                        onChange={handleChange}
                    />
                    {errors.inspectionDate ? (
                        <p className={classes.error}>{errors.inspectionDate}</p>
                    ) : null}

                    <label className={classes.label} htmlFor="learnerCount">
                        {i18n.t('Learners present today')}
                    </label>
                    <input
                        className={classes.input}
                        type="number"
                        inputMode="numeric"
                        min={0}
                        id="learnerCount"
                        name="learnerCount"
                        value={form.learnerCount}
                        onChange={handleChange}
                    />
                    {errors.learnerCount ? (
                        <p className={classes.error}>{errors.learnerCount}</p>
                    ) : null}
                </fieldset>

                <fieldset className={classes.fieldset}>
                    <legend className={classes.sectionTitle}>
                        {i18n.t('Toilet breakdown')}
                    </legend>

                    <div className={classes.fieldGrid}>
                        <div>
                            <label className={classes.label} htmlFor="totalToilets">
                                {i18n.t('Total toilets on site')}
                            </label>
                            <input
                                className={classes.input}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                id="totalToilets"
                                name="totalToilets"
                                value={form.totalToilets}
                                onChange={handleChange}
                            />
                            {errors.totalToilets ? (
                                <p className={classes.error}>{errors.totalToilets}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className={classes.label} htmlFor="workingToilets">
                                {i18n.t('Working toilets')}
                            </label>
                            <input
                                className={classes.input}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                id="workingToilets"
                                name="workingToilets"
                                value={form.workingToilets}
                                onChange={handleChange}
                            />
                            {errors.workingToilets ? (
                                <p className={classes.error}>{errors.workingToilets}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className={classes.label} htmlFor="femaleFriendlyToilets">
                                {i18n.t('Female-friendly toilets')}
                            </label>
                            <input
                                className={classes.input}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                id="femaleFriendlyToilets"
                                name="femaleFriendlyToilets"
                                value={form.femaleFriendlyToilets}
                                onChange={handleChange}
                            />
                            {errors.femaleFriendlyToilets ? (
                                <p className={classes.error}>{errors.femaleFriendlyToilets}</p>
                            ) : null}
                        </div>

                        <div>
                            <label className={classes.label} htmlFor="accessibleToilets">
                                {i18n.t('Accessible toilets')}
                            </label>
                            <input
                                className={classes.input}
                                type="number"
                                inputMode="numeric"
                                min={0}
                                id="accessibleToilets"
                                name="accessibleToilets"
                                value={form.accessibleToilets}
                                onChange={handleChange}
                            />
                            {errors.accessibleToilets ? (
                                <p className={classes.error}>{errors.accessibleToilets}</p>
                            ) : null}
                        </div>
                    </div>
                </fieldset>

                <fieldset className={classes.fieldset}>
                    <legend className={classes.sectionTitle}>{i18n.t('Notes')}</legend>

                    <label className={classes.label} htmlFor="notes">
                        {i18n.t('Observations and maintenance needs')}
                    </label>
                    <textarea
                        className={classes.textarea}
                        id="notes"
                        name="notes"
                        value={form.notes}
                        onChange={handleChange}
                        rows={4}
                        placeholder={i18n.t(
                            'Describe cleanliness, stock levels (soap, water), or any urgent repairs.'
                        )}
                    />
                </fieldset>

                <div className={classes.actions}>
                    <button className={classes.primaryButton} type="submit">
                        {i18n.t('Mark draft as ready')}
                    </button>
                    <button
                        className={classes.secondaryButton}
                        type="button"
                        onClick={handleClearDraft}
                    >
                        {i18n.t('Clear draft')}
                    </button>
                </div>

                {submissionSucceeded ? (
                    <p className={classes.statusMessage}>
                        {lastSavedAt
                            ? i18n.t('Draft saved locally at {{timestamp}}. Ready to sync later.', {
                                  timestamp: new Date(lastSavedAt).toLocaleString(),
                              })
                            : i18n.t('Draft saved locally on this device. Ready to sync later.')}
                    </p>
                ) : wasSubmitted ? (
                    <p className={classes.statusWarning}>
                        {i18n.t('Please fix the highlighted fields before finishing the draft.')}
                    </p>
                ) : null}

                {persistError ? <p className={classes.statusError}>{persistError}</p> : null}

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
                            limit: MIN_TOILET_RATIO,
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
