import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import ToiletCapturePage from '../features/inspection/ToiletCapturePage'
import InspectionOverview from '../features/inspection/overview/InspectionOverview'
import useAccessibleOrgUnits from '../shared/hooks/useAccessibleOrgUnits'
import classes from './AppShell.module.css'

type MeQueryResult = {
    me: {
        name: string
    }
}

const query = {
    me: {
        resource: 'me',
    },
}
import InspectionHomePage from '../features/inspection/InspectionHomePage'

/**
 * Main application shell - renders the inspection home page
 * Designed for tablet-optimized offline-first school inspection workflow
 */
const AppShell: React.FC = () => {
    return <InspectionHomePage />
}

export default AppShell
