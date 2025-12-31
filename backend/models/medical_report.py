"""Database models for medical report analysis."""
from extensions import db
from datetime import datetime
import json


class MedicalReport(db.Model):
    """Model for storing uploaded medical reports and their analysis."""
    __tablename__ = 'medical_reports'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    file_path = db.Column(db.String(512), nullable=False)
    file_type = db.Column(db.String(50))
    uploaded_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Analysis results
    analysis_status = db.Column(db.String(50), default='pending')  # pending, processing, completed, failed
    
    # Report analysis
    summary = db.Column(db.Text)
    biomarkers_high = db.Column(db.Text)  # JSON array
    biomarkers_low = db.Column(db.Text)  # JSON array
    biomarkers_borderline = db.Column(db.Text)  # JSON array
    biomarkers_normal = db.Column(db.Text)  # JSON array
    
    # Recommendations
    precautions = db.Column(db.Text)  # JSON array
    recommendations = db.Column(db.Text)  # JSON array
    daily_routine = db.Column(db.Text)  # JSON array
    
    # Full report details
    complete_analysis = db.Column(db.Text)
    raw_text = db.Column(db.Text)
    
    # Vector DB reference for chatbot
    vector_collection_id = db.Column(db.String(255))
    
    # Relationships
    chat_messages = db.relationship('ReportChatMessage', backref='report', lazy=True, cascade='all, delete-orphan')
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'filename': self.filename,
            'file_type': self.file_type,
            'uploaded_at': self.uploaded_at.isoformat() + 'Z' if self.uploaded_at else None,
            'analysis_status': self.analysis_status,
            'summary': self.summary,
            'biomarkers': {
                'high': json.loads(self.biomarkers_high) if self.biomarkers_high else [],
                'low': json.loads(self.biomarkers_low) if self.biomarkers_low else [],
                'borderline': json.loads(self.biomarkers_borderline) if self.biomarkers_borderline else [],
                'normal': json.loads(self.biomarkers_normal) if self.biomarkers_normal else []
            },
            'precautions': json.loads(self.precautions) if self.precautions else [],
            'recommendations': json.loads(self.recommendations) if self.recommendations else [],
            'daily_routine': json.loads(self.daily_routine) if self.daily_routine else [],
            'complete_analysis': self.complete_analysis
        }


class ReportChatMessage(db.Model):
    """Model for storing chat messages related to a medical report."""
    __tablename__ = 'report_chat_messages'
    
    id = db.Column(db.Integer, primary_key=True)
    report_id = db.Column(db.Integer, db.ForeignKey('medical_reports.id'), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # user or assistant
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        """Convert to dictionary."""
        return {
            'id': self.id,
            'role': self.role,
            'content': self.content,
            'timestamp': self.timestamp.isoformat() if self.timestamp else None
        }
