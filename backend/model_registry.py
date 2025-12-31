# Model Registry Configuration
MODEL_REGISTRY = {
    "MRI": {
        "description": "Magnetic Resonance Imaging models",
        "applications": [
            "Brain tumor detection and segmentation",
            "Multiple sclerosis lesion detection",
            "Cardiac function analysis",
            "Prostate cancer detection"
        ],
        "models": {
            "brain_tumor_unet": {
                "name": "Brain Tumor U-Net",
                "type": "segmentation",
                "huggingface_id": "nielsr/unet-segmentation",
                "applications": ["Brain tumor segmentation", "BRATS challenge"],
                "input_size": (224, 224),
                "output_classes": ["background", "tumor_core", "edema", "enhancing_tumor"],
                "confidence_threshold": 0.7
            },
            "cardiac_segmentation": {
                "name": "Cardiac MRI Segmentation",
                "type": "segmentation",
                "huggingface_id": "Project-MONAI/nnUNet",
                "applications": ["Left ventricle segmentation", "Myocardium analysis"],
                "input_size": (224, 224),
                "output_classes": ["background", "lv_cavity", "myocardium", "rv_cavity"],
                "confidence_threshold": 0.6
            }
        }
    },
    "CT": {
        "description": "Computed Tomography models",
        "applications": [
            "Lung nodule detection",
            "Liver segmentation",
            "COVID-19 detection",
            "Bone fracture detection"
        ],
        "models": {
            "lung_nodule_detector": {
                "name": "Lung Nodule Detector",
                "type": "detection",
                "huggingface_id": "microsoft/resnet-50",
                "applications": ["Lung cancer screening", "Nodule detection"],
                "input_size": (512, 512),
                "confidence_threshold": 0.7
            },
            "covid_classifier": {
                "name": "COVID-19 CT Classifier",
                "type": "classification",
                "huggingface_id": "microsoft/resnet-50",
                "applications": ["COVID-19 detection", "Pneumonia classification"],
                "input_size": (224, 224),
                "output_classes": ["normal", "covid", "pneumonia"],
                "confidence_threshold": 0.8
            }
        }
    },
    "X-ray": {
        "description": "X-ray imaging models",
        "applications": [
            "Chest X-ray pathology detection",
            "Pneumonia detection",
            "Bone fracture detection"
        ],
        "models": {
            "chest_pathology": {
                "name": "Chest Pathology Detector",
                "type": "classification",
                "huggingface_id": "google/vit-base-patch16-224",
                "applications": ["14 chest pathologies", "CheXpert dataset"],
                "input_size": (224, 224),
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
                "huggingface_id": "ryefoxlime/PneumoniaDetection",
                "applications": ["Pneumonia vs Normal classification"],
                "input_size": (224, 224),
                "confidence_threshold": 0.8
            }
        }
    }
}
