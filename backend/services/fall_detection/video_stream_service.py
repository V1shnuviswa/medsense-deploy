import cv2
import numpy as np
import threading
import time
import logging
from typing import Dict, Optional
from .yolo_service import yolo_service
from .pipeline import fall_pipeline

logger = logging.getLogger(__name__)

class VideoStreamService:
    def __init__(self):
        self.active_streams: Dict[str, cv2.VideoCapture] = {}
        self.stream_locks: Dict[str, threading.Lock] = {}
        
    def get_stream(self, camera_url: str) -> Optional[cv2.VideoCapture]:
        """Get or create a video stream for the given camera URL"""
        if camera_url not in self.active_streams:
            try:
                # Convert string URL to int if it's a webcam index
                camera_index = int(camera_url) if camera_url.isdigit() else camera_url
                
                # Use DirectShow backend on Windows for better webcam support
                cap = cv2.VideoCapture(camera_index, cv2.CAP_DSHOW)
                
                # Set camera properties for better performance
                cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
                cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
                cap.set(cv2.CAP_PROP_FPS, 30)
                cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Reduce buffer to minimize latency
                
                if not cap.isOpened():
                    logger.error(f"Failed to open camera: {camera_url}")
                    return None
                
                # Verify we can read a frame
                ret, test_frame = cap.read()
                if not ret or test_frame is None:
                    logger.error(f"Camera opened but cannot read frames: {camera_url}")
                    cap.release()
                    return None
                
                self.active_streams[camera_url] = cap
                self.stream_locks[camera_url] = threading.Lock()
                logger.info(f"Opened video stream for camera: {camera_url}")
                
            except Exception as e:
                logger.error(f"Error opening camera {camera_url}: {e}")
                return None
        
        return self.active_streams.get(camera_url)
    
    def read_frame(self, camera_url: str, with_detections: bool = True):
        """Read a frame from the camera and optionally add detection overlays"""
        stream = self.get_stream(camera_url)
        if not stream:
            logger.error(f"No stream available for camera: {camera_url}")
            return None
        
        lock = self.stream_locks.get(camera_url)
        if not lock:
            logger.error(f"No lock available for camera: {camera_url}")
            return None
        
        try:
            with lock:
                ret, frame = stream.read()
                if not ret or frame is None:
                    logger.warning(f"Failed to read frame from camera: {camera_url}")
                    # Don't release immediately, try a few times
                    time.sleep(0.01)
                    ret, frame = stream.read()
                    if not ret or frame is None:
                        logger.error(f"Camera {camera_url} stopped responding, releasing...")
                        stream.release()
                        if camera_url in self.active_streams:
                            del self.active_streams[camera_url]
                        return None
            
                if with_detections:
                    # Run fall detection pipeline
                    fall_result = fall_pipeline.process_frame(camera_url, frame)
                    
                    for detection in fall_result['detections']:
                        bbox = detection['bbox']
                        is_suspect = detection.get('is_suspect', False)
                        
                        # Draw bounding box
                        x1, y1, x2, y2 = [int(v) for v in bbox]
                        
                        # Red if suspect/fallen, green if normal
                        if is_suspect or fall_result['fall_detected']:
                            color = (0, 0, 255)  # Red for fall detection
                            label = "FALL DETECTED!"
                            
                            # Add warning overlay
                            cv2.putText(frame, "!!! FALL DETECTED !!!", (10, 50), 
                                       cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 3)
                        else:
                            color = (0, 255, 0)  # Green for normal
                            label = "Person - Normal"
                        
                        # Draw bounding box
                        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 3)
                        
                        # Draw label with background
                        (label_width, label_height), baseline = cv2.getTextSize(
                            label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2
                        )
                        cv2.rectangle(frame, (x1, y1 - label_height - 10), 
                                    (x1 + label_width, y1), color, -1)
                        cv2.putText(frame, label, (x1, y1 - 5), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                        
                        # Draw aspect ratio for debugging
                        width = x2 - x1
                        height = y2 - y1
                        aspect_ratio = width / height if height > 0 else 0
                        debug_text = f"Ratio: {aspect_ratio:.2f}"
                        cv2.putText(frame, debug_text, (x1, y2 + 20), 
                                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
                
                return frame
        except Exception as e:
            logger.error(f"Error reading frame: {e}")
            return None
    
    def generate_frames(self, camera_url: str):
        """Generator function for video streaming"""
        while True:
            frame = self.read_frame(camera_url, with_detections=True)
            
            if frame is None:
                # Send a black frame with error message
                frame = self._create_error_frame()
            
            # Encode frame as JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
            if not ret:
                continue
            
            frame_bytes = buffer.tobytes()
            
            # Yield frame in multipart format
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
            
            # Small delay to control frame rate
            time.sleep(0.033)  # ~30 FPS
    
    def _create_error_frame(self):
        """Create a black frame with error message"""
        frame = np.zeros((480, 640, 3), dtype=np.uint8)
        text = "Camera Unavailable"
        cv2.putText(frame, text, (150, 240), 
                   cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        return frame
    
    def release_stream(self, camera_url: str):
        """Release a video stream"""
        if camera_url in self.active_streams:
            self.active_streams[camera_url].release()
            del self.active_streams[camera_url]
            if camera_url in self.stream_locks:
                del self.stream_locks[camera_url]
            logger.info(f"Released video stream for camera: {camera_url}")
    
    def release_all(self):
        """Release all active streams"""
        for camera_url in list(self.active_streams.keys()):
            self.release_stream(camera_url)

video_stream_service = VideoStreamService()
