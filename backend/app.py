from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_jwt_extended import JWTManager, jwt_required, create_access_token, get_jwt_identity
from werkzeug.security import generate_password_hash, check_password_hash
from werkzeug.utils import secure_filename
import os
import uuid
from datetime import datetime, timedelta, timezone
import pydicom
import numpy as np
from PIL import Image
import io
import base64
import json
from dotenv import load_dotenv

# Load environment variables from .env.symptom file for API keys
load_dotenv('.env.symptom')
# Load database environment variables from .env file
load_dotenv('.env')

# Import extensions and models
from extensions import db
from models.auth import User, AuditLog, Session
from models.medical import Patient, Study, DicomFile, VLMAnalysis, Segmentation, Report, SymptomCheck, HealthRecord, Medication, Condition, ExplainedDocument, JournalEntry, WearableDevice, WearableMetric
from models.feedback import UserFeedback
from models.medical_report import MedicalReport, ReportChatMessage
from models.fall_detection import Camera, FallEvent
from routes.radiology_reports import reports_bp
from routes.fall_detection import fall_bp

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# PostgreSQL Database Configuration
DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = os.getenv('DB_PORT', '5432')
DB_NAME = os.getenv('DB_NAME', 'medsense_db')
DB_USER = os.getenv('DB_USER', 'postgres')
DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')

# URL encode the password to handle special characters
from urllib.parse import quote_plus
encoded_password = quote_plus(DB_PASSWORD)

# Construct PostgreSQL connection string
app.config['SQLALCHEMY_DATABASE_URI'] = f'postgresql://{DB_USER}:{encoded_password}@{DB_HOST}:{DB_PORT}/{DB_NAME}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'jwt-secret-string-change-in-production')
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['UPLOAD_FOLDER'] = 'uploads'
app.config['MAX_CONTENT_LENGTH'] = 500 * 1024 * 1024  # 500MB max file size

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize extensions
db.init_app(app)
jwt = JWTManager(app)
CORS(app)

# JWT error handlers
@jwt.invalid_token_loader
def invalid_token_callback(error):
    return jsonify({
        'message': 'Invalid token',
        'error': str(error)
    }), 422

@jwt.unauthorized_loader
def missing_token_callback(error):
    return jsonify({
        'message': 'Missing authorization token',
        'error': str(error)
    }), 401

@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({
        'message': 'Token has expired',
        'error': 'token_expired'
    }), 401


from routes.patient_routes import patient_bp
from routes.clinician_routes import clinician_bp
from routes.radiology_routes import radiology_bp
from routes.symptom_checker import symptom_checker_bp
from routes.doctor_notes import doctor_notes_bp
from routes.care_locator import care_locator_bp
from routes.health_chatbot import health_chatbot_bp
from routes.medical_report import medical_report_bp
from routes.evidence_routes import evidence_bp
from routes.wearable_routes import wearable_bp
from routes.video_consultation import video_consultation_bp
from routes.feedback import feedback_bp

# Register blueprints
app.register_blueprint(reports_bp, url_prefix='/api/reports')
app.register_blueprint(fall_bp, url_prefix='/api/fall-detection')
app.register_blueprint(patient_bp, url_prefix='/api/patients')
app.register_blueprint(clinician_bp, url_prefix='/api/clinician')
app.register_blueprint(radiology_bp, url_prefix='/api/radiology')
app.register_blueprint(symptom_checker_bp)
app.register_blueprint(doctor_notes_bp, url_prefix='/api/doctor-notes')
app.register_blueprint(care_locator_bp, url_prefix='/api/care-locator')
app.register_blueprint(health_chatbot_bp)
app.register_blueprint(medical_report_bp)
app.register_blueprint(evidence_bp, url_prefix='/api/evidence')
app.register_blueprint(wearable_bp, url_prefix='/api/wearable')
app.register_blueprint(video_consultation_bp, url_prefix='/api/video-consultation')
app.register_blueprint(feedback_bp, url_prefix='/api')

# Create tables
with app.app_context():
    db.create_all()

# Authentication Routes
@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    
    user = User.query.filter_by(username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        # Update last login
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()
        
        # Create token with user ID as string (JWT requires string subject)
        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'role': user.role,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
        }), 200
    
    return jsonify({'message': 'Invalid credentials'}), 401


