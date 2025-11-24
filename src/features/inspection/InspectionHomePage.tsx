import i18n from '@dhis2/d2-i18n'
import { CircularLoader, Modal, ModalTitle, ModalContent, ModalActions, ButtonStrip, Button } from '@dhis2/ui'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { DHIS2_PROGRAM_UID } from '../../shared/config/dhis2'
import { clearAllInspections } from '../../shared/db/indexedDB'
import { useInspections } from '../../shared/hooks/useInspections'
import { useSync } from '../../shared/hooks/useSync'
import { getApiBase, getAuthHeader } from '../../shared/utils/auth'

import { CreateInspectionModal } from './components/CreateInspectionModal'
import classes from './InspectionHomePage.module.css'

/**
 * Inspection event from DHIS2 tracker API
 */
interface InspectionEvent {
    event: string
    orgUnit: string
    orgUnitName: string
    occurredAt: string
    status: 'COMPLETED' | 'ACTIVE' | 'SCHEDULE'
    dataValues: Array<{
        dataElement: string
        value: string | number
    }>
}

interface EventsQueryResult {
    events: {
        instances: InspectionEvent[]
    }
}

/**
 * Home page showing upcoming and completed school inspections
 * Designed for 768x1024 tablet viewport with offline-first workflow
 */
