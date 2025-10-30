export type RatioComparison = 'lt' | 'lte' | 'gt' | 'gte' | 'eq'

export type RatioStandard = {
    /** Human-readable identifier used in copy and logging. */
    id: 'seat-to-learner' | 'textbook-to-learner' | 'learner-to-classroom' | 'learner-to-teacher' | 'learner-to-toilet'
    /** Friendly label to show in UIs. */
    label: string
    /** Numerator entity in the ratio, e.g. learners. */
    numerator: string
    /** Denominator entity in the ratio, e.g. toilets. */
    denominator: string
    /** Comparison operator describing how to interpret the target. */
    comparison: RatioComparison
    /** Target value that must satisfy the comparison. */
    target: number
    /** Short description summarising the policy intent. */
    description: string
}

export const RATIO_STANDARDS: Record<RatioStandard['id'], RatioStandard> = {
    'seat-to-learner': {
        id: 'seat-to-learner',
        label: 'Seat to learner ratio',
        numerator: 'seats',
        denominator: 'learners',
        comparison: 'lte',
        target: 1,
        description: 'Every learner should have access to a seat (≤ 1 learner per seat).',
    },
    'textbook-to-learner': {
        id: 'textbook-to-learner',
        label: 'Textbook to learner ratio',
        numerator: 'textbooks',
        denominator: 'learners',
        comparison: 'lte',
        target: 1,
        description: 'Each learner should have direct access to a textbook (≤ 1 learner per textbook).',
    },
    'learner-to-classroom': {
        id: 'learner-to-classroom',
        label: 'Learner to classroom ratio',
        numerator: 'learners',
        denominator: 'classrooms',
        comparison: 'lt',
        target: 53,
        description: 'Class sizes should stay below 53 learners per classroom.',
    },
    'learner-to-teacher': {
        id: 'learner-to-teacher',
        label: 'Learner to teacher ratio',
        numerator: 'learners',
        denominator: 'teachers',
        comparison: 'lt',
        target: 45,
        description: 'The number of learners per teacher should remain under 45.',
    },
    'learner-to-toilet': {
        id: 'learner-to-toilet',
        label: 'Learner to toilet ratio',
        numerator: 'learners',
        denominator: 'working toilets',
        comparison: 'lt',
        target: 25,
        description: 'Maintain fewer than 25 learners per working toilet.',
    },
}

export const LEARNER_TO_TOILET_MAX_RATIO = RATIO_STANDARDS['learner-to-toilet'].target
