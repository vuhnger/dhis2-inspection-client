import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'

import InspectionHomePage from '../features/inspection/InspectionHomePage'
import classes from './AppShell.module.css'
import { routes } from './routes'

/**
 * Main application shell - wires up all feature routes
 * Designed for tablet-optimized offline-first school inspection workflow
 */
const AppShell: React.FC = () => {
    const DefaultRouteComponent = routes[0]?.component ?? InspectionHomePage

    return (
        <Router>
            <React.Suspense fallback={<div className={classes.loadingState}>Loading inspection workspace…</div>}>
                <Routes>
                    {routes.map(({ path, component: Component }) => (
                        <Route key={path} path={path} element={<Component />} />
                    ))}
                    <Route path="*" element={<DefaultRouteComponent />} />
                </Routes>
            </React.Suspense>
        </Router>
    )
}

export default AppShell
