from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from services.users.clinician_service import ClinicianService

clinician_bp = Blueprint('clinician', __name__)

@clinician_bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    try:
        current_user_id = get_jwt_identity()
        clinician = ClinicianService.get_clinician_profile(current_user_id)
        if not clinician:
            return jsonify({'success': False, 'error': 'Clinician not found'}), 404
        return jsonify({'success': True, 'profile': clinician.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clinician_bp.route('/patients', methods=['GET'])
@jwt_required()
def get_my_patients():
    try:
        current_user_id = get_jwt_identity()
        patients = ClinicianService.get_assigned_patients(current_user_id)
        return jsonify({'success': True, 'patients': [p.to_dict() for p in patients]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@clinician_bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    try:
        current_user_id = get_jwt_identity()
        data = request.get_json()
        clinician = ClinicianService.update_profile(current_user_id, data)
        if not clinician:
            return jsonify({'success': False, 'error': 'Clinician not found'}), 404
        return jsonify({'success': True, 'profile': clinician.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
