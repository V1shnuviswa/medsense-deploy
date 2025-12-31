export interface WomensHealthModule {
    id: string;
    title: string;
    description: string;
    focus: string;
    tests: string[];
    frequency: string;
}

export const WOMENS_HEALTH_MODULES: WomensHealthModule[] = [
    {
        id: 'hormonal',
        title: 'Hormonal Balance & Fertility',
        description: 'Tracking key hormones for cycle health, fertility, and menopause transition.',
        focus: 'Cycle Optimization',
        tests: [
            'FSH & LH',
            'Estradiol (E2)',
            'Progesterone (Day 21)',
            'AMH (Ovarian Reserve)',
            'Prolactin',
            'Free & Total Testosterone',
            'DHEA-S'
        ],
        frequency: 'Annual or Cycle-Dependent'
    },
    {
        id: 'cancer_screening',
        title: 'Cancer Screening & Prevention',
        description: 'Early detection of female-specific cancers is critical for long-term survival.',
        focus: 'Risk Reduction',
        tests: [
            'Mammogram / Thermography',
            'Pap Smear / HPV Test',
            'Breast Ultrasound',
            'CA-125 (Ovarian Marker)',
            'BRCA1/BRCA2 (Genetic)'
        ],
        frequency: 'Age & Risk Dependent'
    },
    {
        id: 'bone_thyroid',
        title: 'Bone & Thyroid Health',
        description: 'Women are at significantly higher risk for thyroid dysfunction and osteoporosis.',
        focus: 'Structural & Metabolic',
        tests: [
            'Full Thyroid Panel (TSH, T3, T4, Antibodies)',
            'DEXA Scan (Bone Density)',
            'Vitamin D & Calcium',
            'Parathyroid Hormone (PTH)'
        ],
        frequency: 'Annual'
    },
    {
        id: 'pregnancy',
        title: 'Pre-Conception & Pregnancy',
        description: 'Optimizing nutrient stores and hormonal health before and during pregnancy.',
        focus: 'Maternal Health',
        tests: [
            'Ferritin & Iron Panel',
            'Folate & B12',
            'Thyroid Function',
            'Rubella Immunity',
            'Varicella Immunity'
        ],
        frequency: 'Pre-Conception / Trimester'
    }
];
