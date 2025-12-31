from datetime import datetime
import uuid
from extensions import db

class Patient(db.Model):
    __tablename__ = 'patients'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    age = db.Column(db.Integer)
    gender = db.Column(db.String(10))
    mrn = db.Column(db.String(50), unique=True, nullable=False)
    date_of_birth = db.Column(db.Date)
    diagnosis = db.Column(db.String(200))
    physician = db.Column(db.String(100))
    priority = db.Column(db.String(20), default='Medium')
    status = db.Column(db.String(20), default='Active')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_visit = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    studies = db.relationship('Study', backref='patient', lazy=True, cascade='all, delete-orphan')
    health_records = db.relationship('HealthRecord', backref='patient', lazy=True, cascade='all, delete-orphan')
    medications = db.relationship('Medication', backref='patient', lazy=True, cascade='all, delete-orphan')
    conditions = db.relationship('Condition', backref='patient', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'age': self.age,
            'gender': self.gender,
            'mrn': self.mrn,
            'diagnosis': self.diagnosis,
            'physician': self.physician,
            'priority': self.priority,
            'status': self.status,
            'last_visit': self.last_visit.isoformat() if self.last_visit else None,
            'studies_count': len(self.studies)
        }

class Study(db.Model):
    __tablename__ = 'studies'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=False)
    study_date = db.Column(db.DateTime, default=datetime.utcnow)
    study_time = db.Column(db.Time)
    modality = db.Column(db.String(20), nullable=False)
    body_part = db.Column(db.String(50))
    description = db.Column(db.String(200))
    series_count = db.Column(db.Integer, default=0)
    instance_count = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default='Pending')
    radiologist_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    # DICOM specific fields
    study_instance_uid = db.Column(db.String(100), unique=True)
    accession_number = db.Column(db.String(50))
    referring_physician = db.Column(db.String(100))
    
    # Relationships
    dicom_files = db.relationship('DicomFile', backref='study', lazy=True, cascade='all, delete-orphan')
    nifti_files = db.relationship('NiftiFile', backref='study', lazy=True, cascade='all, delete-orphan')
    vlm_analyses = db.relationship('VLMAnalysis', backref='study', lazy=True, cascade='all, delete-orphan')
    segmentations = db.relationship('Segmentation', backref='study', lazy=True, cascade='all, delete-orphan')
    reports = db.relationship('Report', backref='study', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'patient_id': self.patient_id,
            'study_date': self.study_date.isoformat(),
            'modality': self.modality,
            'body_part': self.body_part,
            'description': self.description,
            'series_count': self.series_count,
            'instance_count': self.instance_count,
            'status': self.status,
            'study_instance_uid': self.study_instance_uid,
            'accession_number': self.accession_number
        }

class DicomFile(db.Model):
    __tablename__ = 'dicom_files'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id = db.Column(db.String(50), db.ForeignKey('studies.id'), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    
    # DICOM metadata
    series_instance_uid = db.Column(db.String(100))
    sop_instance_uid = db.Column(db.String(100), unique=True)
    series_number = db.Column(db.Integer)
    instance_number = db.Column(db.Integer)
    slice_location = db.Column(db.Float)
    slice_thickness = db.Column(db.Float)
    pixel_spacing = db.Column(db.String(50))
    image_orientation = db.Column(db.String(100))
    image_position = db.Column(db.String(100))
    
    # Image properties
    rows = db.Column(db.Integer)
    columns = db.Column(db.Integer)
    bits_allocated = db.Column(db.Integer)
    bits_stored = db.Column(db.Integer)
    
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'study_id': self.study_id,
            'filename': self.filename,
            'series_number': self.series_number,
            'instance_number': self.instance_number,
            'slice_location': self.slice_location,
            'uploaded_at': self.uploaded_at.isoformat()
        }

class NiftiFile(db.Model):
    __tablename__ = 'nifti_files'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id = db.Column(db.String(50), db.ForeignKey('studies.id'), nullable=False)
    filename = db.Column(db.String(200), nullable=False)
    file_path = db.Column(db.String(500), nullable=False)
    file_size = db.Column(db.Integer)
    
    # NIfTI metadata
    data_type = db.Column(db.String(50))
    dims = db.Column(db.String(50)) # Stored as string representation of list
    voxel_sizes = db.Column(db.String(100)) # Stored as string representation of list
    description = db.Column(db.String(200))
    
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'study_id': self.study_id,
            'filename': self.filename,
            'data_type': self.data_type,
            'dims': self.dims,
            'description': self.description,
            'uploaded_at': self.uploaded_at.isoformat()
        }

