from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime
import json

video_consultation_bp = Blueprint('video_consultation', __name__)

# Configuration
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'uploads', 'videos')
ALLOWED_EXTENSIONS = {'webm', 'mp4', 'avi', 'mov'}
MAX_FILE_SIZE = 100 * 1024 * 1024  # 100MB

# Ensure upload directory exists
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@video_consultation_bp.route('/upload', methods=['POST'])
def upload_video():
    """
    Upload a video recording from patient to doctor.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in upload_video: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Check if video file is present
        if 'video' not in request.files:
            return jsonify({'error': 'No video file provided'}), 400
        
        video_file = request.files['video']
        
        if video_file.filename == '':
            return jsonify({'error': 'No video file selected'}), 400
        
        if not allowed_file(video_file.filename):
            return jsonify({'error': 'Invalid file type. Allowed types: webm, mp4, avi, mov'}), 400
        
        # Get optional metadata
        description = request.form.get('description', '')
        patient_name = request.form.get('patient_name', 'Unknown Patient')
        
        # Generate unique filename
        file_extension = video_file.filename.rsplit('.', 1)[1].lower()
        unique_id = str(uuid.uuid4())
        timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
        filename = f"{user_id}_{timestamp}_{unique_id}.{file_extension}"
        
        # Save the video file
        filepath = os.path.join(UPLOAD_FOLDER, filename)
        video_file.save(filepath)
        
        # Get file size
        file_size = os.path.getsize(filepath)
        
        # Save metadata
        metadata = {
            'video_id': unique_id,
            'user_id': user_id,
            'filename': filename,
            'original_filename': secure_filename(video_file.filename),
            'description': description,
            'patient_name': patient_name,
            'file_size': file_size,
            'uploaded_at': datetime.utcnow().isoformat(),
            'status': 'uploaded'
        }
        
        # Save metadata to JSON file
        metadata_filename = f"{user_id}_{timestamp}_{unique_id}_metadata.json"
        metadata_filepath = os.path.join(UPLOAD_FOLDER, metadata_filename)
        
        with open(metadata_filepath, 'w') as f:
            json.dump(metadata, f, indent=2)
        
        print(f"Video uploaded successfully: {filename}")
        
        return jsonify({
            'success': True,
            'message': 'Video uploaded successfully',
            'video_id': unique_id,
            'filename': filename,
            'file_size': file_size
        }), 201
        
    except Exception as e:
        print(f"Error uploading video: {str(e)}")
        return jsonify({'error': f'Failed to upload video: {str(e)}'}), 500


@video_consultation_bp.route('/videos', methods=['GET'])
def get_all_videos():
    """
    Get all video consultations for the logged-in user.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_all_videos: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Get all metadata files for this user
        videos = []
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('_metadata.json') and filename.startswith(f"{user_id}_"):
                metadata_filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                with open(metadata_filepath, 'r') as f:
                    metadata = json.load(f)
                    
                # Verify the video file still exists
                video_filepath = os.path.join(UPLOAD_FOLDER, metadata['filename'])
                if os.path.exists(video_filepath):
                    videos.append(metadata)
        
        # Sort by upload date (newest first)
        videos.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'videos': videos,
            'count': len(videos)
        }), 200
        
    except Exception as e:
        print(f"Error getting videos: {str(e)}")
        return jsonify({'error': f'Failed to retrieve videos: {str(e)}'}), 500


@video_consultation_bp.route('/video/<video_id>', methods=['GET'])
def get_video(video_id):
    """
    Stream a specific video file.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_video: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Find the metadata file for this video
        metadata_file = None
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if filename.endswith('_metadata.json') and video_id in filename:
                metadata_filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                with open(metadata_filepath, 'r') as f:
                    metadata = json.load(f)
                    
                # Verify ownership
                if metadata.get('user_id') == user_id and metadata.get('video_id') == video_id:
                    video_filepath = os.path.join(UPLOAD_FOLDER, metadata['filename'])
                    
                    if os.path.exists(video_filepath):
                        return send_file(
                            video_filepath,
                            mimetype='video/webm',
                            as_attachment=False
                        )
        
        return jsonify({'error': 'Video not found'}), 404
        
    except Exception as e:
        print(f"Error getting video: {str(e)}")
        return jsonify({'error': f'Failed to retrieve video: {str(e)}'}), 500


@video_consultation_bp.route('/video/<video_id>', methods=['DELETE'])
def delete_video(video_id):
    """
    Delete a video and its metadata.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in delete_video: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Find and delete the video and metadata
        deleted = False
        
        for filename in os.listdir(UPLOAD_FOLDER):
            if video_id in filename:
                filepath = os.path.join(UPLOAD_FOLDER, filename)
                
                # If it's a metadata file, verify ownership first
                if filename.endswith('_metadata.json'):
                    with open(filepath, 'r') as f:
                        metadata = json.load(f)
                    
                    if metadata.get('user_id') == user_id and metadata.get('video_id') == video_id:
                        # Delete video file
                        video_filepath = os.path.join(UPLOAD_FOLDER, metadata['filename'])
                        if os.path.exists(video_filepath):
                            os.remove(video_filepath)
                        
                        # Delete metadata file
                        os.remove(filepath)
                        deleted = True
                        break
        
        if deleted:
            return jsonify({
                'success': True,
                'message': 'Video deleted successfully'
            }), 200
        else:
            return jsonify({'error': 'Video not found'}), 404
        
    except Exception as e:
        print(f"Error deleting video: {str(e)}")
        return jsonify({'error': f'Failed to delete video: {str(e)}'}), 500
