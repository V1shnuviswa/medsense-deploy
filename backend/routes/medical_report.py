"""API routes for medical report analysis."""
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
import os
import json
from datetime import datetime

from extensions import db
from models.medical_report import MedicalReport, ReportChatMessage
from services.medical_report_agent import MedicalReportAgent, ReportChatAgent
from utils.pdf_extractor import extract_text_from_pdf


medical_report_bp = Blueprint('medical_report', __name__)

# Initialize agents (will be configured with API keys from environment)
report_agent = None
chat_agent = None


def init_agents():
    """Initialize the AI agents with API keys."""
    global report_agent, chat_agent
    
    api_key = os.getenv('MOONSHOT_API_KEY', '')
    base_url = os.getenv('MOONSHOT_BASE_URL', 'https://api.groq.com/openai/v1')
    model = os.getenv('MOONSHOT_MODEL', 'moonshotai/kimi-k2-instruct')
    
    if not api_key:
        print("⚠️ WARNING: MOONSHOT_API_KEY not set. Medical report analysis will not work.")
        return False
    
    try:
        report_agent = MedicalReportAgent(api_key, base_url, model)
        chat_agent = ReportChatAgent(api_key, base_url, model)
        print("✅ Medical report agents initialized successfully")
        return True
    except Exception as e:
        print(f"❌ Error initializing medical report agents: {e}")
        return False


@medical_report_bp.route('/api/medical-reports/upload', methods=['POST'])
def upload_report():
    """Upload and analyze a medical report."""
    # Verify JWT first
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in upload: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    # Validate file type
    allowed_extensions = {'pdf'}
    if not ('.' in file.filename and file.filename.rsplit('.', 1)[1].lower() in allowed_extensions):
        return jsonify({'error': 'Only PDF files are supported'}), 400
    
    try:
        # Save file
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(current_app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        
        # Create database record
        report = MedicalReport(
            user_id=user_id,
            filename=filename,
            file_path=file_path,
            file_type='pdf',
            analysis_status='pending'
        )
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'id': report.id,
            'filename': filename,
            'status': 'uploaded',
            'message': 'File uploaded successfully. Starting analysis...'
        }), 201
        
    except Exception as e:
        print(f"Upload error: {e}")
        return jsonify({'error': f'Upload failed: {str(e)}'}), 500


@medical_report_bp.route('/api/medical-reports/<int:report_id>/analyze', methods=['POST'])
def analyze_report(report_id):
    """Analyze an uploaded medical report."""
    global report_agent, chat_agent
    
    # Initialize agents if not already done
    if report_agent is None:
        if not init_agents():
            return jsonify({'error': 'AI agents not configured. Please set MOONSHOT_API_KEY in environment.'}), 500
    
    report = MedicalReport.query.get_or_404(report_id)
    
    if report.analysis_status == 'completed':
        return jsonify({'message': 'Report already analyzed', 'report': report.to_dict()}), 200
    
    try:
        # Update status
        report.analysis_status = 'processing'
        db.session.commit()
        
        # Extract text from PDF
        print(f"Extracting text from: {report.file_path}")
        raw_text = extract_text_from_pdf(report.file_path)
        
        if not raw_text:
            report.analysis_status = 'failed'
            db.session.commit()
            return jsonify({'error': 'Failed to extract text from PDF'}), 500
        
        report.raw_text = raw_text
        db.session.commit()
        
        # Analyze report using AI agent
        print(f"Analyzing report with AI agent...")
        analysis = report_agent.analyze_report(raw_text)
        
        # Save analysis results
        report.summary = analysis.get('summary', '')
        report.biomarkers_high = json.dumps(analysis.get('biomarkers_high', []))
        report.biomarkers_low = json.dumps(analysis.get('biomarkers_low', []))
        report.biomarkers_borderline = json.dumps(analysis.get('biomarkers_borderline', []))
        report.biomarkers_normal = json.dumps(analysis.get('biomarkers_normal', []))
        report.precautions = json.dumps(analysis.get('precautions', []))
        report.recommendations = json.dumps(analysis.get('recommendations', []))
        report.daily_routine = json.dumps(analysis.get('daily_routine', []))
        report.complete_analysis = analysis.get('complete_analysis', '')
        
        # Create vector store for chatbot
        print(f"Creating vector store for chatbot...")
        collection_id = chat_agent.create_vector_store(str(report_id), raw_text, analysis)
        report.vector_collection_id = collection_id
        
        report.analysis_status = 'completed'
        db.session.commit()
        
        return jsonify({
            'message': 'Analysis completed successfully',
            'report': report.to_dict()
        }), 200
        
    except Exception as e:
        print(f"Analysis error: {e}")
        import traceback
        traceback.print_exc()
        report.analysis_status = 'failed'
        db.session.commit()
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500


