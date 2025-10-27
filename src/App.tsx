import { useDataQuery, type DataQuery } from '@dhis2/app-runtime'
import i18n from '@dhis2/d2-i18n'
import React from 'react'

import classes from './App.module.css'
// './locales' will be populated after running start or build scripts
import './locales'

type MeQueryResult = {
    me: {
        name: string
    }
}

const query: DataQuery = {
    me: {
        resource: 'me',
    },
}

const MyApp: React.FC = () => {
    const { error, loading, data } = useDataQuery<MeQueryResult>(query)

    if (error) {
        return <span>{i18n.t('ERROR')}</span>
    }

    if (loading) {
        return <span>{i18n.t('Loading...')}</span>
    }

    if (!data) {
        return <span>{i18n.t('Offline cache empty – sync when online')}</span>
    }

    return (
        <div className={classes.container}>
            <h1>{i18n.t('Hello {{name}}', { name: data.me.name })}</h1>
            <h3>{i18n.t('Welcome to DHIS2!')}</h3>
        </div>
    )
}

export default MyApp
