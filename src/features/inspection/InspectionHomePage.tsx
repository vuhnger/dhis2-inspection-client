import i18n from '@dhis2/d2-i18n'
import { CircularLoader, Modal, ModalTitle, ModalContent, ModalActions, ButtonStrip, Button } from '@dhis2/ui'
import React from 'react'
import { useNavigate, useLocation } from 'react-router-dom'

import { clearAllInspections } from '../../shared/db/indexedDB'
import { useInspections } from '../../shared/hooks/useInspections'
import { useSync } from '../../shared/hooks/useSync'
import { pullRemoteInspections } from '../../shared/services/pullService'

import { CreateInspectionBottomSheet } from './components/CreateInspectionBottomSheet'
import classes from './InspectionHomePage.module.css'

const InspectionHomePage: React.FC = () => {
    const navigate = useNavigate()
    const location = useLocation()
    const [remoteLoading, setRemoteLoading] = React.useState(false)
    const [remoteError, setRemoteError] = React.useState<string | null>(null)
    const { inspections: localInspections, loading: localLoading, refetch: refetchInspections } = useInspections()
    const { hasUnsynced, isSyncing, triggerSync, checkUnsyncedStatus } = useSync()
    const [isOnline, setIsOnline] = React.useState(navigator.onLine)
    const [searchQuery, setSearchQuery] = React.useState('')
    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
    const [isConfirmClearOpen, setIsConfirmClearOpen] = React.useState(false)
    const [isClearing, setIsClearing] = React.useState(false)
    const [lastPullError, setLastPullError] = React.useState<string | null>(null)
    const [lastPulledAt, setLastPulledAt] = React.useState<Date | null>(null)
    const [searchResults, setSearchResults] = React.useState<any[]>([])
    const [showDropdown, setShowDropdown] = React.useState(false)
    const [showAllUpcoming, setShowAllUpcoming] = React.useState(false)
    const [showAllCompleted, setShowAllCompleted] = React.useState(false)
    const [showDiscardToast, setShowDiscardToast] = React.useState(false)
    const [isFabMenuOpen, setIsFabMenuOpen] = React.useState(false)
    const [createMode, setCreateMode] = React.useState<"start" | "schedule">("start")
    const [discardedInspectionInfo, setDiscardedInspectionInfo] = React.useState<{id: string, name: string} | null>(null)
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

        if (localInspections.length === 0) {
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
    }, [effectiveHasUnsynced, isSyncing, localInspections.length])

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

    React.useEffect(() => {
        checkUnsyncedStatus().catch(err => {
            console.error('Failed to refresh sync status:', err)
        })
    }, [localInspections, checkUnsyncedStatus])

    React.useEffect(() => {
        const state = location.state as any
        if (state?.discardedInspection) {
            setDiscardedInspectionInfo(state.discardedInspection)
            setShowDiscardToast(true)
            navigate(location.pathname, { replace: true })
        }
    }, [location.state, location.pathname, navigate])

    React.useEffect(() => {
        if (showDiscardToast) {
            const timer = setTimeout(() => {
                setShowDiscardToast(false)
                setDiscardedInspectionInfo(null)
            }, 4000)
            
            return () => clearTimeout(timer)
        }
    }, [showDiscardToast])

    const pullRemote = React.useCallback(async () => {
        if (!isOnline) {
            return
        }
        setRemoteLoading(true)
        setRemoteError(null)
        try {
            const result = await pullRemoteInspections(200)
            console.log('Pulled remote inspections:', result)
            setLastPullError(null)
            setLastPulledAt(new Date())
            await refetchInspections()
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error'
            console.error('Failed to pull remote inspections', err)
            setRemoteError(message)
            setLastPullError(message)
        } finally {
            setRemoteLoading(false)
        }
    }, [isOnline, refetchInspections])

    React.useEffect(() => {
        pullRemote()
    }, [pullRemote])

    React.useEffect(() => {
        if (!isOnline) return
        pullRemote()
    }, [isOnline, pullRemote])

    const handleSyncAndPull = React.useCallback(async () => {
        try {
            await triggerSync()
            await pullRemote()
        } catch (error) {
            console.error('Sync/pull failed', error)
            setRemoteError(error instanceof Error ? error.message : 'Sync failed')
        }
    }, [pullRemote, triggerSync])

    const { upcomingInspections, finishedInspections } = React.useMemo(() => {
        const now = new Date()

        const localInspectionsList = localInspections.map(inspection => ({
            id: inspection.id,
            event: inspection.dhis2EventId || inspection.id,
            orgUnit: inspection.orgUnit,
            orgUnitName: inspection.orgUnitName,
            eventDate: inspection.eventDate,
            status: inspection.status,
            syncStatus: inspection.syncStatus,
            source: inspection.source || 'local',
        }))

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

    const formatRelativeDays = (days: number, isPast: boolean): string => {
        if (days === 0) {
            return i18n.t('Today')
        }
        return isPast ? i18n.t('{{count}} days ago', { count: days }) : i18n.t('In {{count}} days', { count: days })
    }

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString)
        const base = date.toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'short',
        }).replace(',', '')
        return base.replace(/(\d{1,2}) /, '$1. ')
    }

    const handleUndoDiscard = () => {
        if (discardedInspectionInfo) {
            setShowDiscardToast(false)
            setDiscardedInspectionInfo(null)
            navigate(`/inspection/${discardedInspectionInfo.id}`)
        }
    }

    const handleClearData = async () => {
        setIsClearing(true)
        try {
            await clearAllInspections()
            await refetchInspections()
            // Force a slight delay to ensure the refetch completes before checking sync status
            await new Promise(resolve => setTimeout(resolve, 100))
            await checkUnsyncedStatus()
            setIsConfirmClearOpen(false)
        } catch (error) {
            console.error('Failed to clear data:', error)
            alert('Failed to clear data. Please try again.')
        } finally {
            setIsClearing(false)
        }
    }

    const handleSearch = (query: string) => {
        setSearchQuery(query)
        
        if (!query.trim()) {
            setSearchResults([])
            setShowDropdown(false)
            return
        }

        const filtered = localInspections.filter(inspection => {
            const searchTerm = query.toLowerCase().trim()
            
            if (inspection.orgUnitName?.toLowerCase().includes(searchTerm)) {
                return true
            }
            
            const formattedDate = formatDate(inspection.eventDate).toLowerCase()
            if (formattedDate.includes(searchTerm)) {
                return true
            }
            
            const eventDate = new Date(inspection.eventDate)
            const monthYear = eventDate.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }).toLowerCase()
            if (monthYear.includes(searchTerm)) {
                return true
            }
            
            return false
        }).slice(0, 5)
        
        setSearchResults(filtered)
        setShowDropdown(filtered.length > 0)
    }

    const handleSearchResultClick = (inspection: any) => {
        setSearchQuery(inspection.orgUnitName)
        setShowDropdown(false)
        
        if (inspection.status === 'completed') {
            navigate(`/summary/${inspection.id}`)
        } else {
            navigate(`/inspection/${inspection.id}`)
        }
    }

    const lastPulledLabel = React.useMemo(() => {
        if (lastPulledAt) {
            return `${lastPulledAt.toLocaleDateString()} ${lastPulledAt.toLocaleTimeString()}`
        }
        return i18n.t('Never pulled')
    }, [lastPulledAt])

    return (
        <div className={classes.container}>
            <header className={classes.header}>
                <div className={classes.headerTop}>
                    <h1 className={classes.greeting}>Hi, inspector!</h1>
                    <div className={classes.headerActions}>
                        <div
                            className={classes.syncBadge}
                            style={{
                                ...syncBadgeColors,
                                cursor: isOnline && !isSyncing && !remoteLoading ? 'pointer' : 'default',
                            }}
                            onClick={isOnline && !isSyncing && !remoteLoading ? handleSyncAndPull : undefined}
                            role={isOnline && !isSyncing && !remoteLoading ? 'button' : undefined}
                            tabIndex={isOnline && !isSyncing && !remoteLoading ? 0 : undefined}
                            onKeyDown={(event) => {
                                if (!isOnline || isSyncing || remoteLoading) {
                                    return
                                }
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault()
                                    handleSyncAndPull()
                                }
                            }}
                            aria-live="polite"
                        >
                            {isSyncing || remoteLoading ? (
                                <>
                                    <svg
                                        width="20"
                                        height="20"
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
                                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                                        {isSyncing ? i18n.t('Syncing...') : i18n.t('Refreshing...')}
                                    </span>
                                </>
                            ) : effectiveHasUnsynced ? (
                                <>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 15c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1s1 .45 1 1v4c0 .55-.45 1-1 1zm0-8c-.69 0-1.25-.56-1.25-1.25S11.31 6.5 12 6.5s1.25.56 1.25 1.25S12.69 9 12 9z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                                        {isOnline ? i18n.t('Sync & Refresh') : i18n.t('Offline')}
                                    </span>
                                </>
                            ) : localInspections.length === 0 ? (
                                <>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M12 4V1L8 5L12 9V6C15.31 6 18 8.69 18 12C18 13.01 17.75 13.97 17.3 14.8L18.76 16.26C19.54 15.03 20 13.57 20 12C20 7.58 16.42 4 12 4ZM12 18C8.69 18 6 15.31 6 12C6 10.99 6.25 10.03 6.7 9.2L5.24 7.74C4.46 8.97 4 10.43 4 12C4 16.42 7.58 20 12 20V23L16 19L12 15V18Z"
                                            fill="currentColor"
                                        />
                                    </svg>
                                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                                        {isOnline ? i18n.t('Refresh') : i18n.t('Offline')}
                                    </span>
                                </>
                            ) : (
                                <>
                                    <svg
                                        width="20"
                                        height="20"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        xmlns="http://www.w3.org/2000/svg"
                                    >
                                        <path
                                            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                            stroke="currentColor"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            fill="none"
                                        />
                                    </svg>
                                    <span style={{ marginLeft: '8px', fontWeight: '500' }}>
                                        {i18n.t('Up to date')}
                                    </span>
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

                {}
                <div className={classes.searchContainer}>
                    <div className={classes.searchWrapper}>
                        <input
                            type="text"
                            placeholder="Search for school or date..."
                            className={classes.searchInput}
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value)
                                handleSearch(e.target.value)
                            }}
                        />
                        <button className={classes.searchButton}>
                            <span className={classes.searchIcon}>🔍</span>
                        </button>
                        {showDropdown && searchQuery && searchResults.length > 0 && (
                            <div className={classes.searchDropdown}>
                                {searchResults.map((inspection, index) => (
                                    <div
                                        key={inspection.id || index}
                                        className={classes.searchResultItem}
                                        onClick={() => handleSearchResultClick(inspection)}
                                    >
                                        <div className={classes.searchResultSchool}>
                                            {inspection.orgUnitName || 'School name not available'}
                                        </div>
                                        <div className={classes.searchResultDate}>
                                            {formatDate(inspection.eventDate)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {}
            <main className={classes.content}>
                {}
                <section className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <h2 className={classes.sectionTitle}>Upcoming inspections</h2>
                        <button 
                            className={classes.seeAllLink}
                            onClick={() => setShowAllUpcoming(!showAllUpcoming)}
                        >
                            {showAllUpcoming ? 'Show less ▴' : 'See all upcoming inspections ▾'}
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
                        {(showAllUpcoming ? upcomingInspections : upcomingInspections.slice(0, 3)).map((inspection) => {
                            const { days, isPast } = getDaysRelative(inspection.eventDate)
                            const relativeLabel = formatRelativeDays(days, isPast)
                            const isSynced = inspection.syncStatus === 'synced'
                            const isServer = inspection.source === 'server'

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
                                                {isServer ? (
                                                    <span style={{ fontSize: '0.7rem', marginLeft: 6 }}>
                                                        {i18n.t('From server')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={classes.cardRight}>
                                        <div className={classes.daysIndicator}>
                                            <svg
                                                width="12"
                                                height="13"
                                                viewBox="0 0 15 17"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                style={{ marginRight: 6, flexShrink: 0 }}
                                            >
                                                <path
                                                    d="M13.3333 1.66667H12.5V0H10.8333V1.66667H4.16667V0H2.5V1.66667H1.66667C0.741667 1.66667 0.00833333 2.41667 0.00833333 3.33333L0 15C0 15.9167 0.741667 16.6667 1.66667 16.6667H13.3333C14.25 16.6667 15 15.9167 15 15V3.33333C15 2.41667 14.25 1.66667 13.3333 1.66667ZM13.3333 15H1.66667V6.66667H13.3333V15ZM13.3333 5H1.66667V3.33333H13.3333V5ZM7.5 9.16667H11.6667V13.3333H7.5V9.16667Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                            {relativeLabel}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>

                {}
                <section className={classes.section}>
                    <div className={classes.sectionHeader}>
                        <h2 className={classes.sectionTitle}>Completed inspections</h2>
                        <button 
                            className={classes.seeAllLink}
                            onClick={() => setShowAllCompleted(!showAllCompleted)}
                        >
                            {showAllCompleted ? 'Show less ▴' : 'See all previous inspections ▾'}
                        </button>
                    </div>

                    {!loading && finishedInspections.length === 0 && (
                        <div className={classes.emptyCard}>
                            <p>{i18n.t('No completed inspections yet')}</p>
                        </div>
                    )}

                    <div className={classes.inspectionCards}>
                        {(showAllCompleted ? finishedInspections : finishedInspections.slice(0, 3)).map((inspection) => {
                            const { days, isPast } = getDaysRelative(inspection.eventDate)
                            const relativeLabel = formatRelativeDays(days, isPast)
                            const isSynced = inspection.syncStatus === 'synced'
                            const isServer = inspection.source === 'server'

                            return (
                                <div
                                    key={inspection.id}
                                    className={classes.inspectionCardCompleted}
                                    onClick={() => navigate(`/summary/${inspection.id}`)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault()
                                            navigate(`/summary/${inspection.id}`)
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
                                                {isServer ? (
                                                    <span style={{ fontSize: '0.7rem', marginLeft: 6 }}>
                                                        {i18n.t('From server')}
                                                    </span>
                                                ) : null}
                                            </div>
                                        </div>
                                    </div>
                                    <div className={classes.cardRight}>
                                        <div className={classes.daysAgo}>
                                            <svg
                                                width="12"
                                                height="13"
                                                viewBox="0 0 15 17"
                                                fill="none"
                                                xmlns="http://www.w3.org/2000/svg"
                                                style={{ marginRight: 6, flexShrink: 0 }}
                                            >
                                                <path
                                                    d="M13.3333 1.66667H12.5V0H10.8333V1.66667H4.16667V0H2.5V1.66667H1.66667C0.741667 1.66667 0.00833333 2.41667 0.00833333 3.33333L0 15C0 15.9167 0.741667 16.6667 1.66667 16.6667H13.3333C14.25 16.6667 15 15.9167 15 15V3.33333C15 2.41667 14.25 1.66667 13.3333 1.66667ZM13.3333 15H1.66667V6.66667H13.3333V15ZM13.3333 5H1.66667V3.33333H13.3333V5ZM7.5 9.16667H11.6667V13.3333H7.5V9.16667Z"
                                                    fill="currentColor"
                                                />
                                            </svg>
                                            {relativeLabel}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </section>
            </main>

            <button
                className={classes.fab}
                onClick={() => setIsFabMenuOpen((prev) => !prev)}
                aria-haspopup="menu"
                aria-expanded={isFabMenuOpen}
            >
                <span className={classes.fabIcon}>+</span>
            </button>

            {isFabMenuOpen && (
                <div
                    className={classes.fabMenu}
                    role="menu"
                    aria-label={i18n.t('Inspection actions')}
                    style={{
                        bottom: 40 + 112 / 2 - 56 / 2,
                        right: 40 + 72 + 16,
                    }}
                >
                    <div className={classes.fabMenuList}>
                        <button
                            type="button"
                            className={classes.fabMenuItem}
                            role="menuitem"
                            onClick={() => {
                                setIsFabMenuOpen(false)
                                setCreateMode("start")
                                setIsCreateModalOpen(true)
                            }}
                        >
                            <svg
                                className={classes.fabMenuIcon}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M4.6 2.04C4.73 2.01 4.86 2 5 2H12V4H5V20H19V12H21V20C21 21.1 20.1 22 19 22H5C4.86 22 4.73 21.99 4.6 21.97C4.21 21.89 3.86 21.69 3.59 21.42C3.41 21.23 3.26 21.02 3.16 20.78C3.06 20.54 3 20.27 3 20V4C3 3.72 3.06 3.46 3.16 3.23C3.26 2.99 3.41 2.77 3.59 2.59C3.86 2.32 4.21 2.12 4.6 2.04Z" fill="#007DEB"/>
                                <path d="M17.5809 3.09773L18.3583 2.32029C18.7854 1.89324 19.4752 1.89324 19.9023 2.32029L20.6797 3.09773C21.1068 3.52478 21.1068 4.21462 20.6797 4.64167L19.9023 5.41912L17.5809 3.09773ZM16.8034 3.87518L11 9.67864V12H13.3214L19.1248 6.19656L16.8034 3.87518Z" fill="#007DEB"/>
                            </svg>
                            <span className={classes.fabMenuLabel}>{i18n.t('New inspection')}</span>
                        </button>
                        <button
                            type="button"
                            className={classes.fabMenuItem}
                            role="menuitem"
                            onClick={() => {
                                setIsFabMenuOpen(false)
                                setCreateMode("schedule")
                                setIsCreateModalOpen(true)
                            }}
                        >
                            <svg
                                className={classes.fabMenuIcon}
                                viewBox="0 0 24 24"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <path d="M19 4H18V2H16V4H8V2H6V4H5C3.89 4 3.01 4.9 3.01 6L3 20C3 21.1 3.89 22 5 22H19C20.1 22 21 21.1 21 20V6C21 4.9 20.1 4 19 4ZM19 20H5V10H19V20ZM19 8H5V6H19V8ZM12 13H17V18H12V13Z" fill="#007DEB"/>
                            </svg>
                            <span className={classes.fabMenuLabel}>{i18n.t('Schedule inspection')}</span>
                        </button>
                    </div>
                </div>
            )}

            <CreateInspectionBottomSheet
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                mode={createMode}
                onSuccess={async () => {
                    await refetchInspections()
                    if (isOnline) {
                        await triggerSync()
                    }
                }}
            />

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

            {}
            {showDiscardToast && discardedInspectionInfo && (
                <div className={classes.discardToast}>
                    <span className={classes.toastMessage}>
                        {i18n.t('Inspection discarded')}
                    </span>
                    <button 
                        className={classes.undoButton}
                        onClick={handleUndoDiscard}
                    >
                        {i18n.t('Undo')}
                    </button>
                </div>
            )}
        </div>
    )
}

export default InspectionHomePage
