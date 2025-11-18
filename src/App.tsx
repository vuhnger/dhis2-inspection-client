import React from 'react'

// './locales' will be populated after running start or build scripts
import './locales'
import AppShell from './app/AppShell'

// Import test data utilities in development mode
if (process.env.NODE_ENV === 'development') {
    import('./shared/utils/testData')
}

const App: React.FC = () => {
    return <AppShell />
}

export default App
