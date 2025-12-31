export interface TestPanel {
    id: string;
    name: string;
    description: string;
    frequency: string;
    tests: string[];
}

export const REQUIRED_TESTS: TestPanel[] = [
    {
        id: 'metabolic',
        name: 'Metabolic Health Panel',
        description: 'Evaluates your body\'s ability to process sugar and energy. Crucial for detecting insulin resistance and diabetes risk.',
        frequency: 'Every 3-6 months',
        tests: [
            'Hemoglobin A1c (HbA1c)',
            'Fasting Insulin',
            'Fasting Glucose',
            'Uric Acid'
        ]
    },
    {
        id: 'lipid',
        name: 'Advanced Lipid Panel',
        description: 'Goes beyond standard cholesterol to measure particle number and genetic risk factors for cardiovascular disease.',
        frequency: 'Every 6-12 months',
        tests: [
            'ApoB',
            'Lipoprotein(a) [Once in lifetime]',
            'LDL-C',
            'HDL-C',
            'Triglycerides',
            'Total Cholesterol'
        ]
    },
    {
        id: 'hormone_male',
        name: 'Hormone Panel (Male)',
        description: 'Assesses testosterone levels and thyroid function, key drivers of energy, muscle mass, and mood.',
        frequency: 'Every 6-12 months',
        tests: [
            'Total Testosterone',
            'Free Testosterone',
            'SHBG',
            'Estradiol (E2)',
            'TSH',
            'Free T3',
            'Free T4'
        ]
    },
    {
        id: 'hormone_female',
        name: 'Hormone Panel (Female)',
        description: 'Evaluates reproductive hormones and thyroid function. Timing may depend on menstrual cycle.',
        frequency: 'Every 6-12 months',
        tests: [
            'FSH & LH',
            'Estradiol',
            'Progesterone',
            'Total Testosterone',
            'DHEA-S',
            'TSH',
            'Free T3',
            'Free T4'
        ]
    },
    {
        id: 'inflammation',
        name: 'Inflammation & Cardiac Risk',
        description: 'Detects systemic inflammation and vascular health markers.',
        frequency: 'Every 6-12 months',
        tests: [
            'hs-CRP (High-Sensitivity C-Reactive Protein)',
            'Homocysteine',
            'Fibrinogen'
        ]
    },
    {
        id: 'nutrient',
        name: 'Nutrient & Mineral Panel',
        description: 'Checks for common deficiencies that affect energy, immunity, and long-term health.',
        frequency: 'Every 6-12 months',
        tests: [
            'Vitamin D (25-OH)',
            'Vitamin B12',
            'Folate',
            'Magnesium (RBC)',
            'Ferritin',
            'Iron Panel'
        ]
    },
    {
        id: 'organ',
        name: 'Organ Function (CMP & CBC)',
        description: 'Standard overview of liver and kidney function, electrolytes, and blood cell counts.',
        frequency: 'Every 12 months',
        tests: [
            'Comprehensive Metabolic Panel (CMP)',
            'Complete Blood Count (CBC) with Differential',
            'GGT (Liver Enzyme)',
            'Cystatin C (Kidney Function)'
        ]
    }
];
