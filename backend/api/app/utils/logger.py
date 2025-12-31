import logging
import logging.handlers
import sys
from pathlib import Path
from typing import Optional
import json
from datetime import datetime

class JSONFormatter(logging.Formatter):
    """JSON formatter for structured logging"""
    
    def format(self, record):
        log_entry = {
            "timestamp": datetime.fromtimestamp(record.created).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno
        }
        
        # Add exception info if present
        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)
        
        # Add extra fields
        for key, value in record.__dict__.items():
            if key not in ["name", "msg", "args", "levelname", "levelno", "pathname",
                          "filename", "module", "exc_info", "exc_text", "stack_info",
                          "lineno", "funcName", "created", "msecs", "relativeCreated",
                          "thread", "threadName", "processName", "process", "message"]:
                log_entry[key] = value
        
        return json.dumps(log_entry, default=str)

def setup_logging(
    log_level: str = "INFO",
    log_format: str = "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    log_file: Optional[str] = None,
    json_format: bool = False,
    max_bytes: int = 10 * 1024 * 1024,  # 10MB
    backup_count: int = 5
):
    """Setup logging configuration"""
    
    # Clear existing handlers
    root_logger = logging.getLogger()
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    # Set log level
    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    root_logger.setLevel(numeric_level)
    
    # Create formatter
    if json_format:
        formatter = JSONFormatter()
    else:
        formatter = logging.Formatter(log_format)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    root_logger.addHandler(console_handler)
    
    # File handler (if specified)
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.handlers.RotatingFileHandler(
            log_file,
            maxBytes=max_bytes,
            backupCount=backup_count
        )
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        root_logger.addHandler(file_handler)
    
    # Set specific logger levels for common libraries
    logging.getLogger("uvicorn").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
    logging.getLogger("transformers").setLevel(logging.WARNING)
    logging.getLogger("torch").setLevel(logging.WARNING)
    
    logging.info(f"Logging initialized with level: {log_level}")

def get_logger(name: str) -> logging.Logger:
    """Get logger with specific name"""
    return logging.getLogger(name)

class LoggerMixin:
    """Mixin class to add logging capabilities"""
    
    @property
    def logger(self) -> logging.Logger:
        """Get logger for this class"""
        return logging.getLogger(f"{self.__class__.__module__}.{self.__class__.__name__}")

class ContextualLogger:
    """Logger that maintains context across operations"""
    
    def __init__(self, logger: logging.Logger, context: dict = None):
        self.logger = logger
        self.context = context or {}
    
    def _log_with_context(self, level: int, message: str, **kwargs):
        """Log message with context"""
        extra = {**self.context, **kwargs}
        self.logger.log(level, message, extra=extra)
    
    def debug(self, message: str, **kwargs):
        self._log_with_context(logging.DEBUG, message, **kwargs)
    
    def info(self, message: str, **kwargs):
        self._log_with_context(logging.INFO, message, **kwargs)
    
    def warning(self, message: str, **kwargs):
        self._log_with_context(logging.WARNING, message, **kwargs)
    
    def error(self, message: str, **kwargs):
        self._log_with_context(logging.ERROR, message, **kwargs)
    
    def critical(self, message: str, **kwargs):
        self._log_with_context(logging.CRITICAL, message, **kwargs)
    
    def add_context(self, **kwargs):
        """Add context to logger"""
        self.context.update(kwargs)
        return self
    
    def with_context(self, **kwargs):
        """Create new logger with additional context"""
        new_context = {**self.context, **kwargs}
        return ContextualLogger(self.logger, new_context)

def get_contextual_logger(name: str, **context) -> ContextualLogger:
    """Get contextual logger with initial context"""
    logger = get_logger(name)
    return ContextualLogger(logger, context)