@app.route('/api/auth/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')
    first_name = data.get('first_name', '')
    last_name = data.get('last_name', '')
    
    if User.query.filter_by(username=username).first():
        return jsonify({'message': 'Username already exists'}), 400
    
    if User.query.filter_by(email=email).first():
        return jsonify({'message': 'Email already exists'}), 400
    
    user = User(
        username=username,
        email=email,
        password_hash=generate_password_hash(password),
        first_name=first_name,
        last_name=last_name
    )
    
    db.session.add(user)
    db.session.commit()
    
    return jsonify({'message': 'User created successfully'}), 201

# --- New Routes for Application Restructure ---

# Symptom Checker Routes
@app.route('/api/symptoms/check', methods=['POST'])
def check_symptoms():
    data = request.get_json()
    
    # Simulate AI analysis
    description = data.get('description', '').lower()
    response = "I understand. Can you tell me more?"
    if 'pain' in description:
        response = "Could you describe the pain? Is it sharp, dull, throbbing?"
    elif 'fever' in description:
        response = "Have you measured your temperature? When did it start?"
    
    check = SymptomCheck(
        description=data.get('description'),
        severity=data.get('severity'),
        duration=data.get('duration'),
        onset=data.get('onset'),
        ai_response=response
    )
    db.session.add(check)
    db.session.commit()
    
    return jsonify({
        'id': check.id,
        'response': response,
        'timestamp': datetime.utcnow().isoformat()
    })

# Health Vault Routes
@app.route('/api/health-records', methods=['GET'])
def get_health_records():
    records = HealthRecord.query.order_by(HealthRecord.date.desc()).all()
    return jsonify([r.to_dict() for r in records])

@app.route('/api/health-records', methods=['POST'])
def create_health_record():
    data = request.get_json()
    record = HealthRecord(
        type=data['type'],
        title=data['title'],
        doctor=data['doctor'],
        date=datetime.strptime(data['date'], '%Y-%m-%d').date() if data.get('date') else datetime.utcnow().date(),
        content=data.get('content')
    )
    db.session.add(record)
    db.session.commit()
    return jsonify(record.to_dict()), 201

@app.route('/api/medications', methods=['GET'])
def get_medications():
    meds = Medication.query.all()
    return jsonify([m.to_dict() for m in meds])

@app.route('/api/medications', methods=['POST'])
def add_medication():
    data = request.get_json()
    med = Medication(
        name=data['name'],
        dosage=data['dosage'],
        frequency=data['frequency'],
        status=data.get('status', 'Active')
    )
    db.session.add(med)
    db.session.commit()
    return jsonify(med.to_dict()), 201

# Dashboard Routes - User-specific data
@app.route('/api/dashboard/stats', methods=['GET'])
def get_dashboard_stats():
    """Get dashboard statistics for the logged-in user"""
    # Manual JWT verification
    from flask_jwt_extended import verify_jwt_in_request
    from flask_jwt_extended.exceptions import NoAuthorizationError
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())  # Convert string to int
    except Exception as e:
        print(f"DEBUG: JWT Error: {str(e)}")
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    
    if not user_id:
        return jsonify({'message': 'Authentication required', 'error': 'No user ID in token'}), 401
    
    user = db.session.get(User, user_id)
    
    if not user:
        return jsonify({'message': 'User not found'}), 404
    
    # Import MedicalReport model
    from models.medical_report import MedicalReport
    from services.doctor_notes_vector_store import DoctorNotesVectorStore
    
    # Count user's medical reports (uploaded PDFs)
    medical_reports_count = MedicalReport.query.filter_by(user_id=user_id).count()
    
    # Count active medications from doctor notes
    active_medications_count = 0
    try:
        vector_store = DoctorNotesVectorStore()
        all_notes = vector_store.get_all_notes()
        
        # Filter by user and extract medications
        user_notes = [note for note in all_notes if note.get('user_id') == user_id and not note.get('deleted', False)]
        unique_medications = set()
        
        for note in user_notes:
            patient_context = note.get('patient_context', {})
            medications = patient_context.get('medications', [])
            if isinstance(medications, list):
                unique_medications.update(medications)
        
        active_medications_count = len(unique_medications)
    except Exception as e:
        print(f"DEBUG: Error counting medications from notes: {str(e)}")
        # Fallback to 0 if error
    
    # Get recent symptom checks for this user
    recent_symptom_checks = SymptomCheck.query.filter_by(user_id=user_id).order_by(SymptomCheck.created_at.desc()).limit(5).all()
    
    # Get latest medical report
    latest_report = MedicalReport.query.filter_by(user_id=user_id).order_by(MedicalReport.uploaded_at.desc()).first()
    
    return jsonify({
        'user': {
            'id': user.id,
            'username': user.username,
            'first_name': user.first_name,
            'last_name': user.last_name,
            'full_name': user.full_name
        },
        'stats': {
            'health_records_count': medical_reports_count,  # Count of uploaded medical reports
            'active_medications_count': active_medications_count,  # Count from doctor notes
            'symptom_checks_count': len(recent_symptom_checks),
            'latest_health_record': latest_report.to_dict() if latest_report else None
        }
    }), 200

