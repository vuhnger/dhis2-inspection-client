import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import React from 'react'

import ToiletCapturePage from '../features/inspection/ToiletCapturePage'
import useAccessibleOrgUnits from '../shared/hooks/useAccessibleOrgUnits'
import classes from './AppShell.module.css'

type MeQueryResult = {
    me: {
        name: string
    }
}

const query = {
    me: {
        resource: 'me',
    },
}

const AppShell: React.FC = () => {
    const { error, loading, data } = useDataQuery<MeQueryResult>(query)
    const { orgUnits, loading: orgUnitsLoading, error: orgUnitsError, hasCachedData } =
        useAccessibleOrgUnits()

    const notice = React.useMemo(() => {
        if (error) {
            return {
                tone: 'error' as const,
                message: i18n.t('We could not load your DHIS2 profile right now. You can still capture toilets and sync later.'),
            }
        }

        if (loading) {
            return {
                tone: 'info' as const,
                message: i18n.t('Loading your workspace… You can start filling the form while we fetch your profile.'),
            }
        }

        if (!data) {
            return {
                tone: 'info' as const,
                message: i18n.t('Offline cache is empty. Complete the form below and it will stay on this device until you sync.'),
            }
        }

        return null
    }, [data, error, loading])

    const inspectorName = data?.me?.name ?? ''

    const orgUnitsNotice = React.useMemo(() => {
        if (orgUnitsError && !hasCachedData) {
            return {
                tone: 'error' as const,
                message: i18n.t('We could not load your school list. Try refreshing when you are back online.'),
            }
        }

        if (orgUnitsError && hasCachedData) {
            return {
                tone: 'info' as const,
                message: i18n.t('Working from cached school data. Refresh when connectivity returns for the latest list.'),
            }
        }

        if (orgUnitsLoading && orgUnits.length === 0) {
            return {
                tone: 'info' as const,
                message: i18n.t('Loading accessible schools…'),
            }
        }

        if (!orgUnitsLoading && orgUnits.length === 0) {
            return {
                tone: 'info' as const,
                message: i18n.t('No schools found for your account. Confirm your DHIS2 access rights.'),
            }
        }

        return null
    }, [hasCachedData, orgUnits.length, orgUnitsError, orgUnitsLoading])

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <h1 className={classes.title}>{i18n.t('School Inspection Toolkit')}</h1>
                <p className={classes.subtitle}>
                    {inspectorName
                        ? i18n.t('Welcome back, {{name}}. Prepare your inspection below.', {
                              name: inspectorName,
                          })
                        : i18n.t('Prepare your inspection below. We will sync when connectivity returns.')}
                </p>
            </header>

            <main className={classes.body}>
                {notice ? (
                    <div
                        className={`${classes.notice} ${notice.tone === 'error' ? classes.noticeError : classes.noticeInfo}`}
                    >
                        {notice.message}
                    </div>
                ) : null}

                {orgUnitsNotice ? (
                    <div
                        className={`${classes.notice} ${orgUnitsNotice.tone === 'error' ? classes.noticeError : classes.noticeInfo}`}
                    >
                        {orgUnitsNotice.message}
                    </div>
                ) : null}

                <ToiletCapturePage
                    inspectorName={inspectorName}
                    orgUnits={orgUnits}
                    orgUnitsLoading={orgUnitsLoading}
                />
            </main>
        </div>
    )
}

export default AppShell
