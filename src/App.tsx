import { Provider } from '@dhis2/app-runtime'
import React from 'react'

import './locales'
import AppShell from './app/AppShell'

if (process.env.NODE_ENV === 'development') {
    import('./shared/utils/testData')
}

const runtimeConfig = {
    baseUrl: process.env.REACT_APP_DHIS2_BASE_URL || 'https://research.im.dhis2.org/in5320g16',
    apiVersion: Number(process.env.REACT_APP_DHIS2_API_VERSION || 38),
    auth: {
        username: process.env.REACT_APP_DHIS2_USERNAME || 'in5320',
        password: process.env.REACT_APP_DHIS2_PASSWORD || 'P1@tform',
    },
}

const App: React.FC = () => {
    return (
        <Provider config={runtimeConfig}>
            <AppShell />
        </Provider>
    )
}

export default App
