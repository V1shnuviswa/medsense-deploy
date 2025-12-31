from datetime import datetime
from extensions import db
import uuid

class UserFeedback(db.Model):
    """Store user feedback for AI-generated responses"""
    __tablename__ = 'user_feedback'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Optional for anonymous feedback
    feature_type = db.Column(db.String(50), nullable=False)  # 'symptom_check' or 'report_analysis'
    reference_id = db.Column(db.String(50), nullable=False)  # ID of the symptom check or report
    is_helpful = db.Column(db.Boolean, nullable=False)  # True = helpful, False = not helpful
    comment = db.Column(db.Text, nullable=True)  # Optional user comment
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'feature_type': self.feature_type,
            'reference_id': self.reference_id,
            'is_helpful': self.is_helpful,
            'comment': self.comment,
            'created_at': self.created_at.isoformat()
        }


# Patient, Study, and other models remain below this...
