import { useDataQuery } from '@dhis2/app-runtime'
import React from 'react'

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

const query = {
    orgUnits: {
        resource: 'organisationUnits',
        params: {
            fields: 'id,name,displayName,path',
            paging: false,
            withinUserHierarchy: true,
            order: 'displayName:asc',
        },
    },
}

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

    const { data, loading, error, refetch } = useDataQuery<{ orgUnits: OrgUnitsQueryResponse }>(query)

    React.useEffect(() => {
        if (!data?.orgUnits?.organisationUnits) {
            return
        }

        const normalised: AccessibleOrgUnit[] = data.orgUnits.organisationUnits
            .map((orgUnit) => ({
                id: orgUnit.id,
                name: orgUnit.displayName ?? orgUnit.name,
                path: orgUnit.path,
            }))
            .sort((a, b) => a.name.localeCompare(b.name))

        setOrgUnits(normalised)
        persistOrgUnits(normalised)
    }, [data])

    return {
        orgUnits,
        loading,
        error,
        refetch,
        hasCachedData: cached.current.length > 0,
    }
}

export default useAccessibleOrgUnits
