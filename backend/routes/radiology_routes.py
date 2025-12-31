from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.radiology.radiology_service import RadiologyService
from services.radiology.ai_segmentation_service import AISegmentationService

radiology_bp = Blueprint('radiology', __name__)

@radiology_bp.route('/upload', methods=['POST'])
@jwt_required()
def upload_dicom():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400
            
        patient_id = request.form.get('patient_id')
        
        result = RadiologyService.process_dicom_upload(file, patient_id)
        return jsonify(result), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/metadata', methods=['POST'])
@jwt_required()
def get_metadata():
    """
    Extract metadata from a file without saving it permanently.
    Useful for the frontend to preview patient info before confirming upload.
    """
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400
            
        metadata = RadiologyService.get_metadata_only(file)
        return jsonify({'success': True, 'metadata': metadata})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/studies/<study_id>', methods=['GET'])
@jwt_required()
def get_study(study_id):
    try:
        study = RadiologyService.get_study(study_id)
        if not study:
            return jsonify({'success': False, 'error': 'Study not found'}), 404
        return jsonify({'success': True, 'study': study.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/studies/<study_id>/images', methods=['GET'])
@jwt_required()
def get_study_images(study_id):
    try:
        images = RadiologyService.get_study_images(study_id)
        return jsonify({'success': True, 'images': [img.to_dict() for img in images]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/upload/nifti', methods=['POST'])
@jwt_required()
def upload_nifti():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400
            
        patient_id = request.form.get('patient_id')
        study_id = request.form.get('study_id')
        
        result = RadiologyService.process_nifti_upload(file, patient_id, study_id)
        return jsonify(result), 201
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/metadata/nifti', methods=['POST'])
@jwt_required()
def get_nifti_metadata():
    try:
        if 'file' not in request.files:
            return jsonify({'success': False, 'error': 'No file part'}), 400
            
        file = request.files['file']
        if file.filename == '':
            return jsonify({'success': False, 'error': 'No selected file'}), 400
            
        metadata = RadiologyService.get_nifti_metadata_only(file)
        return jsonify({'success': True, 'metadata': metadata})
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/studies/<study_id>/convert/nifti', methods=['POST'])
@jwt_required()
def convert_to_nifti(study_id):
    try:
        result = RadiologyService.convert_study_to_nifti(study_id)
        return jsonify({'success': True, 'files': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

# --- AI Analysis Endpoints ---

@radiology_bp.route('/models', methods=['GET'])
@jwt_required()
def get_models():
    """List available AI models"""
    try:
        modality = request.args.get('modality')
        models = AISegmentationService.get_available_models(modality)
        return jsonify({'success': True, 'models': models})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@radiology_bp.route('/analyze', methods=['POST'])
@jwt_required()
def analyze_image():
    """Run AI analysis on a study or specific image"""
    try:
        data = request.get_json()
        study_id = data.get('study_id')
        modality = data.get('modality')
        model_id = data.get('model_id')
        
        if not all([study_id, modality, model_id]):
            return jsonify({'success': False, 'error': 'Missing required parameters'}), 400
            
        # Get image path from study (simplified: getting first image)
        images = RadiologyService.get_study_images(study_id)
        if not images:
            return jsonify({'success': False, 'error': 'No images found for study'}), 404
            
        # In a real scenario, we might analyze the whole series or a specific slice
        # For now, let's analyze the middle slice or first one
        target_image = images[len(images)//2]
        
        results = AISegmentationService.analyze_image(target_image.file_path, modality, model_id)
        
        return jsonify({
            'success': True, 
            'results': results,
            'model_id': model_id,
            'analyzed_image_id': target_image.id
        })
        
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
