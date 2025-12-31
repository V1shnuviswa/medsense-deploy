import torch
import logging
from typing import Dict, List, Optional, Any, Tuple
import psutil
import time

logger = logging.getLogger(__name__)

def get_optimal_device() -> str:
    """Determine the optimal device for model inference"""
    if torch.cuda.is_available():
        # Check if MPS is available (Apple Silicon)
        if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
            return "mps"
        return "cuda"
    return "cpu"

def get_device_info() -> Dict[str, Any]:
    """Get comprehensive device information"""
    info = {
        "cpu": {
            "count": torch.get_num_threads(),
            "name": get_cpu_name(),
            "usage_percent": psutil.cpu_percent(interval=1)
        },
        "memory": {
            "total_gb": psutil.virtual_memory().total / (1024**3),
            "available_gb": psutil.virtual_memory().available / (1024**3),
            "used_percent": psutil.virtual_memory().percent
        },
        "cuda": {
            "available": torch.cuda.is_available(),
            "device_count": torch.cuda.device_count() if torch.cuda.is_available() else 0,
            "devices": []
        }
    }
    
    # Add CUDA device information
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            device_info = {
                "index": i,
                "name": torch.cuda.get_device_name(i),
                "memory_total": torch.cuda.get_device_properties(i).total_memory / (1024**3),
                "memory_allocated": torch.cuda.memory_allocated(i) / (1024**3),
                "memory_reserved": torch.cuda.memory_reserved(i) / (1024**3),
                "compute_capability": f"{torch.cuda.get_device_properties(i).major}.{torch.cuda.get_device_properties(i).minor}"
            }
            info["cuda"]["devices"].append(device_info)
    
    # Add MPS information (Apple Silicon)
    if hasattr(torch.backends, 'mps'):
        info["mps"] = {
            "available": torch.backends.mps.is_available(),
            "built": torch.backends.mps.is_built()
        }
    
    return info

def get_cpu_name() -> str:
    """Get CPU name/model"""
    try:
        # Try to get CPU name from /proc/cpuinfo on Linux
        with open('/proc/cpuinfo', 'r') as f:
            for line in f:
                if 'model name' in line:
                    return line.split(':')[1].strip()
    except:
        pass
    
    # Fallback to generic description
    return f"{psutil.cpu_count()} core CPU"

def monitor_gpu_memory() -> Dict[str, Any]:
    """Monitor GPU memory usage"""
    if not torch.cuda.is_available():
        return {"error": "CUDA not available"}
    
    memory_info = {}
    
    for i in range(torch.cuda.device_count()):
        device_name = torch.cuda.get_device_name(i)
        total_memory = torch.cuda.get_device_properties(i).total_memory
        allocated_memory = torch.cuda.memory_allocated(i)
        reserved_memory = torch.cuda.memory_reserved(i)
        
        memory_info[f"gpu_{i}"] = {
            "device_name": device_name,
            "total_gb": total_memory / (1024**3),
            "allocated_gb": allocated_memory / (1024**3),
            "reserved_gb": reserved_memory / (1024**3),
            "free_gb": (total_memory - allocated_memory) / (1024**3),
            "utilization_percent": (allocated_memory / total_memory) * 100
        }
    
    return memory_info

def optimize_gpu_memory():
    """Optimize GPU memory usage"""
    if torch.cuda.is_available():
        torch.cuda.empty_cache()
        torch.cuda.synchronize()
        logger.info("GPU memory cache cleared")

def check_memory_requirements(model_size_gb: float) -> Tuple[bool, str]:
    """Check if system has enough memory for model"""
    # Check RAM
    available_ram = psutil.virtual_memory().available / (1024**3)
    
    if available_ram < model_size_gb * 1.5:  # 1.5x buffer
        return False, f"Insufficient RAM: {available_ram:.1f}GB available, {model_size_gb * 1.5:.1f}GB required"
    
    # Check GPU memory if CUDA available
    if torch.cuda.is_available():
        gpu_info = monitor_gpu_memory()
        max_gpu_free = max([gpu["free_gb"] for gpu in gpu_info.values() if isinstance(gpu, dict)])
        
        if max_gpu_free < model_size_gb:
            return False, f"Insufficient GPU memory: {max_gpu_free:.1f}GB available, {model_size_gb:.1f}GB required"
    
    return True, "Memory requirements satisfied"

def select_best_device_for_model(model_size_gb: float) -> str:
    """Select the best device for a model based on its size"""
    # Check memory requirements
    has_memory, message = check_memory_requirements(model_size_gb)
    
    if not has_memory:
        logger.warning(f"Memory check failed: {message}")
    
    # For large models, prefer GPU if available
    if model_size_gb > 2.0 and torch.cuda.is_available():
        gpu_info = monitor_gpu_memory()
        
        # Find GPU with most free memory
        best_gpu = None
        max_free_memory = 0
        
        for gpu_id, info in gpu_info.items():
            if isinstance(info, dict) and info["free_gb"] > max_free_memory:
                max_free_memory = info["free_gb"]
                best_gpu = gpu_id.split("_")[1]  # Extract GPU index
        
        if best_gpu and max_free_memory > model_size_gb:
            return f"cuda:{best_gpu}"
    
    return get_optimal_device()

