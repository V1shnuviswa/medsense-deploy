from flask import Blueprint, request, jsonify, Response
from extensions import db
from models.fall_detection import Camera, FallEvent
from services.fall_detection.pipeline import fall_pipeline
from services.fall_detection.video_stream_service import video_stream_service
import datetime
import cv2
import numpy as np
import time

fall_bp = Blueprint('fall_detection', __name__)

# --- Camera Management ---

@fall_bp.route('/cameras', methods=['GET'])
def get_cameras():
    cameras = Camera.query.all()
    return jsonify([c.to_dict() for c in cameras])

@fall_bp.route('/cameras', methods=['POST'])
def register_camera():
    data = request.get_json()
    camera = Camera(
        name=data['name'],
        location=data.get('location'),
        url=data.get('url'),
        status='Active'
    )
    db.session.add(camera)
    db.session.commit()
    return jsonify(camera.to_dict()), 201

@fall_bp.route('/cameras/detect-webcam', methods=['POST'])
def detect_webcam():
    """
    Detect and register available webcams (laptop camera, USB cameras)
    """
    try:
        # Try to detect webcams (indices 0-2 usually cover most systems)
        available_cameras = []
        
        for i in range(3):
            cap = cv2.VideoCapture(i, cv2.CAP_DSHOW)  # Use DirectShow on Windows for better compatibility
            if cap.isOpened():
                # Check if we can actually read multiple frames to ensure it's working
                ret1, frame1 = cap.read()
                time.sleep(0.1)
                ret2, frame2 = cap.read()
                
                if ret1 and ret2 and frame1 is not None and frame2 is not None:
                    # Verify frames are different (camera is actually streaming)
                    if not np.array_equal(frame1, frame2):
                        available_cameras.append({
                            'index': i,
                            'name': f'Webcam {i}' if i > 0 else 'Built-in Camera',
                            'url': str(i)
                        })
                cap.release()
            cv2.destroyAllWindows()
        
        if not available_cameras:
            return jsonify({'error': 'No webcams detected'}), 404
        
        # Register the first available camera if none exist
        existing_cameras = Camera.query.filter(Camera.url.in_([str(c['index']) for c in available_cameras])).all()
        existing_urls = {cam.url for cam in existing_cameras}
        
        registered = []
        for cam_info in available_cameras:
            if cam_info['url'] not in existing_urls:
                camera = Camera(
                    name=cam_info['name'],
                    location='Local Device',
                    url=cam_info['url'],
                    status='Active'
                )
                db.session.add(camera)
                registered.append(cam_info['name'])
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'available': len(available_cameras),
            'registered': registered,
            'message': f'Detected {len(available_cameras)} webcam(s). Registered: {", ".join(registered) if registered else "Already registered"}'
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Video Streaming ---

@fall_bp.route('/stream/<camera_id>', methods=['GET'])
def video_stream(camera_id):
    """
    Stream live video from a camera with real-time fall detection overlays
    """
    try:
        # Get camera from database
        camera = Camera.query.get_or_404(camera_id)
        
        if not camera.url:
            return jsonify({'error': 'Camera URL not configured'}), 400
        
        # Return streaming response
        return Response(
            video_stream_service.generate_frames(camera.url),
            mimetype='multipart/x-mixed-replace; boundary=frame'
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# --- Inference / Stream Simulation ---

@fall_bp.route('/infer/frame', methods=['POST'])
def infer_frame():
    """
    Endpoint to process a single frame (e.g., sent from frontend or edge device).
    """
    # In a real app, we'd handle file upload or base64 image
    # For simulation, we just trigger the pipeline logic with dummy data
    
    camera_id = request.json.get('camera_id')
    
    # Simulate processing
    result = fall_pipeline.process_frame(camera_id, None) # Passing None as frame for mock
    
    if result['fall_detected']:
        # Create event
        event = FallEvent(
            camera_id=camera_id,
            confidence=result['event_details']['confidence'],
            severity='High',
            status='New',
            metadata_json=str(result['event_details'])
        )
        db.session.add(event)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'fall_detected': True,
            'event': event.to_dict()
        })
        
    return jsonify({
        'success': True,
        'fall_detected': False,
        'detections': result['detections']
    })

# --- Event Management ---

@fall_bp.route('/events', methods=['GET'])
def get_events():
    events = FallEvent.query.order_by(FallEvent.timestamp.desc()).limit(50).all()
    return jsonify([e.to_dict() for e in events])

@fall_bp.route('/events/<event_id>/acknowledge', methods=['POST'])
def acknowledge_event(event_id):
    event = FallEvent.query.get_or_404(event_id)
    event.status = 'Acknowledged'
    db.session.commit()
    return jsonify(event.to_dict())

@fall_bp.route('/stats', methods=['GET'])
def get_stats():
    total_events = FallEvent.query.count()
    active_cameras = Camera.query.filter_by(status='Active').count()
    recent_falls = FallEvent.query.filter(
        FallEvent.timestamp > datetime.datetime.utcnow() - datetime.timedelta(hours=24)
    ).count()
    
    return jsonify({
        'total_events': total_events,
        'active_cameras': active_cameras,
        'recent_falls_24h': recent_falls
    })