const InspectionHomePage: React.FC = () => {
    const navigate = useNavigate()
    const apiBase = React.useMemo(() => getApiBase(), [])
    const [remoteEvents, setRemoteEvents] = React.useState<InspectionEvent[]>([])
    const [remoteLoading, setRemoteLoading] = React.useState(false)
    const [remoteError, setRemoteError] = React.useState<string | null>(null)
    const { inspections: localInspections, loading: localLoading, refetch: refetchInspections } = useInspections()
    const { hasUnsynced, isSyncing, triggerSync, checkUnsyncedStatus } = useSync()
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
    const [isConfirmClearOpen, setIsConfirmClearOpen] = React.useState(false)
    const [isClearing, setIsClearing] = React.useState(false)
    const loading = remoteLoading
    const localHasUnsynced = React.useMemo(
        () => localInspections.some((inspection) => inspection.syncStatus !== 'synced'),
        [localInspections]
    )
    const effectiveHasUnsynced = hasUnsynced || localHasUnsynced
    const canTriggerSync = isOnline && effectiveHasUnsynced && !isSyncing

    const syncBadgeColors = React.useMemo(() => {
        if (isSyncing) {
            return {
                background: '#DBEAFE',
                color: '#1D4ED8',
                border: '1px solid #BFDBFE',
            }
        }

        if (effectiveHasUnsynced) {
            return {
                background: '#F3F4F6',
                color: '#4B5563',
                border: '1px solid #E5E7EB',
            }
        }

        return {
            background: '#D1FAE5',
            color: '#047857',
            border: '1px solid #6EE7B7',
        }
    }, [effectiveHasUnsynced, isSyncing])

    // Track online/offline status
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

    // Re-check unsynced state whenever local inspections change
    React.useEffect(() => {
        checkUnsyncedStatus().catch(err => {
            console.error('Failed to refresh sync status:', err)
        })
    }, [localInspections, checkUnsyncedStatus])

    // Load DHIS2 events once per mount (or when online changes to true)
    React.useEffect(() => {
        let cancelled = false
        const fetchEvents = async () => {
            if (!isOnline) {
                return
            }
            setRemoteLoading(true)
            setRemoteError(null)
            try {
                const params = new URLSearchParams()
                params.set('program', DHIS2_PROGRAM_UID)
                params.set('fields', 'event,orgUnit,orgUnitName,occurredAt,status,dataValues[dataElement,value]')
                params.set('order', 'occurredAt:desc')
                params.set('pageSize', '50')
                const url = `${apiBase}/tracker/events?${params.toString()}`
                const res = await fetch(url, {
                    headers: {
                        Authorization: getAuthHeader(),
                    },
                })
                if (!res.ok) {
                    throw new Error(`${res.status} ${res.statusText}`)
                }
                const data = (await res.json()) as EventsQueryResult
                if (!cancelled) {
                    setRemoteEvents(data?.events?.instances || [])
                }
            } catch (err) {
                if (!cancelled) {
                    setRemoteError(err instanceof Error ? err.message : 'Unknown error')
                    setRemoteEvents([])
                }
            } finally {
                if (!cancelled) {
                    setRemoteLoading(false)
                }
            }
        }
        fetchEvents()
        return () => {
            cancelled = true
        }
    }, [apiBase, isOnline])

    // Parse local inspections and DHIS2 events into upcoming vs finished
    const { upcomingInspections, finishedInspections } = React.useMemo(() => {
        const now = new Date()

        // Map local inspections to display format
        const localInspectionsList = localInspections.map(inspection => ({
            id: inspection.id,
            event: inspection.dhis2EventId || inspection.id,
            orgUnit: inspection.orgUnit,
            orgUnitName: inspection.orgUnitName,
            eventDate: inspection.eventDate,
            status: inspection.status,
            syncStatus: inspection.syncStatus,
            isLocal: true,
        }))

        // Separate upcoming and finished based on status and date
        const upcoming = localInspectionsList.filter(inspection => {
            const eventDate = new Date(inspection.eventDate)
            return inspection.status === 'scheduled' ||
                   (inspection.status === 'in_progress' && eventDate >= now)
        })

        const finished = localInspectionsList.filter(inspection => {
            const eventDate = new Date(inspection.eventDate)
            return inspection.status === 'completed' ||
                   (eventDate < now && inspection.status !== 'scheduled')
        })

        return {
            upcomingInspections: upcoming,
            finishedInspections: finished,
        }
    }, [localInspections])

    // Calculate days until/since inspection
    const getDaysRelative = (dateString: string): { days: number; isPast: boolean } => {
        const eventDate = new Date(dateString)
        const now = new Date()
        const diffTime = eventDate.getTime() - now.getTime()
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        return {
            days: Math.abs(diffDays),
            isPast: diffDays < 0,
        }
    }

    // Format date for display
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleDateString('en-GB', {
            day: 'numeric',
            month: 'short'
        })
    }

    // Handle clearing all data
    const handleClearData = async () => {
        setIsClearing(true)
        try {
            await clearAllInspections()
            await refetchInspections()
            setIsConfirmClearOpen(false)
        } catch (error) {
            console.error('Failed to clear data:', error)
            alert('Failed to clear data. Please try again.')
        } finally {
            setIsClearing(false)
        }
    }

    return (
        <div className={classes.container}>
            {/* Dark Header */}
            <header className={classes.header}>
                <div className={classes.headerTop}>
                    <h1 className={classes.greeting}>Hi, inspector!</h1>
                    <div className={classes.headerActions}>
                        <div
                            className={classes.syncBadge}
                            style={{
                                ...syncBadgeColors,
                                cursor: canTriggerSync ? 'pointer' : 'default',
                            }}
                            onClick={canTriggerSync ? triggerSync : undefined}
                            role={canTriggerSync ? 'button' : undefined}
                            tabIndex={canTriggerSync ? 0 : undefined}
                            onKeyDown={(event) => {
                                if (!canTriggerSync) {
                                    return
                                }
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    triggerSync()
                                }
                            }}
                            aria-live="polite"
                        >
                            {isSyncing ? (
                                <>
                                    <svg
                                    width="24"
                                    height="24"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                    style={{ animation: 'spin 1s linear infinite' }}
                                >
                                    <path
                                        d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z"
                                        fill="currentColor"
                                    />
                                </svg>
                                    <span>{i18n.t('Syncing...')}</span>
                                </>
                            ) : effectiveHasUnsynced ? (
                                <>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.69 0-1.25-.56-1.25-1.25S11.31 6.5 12 6.5s1.25.56 1.25 1.25S12.69 9 12 9z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
                                        <span>{i18n.t('Not synced')}</span>
                                        <small style={{ fontSize: '0.7rem', opacity: 0.9 }}>
                                            {isOnline ? i18n.t('Tap to sync') : i18n.t('Connect to sync')}
                                        </small>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <svg
                                        width="24"
                                        height="24"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span>{i18n.t('Synced')}</span>
                                </>
                            )}
                        </div>
                        <button
                            className={classes.clearDataButton}
                            onClick={() => setIsConfirmClearOpen(true)}
                            title={i18n.t('Reset all local data')}
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path
                                    d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                    fill="currentColor"
                                />
                            </svg>
                        </button>
                        <div className={classes.userAvatar}>LH</div>
                    </div>
                </div>

                {/* Search Bar */}
                <div className={classes.searchContainer}>
                    <input
                        type="text"
                        placeholder="Looking for an inspection?"
                        className={classes.searchInput}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button className={classes.searchButton}>
                        <span className={classes.searchIcon}>🔍</span>
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className={classes.content}>
                {/* Upcoming Inspections Section */}
                <section className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <h2 className={classes.sectionTitle}>Upcoming inspections</h2>
                        <button className={classes.seeAllLink}>
                            See all upcoming inspections ▾
                        </button>
                    </div>

                    {(loading || localLoading) && (
                        <div className={classes.loadingContainer}>
                            <CircularLoader small />
                        </div>
                    )}

                    {!loading && upcomingInspections.length === 0 && (
                        <div className={classes.emptyCard}>
                            <p>{i18n.t('No upcoming inspections scheduled')}</p>
                        </div>
                    )}

                    <div className={classes.inspectionCards}>
                        {upcomingInspections.slice(0, 3).map((inspection) => {
                            const { days } = getDaysRelative(inspection.eventDate)
                            const isSynced = inspection.syncStatus === 'synced'

                            return (
                                <div
                                    key={inspection.id}
                                    className={classes.inspectionCard}
                                    onClick={() => navigate(`/inspection/${inspection.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            navigate(`/inspection/${inspection.id}`)
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={classes.cardLeft}>
                                        <div className={classes.avatarCircle}>LH</div>
                                        <div className={classes.cardInfo}>
                                            <div className={classes.cardDate}>
                                                {formatDate(inspection.eventDate)}
                                            </div>
                                            <div className={classes.cardTime}>
                                                16:00 - 17:30
                                            </div>
                                            <div className={classes.cardSchool}>
                                                {inspection.orgUnitName}
                                            </div>
                                            <div
                                                className={classes.cardStatus}
                                                style={{ color: isSynced ? '#059669' : '#6B7280' }}
                                            >
                                                <span className={classes.syncIcon}>
                                                    {isSynced ? '✓' : '•'}
                                                </span>
                                                {isSynced ? i18n.t('Synced') : i18n.t('Not synced')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={classes.cardRight}>
                                        <div className={classes.daysIndicator}>
                                            In {days} days
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {/* Completed Inspections Section */}
                <section className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <h2 className={classes.sectionTitle}>Completed inspections</h2>
                        <button className={classes.seeAllLink}>
                            See all previous inspections ▾
                        </button>
                    </div>

                    {!loading && finishedInspections.length === 0 && (
                        <div className={classes.emptyCard}>
                            <p>{i18n.t('No completed inspections yet')}</p>
                        </div>
                    )}

                    <div className={classes.inspectionCards}>
                        {finishedInspections.slice(0, 3).map((inspection) => {
                            const { days } = getDaysRelative(inspection.eventDate)
                            const isSynced = inspection.syncStatus === 'synced'

                            return (
                                <div
                                    key={inspection.id}
                                    className={classes.inspectionCard}
                                    onClick={() => navigate(`/inspection/${inspection.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            navigate(`/inspection/${inspection.id}`)
                                        }
                                    }}
                                    role="button"
                                    tabIndex={0}
                                    style={{ cursor: 'pointer' }}
                                >
                                    <div className={classes.cardLeft}>
                                        <div className={classes.avatarCircle}>LH</div>
                                        <div className={classes.cardInfo}>
                                            <div className={classes.cardDate}>
                                                {formatDate(inspection.eventDate)}
                                            </div>
                                            <div className={classes.cardTime}>
                                                16:00 - 17:30
                                            </div>
                                            <div className={classes.cardSchool}>
                                                {inspection.orgUnitName}
                                            </div>
                                            <div
                                                className={classes.cardStatus}
                                                style={{ color: isSynced ? '#059669' : '#6B7280' }}
                                            >
                                                <span className={classes.syncIcon}>
                                                    {isSynced ? '✓' : '•'}
                                                </span>
                                                {isSynced ? i18n.t('Synced') : i18n.t('Not synced')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={classes.cardRight}>
                                        <div className={classes.daysAgo}>
                                            {days} days ago
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </main>

            {/* Floating Action Button */}
            <button className={classes.fab} onClick={() => setIsCreateModalOpen(true)}>
                <span className={classes.fabIcon}>+</span>
            </button>

            {/* Create Inspection Modal */}
            <CreateInspectionModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onSuccess={async () => {
                    await refetchInspections()
                    // Trigger sync if online
                    if (isOnline) {
                        await triggerSync()
                    }
                }}
            />

            {/* Confirm Clear Data Modal */}
            <Modal hide={!isConfirmClearOpen} onClose={() => setIsConfirmClearOpen(false)} position="middle">
                <ModalTitle>{i18n.t('Reset Local Data?')}</ModalTitle>
                <ModalContent>
                    <p style={{ marginBottom: '12px' }}>
                        {i18n.t('This will permanently delete all inspections stored on this device.')}
                    </p>
                    <p style={{ marginBottom: '12px', fontWeight: 'bold' }}>
                        {i18n.t('Warning: This action cannot be undone!')}
                    </p>
                    <p style={{ color: '#6B7280', fontSize: '14px' }}>
                        {i18n.t('Note: Only data that has been synced to the server will be preserved. Any unsynced inspections will be lost.')}
                    </p>
                </ModalContent>
                <ModalActions>
                    <ButtonStrip end>
                        <Button onClick={() => setIsConfirmClearOpen(false)} disabled={isClearing}>
                            {i18n.t('Cancel')}
                        </Button>
                        <Button destructive onClick={handleClearData} loading={isClearing}>
                            {i18n.t('Reset Data')}
                        </Button>
                    </ButtonStrip>
                </ModalActions>
            </Modal>
        </div>
    )
}

export default InspectionHomePage
