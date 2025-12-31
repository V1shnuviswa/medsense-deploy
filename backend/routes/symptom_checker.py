"""Symptom Checker routes for the Flask backend."""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from typing import Dict, Any
from extensions import db
from models.medical import SymptomCheck
import datetime

# Create blueprint
symptom_checker_bp = Blueprint('symptom_checker', __name__)

# Lazy import to avoid loading heavy dependencies at startup
_agent = None

def get_agent():
    """Lazy load the symptom checker agent."""
    global _agent
    if _agent is None:
        from services.symptom_checker_agent import agent
        _agent = agent
    return _agent


@symptom_checker_bp.route('/api/symptom-checker/analyze', methods=['POST'])
def analyze_symptoms():
    """
    Analyze symptoms and return diagnosis with recommendations.
    
    Request JSON:
        {
            "symptoms": "description of symptoms"
        }
    
    Response JSON:
        {
            "symptoms": str,
            "opening_message": str,
            "diagnosis": list,
            "medications": list,
            "medication_disclaimer": str,
            "diet": list,
            "precautions": str,
            "doctor_visit": str,
            "doctor_specialist": str,
            "severity": str,
            "recommendations": str,
            "dos_donts": dict,
            "sources": list
        }
    """
    # Verify JWT (optional - allow anonymous symptom checks)
    user_id = None
    try:
        verify_jwt_in_request(optional=True)
        identity = get_jwt_identity()
        if identity:
            user_id = int(identity)
    except Exception as e:
        print(f"DEBUG: JWT optional check: {str(e)}")
        # Continue without user_id for anonymous checks
    
    try:
        data = request.get_json()
        
        if not data or 'symptoms' not in data:
            return jsonify({'error': 'Symptoms are required'}), 400
        
        symptoms = data['symptoms'].strip()
        
        if not symptoms:
            return jsonify({'error': 'Symptoms cannot be empty'}), 400
        
        # Get the agent and analyze symptoms
        agent = get_agent()
        result = agent.analyze_symptoms(symptoms)
        
        # Helper function to ensure symptoms is a string
        def format_symptoms(symptoms_data):
            if isinstance(symptoms_data, list):
                return ", ".join(str(s) for s in symptoms_data)
            return str(symptoms_data) if symptoms_data else symptoms
        
        # Helper function to ensure sources is properly formatted
        def format_sources(sources_data):
            if not sources_data:
                return []
            if isinstance(sources_data, list):
                formatted = []
                for source in sources_data:
                    if isinstance(source, dict):
                        formatted.append({
                            "title": str(source.get("title", "Medical Source")),
                            "url": str(source.get("url", ""))
                        })
                return formatted
            return []
        
        # Ensure all required fields are present and properly formatted
        response = {
            "symptoms": format_symptoms(result.get("symptoms")),
            "opening_message": result.get("opening_message", "Thank you for sharing your symptoms with me. Let me help you understand what might be going on."),
            "diagnosis": result.get("diagnosis", ["Unable to determine diagnosis"]) if isinstance(result.get("diagnosis"), list) else [str(result.get("diagnosis", "Unable to determine diagnosis"))],
            "possible_conditions": result.get("possible_conditions", []) if isinstance(result.get("possible_conditions"), list) else [],
            "medications": result.get("medications", []) if isinstance(result.get("medications"), list) else [],
            "medication_disclaimer": result.get(
                "medication_disclaimer",
                "⚠️ IMPORTANT: Do NOT take any medications without consulting a qualified healthcare professional first. These are suggestions for discussion with your doctor only."
            ),
            "diet": result.get("diet", []) if isinstance(result.get("diet"), list) else [],
            "precautions": result.get("precautions", "Please monitor your symptoms and consult a healthcare professional"),
            "doctor_visit": result.get("doctor_visit", "no"),
            "doctor_specialist": result.get("doctor_specialist", ""),
            "urgency": result.get("urgency", "routine"),
            "severity": result.get("severity", "moderate"),
            "recommendations": result.get("recommendations", "Please consult with a healthcare professional for proper evaluation"),
            "when_to_seek_emergency": result.get(
                "when_to_seek_emergency",
                "Seek immediate medical attention for severe symptoms, difficulty breathing, chest pain, or sudden changes"
            ),
            "dos_donts": result.get("dos_donts", {"dos": [], "donts": []}) if isinstance(result.get("dos_donts"), dict) else {"dos": [], "donts": []},
            "sources": format_sources(result.get("sources", []))
        }
        
        # Save to database if user is logged in
        if user_id:
            try:
                symptom_check = SymptomCheck(
                    user_id=user_id,
                    description=symptoms,
                    severity=result.get("severity", "moderate"),
                    duration=None,  # Can be added to frontend later
                    onset=None,  # Can be added to frontend later
                    ai_response=str(result.get("diagnosis", [])),
                    created_at=datetime.datetime.now(datetime.UTC)
                )
                db.session.add(symptom_check)
                db.session.commit()
                print(f"DEBUG: Saved symptom check for user {user_id}")
            except Exception as db_error:
                print(f"DEBUG: Error saving symptom check: {str(db_error)}")
                # Don't fail the request if DB save fails
        
        return jsonify(response), 200
        
    except Exception as e:
        print(f"Error in symptom checker: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({
            'error': f'Error analyzing symptoms: {str(e)}',
            'symptoms': data.get('symptoms', ''),
            'diagnosis': ['Unable to process symptoms at this time.'],
            'medications': [],
            'diet': [],
            'precautions': 'Please consult with a healthcare professional.',
            'doctor_visit': 'yes',
            'severity': 'unknown',
            'recommendations': 'Please consult with a healthcare professional for proper evaluation.'
        }), 500


@symptom_checker_bp.route('/api/symptom-checker/health', methods=['GET'])
def health_check():
    """Health check endpoint for symptom checker."""
    try:
        from services.symptom_checker_config import config
        return jsonify({
            'status': 'healthy',
            'model': config.MOONSHOT_MODEL,
            'api_configured': bool(config.MOONSHOT_API_KEY),
            'mock_mode': config.MOCK_MODE
        }), 200
    except Exception as e:
        return jsonify({
            'status': 'error',
            'error': str(e)
        }), 500
