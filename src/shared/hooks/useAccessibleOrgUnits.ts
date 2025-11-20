import React from 'react'

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
        path: string
    }>
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
            const params = new URLSearchParams()
            params.set('fields', 'id,name,displayName,path')
            params.set('paging', 'false')
            params.set('withinUserHierarchy', 'true')
            params.set('order', 'displayName:asc')
            const url = `${apiBase}/organisationUnits?${params.toString()}`
            const res = await fetch(url, {
                headers: {
                    Authorization: getAuthHeader(),
                },
            })
            if (!res.ok) {
                throw new Error(`${res.status} ${res.statusText}`)
            }
            const data: OrgUnitsQueryResponse = await res.json()
            const normalised: AccessibleOrgUnit[] = (data.organisationUnits || [])
                .map((orgUnit) => ({
                    id: orgUnit.id,
                    name: (orgUnit as any).displayName ?? orgUnit.name,
                    path: orgUnit.path,
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
        if (!orgUnits.length) {
            fetchOrgUnits()
        }
    }, [fetchOrgUnits, orgUnits.length])

    return {
        orgUnits,
        loading,
        error,
        refetch: fetchOrgUnits,
        hasCachedData: cached.current.length > 0,
    }
}

export default useAccessibleOrgUnits
