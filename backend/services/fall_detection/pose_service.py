import random

class PoseService:
    def __init__(self):
        self.model_loaded = False
        # In real implementation: import mediapipe as mp
        self.model_loaded = True

    def estimate_pose(self, frame, bbox):
        """
        Simulates Pose Estimation on a cropped person image (bbox).
        Returns keypoints.
        """
        # Mock pose data
        # Keypoints: nose, shoulders, hips, knees, ankles
        
        # Simulate a "fallen" pose vs "standing" pose based on random chance or input
        is_fallen = random.random() > 0.8
        
        if is_fallen:
            # Horizontal-ish coordinates
            return {
                'nose': [150, 280],
                'left_shoulder': [140, 280],
                'right_shoulder': [160, 280],
                'left_hip': [140, 285],
                'right_hip': [160, 285],
                'left_ankle': [140, 290],
                'right_ankle': [160, 290],
                'orientation': 'horizontal',
                'confidence': 0.9
            }
        else:
            # Vertical coordinates
            return {
                'nose': [150, 120],
                'left_shoulder': [140, 140],
                'right_shoulder': [160, 140],
                'left_hip': [145, 200],
                'right_hip': [155, 200],
                'left_ankle': [145, 280],
                'right_ankle': [155, 280],
                'orientation': 'vertical',
                'confidence': 0.95
            }

pose_service = PoseService()