class VLMAnalysis(db.Model):
    __tablename__ = 'vlm_analyses'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id = db.Column(db.String(50), db.ForeignKey('studies.id'), nullable=False)
    model_name = db.Column(db.String(100), default='MedGemma-v1')
    findings = db.Column(db.Text)  # JSON string
    confidence_scores = db.Column(db.Text)  # JSON string
    reasoning_trace = db.Column(db.Text)
    processing_time = db.Column(db.Float)
    status = db.Column(db.String(20), default='Completed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'study_id': self.study_id,
            'model_name': self.model_name,
            'findings': self.findings,
            'confidence_scores': self.confidence_scores,
            'reasoning_trace': self.reasoning_trace,
            'processing_time': self.processing_time,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class Segmentation(db.Model):
    __tablename__ = 'segmentations'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id = db.Column(db.String(50), db.ForeignKey('studies.id'), nullable=False)
    model_name = db.Column(db.String(100), nullable=False)
    model_version = db.Column(db.String(20))
    application = db.Column(db.String(100))
    segmentation_data = db.Column(db.Text)  # JSON string
    volume_measurements = db.Column(db.Text)  # JSON string
    accuracy = db.Column(db.Float)
    dice_score = db.Column(db.Float)
    processing_time = db.Column(db.Float)
    status = db.Column(db.String(20), default='Completed')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'study_id': self.study_id,
            'model_name': self.model_name,
            'application': self.application,
            'accuracy': self.accuracy,
            'dice_score': self.dice_score,
            'processing_time': self.processing_time,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class Report(db.Model):
    __tablename__ = 'reports'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    study_id = db.Column(db.String(50), db.ForeignKey('studies.id'), nullable=False)
    template_name = db.Column(db.String(100))
    
    # Report sections
    clinical_history = db.Column(db.Text)
    technique = db.Column(db.Text)
    findings = db.Column(db.Text)
    impression = db.Column(db.Text)
    recommendations = db.Column(db.Text)
    
    # Metadata
    status = db.Column(db.String(20), default='Draft')
    version = db.Column(db.String(10), default='v1.0')
    is_final = db.Column(db.Boolean, default=False)
    finalized_at = db.Column(db.DateTime)
    finalized_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    created_by = db.Column(db.Integer, db.ForeignKey('users.id'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'study_id': self.study_id,
            'template_name': self.template_name,
            'clinical_history': self.clinical_history,
            'technique': self.technique,
            'findings': self.findings,
            'impression': self.impression,
            'recommendations': self.recommendations,
            'status': self.status,
            'version': self.version,
            'is_final': self.is_final,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }

# --- New Models for Application Restructure ---

class SymptomCheck(db.Model):
    __tablename__ = 'symptom_checks'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True) # Optional if generic/anonymous
    description = db.Column(db.Text)
    severity = db.Column(db.String(20))
    duration = db.Column(db.String(50))
    onset = db.Column(db.String(20))
    ai_response = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'description': self.description,
            'severity': self.severity,
            'duration': self.duration,
            'onset': self.onset,
            'ai_response': self.ai_response,
            'created_at': self.created_at.isoformat()
        }

class HealthRecord(db.Model):
    __tablename__ = 'health_records'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True) # Optional for now if single user
    type = db.Column(db.String(50)) # Consultation, Lab Report, etc.
    title = db.Column(db.String(100))
    doctor = db.Column(db.String(100))
    date = db.Column(db.Date)
    content = db.Column(db.Text) # For consultation notes or summaries
    file_path = db.Column(db.String(500)) # For uploaded reports
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.type,
            'title': self.title,
            'doctor': self.doctor,
            'date': self.date.isoformat() if self.date else None,
            'content': self.content,
            'file_path': self.file_path
        }

class Medication(db.Model):
    __tablename__ = 'medications'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True)
    name = db.Column(db.String(100))
    dosage = db.Column(db.String(50))
    frequency = db.Column(db.String(50))
    status = db.Column(db.String(20)) # Active, Past
    start_date = db.Column(db.Date)
    end_date = db.Column(db.Date)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'dosage': self.dosage,
            'frequency': self.frequency,
            'status': self.status
        }

class Condition(db.Model):
    __tablename__ = 'conditions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    patient_id = db.Column(db.String(50), db.ForeignKey('patients.id'), nullable=True)
    name = db.Column(db.String(100))
    diagnosed_date = db.Column(db.Date)
    status = db.Column(db.String(20)) # Active, Resolved
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'diagnosed_date': self.diagnosed_date.isoformat() if self.diagnosed_date else None,
            'status': self.status
        }

class ExplainedDocument(db.Model):
    __tablename__ = 'explained_documents'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    name = db.Column(db.String(200))
    file_path = db.Column(db.String(500))
    doc_type = db.Column(db.String(50)) # Lab Report, Prescription, etc.
    summary = db.Column(db.Text)
    key_points = db.Column(db.Text) # JSON string
    questions_to_ask = db.Column(db.Text) # JSON string
    status = db.Column(db.String(20), default='Processing')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'type': self.doc_type,
            'summary': self.summary,
            'key_points': self.key_points,
            'questions_to_ask': self.questions_to_ask,
            'status': self.status,
            'created_at': self.created_at.isoformat()
        }

class JournalEntry(db.Model):
    __tablename__ = 'journal_entries'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    mood = db.Column(db.String(50))
    content = db.Column(db.Text)
    tags = db.Column(db.String(200)) # JSON string or comma-separated
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'mood': self.mood,
            'content': self.content,
            'tags': self.tags,
            'created_at': self.created_at.isoformat()
        }

class WearableDevice(db.Model):
    __tablename__ = 'wearable_devices'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    provider = db.Column(db.String(50)) # apple, google, fitbit, oura
    status = db.Column(db.String(20), default='Connected')
    last_sync = db.Column(db.DateTime, default=datetime.utcnow)
    
    metrics = db.relationship('WearableMetric', backref='device', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        return {
            'id': self.id,
            'provider': self.provider,
            'status': self.status,
            'last_sync': self.last_sync.isoformat()
        }

class WearableMetric(db.Model):
    __tablename__ = 'wearable_metrics'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    device_id = db.Column(db.String(50), db.ForeignKey('wearable_devices.id'), nullable=False)
    metric_type = db.Column(db.String(50)) # heart_rate, steps, sleep, hrv
    value = db.Column(db.Float)
    unit = db.Column(db.String(20))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'type': self.metric_type,
            'value': self.value,
            'unit': self.unit,
            'timestamp': self.timestamp.isoformat()
        }