def benchmark_device_performance() -> Dict[str, float]:
    """Benchmark device performance for model inference"""
    devices = ["cpu"]
    
    if torch.cuda.is_available():
        for i in range(torch.cuda.device_count()):
            devices.append(f"cuda:{i}")
    
    if hasattr(torch.backends, 'mps') and torch.backends.mps.is_available():
        devices.append("mps")
    
    results = {}
    
    # Simple tensor operations benchmark
    for device in devices:
        try:
            times = []
            for _ in range(5):  # Run 5 times for average
                start_time = time.time()
                
                # Create test tensors
                a = torch.randn(1000, 1000, device=device)
                b = torch.randn(1000, 1000, device=device)
                
                # Perform operations
                c = torch.matmul(a, b)
                c = torch.relu(c)
                c = torch.sum(c)
                
                # Synchronize for accurate timing
                if device.startswith("cuda"):
                    torch.cuda.synchronize()
                
                end_time = time.time()
                times.append(end_time - start_time)
            
            results[device] = sum(times) / len(times)  # Average time
            
        except Exception as e:
            logger.warning(f"Benchmark failed for {device}: {e}")
            results[device] = float('inf')  # Mark as unavailable
    
    return results

def get_memory_usage() -> Dict[str, Any]:
    """Get current memory usage across all devices"""
    usage = {
        "system": {
            "total_gb": psutil.virtual_memory().total / (1024**3),
            "used_gb": psutil.virtual_memory().used / (1024**3),
            "available_gb": psutil.virtual_memory().available / (1024**3),
            "percent": psutil.virtual_memory().percent
        }
    }
    
    # Add GPU memory usage
    if torch.cuda.is_available():
        usage["gpu"] = monitor_gpu_memory()
    
    return usage

def set_memory_fraction(device_id: int = 0, fraction: float = 0.8):
    """Set GPU memory fraction to prevent OOM errors"""
    if torch.cuda.is_available() and 0 <= fraction <= 1:
        try:
            torch.cuda.set_per_process_memory_fraction(fraction, device_id)
            logger.info(f"Set GPU {device_id} memory fraction to {fraction}")
        except Exception as e:
            logger.warning(f"Failed to set memory fraction: {e}")

class GPUMemoryManager:
    """Context manager for GPU memory management"""
    
    def __init__(self, clear_cache: bool = True):
        self.clear_cache = clear_cache
        self.initial_memory = None
    
    def __enter__(self):
        if torch.cuda.is_available():
            self.initial_memory = torch.cuda.memory_allocated()
            if self.clear_cache:
                torch.cuda.empty_cache()
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if torch.cuda.is_available():
            current_memory = torch.cuda.memory_allocated()
            if self.initial_memory is not None:
                memory_diff = (current_memory - self.initial_memory) / (1024**3)
                logger.info(f"GPU memory change: {memory_diff:+.3f} GB")
            
            if self.clear_cache:
                torch.cuda.empty_cache()

def log_device_info():
    """Log comprehensive device information"""
    info = get_device_info()
    
    logger.info("=== Device Information ===")
    logger.info(f"CPU: {info['cpu']['name']} ({info['cpu']['count']} threads)")
    logger.info(f"Memory: {info['memory']['available_gb']:.1f}GB available / {info['memory']['total_gb']:.1f}GB total")
    
    if info['cuda']['available']:
        logger.info(f"CUDA: Available ({info['cuda']['device_count']} devices)")
        for device in info['cuda']['devices']:
            logger.info(f"  GPU {device['index']}: {device['name']} "
                       f"({device['memory_total']:.1f}GB total, "
                       f"{device['memory_total'] - device['memory_allocated']:.1f}GB free)")
    else:
        logger.info("CUDA: Not available")
    
    if info.get('mps', {}).get('available', False):
        logger.info("MPS (Apple Silicon): Available")

def get_recommended_batch_size(model_size_gb: float, device: str = None) -> int:
    """Get recommended batch size based on available memory"""
    if device is None:
        device = get_optimal_device()
    
    # Conservative estimates for batch size
    if device == "cpu":
        available_memory = psutil.virtual_memory().available / (1024**3)
        # Use 25% of available RAM for batch processing
        usable_memory = available_memory * 0.25
    elif device.startswith("cuda"):
        gpu_info = monitor_gpu_memory()
        device_idx = device.split(":")[-1] if ":" in device else "0"
        gpu_key = f"gpu_{device_idx}"
        
        if gpu_key in gpu_info:
            usable_memory = gpu_info[gpu_key]["free_gb"] * 0.8  # Use 80% of free GPU memory
        else:
            usable_memory = 1.0  # Conservative fallback
    else:
        usable_memory = 2.0  # Conservative fallback for other devices
    
    # Estimate batch size (very conservative)
    memory_per_sample = model_size_gb * 0.1  # Assume each sample needs 10% of model size
    recommended_batch_size = max(1, int(usable_memory / memory_per_sample))
    
    # Cap at reasonable limits
    return min(recommended_batch_size, 32)

