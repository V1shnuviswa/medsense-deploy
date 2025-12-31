// AI Model Registry Configuration
// This configuration defines available AI models for medical image analysis

export const MODEL_REGISTRY = {
    "MRI": {
        "description": "Magnetic Resonance Imaging models",
        "models": {
            "brain_tumor_unet": {
                "name": "Brain Tumor U-Net",
                "type": "segmentation",
                "applications": ["Brain tumor segmentation", "BRATS challenge"],
                "input_size": [224, 224],
                "output_classes": ["background", "tumor_core", "edema", "enhancing_tumor"],
                "confidence_threshold": 0.7
            },
            "cardiac_segmentation": {
                "name": "Cardiac MRI Segmentation",
                "type": "segmentation",
                "applications": ["Left ventricle segmentation", "Myocardium analysis"],
                "input_size": [224, 224],
                "output_classes": ["background", "lv_cavity", "myocardium", "rv_cavity"],
                "confidence_threshold": 0.6
            }
        }
    },
    "CT": {
        "description": "Computed Tomography models",
        "models": {
            "lung_nodule_detector": {
                "name": "Lung Nodule Detector",
                "type": "detection",
                "applications": ["Lung cancer screening", "Nodule detection"],
                "input_size": [512, 512],
                "confidence_threshold": 0.7
            },
            "covid_classifier": {
                "name": "COVID-19 CT Classifier",
                "type": "classification",
                "applications": ["COVID-19 detection", "Pneumonia classification"],
                "input_size": [224, 224],
                "output_classes": ["normal", "covid", "pneumonia"],
                "confidence_threshold": 0.8
            }
        }
    },
    "X-ray": {
        "description": "X-ray imaging models",
        "models": {
            "chest_pathology": {
                "name": "Chest Pathology Detector",
                "type": "classification",
                "applications": ["14 chest pathologies", "CheXpert dataset"],
                "input_size": [224, 224],
                "output_classes": [
                    "Atelectasis", "Cardiomegaly", "Consolidation", "Edema",
                    "Effusion", "Emphysema", "Fibrosis", "Hernia",
                    "Infiltration", "Mass", "Nodule", "Pleural_Thickening",
                    "Pneumonia", "Pneumothorax"
                ],
                "confidence_threshold": 0.6
            },
            "pneumonia_detector": {
                "name": "Pneumonia Detector",
                "type": "classification",
                "applications": ["Pneumonia vs Normal classification"],
                "input_size": [224, 224],
                "confidence_threshold": 0.8
            }
        }
    }
} as const;

export type ModelRegistry = typeof MODEL_REGISTRY;
export type Modality = keyof ModelRegistry;
export type ModelId<M extends Modality> = keyof ModelRegistry[M]['models'];
