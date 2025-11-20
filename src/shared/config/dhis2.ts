/**
 * DHIS2 configuration constants.
 *
 * Defaults match the current IN5320 Gambia backend. Override via Vite env vars
 * if the backend uses different IDs.
 */
export const DHIS2_PROGRAM_UID = import.meta.env.VITE_DHIS2_PROGRAM_UID || 'UxK2o06ScIe'
export const DHIS2_PROGRAM_STAGE_UID =
    import.meta.env.VITE_DHIS2_PROGRAM_STAGE_UID || 'eJiBjm9Rl7E'
// Default to the Gambia root, now assigned to the program for browsing full tree
export const DHIS2_ROOT_OU_UID = import.meta.env.VITE_DHIS2_ROOT_OU_UID || 'QGMu6bmPtkD'
