import React from 'react'

import { DHIS2_PROGRAM_UID, DHIS2_ROOT_OU_UID } from '../config/dhis2'
import { getApiBase, getAuthHeader } from '../utils/auth'

export type AccessibleOrgUnit = {
    id: string
    name: string
    path: string
}

type OrgUnitsQueryResponse = {
    organisationUnits: Array<{
        id: string
        name: string
        displayName?: string
        path?: string
        level?: number
    }>
}

type MeOrgUnitsResponse = {
    organisationUnits: Array<{
        id: string
        name: string
        displayName?: string
        path?: string
        level?: number
    }>
    dataViewOrganisationUnits?: Array<{ id: string; path?: string }>
}

const STORAGE_KEY = 'group16:orgUnits:cache'

const loadCachedOrgUnits = (): AccessibleOrgUnit[] => {
    if (typeof window === 'undefined') {
        return []
    }

    try {
        const raw = window.localStorage.getItem(STORAGE_KEY)

        if (!raw) {
            return []
        }

        const parsed: AccessibleOrgUnit[] = JSON.parse(raw)

        if (!Array.isArray(parsed)) {
            return []
        }

        return parsed.filter((item): item is AccessibleOrgUnit => Boolean(item?.id && item?.name))
    } catch (error) {
        console.warn('Unable to read cached org units', error)
        return []
    }
}

const persistOrgUnits = (orgUnits: AccessibleOrgUnit[]) => {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(orgUnits))
    } catch (error) {
        console.warn('Unable to persist org unit cache', error)
    }
}

export const useAccessibleOrgUnits = () => {
    const cached = React.useRef<AccessibleOrgUnit[]>(loadCachedOrgUnits())
    const [orgUnits, setOrgUnits] = React.useState<AccessibleOrgUnit[]>(cached.current)
    const [loading, setLoading] = React.useState(false)
    const [error, setError] = React.useState<Error | null>(null)
    const apiBase = React.useMemo(() => getApiBase(), [])

    const fetchOrgUnits = React.useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const programUrl = `${apiBase}/programs/${DHIS2_PROGRAM_UID}?fields=organisationUnits[id,name,displayName,path,level]`
            const meUrl = `${apiBase}/me?fields=organisationUnits[id,path],dataViewOrganisationUnits[id,path]`

            const [programRes, meRes] = await Promise.all([
                fetch(programUrl, {
                    headers: {
                        Authorization: getAuthHeader(),
                    },
                    cache: 'no-store',
                }),
                fetch(meUrl, {
                    headers: {
                        Authorization: getAuthHeader(),
                    },
                    cache: 'no-store',
                }),
            ])

            if (!programRes.ok) {
                throw new Error(`${programRes.status} ${programRes.statusText}`)
            }
            if (!meRes.ok) {
                throw new Error(`User access check failed: ${meRes.status} ${meRes.statusText}`)
            }

            const data: OrgUnitsQueryResponse = await programRes.json()
            const me: MeOrgUnitsResponse = await meRes.json()
            const rootPrefix = DHIS2_ROOT_OU_UID ? `/${DHIS2_ROOT_OU_UID}` : null

            const userOuPrefixes = [
                ...(me.organisationUnits || []),
                ...(me.dataViewOrganisationUnits || []),
            ]
                .map((ou) => ou.path)
                .filter(Boolean)

            const normalised: AccessibleOrgUnit[] = (data.organisationUnits || [])
                .filter((orgUnit) => {
                    const underRoot = rootPrefix ? orgUnit.path?.startsWith(rootPrefix) : true
                    const withinUserHierarchy = userOuPrefixes.length
                        ? userOuPrefixes.some((prefix) => orgUnit.path?.startsWith(prefix))
                        : true
                    return underRoot && withinUserHierarchy
                })
                .map((orgUnit) => ({
                    id: orgUnit.id,
                    name: (orgUnit as any).displayName ?? orgUnit.name,
                    path: orgUnit.path ?? '',
                }))
                .sort((a, b) => a.name.localeCompare(b.name))

            setOrgUnits(normalised)
            persistOrgUnits(normalised)
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Failed to load org units'))
        } finally {
            setLoading(false)
        }
    }, [apiBase])

    React.useEffect(() => {
        fetchOrgUnits()
    }, [fetchOrgUnits])

    return {
        orgUnits,
        loading,
        error,
        refetch: fetchOrgUnits,
        hasCachedData: cached.current.length > 0,
    }
}

export default useAccessibleOrgUnits
