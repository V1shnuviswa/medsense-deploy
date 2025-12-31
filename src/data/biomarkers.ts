export interface Biomarker {
    id: string;
    name: string;
    category: 'Cardiovascular' | 'Metabolic' | 'Hormonal' | 'Nutrient' | 'Inflammation' | 'Liver' | 'Kidney' | 'Blood' | 'Genetics' | 'Other';
    summary: string;
    description: string;
    clinicalSignificance: string;
    referenceRange: string;
    unit: string;
}

export const BIOMARKER_DATABASE: Biomarker[] = [
    // Cardiovascular
    {
        id: 'apob',
        name: 'ApoB',
        category: 'Cardiovascular',
        summary: 'The primary protein on LDL particles; a direct measure of particle number.',
        description: 'Apolipoprotein B (ApoB) is the primary protein found on low-density lipoprotein (LDL) and very-low-density lipoprotein (VLDL) particles. Unlike LDL-C, which measures the cholesterol mass, ApoB measures the number of atherogenic particles.',
        clinicalSignificance: 'Elevated ApoB is a stronger predictor of cardiovascular disease risk than LDL-C, especially in individuals with metabolic syndrome or diabetes.',
        referenceRange: '< 90',
        unit: 'mg/dL'
    },
    {
        id: 'lpa',
        name: 'Lipoprotein(a)',
        category: 'Cardiovascular',
        summary: 'A genetic risk factor for heart disease and stroke.',
        description: 'Lipoprotein(a) or Lp(a) is an LDL-like particle with an added protein called apolipoprotein(a). Levels are largely determined by genetics and remain stable throughout life.',
        clinicalSignificance: 'High levels are an independent risk factor for atherosclerosis, heart attack, and stroke. It promotes clotting and inflammation in artery walls.',
        referenceRange: '< 30',
        unit: 'mg/dL'
    },
    {
        id: 'hscrp',
        name: 'hs-CRP',
        category: 'Inflammation',
        summary: 'A marker of systemic inflammation in the body.',
        description: 'High-sensitivity C-reactive protein (hs-CRP) is a protein produced by the liver in response to inflammation. It detects lower levels of CRP than standard tests.',
        clinicalSignificance: 'Elevated levels indicate chronic low-grade inflammation, which is associated with an increased risk of cardiovascular disease, diabetes, and other chronic conditions.',
        referenceRange: '< 1.0',
        unit: 'mg/L'
    },
    // Metabolic
    {
        id: 'hba1c',
        name: 'HbA1c',
        category: 'Metabolic',
        summary: 'Average blood sugar levels over the past 2-3 months.',
        description: 'Hemoglobin A1c measures the percentage of hemoglobin proteins in your blood that are coated with sugar (glycated). It provides a long-term view of glucose control.',
        clinicalSignificance: 'Used to diagnose prediabetes and diabetes. Higher levels indicate poor blood sugar control and increased risk of complications.',
        referenceRange: '< 5.7',
        unit: '%'
    },
    {
        id: 'insulin_fasting',
        name: 'Fasting Insulin',
        category: 'Metabolic',
        summary: 'Insulin levels after an overnight fast.',
        description: 'Insulin is a hormone produced by the pancreas to help regulate blood sugar. Fasting levels show how much insulin is needed to maintain baseline glucose.',
        clinicalSignificance: 'Elevated fasting insulin is an early sign of insulin resistance, often appearing years before blood sugar rises (prediabetes).',
        referenceRange: '2.6 - 24.9',
        unit: 'uIU/mL'
    },
    // Hormonal
    {
        id: 'testosterone_total',
        name: 'Total Testosterone',
        category: 'Hormonal',
        summary: 'The total amount of testosterone in the blood.',
        description: 'Testosterone is a key hormone for muscle mass, bone density, libido, and mood in both men and women (though levels differ significantly).',
        clinicalSignificance: 'Low levels can lead to fatigue, depression, muscle loss, and sexual dysfunction. High levels can indicate other hormonal imbalances.',
        referenceRange: '264 - 916',
        unit: 'ng/dL'
    },
    {
        id: 'tsh',
        name: 'TSH',
        category: 'Hormonal',
        summary: 'Stimulates the thyroid gland to produce hormones.',
        description: 'Thyroid Stimulating Hormone (TSH) is produced by the pituitary gland. It signals the thyroid to release T3 and T4.',
        clinicalSignificance: 'High TSH usually indicates hypothyroidism (underactive thyroid), while low TSH suggests hyperthyroidism (overactive thyroid).',
        referenceRange: '0.4 - 4.0',
        unit: 'mIU/L'
    },
    // Nutrient
    {
        id: 'vit_d',
        name: 'Vitamin D (25-OH)',
        category: 'Nutrient',
        summary: 'Crucial for bone health, immune function, and mood.',
        description: '25-Hydroxy Vitamin D is the major circulating form of Vitamin D. It is synthesized in the skin upon sun exposure and obtained from diet.',
        clinicalSignificance: 'Deficiency is common and linked to bone weakness, increased infection risk, and potential mood disorders.',
        referenceRange: '30 - 100',
        unit: 'ng/mL'
    },
    {
        id: 'ferritin',
        name: 'Ferritin',
        category: 'Nutrient',
        summary: 'The body\'s iron storage protein.',
        description: 'Ferritin is a blood protein that contains iron. The test measures how much iron your body has stored.',
        clinicalSignificance: 'Low ferritin indicates iron deficiency anemia. High ferritin can indicate iron overload (hemochromatosis) or inflammation.',
        referenceRange: '30 - 400',
        unit: 'ng/mL'
    },
    // Liver
    {
        id: 'alt',
        name: 'ALT (Alanine Aminotransferase)',
        category: 'Liver',
        summary: 'An enzyme found primarily in the liver.',
        description: 'ALT is an enzyme that helps convert proteins into energy for liver cells. When the liver is damaged, ALT is released into the bloodstream.',
        clinicalSignificance: 'Elevated ALT is a specific indicator of liver injury, often caused by fatty liver disease, alcohol, or hepatitis.',
        referenceRange: '7 - 55',
        unit: 'U/L'
    },
    // Kidney
    {
        id: 'egfr',
        name: 'eGFR',
        category: 'Kidney',
        summary: 'Estimated Glomerular Filtration Rate.',
        description: 'eGFR is a calculation based on serum creatinine levels, age, and sex to estimate how well the kidneys are filtering waste.',
        clinicalSignificance: 'The best test to measure your level of kidney function and determine your stage of kidney disease.',
        referenceRange: '> 90',
        unit: 'mL/min/1.73m²'
    },
    // Genetics
    {
        id: 'apoe',
        name: 'ApoE Genotype',
        category: 'Genetics',
        summary: 'Genetic risk factor for Alzheimer\'s and cardiovascular disease.',
        description: 'The ApoE gene provides instructions for making a protein that transports cholesterol. There are three alleles: e2, e3, and e4.',
        clinicalSignificance: 'The e4 allele is associated with an increased risk of late-onset Alzheimer\'s disease and higher cholesterol levels.',
        referenceRange: 'N/A',
        unit: 'Genotype'
    },
    // Thyroid
    {
        id: 'free_t3',
        name: 'Free T3',
        category: 'Hormonal',
        summary: 'The active form of thyroid hormone.',
        description: 'Triiodothyronine (T3) is the active thyroid hormone that regulates metabolism. "Free" refers to the amount not bound to proteins.',
        clinicalSignificance: 'Low levels can indicate hypothyroidism even if TSH is normal. High levels indicate hyperthyroidism.',
        referenceRange: '2.0 - 4.4',
        unit: 'pg/mL'
    },
    {
        id: 'free_t4',
        name: 'Free T4',
        category: 'Hormonal',
        summary: 'The storage form of thyroid hormone.',
        description: 'Thyroxine (T4) is the main hormone secreted by the thyroid. It is converted into T3 in the body.',
        clinicalSignificance: 'Used with TSH to diagnose thyroid disorders. Low Free T4 signals hypothyroidism.',
        referenceRange: '0.8 - 1.8',
        unit: 'ng/dL'
    },
    // Nutrients & Toxins
    {
        id: 'omega3',
        name: 'Omega-3 Index',
        category: 'Nutrient',
        summary: 'Measure of EPA and DHA in red blood cells.',
        description: 'The Omega-3 Index measures the amount of EPA and DHA in red blood cell membranes. It reflects long-term intake.',
        clinicalSignificance: 'A low index (< 4%) is associated with higher risk of sudden cardiac death and cardiovascular disease. Optimal is > 8%.',
        referenceRange: '> 8',
        unit: '%'
    },
    {
        id: 'magnesium',
        name: 'Magnesium',
        category: 'Nutrient',
        summary: 'Essential mineral for over 300 enzyme reactions.',
        description: 'Magnesium is vital for nerve function, muscle contraction, and energy production. RBC Magnesium is a more accurate test than serum magnesium.',
        clinicalSignificance: 'Deficiency is linked to muscle cramps, fatigue, anxiety, and heart arrhythmias.',
        referenceRange: '1.7 - 2.2',
        unit: 'mg/dL'
    },
    {
        id: 'mercury',
        name: 'Mercury',
        category: 'Other',
        summary: 'Heavy metal toxin exposure level.',
        description: 'Measures the level of mercury in the blood, often from seafood consumption or environmental exposure.',
        clinicalSignificance: 'High levels can cause neurological damage, cognitive decline, and fatigue.',
        referenceRange: 'Low',
        unit: 'ng/mL'
    },
    // Structural & Imaging
    {
        id: 'mri_body',
        name: 'Full-body MRI',
        category: 'Other',
        summary: 'Screening for tumors and structural abnormalities.',
        description: 'A non-invasive scan that images the entire body to detect early-stage cancer, aneurysms, and other structural issues.',
        clinicalSignificance: 'Early detection of asymptomatic tumors or vascular issues.',
        referenceRange: 'No abnormalities',
        unit: 'N/A'
    },
    {
        id: 'bone_density',
        name: 'Bone Density',
        category: 'Other',
        summary: 'Measure of bone mineral density (DEXA).',
        description: 'A DEXA scan measures bone density to assess risk for osteoporosis and fractures.',
        clinicalSignificance: 'Low scores (osteopenia/osteoporosis) indicate high fracture risk.',
        referenceRange: '> -1.0',
        unit: 'T-score'
    },
    {
        id: 'mri_brain',
        name: 'Brain Volume MRI',
        category: 'Other',
        summary: 'Assessment of brain structure and atrophy.',
        description: 'Advanced MRI analysis to measure the volume of specific brain regions (hippocampus, etc.) compared to age-matched controls.',
        clinicalSignificance: 'Accelerated atrophy can be an early sign of neurodegenerative diseases like Alzheimer\'s.',
        referenceRange: 'Age adjusted',
        unit: 'percentile'
    },
    // Advanced Aging
    {
        id: 'homocysteine',
        name: 'Homocysteine',
        category: 'Inflammation',
        summary: 'Amino acid linked to heart and brain health.',
        description: 'Homocysteine is an amino acid broken down by B vitamins. High levels indicate poor methylation.',
        clinicalSignificance: 'Elevated levels damage arterial linings and are a risk factor for stroke, dementia, and heart disease.',
        referenceRange: '5 - 15',
        unit: 'umol/L'
    },
    {
        id: 'dunedin',
        name: 'DunedinPACE',
        category: 'Genetics',
        summary: 'Pace of Aging DNA methylation clock.',
        description: 'Measures how fast you are aging biologically compared to chronological time. A value < 1.0 means you are aging slower.',
        clinicalSignificance: 'A faster pace of aging predicts higher risk of chronic disease and mortality.',
        referenceRange: '< 1.0',
        unit: 'ratio'
    },
    {
        id: 'phenoage',
        name: 'PhenoAge',
        category: 'Genetics',
        summary: 'Biological age based on blood markers.',
        description: 'An algorithm that uses standard blood markers (albumin, creatinine, glucose, etc.) to calculate biological age.',
        clinicalSignificance: 'If PhenoAge is lower than chronological age, it indicates good health and lower mortality risk.',
        referenceRange: '< Chronological',
        unit: 'years'
    },
    // Cancer
    {
        id: 'galleri',
        name: 'GRAIL Galleri',
        category: 'Other',
        summary: 'Multi-cancer early detection test.',
        description: 'A liquid biopsy that looks for DNA methylation patterns associated with over 50 types of cancer.',
        clinicalSignificance: 'Can detect cancers early, often before symptoms appear.',
        referenceRange: 'Negative',
        unit: 'Result'
    },
    {
        id: 'liquid_biopsy',
        name: 'Liquid Biopsy',
        category: 'Other',
        summary: 'Screening for circulating tumor DNA (ctDNA).',
        description: 'Analyzes blood for fragments of DNA shed by tumor cells.',
        clinicalSignificance: 'Used for early detection or monitoring of cancer recurrence.',
        referenceRange: 'None',
        unit: 'ctDNA'
    },
    // Organ Function
    {
        id: 'liver_panel',
        name: 'ALT/AST (Liver)',
        category: 'Liver',
        summary: 'Key enzymes indicating liver health.',
        description: 'Alanine transaminase (ALT) and Aspartate transaminase (AST) are enzymes released when liver cells are damaged.',
        clinicalSignificance: 'Elevated levels suggest liver stress, fatty liver, or inflammation.',
        referenceRange: '< 40',
        unit: 'U/L'
    },
    // New Advanced Screening Biomarkers
    {
        id: 'lppla2',
        name: 'Lp-PLA2 (PLAC Test)',
        category: 'Cardiovascular',
        summary: 'Vascular inflammation marker.',
        description: 'Measures an enzyme associated with vascular inflammation and the risk of plaque rupture.',
        clinicalSignificance: 'High levels indicate active inflammation in the arteries and increased risk of heart attack or stroke.',
        referenceRange: '< 200',
        unit: 'ng/mL'
    },
    {
        id: 'igf1',
        name: 'IGF-1',
        category: 'Hormonal',
        summary: 'Growth hormone marker.',
        description: 'Insulin-like Growth Factor 1 (IGF-1) mediates the effects of growth hormone. It is crucial for growth and metabolism.',
        clinicalSignificance: 'High levels support muscle maintenance but may activate aging pathways. Low levels may slow aging but risk frailty.',
        referenceRange: 'Age dependent',
        unit: 'ng/mL'
    },
    {
        id: 'cac_score',
        name: 'CAC Score',
        category: 'Cardiovascular',
        summary: 'CT scan for coronary artery calcium.',
        description: 'A low-dose CT scan that quantifies the amount of calcified plaque in the coronary arteries.',
        clinicalSignificance: 'A score of zero is a powerful predictor of very low heart attack risk. Higher scores indicate atherosclerosis.',
        referenceRange: '0',
        unit: 'Agatston'
    },
    {
        id: 'cimt',
        name: 'CIMT',
        category: 'Cardiovascular',
        summary: 'Ultrasound of carotid artery wall thickness.',
        description: 'Carotid Intima-Media Thickness (CIMT) measures the thickness of the inner layers of the carotid artery.',
        clinicalSignificance: 'Increased thickness is a sign of subclinical atherosclerosis and increased cardiovascular risk.',
        referenceRange: '< 0.9',
        unit: 'mm'
    },
    {
        id: 'multigene_panel',
        name: 'Multi-Gene Panel',
        category: 'Genetics',
        summary: 'Screening for hereditary cancer risks.',
        description: 'Identifies inherited mutations (e.g., BRCA1/2, Lynch Syndrome) that significantly increase lifetime cancer risk.',
        clinicalSignificance: 'Positive results inform personalized screening protocols (e.g., earlier mammograms).',
        referenceRange: 'Negative',
        unit: 'Result'
    },
    {
        id: 'prs',
        name: 'Polygenic Risk Scores',
        category: 'Genetics',
        summary: 'Genetic risk calculation for complex diseases.',
        description: 'Calculates an individual\'s genetic risk for common diseases (e.g., Diabetes, CAD) by analyzing thousands of variants.',
        clinicalSignificance: 'Helps stratify risk and guide lifestyle interventions for those with high genetic susceptibility.',
        referenceRange: 'Average',
        unit: 'Percentile'
    },
    {
        id: 'pgx',
        name: 'Pharmacogenomics',
        category: 'Genetics',
        summary: 'Genetic testing for medication response.',
        description: 'Determines how an individual\'s genes affect their metabolism and response to medications.',
        clinicalSignificance: 'Optimizes drug choice and dosage, reducing adverse effects and improving efficacy.',
        referenceRange: 'N/A',
        unit: 'Report'
    },
    {
        id: 'stool_analysis',
        name: 'Comprehensive Stool Analysis',
        category: 'Other',
        summary: 'Assessment of gut microbiome and function.',
        description: 'Analyzes gut microbiome composition, digestive function, and inflammation markers (e.g., Calprotectin).',
        clinicalSignificance: 'Imbalances (dysbiosis) are linked to autoimmune disease, mood disorders, and chronic inflammation.',
        referenceRange: 'Balanced',
        unit: 'Report'
    },
    {
        id: 'oat',
        name: 'Organic Acids Test',
        category: 'Metabolic',
        summary: 'Urine test for metabolic byproducts.',
        description: 'Measures metabolic byproducts in urine to assess nutrient deficiencies, detoxification, and mitochondrial health.',
        clinicalSignificance: 'Identifies blocks in metabolic pathways and mitochondrial dysfunction.',
        referenceRange: 'Normal',
        unit: 'Report'
    },
    {
        id: 'toxin_panel',
        name: 'Toxin Panel',
        category: 'Other',
        summary: 'Heavy metal and environmental toxin screen.',
        description: 'Measures exposure to heavy metals (Lead, Mercury) and environmental toxins (pesticides, mold) that contribute to disease.',
        clinicalSignificance: 'Chronic exposure can lead to neurological issues, fatigue, and immune dysfunction.',
        referenceRange: 'Negative',
        unit: 'Report'
    },
    {
        id: 'cpm',
        name: 'Continuous Physiological Monitoring',
        category: 'Other',
        summary: 'Wearable data tracking (HRV, Sleep).',
        description: 'Longitudinal tracking of Heart Rate Variability (HRV), resting heart rate, and sleep stages using advanced wearables.',
        clinicalSignificance: 'Assesses the balance of the Autonomic Nervous System (stress/recovery) and sleep quality.',
        referenceRange: 'Optimal',
        unit: 'Score'
    }
];
