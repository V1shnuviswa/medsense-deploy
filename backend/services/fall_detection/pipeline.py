from .yolo_service import yolo_service
from .pose_service import pose_service
import time

class FallDetectionPipeline:
    def __init__(self):
        self.state_buffer = {} # camera_id -> { person_id -> history }

    def process_frame(self, camera_id, frame):
        """
        Main pipeline: YOLO -> Suspect Filter -> Pose -> Fall Logic
        """
        results = {
            'camera_id': camera_id,
            'timestamp': time.time(),
            'detections': [],
            'fall_detected': False,
            'event_details': None
        }

        # 1. YOLO Detection
        persons = yolo_service.detect_persons(frame)
        
        for person in persons:
            bbox = person['bbox']
            confidence = person['confidence']
            
            # 2. Suspect Filter (Heuristics)
            is_suspect = self._is_suspect(bbox)
            
            detection_info = {
                'bbox': bbox,
                'is_suspect': is_suspect,
                'pose': None
            }

            if is_suspect:
                # 3. Pose Estimation (On-demand)
                pose_data = pose_service.estimate_pose(frame, bbox)
                detection_info['pose'] = pose_data
                
                # 4. Fall Confirmation
                if self._confirm_fall(pose_data):
                    results['fall_detected'] = True
                    results['event_details'] = {
                        'confidence': (confidence + pose_data['confidence']) / 2,
                        'bbox': bbox,
                        'pose': pose_data
                    }
            
            results['detections'].append(detection_info)
            
        return results

    def _is_suspect(self, bbox):
        """
        Improved fall detection heuristics.
        Uses combination of aspect ratio and vertical position
        """
        x1, y1, x2, y2 = bbox
        width = x2 - x1
        height = y2 - y1
        
        if height == 0: return False
        
        aspect_ratio = width / height
        center_y = (y1 + y2) / 2  # Vertical center of bounding box
        
        # Calculate bounding box area
        box_area = width * height
        frame_area = 640 * 480  # Typical frame size
        box_percentage = (box_area / frame_area) * 100
        
        # If person takes up more than 50% of frame AND is tall, they're standing too close
        if box_percentage > 50 and height > 250:
            return False
        
        # Detection 1: Horizontal lying (aspect ratio > 1.5)
        # Lying sideways - width much greater than height
        if aspect_ratio > 1.5:
            return True
        
        # Detection 2: Vertical lying (feet towards camera)
        # Key insight: When lying with feet towards camera, person is low in frame
        # but aspect ratio is closer to 1.0 (not very wide, not very tall)
        # Check if center of person is in lower half of frame AND not standing posture
        if center_y > 300 and aspect_ratio > 0.6 and aspect_ratio < 1.4 and y2 > 380:
            return True
        
        # Detection 3: Very short height on ground (compressed view)
        # When lying vertically, height can be very compressed
        if height < 180 and y2 > 360:
            return True
            
        return False

    def _confirm_fall(self, pose_data):
        """
        Confirm fall based on pose keypoints.
        """
        if not pose_data: return False
        
        # Check orientation from pose service
        if pose_data.get('orientation') == 'horizontal':
            return True
            
        # Check head vs hips vertical distance
        nose_y = pose_data['nose'][1]
        hip_y = (pose_data['left_hip'][1] + pose_data['right_hip'][1]) / 2
        
        # If head is roughly same level as hips (within threshold), likely fallen
        if abs(nose_y - hip_y) < 20: # pixel threshold
            return True
            
        return False

fall_pipeline = FallDetectionPipeline()
