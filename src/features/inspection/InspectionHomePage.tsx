import React from 'react'
import { useDataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import { Card, Button, CircularLoader, NoticeBox, IconAdd24, IconSync24, colors, spacers } from '@dhis2/ui'
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
    const { loading, error, data, refetch } = useDataQuery<EventsQueryResult>(eventsQuery)
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)

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

    // Parse events into upcoming vs finished
    const { upcomingInspections, finishedInspections, draftCount } = React.useMemo(() => {
        const events = data?.events?.instances || []
        const now = new Date()
        
        // Check localStorage for draft inspections
        const drafts = Object.keys(localStorage).filter(key => key.startsWith('inspection-draft-'))
        
        const upcoming = events.filter(event => {
            const eventDate = new Date(event.eventDate)
            return event.status === 'SCHEDULE' || (event.status === 'ACTIVE' && eventDate >= now)
        })
        
        const finished = events.filter(event => {
            const eventDate = new Date(event.eventDate)
            return event.status === 'COMPLETED' || (eventDate < now && event.status !== 'SCHEDULE')
        })

        return {
            upcomingInspections: upcoming,
            finishedInspections: finished,
            draftCount: drafts.length,
        }
    }, [data])

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
            month: 'short', 
            year: 'numeric' 
        })
    }

    return (
        <div className={classes.container}>
            {/* Header Section */}
            <header className={classes.header}>
                <div className={classes.headerTop}>
                    <div>
                        <h1 className={classes.title}>
                            {i18n.t('School Inspections')}
                        </h1>
                        <p className={classes.subtitle}>
                            {i18n.t('Edutopia District Inspector Dashboard')}
                        </p>
                    </div>
                    <div className={classes.statusBadge}>
                        {isOnline ? (
                            <>
                                <IconSync24 color={colors.green600} />
                                <span style={{ color: colors.green600 }}>
                                    {i18n.t('Online')}
                                </span>
                            </>
                        ) : (
                            <>
                                <span className={classes.offlineDot} />
                                <span style={{ color: colors.grey700 }}>
                                    {i18n.t('Offline')}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className={classes.actionBar}>
                    <Button 
                        primary 
                        large
                        icon={<IconAdd24 />}
                    >
                        {i18n.t('New Inspection')}
                    </Button>
                    
                    <Button 
                        secondary 
                        large
                        onClick={() => refetch()}
                        disabled={!isOnline}
                    >
                        <IconSync24 />
                        {i18n.t('Refresh')}
                    </Button>

                    {draftCount > 0 && (
                        <Button secondary large>
                            {i18n.t('Drafts ({{count}})', { count: draftCount })}
                        </Button>
                    )}
                </div>
            </header>

            {/* Offline Notice */}
            {!isOnline && (
                <div style={{ marginBottom: spacers.dp16 }}>
                    <NoticeBox warning title={i18n.t('Working Offline')}>
                        {i18n.t('Showing cached data. New inspections will sync when connection is restored.')}
                    </NoticeBox>
                </div>
            )}

            {/* Loading State */}
            {loading && (
                <div className={classes.loadingContainer}>
                    <CircularLoader />
                    <p style={{ marginTop: spacers.dp16, color: colors.grey700 }}>
                        {i18n.t('Loading inspections...')}
                    </p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div style={{ marginBottom: spacers.dp16 }}>
                    <NoticeBox error title={i18n.t('Could not load inspections')}>
                        {i18n.t('Check your connection and try refreshing. Cached data may be available offline.')}
                    </NoticeBox>
                </div>
            )}

            {/* Main Content */}
            {!loading && (
                <div className={classes.content}>
                    {/* Upcoming Inspections Section */}
                    <section className={classes.section}>
                        <div className={classes.sectionHeader}>
                            <h2 className={classes.sectionTitle}>
                                📅 {i18n.t('Upcoming Inspections')}
                            </h2>
                            <span className={classes.badge}>
                                {upcomingInspections.length}
                            </span>
                        </div>

                        {upcomingInspections.length === 0 ? (
                            <Card>
                                <div className={classes.emptyState}>
                                    <p className={classes.emptyText}>
                                        {i18n.t('No upcoming inspections scheduled')}
                                    </p>
                                    <Button primary icon={<IconAdd24 />}>
                                        {i18n.t('Schedule Inspection')}
                                    </Button>
                                </div>
                            </Card>
                        ) : (
                            <div className={classes.inspectionGrid}>
                                {upcomingInspections.map((inspection) => {
                                    const { days, isPast } = getDaysRelative(inspection.eventDate)
                                    const isOverdue = isPast && inspection.status !== 'COMPLETED'
                                    
                                    return (
                                        <Card key={inspection.event}>
                                            <div className={classes.inspectionCard}>
                                                <div className={classes.cardHeader}>
                                                    <h3 className={classes.schoolName}>
                                                        🏫 {inspection.orgUnitName}
                                                    </h3>
                                                    {isOverdue && (
                                                        <span className={classes.overdueTag}>
                                                            {i18n.t('Overdue')}
                                                        </span>
                                                    )}
                                                </div>
                                                
                                                <div className={classes.cardDetails}>
                                                    <div className={classes.detailRow}>
                                                        <span className={classes.detailLabel}>
                                                            {i18n.t('Scheduled:')}
                                                        </span>
                                                        <span className={classes.detailValue}>
                                                            {formatDate(inspection.eventDate)}
                                                        </span>
                                                    </div>
                                                    
                                                    <div className={classes.detailRow}>
                                                        <span className={classes.detailLabel}>
                                                            {isOverdue ? i18n.t('Overdue by:') : i18n.t('In:')}
                                                        </span>
                                                        <span 
                                                            className={classes.detailValue}
                                                            style={{ 
                                                                color: isOverdue ? colors.red600 : colors.grey900,
                                                                fontWeight: isOverdue ? 600 : 400,
                                                            }}
                                                        >
                                                            {i18n.t('{{count}} days', { count: days })}
                                                        </span>
                                                    </div>

                                                    <div className={classes.detailRow}>
                                                        <span className={classes.detailLabel}>
                                                            {i18n.t('Status:')}
                                                        </span>
                                                        <span className={`${classes.statusPill} ${classes[inspection.status.toLowerCase()]}`}>
                                                            {inspection.status === 'SCHEDULE' 
                                                                ? i18n.t('Scheduled')
                                                                : i18n.t('In Progress')}
                                                        </span>
                                                    </div>
                                                </div>

                                                <div className={classes.cardActions}>
                                                    <Button small secondary>
                                                        {i18n.t('View Details')}
                                                    </Button>
                                                    <Button small primary>
                                                        {i18n.t('Start Inspection')}
                                                    </Button>
                                                </div>
                                            </div>
                                        </Card>
                                    )
                                })}
                            </div>
                        )}
                    </section>

                    {/* Finished Inspections Section */}
                    <section className={classes.section}>
                        <div className={classes.sectionHeader}>
                            <h2 className={classes.sectionTitle}>
                                ✅ {i18n.t('Completed Inspections')}
                            </h2>
                            <span className={classes.badge}>
                                {finishedInspections.length}
                            </span>
                        </div>

                        {finishedInspections.length === 0 ? (
                            <Card>
                                <div className={classes.emptyState}>
                                    <p className={classes.emptyText}>
                                        {i18n.t('No completed inspections yet')}
                                    </p>
                                </div>
                            </Card>
                        ) : (
                            <div className={classes.inspectionList}>
                                {finishedInspections.slice(0, 10).map((inspection) => {
                                    const { days } = getDaysRelative(inspection.eventDate)
                                    
                                    return (
                                        <div key={inspection.event} className={classes.listItem}>
                                            <div className={classes.listItemLeft}>
                                                <span className={classes.checkmark}>✓</span>
                                                <div>
                                                    <h4 className={classes.listSchoolName}>
                                                        {inspection.orgUnitName}
                                                    </h4>
                                                    <p className={classes.listDate}>
                                                        {formatDate(inspection.eventDate)} • {i18n.t('{{count}} days ago', { count: days })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className={classes.listItemRight}>
                                                <Button small secondary>
                                                    {i18n.t('View Report')}
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}

                        {finishedInspections.length > 10 && (
                            <div style={{ marginTop: spacers.dp16, textAlign: 'center' }}>
                                <Button secondary>
                                    {i18n.t('View All ({{count}})', { count: finishedInspections.length })}
                                </Button>
                            </div>
                        )}
                    </section>

                    {/* Quick Stats */}
                    <section className={classes.statsSection}>
                        <Card>
                            <div className={classes.stats}>
                                <div className={classes.statItem}>
                                    <div className={classes.statValue}>
                                        {upcomingInspections.length}
                                    </div>
                                    <div className={classes.statLabel}>
                                        {i18n.t('Upcoming')}
                                    </div>
                                </div>
                                <div className={classes.statDivider} />
                                <div className={classes.statItem}>
                                    <div className={classes.statValue}>
                                        {finishedInspections.length}
                                    </div>
                                    <div className={classes.statLabel}>
                                        {i18n.t('Completed')}
                                    </div>
                                </div>
                                <div className={classes.statDivider} />
                                <div className={classes.statItem}>
                                    <div className={classes.statValue}>
                                        {upcomingInspections.filter(i => getDaysRelative(i.eventDate).isPast).length}
                                    </div>
                                    <div className={classes.statLabel}>
                                        {i18n.t('Overdue')}
                                    </div>
                                </div>
                            </div>
                        </Card>
                    </section>
                </div>
            )}
        </div>
    )
}

export default InspectionHomePage
