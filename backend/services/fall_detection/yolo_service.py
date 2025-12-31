import cv2
import numpy as np
import logging
import os
import random

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class YoloService:
    def __init__(self, model_path='models/yolov8n.onnx'):
        self.model_loaded = False
        self.net = None
        self.classes = ['person'] # We only care about person for fall detection
        
        # Check if model file exists
        if os.path.exists(model_path):
            try:
                logger.info(f"Loading YOLO model from {model_path} using OpenCV DNN...")
                self.net = cv2.dnn.readNetFromONNX(model_path)
                
                # Use CPU backend (CUDA has compatibility issues)
                self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                logger.info("Using CPU backend for inference")
                
                self.model_loaded = True
                logger.info("YOLO model loaded successfully.")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {e}")
        else:
            logger.warning(f"Model file not found at {model_path}. Running in mock mode.")
            logger.warning("Please export YOLOv8 to ONNX: 'yolo export model=yolov8n.pt format=onnx'")

    def detect_persons(self, frame):
        """
        Runs YOLO detection using OpenCV DNN module.
        Expects YOLOv8 ONNX format.
        """
        if frame is None or not self.model_loaded:
            return self._mock_detection()

        try:
            # Prepare input blob
            # YOLOv8 expects 640x640 input, normalized 0-1
            blob = cv2.dnn.blobFromImage(frame, 1/255.0, (640, 640), swapRB=True, crop=False)
            self.net.setInput(blob)
            
            # Run inference
            outputs = self.net.forward()
            
            # Process outputs
            # YOLOv8 ONNX output shape is usually (1, 84, 8400)
            # 84 rows = 4 box coords (xc, yc, w, h) + 80 class scores
            outputs = np.array([cv2.transpose(outputs[0])])
            rows = outputs.shape[1]
            
            boxes = []
            scores = []
            class_ids = []
            
            # Image dimensions for scaling back
            img_h, img_w = frame.shape[:2]
            x_scale = img_w / 640
            y_scale = img_h / 640

            for i in range(rows):
                # Extract class scores (skip first 4 coords)
                classes_scores = outputs[0][i][4:]
                (minScore, maxScore, minClassLoc, (x, maxClassIndex)) = cv2.minMaxLoc(classes_scores)
                
                # Filter by confidence and class (0 = person in COCO)
                if maxScore >= 0.5 and maxClassIndex == 0:
                    box = outputs[0][i][0:4]
                    cx, cy, w, h = box[0], box[1], box[2], box[3]
                    
                    # Scale back to original image size
                    left = int((cx - w/2) * x_scale)
                    top = int((cy - h/2) * y_scale)
                    width = int(w * x_scale)
                    height = int(h * y_scale)
                    
                    boxes.append([left, top, width, height])
                    scores.append(float(maxScore))
                    class_ids.append(maxClassIndex)

            # Apply Non-Maximum Suppression (NMS)
            indices = cv2.dnn.NMSBoxes(boxes, scores, 0.5, 0.4)
            
            detections = []
            if len(indices) > 0:
                for i in indices.flatten():
                    x, y, w, h = boxes[i]
                    detections.append({
                        'bbox': [x, y, x + w, y + h], # Convert to x1, y1, x2, y2
                        'confidence': scores[i],
                        'class': 'person'
                    })
            
            return detections

        except Exception as e:
            logger.error(f"Inference error: {e}")
            return self._mock_detection()

    def _mock_detection(self):
        """Simulate detection for testing/demo purposes"""
        if random.random() > 0.3:
            return [{
                'bbox': [100, 100, 200, 300],
                'confidence': 0.85 + (random.random() * 0.14),
                'class': 'person'
            }]
        return []

yolo_service = YoloService()
