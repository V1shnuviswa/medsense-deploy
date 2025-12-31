from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from services.users.patient_service import PatientService

patient_bp = Blueprint('patient', __name__)

@patient_bp.route('/', methods=['GET'])
@jwt_required()
def get_patients():
    try:
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        patients = PatientService.get_all_patients(limit, offset)
        return jsonify({'success': True, 'patients': [p.to_dict() for p in patients]})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@patient_bp.route('/<patient_id>', methods=['GET'])
@jwt_required()
def get_patient(patient_id):
    try:
        patient = PatientService.get_patient_by_id(patient_id)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        return jsonify({'success': True, 'patient': patient.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@patient_bp.route('/', methods=['POST'])
@jwt_required()
def create_patient():
    try:
        data = request.get_json()
        patient = PatientService.create_patient(data)
        return jsonify({'success': True, 'patient': patient.to_dict()}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@patient_bp.route('/<patient_id>', methods=['PUT'])
@jwt_required()
def update_patient(patient_id):
    try:
        data = request.get_json()
        patient = PatientService.update_patient(patient_id, data)
        if not patient:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        return jsonify({'success': True, 'patient': patient.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@patient_bp.route('/<patient_id>', methods=['DELETE'])
@jwt_required()
def delete_patient(patient_id):
    try:
        success = PatientService.delete_patient(patient_id)
        if not success:
            return jsonify({'success': False, 'error': 'Patient not found'}), 404
        return jsonify({'success': True, 'message': 'Patient deleted successfully'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500