@medical_report_bp.route('/api/medical-reports', methods=['GET'])
def get_reports():
    """Get all medical reports for the logged-in user."""
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_reports: {str(e)}")
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    
    if not user_id:
        return jsonify({'message': 'Authentication required'}), 401
    
    reports = MedicalReport.query.filter_by(user_id=user_id).order_by(MedicalReport.uploaded_at.desc()).all()
    return jsonify([report.to_dict() for report in reports]), 200


@medical_report_bp.route('/api/medical-reports/<int:report_id>', methods=['GET'])
def get_report(report_id):
    """Get a specific medical report for the logged-in user."""
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_report: {str(e)}")
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    
    if not user_id:
        return jsonify({'message': 'Authentication required'}), 401
    
    report = MedicalReport.query.filter_by(id=report_id, user_id=user_id).first_or_404()
    return jsonify(report.to_dict()), 200


@medical_report_bp.route('/api/medical-reports/<int:report_id>/chat', methods=['POST'])
def chat_with_report(report_id):
    """Chat with the AI about a specific medical report."""
    global chat_agent
    
    # Initialize agents if not already done
    if chat_agent is None:
        if not init_agents():
            return jsonify({'error': 'AI agents not configured. Please set MOONSHOT_API_KEY in environment.'}), 500
    
    report = MedicalReport.query.get_or_404(report_id)
    
    if report.analysis_status != 'completed':
        return jsonify({'error': 'Report analysis not completed yet'}), 400
    
    data = request.get_json()
    question = data.get('question', '').strip()
    
    if not question:
        return jsonify({'error': 'Question is required'}), 400
    
    try:
        # Save user message
        user_message = ReportChatMessage(
            report_id=report_id,
            role='user',
            content=question
        )
        db.session.add(user_message)
        db.session.commit()
        
        # Get chat history
        chat_history = ReportChatMessage.query.filter_by(report_id=report_id).order_by(ReportChatMessage.timestamp).all()
        history_list = [{'role': msg.role, 'content': msg.content} for msg in chat_history[:-1]]  # Exclude the current question
        
        # Reconstruct analysis from database
        analysis = {
            'summary': report.summary,
            'complete_analysis': report.complete_analysis,
            'biomarkers_high': json.loads(report.biomarkers_high) if report.biomarkers_high else [],
            'biomarkers_low': json.loads(report.biomarkers_low) if report.biomarkers_low else [],
            'biomarkers_borderline': json.loads(report.biomarkers_borderline) if report.biomarkers_borderline else [],
            'precautions': json.loads(report.precautions) if report.precautions else [],
            'recommendations': json.loads(report.recommendations) if report.recommendations else [],
            'daily_routine': json.loads(report.daily_routine) if report.daily_routine else []
        }
        
        # Get AI response
        answer = chat_agent.chat(
            str(report_id),
            question,
            report.raw_text,
            analysis,
            history_list
        )
        
        # Save assistant message
        assistant_message = ReportChatMessage(
            report_id=report_id,
            role='assistant',
            content=answer
        )
        db.session.add(assistant_message)
        db.session.commit()
        
        return jsonify({
            'question': question,
            'answer': answer,
            'timestamp': assistant_message.timestamp.isoformat()
        }), 200
        
    except Exception as e:
        print(f"Chat error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Chat failed: {str(e)}'}), 500


@medical_report_bp.route('/api/medical-reports/<int:report_id>/chat/history', methods=['GET'])
def get_chat_history(report_id):
    """Get chat history for a specific report."""
    report = MedicalReport.query.get_or_404(report_id)
    messages = ReportChatMessage.query.filter_by(report_id=report_id).order_by(ReportChatMessage.timestamp).all()
    return jsonify([msg.to_dict() for msg in messages]), 200


@medical_report_bp.route('/api/medical-reports/<int:report_id>', methods=['DELETE'])
def delete_report(report_id):
    """Delete a medical report and its associated data."""
    report = MedicalReport.query.get_or_404(report_id)
    
    try:
        # Delete file
        if os.path.exists(report.file_path):
            os.remove(report.file_path)
        
        # Delete from database (cascade will delete chat messages)
        db.session.delete(report)
        db.session.commit()
        
        return jsonify({'message': 'Report deleted successfully'}), 200
        
    except Exception as e:
        print(f"Delete error: {e}")
        return jsonify({'error': f'Delete failed: {str(e)}'}), 500
