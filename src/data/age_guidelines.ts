export interface AgeGuideline {
    id: string;
    ageRange: string;
    focus: string;
    description: string;
    keyTests: string[];
    frequency: string;
}

export const AGE_GUIDELINES: AgeGuideline[] = [
    {
        id: '20s_30s',
        ageRange: '20s & 30s',
        focus: 'Foundation & Baseline',
        description: 'Establish your biological baseline and optimize metabolic health. This is the best time to detect genetic risks early.',
        keyTests: [
            'ApoB & Lipid Panel (Annual)',
            'HbA1c & Fasting Insulin (Annual)',
            'Vitamin D & Nutrient Panel (Annual)',
            'Lp(a) (Once - Genetic Screen)',
            'Reproductive Hormones (Baseline)'
        ],
        frequency: 'Annual Check-up'
    },
    {
        id: '40s',
        ageRange: '40s',
        focus: 'Early Detection & Prevention',
        description: 'Cardiovascular risk assessment becomes critical. Begin screening for early signs of chronic disease and structural changes.',
        keyTests: [
            'CAC Score (Baseline Scan)',
            'Advanced Inflammation (hs-CRP, Homocysteine)',
            'Cancer Screening (Mammogram/PSA based on risk)',
            'Full Thyroid Panel',
            'Liver & Kidney Function (eGFR, ALT/AST)'
        ],
        frequency: 'Annual + Targeted Screening'
    },
    {
        id: '50s',
        ageRange: '50s',
        focus: 'Intensive Screening',
        description: 'The "Red Zone" for disease onset. Shift to aggressive screening for cancer, heart disease, and hormonal changes.',
        keyTests: [
            'Colonoscopy (Every 10 years or sooner)',
            'DEXA Scan (Bone Density Baseline)',
            'Hormone Replacement Monitoring',
            'GRAIL Galleri (Multi-Cancer Early Detection)',
            'Carotid Ultrasound (CIMT)'
        ],
        frequency: 'Bi-Annual Monitoring'
    },
    {
        id: '60s_plus',
        ageRange: '60s+',
        focus: 'Longevity & Preservation',
        description: 'Focus on preserving cognitive function, muscle mass (sarcopenia prevention), and organ reserve.',
        keyTests: [
            'Cognitive Assessments & Brain MRI',
            'Cystatin C (Advanced Kidney Health)',
            'Echocardiogram (Heart Function)',
            'Nutrient Absorption Markers (B12, Iron)',
            'Sarcopenia Risk Assessment'
        ],
        frequency: 'Bi-Annual + Specialist Reviews'
    }
];
