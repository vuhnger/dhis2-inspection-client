/* Test helper: trigger sync, pull remote events, and compare local IndexedDB with DHIS2.
 *
 * Usage:
 * 1) Start the app in the browser (logged in/with auth headers working).
 * 2) In DevTools console: import('./scripts/sync-check.js')
 *    (or copy/paste this file’s contents into the console).
 * 3) Watch console output for mismatches or errors.
 */

(async () => {
    const PROGRAM = 'UxK2o06ScIe'
    const BASE = 'https://research.im.dhis2.org/in5320g16/api/38'
    const AUTH = 'Basic ' + btoa('in5320:P1@tform')

    const log = (...args) => console.log('[sync-check]', ...args)

    // Click the sync badge to push unsynced locals (if present)
    const syncBadge = document.querySelector('[aria-live="polite"]')
    if (syncBadge) {
        syncBadge.click()
        log('Triggered sync via badge, waiting 4s…')
        await new Promise((r) => setTimeout(r, 4000))
    } else {
        log('Sync badge not found; skipping UI trigger.')
    }

    // Pull remote events
    const params = new URLSearchParams({
        program: PROGRAM,
        fields: 'event,orgUnit,orgUnitName,occurredAt,status,dataValues[dataElement,value]',
        order: 'occurredAt:desc',
        pageSize: '200',
    })
    const remoteRes = await fetch(`${BASE}/tracker/events?${params.toString()}`, {
        headers: { Authorization: AUTH },
    })
    if (!remoteRes.ok) {
        throw new Error(`Remote fetch failed ${remoteRes.status} ${remoteRes.statusText}`)
    }
    const remoteData = await remoteRes.json()
    const remoteEvents = remoteData?.events?.instances || []
    const remoteIds = new Set(remoteEvents.map((e) => e.event))
    log(`Remote events: ${remoteEvents.length}`)

    // Read local IndexedDB (InspectionDB/inspections)
    const readLocal = () =>
        new Promise((resolve, reject) => {
            const req = indexedDB.open('InspectionDB')
            req.onerror = () => reject(req.error)
            req.onsuccess = () => {
                const db = req.result
                const tx = db.transaction(['inspections'], 'readonly')
                const store = tx.objectStore('inspections')
                const getAll = store.getAll()
                getAll.onerror = () => reject(getAll.error)
                getAll.onsuccess = () => resolve(getAll.result || [])
            }
        })

    const localInspections = await readLocal()
    const localIds = new Set(localInspections.map((i) => i.dhis2EventId || i.id))
    log(`Local inspections: ${localInspections.length}`)

    // Compare
    const missingLocally = [...remoteIds].filter((id) => !localIds.has(id))
    const extraLocally = [...localIds].filter((id) => !remoteIds.has(id))

    log('Missing locally (present on server):', missingLocally)
    log('Extra locally (not on server):', extraLocally)

    if (missingLocally.length === 0 && extraLocally.length === 0) {
        log('Local DB matches remote events ✅')
    } else {
        log('Local DB differs from remote ❌')
    }
})().catch((err) => {
    console.error('[sync-check] Failed:', err)
})
