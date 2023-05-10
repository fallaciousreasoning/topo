const gradeTypes = [
    'ewbank',
    'alpine',
    'commitment',
    'mtcook',
    'aid',
    'ice',
    'mixed',
    'boulder'
] as const

type GradeType = (typeof gradeTypes)[number]

const levels = [
    'beginner',
    'intermediate',
    'experienced',
    'expert',
    'elite'
] as const

export type Level = (typeof levels)[number]

export const levelCalculator: { [P in GradeType]: (grade: string) => Level } = {
    ewbank: grade => {
        const numericalGrade = parseInt(grade)
        if (numericalGrade < 13) return 'beginner'
        if (numericalGrade < 18) return 'intermediate'
        if (numericalGrade < 25) return 'experienced'
        if (numericalGrade < 30) return 'expert'
        return 'elite'
    },
    alpine: grade => {
        const numericalGrade = parseInt(grade)
        if (isNaN(numericalGrade) || numericalGrade <= 1) return 'beginner'
        if (numericalGrade <= 2) return 'intermediate'
        if (numericalGrade <= 3) return 'experienced'
        if (numericalGrade <= 7) return 'expert'
        return 'elite'
    },
    commitment: grade => {
        if (grade === 'I') return 'beginner'
        if (grade === 'II') return 'intermediate'
        if (grade == 'III') return 'experienced'
        if (grade === 'IV') return 'expert'
        return 'elite'
    },
    ice: grade => {
        // Chop off the "WI" prefix
        const numericalGrade = parseInt(grade.substring(2));
        if (numericalGrade <= 2) return 'beginner'
        if (numericalGrade <= 4) return 'intermediate'
        if (numericalGrade <= 5) return 'experienced'
        if (numericalGrade <= 7) return 'expert'

        return 'elite'
    },
    aid: grade => {
        const numericalGrade = parseInt(grade.substring(1));
        if (numericalGrade <= 2) return 'beginner'
        if (numericalGrade <= 4) return 'intermediate'
        if (numericalGrade <= 7) return 'experienced'
        if (numericalGrade <= 9) return 'expert'
        return 'elite'
    },
    boulder: grade => {
        const numericalGrade = parseInt(grade.substring(1));
        if (['VE', 'VM', 'VB', '0'].some(g => grade.includes(g))) return 'beginner'
        if (numericalGrade <= 1) return 'intermediate'
        if (numericalGrade <= 4) return 'experienced'
        if (numericalGrade <= 10) return 'expert'
        return 'elite'
    },
    mixed: grade => {
        const numericalGrade = parseInt(grade.substring(1));
        if (numericalGrade <= 2) return 'beginner'
        if (numericalGrade <= 4) return 'intermediate'
        if (numericalGrade <= 7) return 'experienced'
        if (numericalGrade <= 9) return 'expert'
        return 'elite'
    },
    mtcook: grade => {
        const numericalGrade = parseInt(grade)
        if (isNaN(numericalGrade) || numericalGrade <= 1) return 'beginner'
        if (numericalGrade <= 2) return 'intermediate'
        if (numericalGrade <= 3) return 'experienced'
        if (numericalGrade <= 7) return 'expert'
        return 'elite'
    }
}

export const parseGrade = (grade: string) => {
    const result: { [P in GradeType]?: string } = {}
    const parts = grade.split(/\s|,/).filter(p => p)

    for (const part of parts) {
        const type = guessContext(part)
        const existing = result[type]
        if (!existing || existing < part) {
            result[type] = part
        }
    }

    return result
}

export const guessContext = (grade: string): GradeType => {
    if (grade.startsWith('M')) return 'mixed'
    if (grade.startsWith('W')) return 'ice'
    if (grade.startsWith('A')) return 'aid'
    if (/V([0-9]|B)+/i.test(grade)) return 'boulder'

    const asNumber = parseInt(grade);
    if (!isNaN(asNumber)) {
        return asNumber < 7 ? 'alpine' : 'ewbank'
    }

    if (['I', 'V', 'X'].some(s => grade.startsWith(s))) {
        return 'commitment'
    }

    return 'alpine'
}