@app.route('/api/dashboard/recent-activity', methods=['GET'])
def get_recent_activity():
    """Get recent activity for the logged-in user"""
    # Manual JWT verification
    from flask_jwt_extended import verify_jwt_in_request
    
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())  # Convert string to int
    except Exception as e:
        print(f"DEBUG: JWT Error: {str(e)}")
        return jsonify({'message': 'Authentication required', 'error': str(e)}), 401
    
    if not user_id:
        return jsonify({'message': 'Authentication required', 'error': 'No user ID in token'}), 401
    
    activities = []
    
    # Import MedicalReport model
    from models.medical_report import MedicalReport
    
    # Get recent symptom checks
    symptom_checks = SymptomCheck.query.filter_by(user_id=user_id).order_by(SymptomCheck.created_at.desc()).limit(3).all()
    for check in symptom_checks:
        activities.append({
            'type': 'symptom',
            'title': 'Symptom Check',
            'desc': check.description[:50] + '...' if len(check.description) > 50 else check.description,
            'time': check.created_at.isoformat() + 'Z' if check.created_at else datetime.now(datetime.UTC).isoformat(),
            'icon': 'MessageCircle',
            'color': 'violet'
        })
    
    # Get recent medical reports (user-specific)
    medical_reports = MedicalReport.query.filter_by(user_id=user_id).order_by(MedicalReport.uploaded_at.desc()).limit(3).all()
    for report in medical_reports:
        activities.append({
            'type': 'report',
            'title': 'Medical Report Uploaded',
            'desc': report.filename,
            'time': report.uploaded_at.isoformat() + 'Z' if report.uploaded_at else datetime.now(datetime.UTC).isoformat(),
            'icon': 'FileText',
            'color': 'blue'
        })
    
    # Get recent health records (make user-specific if patient_id exists)
    health_records = HealthRecord.query.order_by(HealthRecord.created_at.desc()).limit(2).all()
    for record in health_records:
        activities.append({
            'type': 'health_record',
            'title': f'{record.type} Record' if record.type else 'Health Record',
            'desc': record.title,
            'time': record.created_at.isoformat() + 'Z' if record.created_at else datetime.now(datetime.UTC).isoformat(),
            'icon': 'Activity',
            'color': 'rose'
        })
    
    # Get recent doctor notes from vector store
    try:
        from services.doctor_notes_vector_store import DoctorNotesVectorStore
        vector_store = DoctorNotesVectorStore()
        all_notes = vector_store.get_all_notes()
        
        # Filter by user and get recent ones
        user_notes = [
            note for note in all_notes 
            if note.get('user_id') == user_id and not note.get('deleted', False)
        ]
        
        # Sort by created_at and take top 3
        user_notes.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        recent_notes = user_notes[:3]
        
        for note in recent_notes:
            activities.append({
                'type': 'doctor_note',
                'title': 'Doctor Note Created',
                'desc': note.get('title', 'Consultation Note')[:50] + '...' if len(note.get('title', '')) > 50 else note.get('title', 'Consultation Note'),
                'time': note.get('created_at', '') + 'Z' if note.get('created_at') else datetime.now(datetime.UTC).isoformat(),
                'icon': 'FileText',
                'color': 'emerald'
            })
    except Exception as e:
        print(f"DEBUG: Error fetching doctor notes for activity: {str(e)}")
    
    # Get recent video consultations
    try:
        import os
        import json
        from pathlib import Path
        
        print(f"DEBUG: Looking for videos for user_id: {user_id}")
        
        video_folder = os.path.join(os.path.dirname(__file__), 'uploads', 'videos')
        print(f"DEBUG: Video folder path: {video_folder}")
        print(f"DEBUG: Video folder exists: {os.path.exists(video_folder)}")
        
        if os.path.exists(video_folder):
            video_files = []
            all_files = os.listdir(video_folder)
            print(f"DEBUG: All files in video folder: {all_files}")
            
            # Get all metadata files for this user
            for filename in all_files:
                print(f"DEBUG: Checking file: {filename}")
                if filename.endswith('_metadata.json'):
                    print(f"DEBUG: Found metadata file: {filename}")
                    if filename.startswith(f"{user_id}_"):
                        print(f"DEBUG: Metadata file matches user_id: {filename}")
                        metadata_filepath = os.path.join(video_folder, filename)
                        
                        try:
                            with open(metadata_filepath, 'r') as f:
                                metadata = json.load(f)
                            print(f"DEBUG: Loaded metadata: {metadata}")
                            video_files.append(metadata)
                        except Exception as e:
                            print(f"Error reading video metadata {filename}: {str(e)}")
                    else:
                        print(f"DEBUG: Metadata file does NOT match user_id {user_id}: {filename}")
            
            print(f"DEBUG: Total video files found for user: {len(video_files)}")
            
            # Sort by upload time and take recent ones
            video_files.sort(key=lambda x: x.get('uploaded_at', ''), reverse=True)
            recent_videos = video_files[:3]
            
            for video in recent_videos:
                description = video.get('description', '')
                if description:
                    desc_text = description[:50] + '...' if len(description) > 50 else description
                else:
                    desc_text = f"Video message to doctor"
                
                activities.append({
                    'type': 'video_consultation',
                    'title': 'Video Consultation Sent',
                    'desc': desc_text,
                    'time': video.get('uploaded_at', '') + 'Z' if video.get('uploaded_at') else datetime.now(datetime.UTC).isoformat(),
                    'icon': 'Video',
                    'color': 'purple'
                })
                print(f"DEBUG: Added video activity: {desc_text}")
    except Exception as e:
        print(f"DEBUG: Error fetching video consultations for activity: {str(e)}")
        import traceback
        traceback.print_exc()
    
    # Sort by time (most recent first) and limit to 10
    activities.sort(key=lambda x: x['time'], reverse=True)
    activities = activities[:5]
    
    return jsonify({'activities': activities}), 200

