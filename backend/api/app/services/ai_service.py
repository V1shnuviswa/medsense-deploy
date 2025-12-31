import asyncio
import logging
from typing import Dict, List, Optional, Any, Tuple
from datetime import datetime, timedelta
import torch
from transformers import pipeline
from PIL import Image
import numpy as np
import time
from collections import OrderedDict

from app.config import get_settings, MODEL_REGISTRY
from app.schemas.imaging import ModelInfo, ModelType, ModalityType, PredictionResult, PreprocessingOptions
from app.utils.gpu_utils import get_optimal_device, monitor_gpu_memory

logger = logging.getLogger(__name__)
settings = get_settings()

class ModelCache:
    """LRU cache for AI models with memory management"""
    
    def __init__(self, max_size: int = 10):
        self.max_size = max_size
        self.cache: OrderedDict = OrderedDict()
        self.model_info: Dict[str, Dict] = {}
        self.load_times: Dict[str, float] = {}
        self.usage_counts: Dict[str, int] = {}
        
    def get(self, key: str):
        """Get model from cache and update LRU order"""
        if key in self.cache:
            # Move to end (most recently used)
            model = self.cache.pop(key)
            self.cache[key] = model
            self.usage_counts[key] = self.usage_counts.get(key, 0) + 1
            return model
        return None
    
    def put(self, key: str, model, model_info: Dict, load_time: float):
        """Add model to cache with LRU eviction"""
        if key in self.cache:
            # Update existing entry
            self.cache.pop(key)
        elif len(self.cache) >= self.max_size:
            # Remove least recently used
            lru_key = next(iter(self.cache))
            removed_model = self.cache.pop(lru_key)
            
            # Cleanup GPU memory if using CUDA
            if hasattr(removed_model, 'model') and torch.cuda.is_available():
                try:
                    del removed_model
                    torch.cuda.empty_cache()
                except Exception as e:
                    logger.warning(f"Error cleaning up model {lru_key}: {e}")
            
            # Remove metadata
            self.model_info.pop(lru_key, None)
            self.load_times.pop(lru_key, None)
            self.usage_counts.pop(lru_key, None)
            
            logger.info(f"Evicted model {lru_key} from cache")
        
        self.cache[key] = model
        self.model_info[key] = model_info
        self.load_times[key] = load_time
        self.usage_counts[key] = 0
        
        logger.info(f"Added model {key} to cache")
    
    def remove(self, key: str):
        """Remove specific model from cache"""
        if key in self.cache:
            model = self.cache.pop(key)
            
            # Cleanup
            if hasattr(model, 'model') and torch.cuda.is_available():
                try:
                    del model
                    torch.cuda.empty_cache()
                except Exception as e:
                    logger.warning(f"Error cleaning up model {key}: {e}")
            
            self.model_info.pop(key, None)
            self.load_times.pop(key, None)
            self.usage_counts.pop(key, None)
            return True
        return False
    
    def clear(self):
        """Clear all models from cache"""
        for key in list(self.cache.keys()):
            self.remove(key)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get cache statistics"""
        return {
            "cache_size": len(self.cache),
            "max_size": self.max_size,
            "models": list(self.cache.keys()),
            "usage_counts": self.usage_counts.copy(),
            "load_times": self.load_times.copy(),
            "total_usage": sum(self.usage_counts.values())
        }

class PreprocessingService:
    """Image preprocessing service"""
    
    @staticmethod
    def apply_preprocessing(image: Image.Image, options: PreprocessingOptions) -> Image.Image:
        """Apply preprocessing pipeline to image"""
        try:
            processed_image = image.copy()
            
            # Resize if specified
            if options.resize and options.resize_dimensions:
                processed_image = processed_image.resize(
                    options.resize_dimensions, 
                    Image.Resampling.LANCZOS
                )
            
            # Convert to numpy for numerical operations
            img_array = np.array(processed_image)
            
            # Apply preprocessing techniques
            if options.normalize:
                img_array = PreprocessingService._normalize_image(
                    img_array, options.normalize_range
                )
            
            if options.histogram_equalization:
                img_array = PreprocessingService._histogram_equalization(img_array)
            
            if options.contrast_enhancement:
                img_array = PreprocessingService._enhance_contrast(
                    img_array, options.contrast_factor
                )
            
            if options.noise_reduction:
                img_array = PreprocessingService._reduce_noise(
                    img_array, options.noise_sigma
                )
            
            # Convert back to PIL Image
            img_array = np.clip(img_array, 0, 255).astype(np.uint8)
            processed_image = Image.fromarray(img_array)
            
            return processed_image
            
        except Exception as e:
            logger.error(f"Preprocessing failed: {e}")
            raise
    
    @staticmethod
    def _normalize_image(img_array: np.ndarray, target_range: Tuple[float, float]) -> np.ndarray:
        """Normalize image to target range"""
        min_val, max_val = target_range
        img_normalized = (img_array - img_array.min()) / (img_array.max() - img_array.min())
        return img_normalized * (max_val - min_val) + min_val * 255
    
    @staticmethod
    def _histogram_equalization(img_array: np.ndarray) -> np.ndarray:
        """Apply histogram equalization"""
        if len(img_array.shape) == 3:
            # Color image - apply to each channel
            result = np.zeros_like(img_array)
            for i in range(img_array.shape[2]):
                result[:, :, i] = PreprocessingService._equalize_channel(img_array[:, :, i])
            return result
        else:
            return PreprocessingService._equalize_channel(img_array)
    
    @staticmethod
    def _equalize_channel(channel: np.ndarray) -> np.ndarray:
        """Apply histogram equalization to single channel"""
        hist, bins = np.histogram(channel.flatten(), 256, [0, 256])
        cdf = hist.cumsum()
        cdf_normalized = cdf * 255 / cdf[-1]
        return np.interp(channel.flatten(), bins[:-1], cdf_normalized).reshape(channel.shape)
    
    @staticmethod
    def _enhance_contrast(img_array: np.ndarray, factor: float) -> np.ndarray:
        """Enhance image contrast"""
        return np.clip(factor * img_array - (factor - 1) * 128, 0, 255)
    
    @staticmethod
    def _reduce_noise(img_array: np.ndarray, sigma: float) -> np.ndarray:
        """Apply Gaussian noise reduction"""
        try:
            from scipy import ndimage
            return ndimage.gaussian_filter(img_array, sigma=sigma)
        except ImportError:
            logger.warning("scipy not available, skipping noise reduction")
            return img_array

class AIModelService:
    """Main AI model service for medical imaging"""
    
    def __init__(self):
        self.model_cache = ModelCache(max_size=settings.model_cache_size)
        self.preprocessing_service = PreprocessingService()
        self.device = get_optimal_device()
        self._initialized = False
        
    async def initialize(self):
        """Initialize the service"""
        if not self._initialized:
            logger.info(f"Initializing AI Model Service on device: {self.device}")
            
            # Pre-load popular models if specified
            if hasattr(settings, 'preload_models') and settings.preload_models:
                await self._preload_models(settings.preload_models)
            
            self._initialized = True
            logger.info("AI Model Service initialized successfully")
    
    def get_available_models(self, modality: Optional[ModalityType] = None) -> List[ModelInfo]:
        """Get list of available models"""
        models = []
        
        for mod_name, mod_data in MODEL_REGISTRY.items():
            if modality and mod_name != modality.value:
                continue
                
            for model_id, model_data in mod_data["models"].items():
                cache_key = f"{mod_name}_{model_id}"
                is_loaded = cache_key in self.model_cache.cache
                last_used = None
                
                if is_loaded and cache_key in self.model_cache.model_info:
                    # Get last used time from cache metadata
                    last_used = datetime.now()  # Placeholder
                
                models.append(ModelInfo(
                    model_id=model_id,
                    name=model_data["name"],
                    type=ModelType(model_data["type"]),
                    modality=ModalityType(mod_name),
                    applications=model_data["applications"],
                    input_size=model_data["input_size"],
                    output_classes=model_data.get("output_classes"),
                    confidence_threshold=model_data.get("confidence_threshold", 0.5),
                    is_loaded=is_loaded,
                    last_used=last_used,
                    loading_time=self.model_cache.load_times.get(cache_key)
                ))
        
        return models
    
    def get_model_info(self, modality: str, model_id: str) -> Optional[Dict]:
        """Get model information from registry"""
        if modality in MODEL_REGISTRY and model_id in MODEL_REGISTRY[modality]["models"]:
            return MODEL_REGISTRY[modality]["models"][model_id]
        return None
    
    async def load_model(self, modality: str, model_id: str, force_reload: bool = False):
        """Load a specific model"""
        cache_key = f"{modality}_{model_id}"
        
        # Return cached model if available and not forcing reload
        if not force_reload:
            cached_model = self.model_cache.get(cache_key)
            if cached_model:
                return cached_model
        
        # Get model info
        model_info = self.get_model_info(modality, model_id)
        if not model_info:
            raise ValueError(f"Model '{model_id}' not found for modality '{modality}'")
        
        try:
            start_time = time.time()
            
            # Load model based on type
            model_type = model_info["type"]
            huggingface_id = model_info["huggingface_id"]
            
            logger.info(f"Loading model {model_id} ({model_type}) from {huggingface_id}")
            
            # Create pipeline based on model type
            if model_type == "segmentation":
                model = pipeline("image-segmentation", model=huggingface_id, device=self.device)
            elif model_type == "classification":
                model = pipeline("image-classification", model=huggingface_id, device=self.device)
            elif model_type == "detection":
                model = pipeline("object-detection", model=huggingface_id, device=self.device)
            elif model_type == "feature_extraction":
                model = pipeline("feature-extraction", model=huggingface_id, device=self.device)
            else:
                model = pipeline("image-classification", model=huggingface_id, device=self.device)
            
            load_time = time.time() - start_time
            
            # Cache the model
            self.model_cache.put(cache_key, model, model_info, load_time)
            
            logger.info(f"Successfully loaded model {model_id} in {load_time:.2f}s")
            
            return model
            
        except Exception as e:
            logger.error(f"Failed to load model {model_id}: {e}")
            raise RuntimeError(f"Failed to load model: {str(e)}")
    
    async def predict(
        self,
        image: Image.Image,
        modality: str,
        model_id: str,
        confidence_threshold: float = 0.5,
        preprocessing_options: Optional[PreprocessingOptions] = None,
        return_probabilities: bool = True
    ) -> List[PredictionResult]:
        """Make predictions using specified model"""
        try:
            # Load model
            model = await self.load_model(modality, model_id)
            model_info = self.get_model_info(modality, model_id)
            
            # Preprocess image if options provided
            processed_image = image
            if preprocessing_options:
                processed_image = self.preprocessing_service.apply_preprocessing(
                    image, preprocessing_options
                )
            
            # Ensure image is RGB
            if processed_image.mode != 'RGB':
                processed_image = processed_image.convert('RGB')
            
            # Make prediction
            start_time = time.time()
            raw_results = model(processed_image)
            prediction_time = time.time() - start_time
            
            # Process results based on model type
            predictions = self._process_prediction_results(
                raw_results, 
                model_info, 
                confidence_threshold,
                return_probabilities
            )
            
            logger.info(f"Prediction completed in {prediction_time:.3f}s with {len(predictions)} results")
            
            return predictions
            
        except Exception as e:
            logger.error(f"Prediction failed: {e}")
            raise
    
    def _process_prediction_results(
        self,
        raw_results: Any,
        model_info: Dict,
        confidence_threshold: float,
        return_probabilities: bool
    ) -> List[PredictionResult]:
        """Process raw model results into standardized format"""
        predictions = []
        
        try:
            if isinstance(raw_results, list):
                for result in raw_results:
                    if isinstance(result, dict):
                        # Classification/Detection result
                        confidence = result.get("score", 1.0)
                        
                        if confidence >= confidence_threshold:
                            prediction = PredictionResult(
                                label=result.get("label", "unknown"),
                                confidence=confidence
                            )
                            
                            # Add bounding box if available (object detection)
                            if "box" in result:
                                bbox = result["box"]
                                prediction.bounding_box = [
                                    bbox.get("xmin", 0),
                                    bbox.get("ymin", 0),
                                    bbox.get("xmax", 0),
                                    bbox.get("ymax", 0)
                                ]
                            
                            # Add probability distribution if requested
                            if return_probabilities and "scores" in result:
                                prediction.probability_distribution = result["scores"]
                            
                            predictions.append(prediction)
            
            elif isinstance(raw_results, dict):
                # Single result
                confidence = raw_results.get("score", 1.0)
                if confidence >= confidence_threshold:
                    predictions.append(PredictionResult(
                        label=raw_results.get("label", "unknown"),
                        confidence=confidence
                    ))
            
        except Exception as e:
            logger.error(f"Error processing prediction results: {e}")
            # Return empty results rather than failing completely
            predictions = []
        
        return predictions
    
    async def batch_predict(
        self,
        images: List[Image.Image],
        modality: str,
        model_id: str,
        confidence_threshold: float = 0.5,
        preprocessing_options: Optional[PreprocessingOptions] = None,
        max_concurrent: int = 3
    ) -> List[List[PredictionResult]]:
        """Batch prediction with concurrency control"""
        semaphore = asyncio.Semaphore(max_concurrent)
        
        async def predict_single(image: Image.Image) -> List[PredictionResult]:
            async with semaphore:
                return await self.predict(
                    image, modality, model_id, confidence_threshold, preprocessing_options
                )
        
        tasks = [predict_single(image) for image in images]
        results = await asyncio.gather(*tasks, return_exceptions=True)
        
        # Handle exceptions in batch results
        processed_results = []
        for result in results:
            if isinstance(result, Exception):
                logger.error(f"Batch prediction error: {result}")
                processed_results.append([])  # Empty result for failed prediction
            else:
                processed_results.append(result)
        
        return processed_results
    
    async def unload_model(self, modality: str, model_id: str) -> bool:
        """Unload a specific model from cache"""
        cache_key = f"{modality}_{model_id}"
        return self.model_cache.remove(cache_key)
    
    async def cleanup(self):
        """Cleanup all resources"""
        logger.info("Cleaning up AI Model Service...")
        self.model_cache.clear()
        
        if torch.cuda.is_available():
            torch.cuda.empty_cache()
        
        logger.info("AI Model Service cleanup completed")
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get model cache statistics"""
        stats = self.model_cache.get_stats()
        
        # Add GPU memory info if available
        if torch.cuda.is_available():
            stats["gpu_memory"] = {
                "allocated": torch.cuda.memory_allocated(),
                "cached": torch.cuda.memory_reserved(),
                "max_allocated": torch.cuda.max_memory_allocated()
            }
        
        return stats
    
    def get_total_models_count(self) -> int:
        """Get total number of available models"""
        count = 0
        for modality_data in MODEL_REGISTRY.values():
            count += len(modality_data["models"])
        return count
    
    async def preload_popular_models(self):
        """Preload commonly used models"""
        popular_models = [
            ("X-ray", "chest_pathology"),
            ("CT", "covid_classifier"),
            ("MRI", "brain_tumor_unet")
        ]
        
        for modality, model_id in popular_models:
            try:
                await self.load_model(modality, model_id)
                logger.info(f"Preloaded model: {modality}/{model_id}")
            except Exception as e:
                logger.warning(f"Failed to preload {modality}/{model_id}: {e}")
    
    async def _preload_models(self, model_list: List[Tuple[str, str]]):
        """Preload specified models"""
        for modality, model_id in model_list:
            try:
                await self.load_model(modality, model_id)
                logger.info(f"Preloaded model: {modality}/{model_id}")
            except Exception as e:
                logger.warning(f"Failed to preload {modality}/{model_id}: {e}")
    
    async def optimize_cache(self):
        """Optimize model cache by analyzing usage patterns"""
        stats = self.model_cache.get_stats()
        
        if len(self.model_cache.cache) < self.model_cache.max_size // 2:
            return  # No optimization needed
        
        # Remove models with zero usage that haven't been used recently
        current_time = time.time()
        models_to_remove = []
        
        for cache_key, load_time in self.model_cache.load_times.items():
            usage_count = self.model_cache.usage_counts.get(cache_key, 0)
            time_since_load = current_time - load_time
            
            # Remove unused models older than 1 hour
            if usage_count == 0 and time_since_load > 3600:
                models_to_remove.append(cache_key)
        
        for cache_key in models_to_remove:
            self.model_cache.remove(cache_key)
            logger.info(f"Optimized cache: removed unused model {cache_key}")
    
    def validate_model_config(self, modality: str, model_id: str) -> Tuple[bool, str]:
        """Validate model configuration"""
        if modality not in MODEL_REGISTRY:
            return False, f"Unsupported modality: {modality}"
        
        if model_id not in MODEL_REGISTRY[modality]["models"]:
            return False, f"Model {model_id} not found for modality {modality}"
        
        model_info = MODEL_REGISTRY[modality]["models"][model_id]
        
        # Check required fields
        required_fields = ["name", "type", "huggingface_id", "applications", "input_size"]
        for field in required_fields:
            if field not in model_info:
                return False, f"Model configuration missing required field: {field}"
        
        return True, "Valid configuration"
    
    async def health_check(self) -> Dict[str, Any]:
        """Perform health check on the service"""
        health_status = {
            "service_initialized": self._initialized,
            "cache_size": len(self.model_cache.cache),
            "device": self.device,
            "torch_version": torch.__version__,
            "cuda_available": torch.cuda.is_available()
        }
        
        if torch.cuda.is_available():
            health_status.update({
                "gpu_count": torch.cuda.device_count(),
                "gpu_memory_allocated": torch.cuda.memory_allocated(),
                "gpu_memory_cached": torch.cuda.memory_reserved()
            })
        
        # Test a simple model load if cache is empty
        if len(self.model_cache.cache) == 0:
            try:
                await self.load_model("X-ray", "chest_pathology")
                health_status["test_load_success"] = True
            except Exception as e:
                health_status["test_load_success"] = False
                health_status["test_load_error"] = str(e)
        
        return health_status