from datetime import datetime
import uuid
from extensions import db

class Camera(db.Model):
    __tablename__ = 'cameras'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    url = db.Column(db.String(500)) # RTSP or file path
    status = db.Column(db.String(20), default='Inactive') # Active, Inactive, Error
    fps = db.Column(db.Integer, default=10)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'location': self.location,
            'url': self.url,
            'status': self.status,
            'fps': self.fps,
            'created_at': self.created_at.isoformat()
        }

class FallEvent(db.Model):
    __tablename__ = 'fall_events'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    camera_id = db.Column(db.String(50), db.ForeignKey('cameras.id'), nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    confidence = db.Column(db.Float)
    severity = db.Column(db.String(20)) # High, Medium, Low
    status = db.Column(db.String(20), default='New') # New, Acknowledged, False Alarm
    snapshot_path = db.Column(db.String(500))
    metadata_json = db.Column(db.Text) # Store pose data, bounding box, etc.
    
    camera = db.relationship('Camera', backref=db.backref('events', lazy=True))
    
    def to_dict(self):
        return {
            'id': self.id,
            'camera_id': self.camera_id,
            'camera_name': self.camera.name if self.camera else 'Unknown',
            'location': self.camera.location if self.camera else 'Unknown',
            'timestamp': self.timestamp.isoformat(),
            'confidence': self.confidence,
            'severity': self.severity,
            'status': self.status,
            'snapshot_path': self.snapshot_path
        }
