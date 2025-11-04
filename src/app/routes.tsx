import React from 'react'

// Feature components - using lazy loading for code splitting
const InspectionHome = React.lazy(() => import('../features/inspection/InspectionHomePage'))

export type AppRoute = {
    path: string
    name: string
    component: React.ComponentType<any>
}

export const routes: AppRoute[] = [
    {
        path: '/',
        name: 'Home',
        component: InspectionHome,
    },
]
