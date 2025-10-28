import { act } from 'react'
import { createRoot } from 'react-dom/client'
import React from 'react'

import ToiletCapturePage from './ToiletCapturePage'

const STORAGE_KEY = 'group16:toiletCapture:draft'

describe('ToiletCapturePage', () => {
    let container: HTMLDivElement
    let root: ReturnType<typeof createRoot>

    beforeAll(() => {
        ;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    })

    beforeEach(() => {
        window.localStorage.clear()
        container = document.createElement('div')
        document.body.appendChild(container)
        root = createRoot(container)
    })

    afterEach(() => {
        act(() => {
            root.unmount()
        })

        container.remove()
    })

    const renderComponent = async (props: React.ComponentProps<typeof ToiletCapturePage>) => {
        await act(async () => {
            root.render(<ToiletCapturePage {...props} />)
        })
    }

    const clickSubmit = async () => {
        const submitButton = container.querySelector<HTMLButtonElement>('button[type="submit"]')

        if (!submitButton) {
            throw new Error('Submit button not found')
        }

        await act(async () => {
            submitButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })
    }

    it('loads a previously stored draft from local storage', async () => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                schoolName: 'Campama LBS',
                inspectionDate: '2024-10-15',
                learnerCount: '420',
                totalToilets: '12',
                workingToilets: '10',
                femaleFriendlyToilets: '6',
                accessibleToilets: '2',
                notes: 'Existing draft',
                lastSavedAt: '2024-10-15T10:00:00.000Z',
            })
        )

        await renderComponent({ inspectorName: 'Test Inspector' })

        const schoolField = container.querySelector<HTMLInputElement>('input[name="schoolName"]')
        const dateField = container.querySelector<HTMLInputElement>('input[name="inspectionDate"]')
        const notesField = container.querySelector<HTMLTextAreaElement>('textarea[name="notes"]')

        expect(schoolField?.value).toBe('Campama LBS')
        expect(dateField?.value).toBe('2024-10-15')
        expect(notesField?.value).toBe('Existing draft')
    })

    it('clears a stored draft when requested', async () => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                schoolName: 'Seaview Primary',
                inspectionDate: '2024-10-21',
            })
        )

        await renderComponent({})

        const clearButton = container.querySelector<HTMLButtonElement>('button[type="button"]')

        if (!clearButton) {
            throw new Error('Clear draft button not found')
        }

        await act(async () => {
            clearButton.dispatchEvent(new MouseEvent('click', { bubbles: true }))
        })

        expect(window.localStorage.getItem(STORAGE_KEY)).toBeNull()
    })

    it('surfaces validation errors when submitting an empty form', async () => {
        await renderComponent({})

        await clickSubmit()

        expect(container.textContent).toContain('Please fix the highlighted fields before finishing the draft')
        expect(container.textContent).toContain('Add the school name')
        expect(container.textContent).toContain('Select the inspection date')
    })

    it('shows a success message when the form is complete', async () => {
        window.localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({
                schoolName: 'Riverbend School',
                inspectionDate: '2024-10-22',
                learnerCount: '280',
                totalToilets: '14',
                workingToilets: '12',
                femaleFriendlyToilets: '6',
                accessibleToilets: '2',
                notes: 'Ready to sync',
                lastSavedAt: '2024-10-22T08:00:00.000Z',
            })
        )

        await renderComponent({})

        await clickSubmit()

        expect(container.textContent).toContain('Draft saved locally')
    })
})
