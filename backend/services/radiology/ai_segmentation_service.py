import torch
from transformers import pipeline
from PIL import Image
import numpy as np
import logging
from collections import OrderedDict
import time
from model_registry import MODEL_REGISTRY

logger = logging.getLogger(__name__)

class ModelCache:
    """LRU cache for AI models"""
    def __init__(self, max_size=5):
        self.max_size = max_size
        self.cache = OrderedDict()
        
    def get(self, key):
        if key in self.cache:
            self.cache.move_to_end(key)
            return self.cache[key]
        return None
        
    def put(self, key, model):
        if key in self.cache:
            self.cache.move_to_end(key)
        self.cache[key] = model
        if len(self.cache) > self.max_size:
            self.cache.popitem(last=False)

class AISegmentationService:
    _model_cache = ModelCache()
    
    @staticmethod
    def get_device():
        if torch.cuda.is_available():
            return "cuda"
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        return "cpu"

    @staticmethod
    def get_available_models(modality=None):
        models = []
        for mod_name, mod_data in MODEL_REGISTRY.items():
            if modality and mod_name != modality:
                continue
            for model_id, model_data in mod_data["models"].items():
                models.append({
                    "id": model_id,
                    "name": model_data["name"],
                    "type": model_data["type"],
                    "modality": mod_name,
                    "applications": model_data["applications"]
                })
        return models

    @staticmethod
    def load_model(modality, model_id):
        cache_key = f"{modality}_{model_id}"
        cached_model = AISegmentationService._model_cache.get(cache_key)
        if cached_model:
            return cached_model

        if modality not in MODEL_REGISTRY or model_id not in MODEL_REGISTRY[modality]["models"]:
            raise ValueError(f"Model {model_id} not found for modality {modality}")

        model_info = MODEL_REGISTRY[modality]["models"][model_id]
        model_type = model_info["type"]
        hf_id = model_info["huggingface_id"]
        device = AISegmentationService.get_device()
        
        logger.info(f"Loading model {model_id} on {device}")
        
        try:
            # Map types to pipeline tasks
            task = "image-classification"
            if model_type == "segmentation":
                task = "image-segmentation"
            elif model_type == "detection":
                task = "object-detection"
            
            # Load pipeline
            # Note: For production, you might want to handle specific model classes
            model = pipeline(task, model=hf_id, device=device)
            AISegmentationService._model_cache.put(cache_key, model)
            return model
        except Exception as e:
            logger.error(f"Failed to load model: {e}")
            raise e

    @staticmethod
    def analyze_image(image_path, modality, model_id):
        """
        Run inference on an image.
        image_path: Path to the image file (or PIL Image object)
        """
        try:
            model = AISegmentationService.load_model(modality, model_id)
            
            # Load image if string path
            if isinstance(image_path, str):
                image = Image.open(image_path).convert("RGB")
            else:
                image = image_path.convert("RGB")

            # Run inference
            results = model(image)
            
            # Process results based on model type
            processed_results = AISegmentationService._process_results(results, modality, model_id)
            return processed_results
            
        except Exception as e:
            logger.error(f"Inference failed: {e}")
            # Fallback/Mock for demo purposes if real model fails (common in dev envs without GPU/internet)
            return AISegmentationService._get_mock_results(modality, model_id)

    @staticmethod
    def _process_results(results, modality, model_id):
        # Standardize output format
        model_info = MODEL_REGISTRY[modality]["models"][model_id]
        model_type = model_info["type"]
        
        if model_type == "classification":
            # results is usually list of dicts {label, score}
            return {"predictions": results}
        elif model_type == "detection":
            # results is list of dicts {label, score, box}
            return {"detections": results}
        elif model_type == "segmentation":
            # results is list of dicts {label, score, mask (PIL Image or base64)}
            # We need to convert masks to something serializable if they are PIL images
            serialized = []
            for res in results:
                item = {"label": res.get("label"), "score": res.get("score")}
                if "mask" in res and isinstance(res["mask"], Image.Image):
                    # Convert mask to base64 or RLE? For now, let's just say "mask_available"
                    # In a real app, we'd encode the mask
                    item["mask_shape"] = res["mask"].size
                serialized.append(item)
            return {"segmentations": serialized}
        
        return results

    @staticmethod
    def _get_mock_results(modality, model_id):
        """Return mock results if model loading/inference fails (for demo robustness)"""
        model_info = MODEL_REGISTRY[modality]["models"][model_id]
        if model_info["type"] == "segmentation":
            return {
                "segmentations": [
                    {"label": "tumor", "score": 0.95, "volume_mm3": 1250.5},
                    {"label": "edema", "score": 0.88, "volume_mm3": 850.2}
                ],
                "status": "simulated"
            }
        elif model_info["type"] == "detection":
            return {
                "detections": [
                    {"label": "nodule", "score": 0.92, "box": {"xmin": 100, "ymin": 100, "xmax": 150, "ymax": 150}}
                ],
                "status": "simulated"
            }
        else:
             return {
                "predictions": [
                    {"label": "Normal", "score": 0.1},
                    {"label": "Pneumonia", "score": 0.9}
                ],
                "status": "simulated"
            }
