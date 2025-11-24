import React from 'react'

// Feature components - using lazy loading for code splitting
const InspectionHome = React.lazy(() => import('../features/inspection/InspectionHomePage'))
const InspectionOverviewPage = React.lazy(() => import('../features/inspection/overview/InspectionOverview'))
const SummaryPage = React.lazy(() => import('../features/summary/pages/Dashboard'))
const RecountPage = React.lazy(() => import('../features/summary/pages/RecountData'))
const RecountPageSubmitted = React.lazy(() => import('../features/summary/pages/RecountDataSubmitted'))

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
    {
        path: '/inspection/:id',
        name: 'Inspection Detail',
        component: InspectionOverviewPage,
    },
    {
        path: '/summary/:id',
        name: 'Summary Page',
        component: SummaryPage,
    },
    {
        path: '/summary/:id/RecountData',
        name: 'Recount data Page',
        component: RecountPage,
    },
        {
        path: '/summary/:id/RecountDataSubmitted',
        name: 'Recount data Page Submitted',
        component: RecountPageSubmitted,
    },

    
]
