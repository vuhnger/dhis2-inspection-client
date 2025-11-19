import React from 'react'

// Feature components - using lazy loading for code splitting
const InspectionHome = React.lazy(() => import('../features/inspection/InspectionHomePage'))
const InspectionOverviewPage = React.lazy(() => import('../features/inspection/overview/InspectionOverview'))
const SummaryPage = React.lazy(() => import('../features/summary/Dashboard'))
const RecountPage = React.lazy(() => import('../features/summary/RecountData'))
const RecountPageSubmitted = React.lazy(() => import('../features/summary/RecountDataSubmitted'))


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
        path: '/inspection/overview',
        name: 'Inspection Overview',
        component: InspectionOverviewPage,
    },
    {
        path: '/summary',
        name: 'Summary Page',
        component: SummaryPage,
    },
    {
        path: '/summary/RecountData',
        name: 'Recount data Page',
        component: RecountPage,
    },
        {
        path: '/summary/RecountDataSubmitted',
        name: 'Recount data Page Submitted',
        component: RecountPageSubmitted,
    },
    
    
]