def monitor_inference_performance(device: str, operation_name: str = "inference"):
    """Context manager to monitor inference performance"""
    class PerformanceMonitor:
        def __init__(self, device: str, operation: str):
            self.device = device
            self.operation = operation
            self.start_time = None
            self.initial_memory = None
            
        def __enter__(self):
            self.start_time = time.time()
            
            if self.device.startswith("cuda") and torch.cuda.is_available():
                torch.cuda.synchronize()
                self.initial_memory = torch.cuda.memory_allocated()
            
            return self
        
        def __exit__(self, exc_type, exc_val, exc_tb):
            if self.device.startswith("cuda") and torch.cuda.is_available():
                torch.cuda.synchronize()
                current_memory = torch.cuda.memory_allocated()
                memory_used = (current_memory - self.initial_memory) / (1024**3) if self.initial_memory else 0
            else:
                memory_used = 0
            
            duration = time.time() - self.start_time
            
            logger.info(f"{self.operation} completed in {duration:.3f}s "
                       f"(Memory: {memory_used:+.3f}GB)")
    
    return PerformanceMonitor(device, operation_name)

def cleanup_gpu_memory():
    """Comprehensive GPU memory cleanup"""
    if torch.cuda.is_available():
        try:
            # Clear cache
            torch.cuda.empty_cache()
            
            # Reset peak memory stats
            torch.cuda.reset_peak_memory_stats()
            
            # Synchronize
            torch.cuda.synchronize()
            
            logger.info("GPU memory cleanup completed")
            
            # Log current memory usage
            memory_info = monitor_gpu_memory()
            for gpu_id, info in memory_info.items():
                if isinstance(info, dict):
                    logger.info(f"{gpu_id}: {info['allocated_gb']:.2f}GB allocated, "
                               f"{info['free_gb']:.2f}GB free")
                               
        except Exception as e:
            logger.error(f"GPU memory cleanup failed: {e}")

def get_cuda_diagnostics() -> Dict[str, Any]:
    """Get CUDA diagnostic information"""
    if not torch.cuda.is_available():
        return {"error": "CUDA not available"}
    
    try:
        diagnostics = {
            "cuda_version": torch.version.cuda,
            "cudnn_version": torch.backends.cudnn.version(),
            "device_count": torch.cuda.device_count(),
            "current_device": torch.cuda.current_device(),
            "devices": []
        }
        
        for i in range(torch.cuda.device_count()):
            props = torch.cuda.get_device_properties(i)
            device_info = {
                "index": i,
                "name": props.name,
                "major": props.major,
                "minor": props.minor,
                "total_memory": props.total_memory,
                "multiprocessor_count": props.multi_processor_count,
                "memory_allocated": torch.cuda.memory_allocated(i),
                "memory_reserved": torch.cuda.memory_reserved(i),
                "max_memory_allocated": torch.cuda.max_memory_allocated(i),
                "max_memory_reserved": torch.cuda.max_memory_reserved(i)
            }
            diagnostics["devices"].append(device_info)
        
        return diagnostics
        
    except Exception as e:
        return {"error": f"Failed to get CUDA diagnostics: {str(e)}"}

def is_device_available(device: str) -> bool:
    """Check if specified device is available"""
    try:
        if device == "cpu":
            return True
        elif device == "mps":
            return hasattr(torch.backends, 'mps') and torch.backends.mps.is_available()
        elif device.startswith("cuda"):
            if not torch.cuda.is_available():
                return False
            
            if ":" in device:
                device_idx = int(device.split(":")[1])
                return device_idx < torch.cuda.device_count()
            else:
                return torch.cuda.device_count() > 0
        else:
            return False
            
    except Exception:
        return False

def get_optimal_device_for_task(task_type: str, model_size_gb: float = 1.0) -> str:
    """Get optimal device for specific task type"""
    # Task-specific device selection
    task_preferences = {
        "inference": {"prefer_gpu": True, "min_memory": 2.0},
        "training": {"prefer_gpu": True, "min_memory": 4.0},
        "preprocessing": {"prefer_gpu": False, "min_memory": 1.0},
        "batch_processing": {"prefer_gpu": True, "min_memory": 3.0}
    }
    
    task_config = task_preferences.get(task_type, task_preferences["inference"])
    
    # Check if we should prefer GPU
    if task_config["prefer_gpu"] and torch.cuda.is_available():
        gpu_info = monitor_gpu_memory()
        
        for gpu_id, info in gpu_info.items():
            if isinstance(info, dict) and info["free_gb"] >= task_config["min_memory"]:
                device_idx = gpu_id.split("_")[1]
                return f"cuda:{device_idx}"
    
    # Fallback to optimal device
    return get_optimal_device()