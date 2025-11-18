import { useDataQuery } from '@dhis2/app-runtime'
import { CircularLoader } from '@dhis2/ui'
import i18n from '@dhis2/d2-i18n'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { useInspections } from '../../shared/hooks/useInspections'

import { CreateInspectionModal } from './components/CreateInspectionModal'
import classes from './InspectionHomePage.module.css'

/**
 * Inspection event from DHIS2 tracker API
 */
interface InspectionEvent {
    event: string
    orgUnit: string
    orgUnitName: string
    eventDate: string
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
 * Query to fetch inspection events for the user's accessible org units
 * This will be cached offline per DHIS2 App Runtime behavior
 */
const eventsQuery = {
    events: {
        resource: 'tracker/events',
        params: {
            program: 'UxK2o06ScIe', // School Inspection program UID
            fields: 'event,orgUnit,orgUnitName,eventDate,status,dataValues[dataElement,value]',
            order: 'eventDate:desc',
            pageSize: 50,
        },
    },
}

/**
 * Home page showing upcoming and completed school inspections
 * Designed for 768x1024 tablet viewport with offline-first workflow
 */
const InspectionHomePage: React.FC = () => {
    const navigate = useNavigate()
    const { loading } = useDataQuery<EventsQueryResult>(eventsQuery)
    const { inspections: localInspections, loading: localLoading, refetch: refetchInspections } = useInspections()
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)

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

    // Format time for display
    const formatTime = (dateString: string): string => {
        const date = new Date(dateString)
        return date.toLocaleTimeString('en-GB', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
        })
    }

    return (
        <div className={classes.container}>
            {/* Dark Header */}
            <header className={classes.header}>
                <div className={classes.headerTop}>
                    <h1 className={classes.greeting}>Hi, inspector!</h1>
                    <div className={classes.headerActions}>
                        {isOnline && (
                            <div className={classes.syncBadge}>
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z" fill="#059669"/>
                                </svg>
                                <span>Synced</span>
                            </div>
                        )}
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
                                            <div className={classes.cardStatus}>
                                                <span className={classes.syncIcon}>{isSynced ? '✓' : '⚠'}</span>
                                                {isSynced ? 'Synced' : 'Not synced'}
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
                                            <div className={classes.cardStatus}>
                                                <span className={classes.syncIcon}>{isSynced ? '✓' : '⚠'}</span>
                                                {isSynced ? 'Synced' : 'Not synced'}
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
                onSuccess={() => {
                    refetchInspections()
                }}
            />
        </div>
    )
}

export default InspectionHomePage