# Upload & Explanation Routes

@app.route('/api/explain/upload', methods=['POST'])
def upload_for_explanation():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
        
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    
    # Simulate AI processing
    doc_type = 'Other'
    if 'lab' in filename.lower(): doc_type = 'Lab Report'
    elif 'rx' in filename.lower(): doc_type = 'Prescription'
    
    doc = ExplainedDocument(
        name=filename,
        file_path=file_path,
        doc_type=doc_type,
        summary="This document appears to be a medical report. The AI is processing the details.",
        key_points=json.dumps(["Key point 1", "Key point 2"]),
        questions_to_ask=json.dumps(["Question 1", "Question 2"]),
        status='Ready'
    )
    db.session.add(doc)
    db.session.commit()
    
    return jsonify(doc.to_dict()), 201

@app.route('/api/explain/documents', methods=['GET'])
def get_explained_documents():
    docs = ExplainedDocument.query.order_by(ExplainedDocument.created_at.desc()).all()
    return jsonify([d.to_dict() for d in docs])


# Journal Routes (Mental Wellness)
@app.route('/api/journal', methods=['GET'])
def get_journal_entries():
    """Get all journal entries, optionally filtered by user_id"""
    entries = JournalEntry.query.order_by(JournalEntry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries])

@app.route('/api/journal', methods=['POST'])
def create_journal_entry():
    """Create a new journal entry"""
    data = request.get_json()
    entry = JournalEntry(
        mood=data.get('mood'),
        content=data.get('content'),
        tags=data.get('tags', '')
    )
    db.session.add(entry)
    db.session.commit()
    return jsonify(entry.to_dict()), 201


if __name__ == '__main__':
    # Use debug=False in production, or read from environment
    debug_mode = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    app.run(debug=debug_mode, host='0.0.0.0', port=5001)