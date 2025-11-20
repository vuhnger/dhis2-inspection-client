/**
 * Shared helpers for DHIS2 auth and API base construction.
 * Defaults are hardcoded for the IN5320 dev backend; override via env.
 */
export function getAuthHeader(): string {
    const username = process.env.REACT_APP_DHIS2_USERNAME || 'in5320'
    const password = process.env.REACT_APP_DHIS2_PASSWORD || 'P1@tform'
    if (typeof btoa === 'function') {
        return `Basic ${btoa(`${username}:${password}`)}`
    }
    return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`
}

export function getApiBase(): string {
    const version = process.env.REACT_APP_DHIS2_API_VERSION || '38'
    const baseUrl =
        process.env.REACT_APP_DHIS2_BASE_URL || 'https://research.im.dhis2.org/in5320g16'
    return `${baseUrl}/api/${version}`
}
