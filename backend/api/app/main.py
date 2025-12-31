from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
from datetime import datetime
import logging

from app.config import get_settings
from app.routes import imaging, analysis
from app.utils.logger import setup_logging
from app.services.ai_service import AIModelService

# Initialize settings
settings = get_settings()

# Setup logging
setup_logging(settings.log_level)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Advanced Medical Imaging API",
    description="Comprehensive API for medical imaging with DICOM/NIfTI support, advanced segmentation models, and AI-powered analysis",
    version="3.1.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(imaging.router, prefix="/api/v1", tags=["imaging"])
app.include_router(analysis.router, prefix="/api/v1", tags=["analysis"])

# Global services
ai_service = None

@app.get("/")
async def root():
    """API root endpoint with system information"""
    return {
        "name": "Advanced Medical Imaging API",
        "version": "3.1.0",
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "docs_url": "/docs",
        "endpoints": {
            "imaging": "/api/v1/imaging",
            "analysis": "/api/v1/analysis",
            "models": "/api/v1/models",
            "jobs": "/api/v1/jobs"
        }
    }

@app.get("/health")
async def health_check():
    """Detailed health check endpoint"""
    global ai_service
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "ai_service": "initialized" if ai_service else "not_initialized",
            "models_loaded": len(ai_service.model_cache) if ai_service else 0,
        },
        "system": {
            "python_version": settings.python_version,
            "cuda_available": settings.cuda_available,
            "gpu_count": settings.gpu_count
        }
    }

@app.exception_handler(HTTPException)
async def http_exception_handler(request, exc):
    """Global HTTP exception handler"""
    logger.error(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now().isoformat(),
            "path": str(request.url.path)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request, exc):
    """Global exception handler for unexpected errors"""
    logger.error(f"Unexpected error: {str(exc)} - Path: {request.url.path}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred",
            "status_code": 500,
            "timestamp": datetime.now().isoformat()
        }
    )

@app.on_event("startup")
async def startup_event():
    """Initialize application services on startup"""
    global ai_service
    
    logger.info("Medical Imaging API starting up...")
    
    # Initialize AI service
    ai_service = AIModelService()
    
    # Add to app state for access in routes
    app.state.ai_service = ai_service
    
    logger.info(f"Startup complete - Models available: {ai_service.get_total_models_count()}")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on application shutdown"""
    global ai_service
    
    logger.info("Medical Imaging API shutting down...")
    
    if ai_service:
        await ai_service.cleanup()
    
    logger.info("Shutdown complete")

if __name__ == "__main__":
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.reload,
        workers=1  # Single worker for model cache consistency
    )