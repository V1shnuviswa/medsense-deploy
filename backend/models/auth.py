from datetime import datetime
from extensions import db

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    
    # Profile information
    first_name = db.Column(db.String(50))
    last_name = db.Column(db.String(50))
    title = db.Column(db.String(20))  # Dr., MD, etc.
    specialty = db.Column(db.String(100))
    license_number = db.Column(db.String(50))
    
    # Role and permissions
    role = db.Column(db.String(50), default='user')
    is_active = db.Column(db.Boolean, default=True)
    is_admin = db.Column(db.Boolean, default=False)
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_login = db.Column(db.DateTime)
    last_activity = db.Column(db.DateTime)
    
    # HIPAA compliance
    access_level = db.Column(db.String(20), default='standard')
    department = db.Column(db.String(100))
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    @property
    def full_name(self):
        if self.first_name and self.last_name:
            return f"{self.title} {self.first_name} {self.last_name}".strip()
        return self.username
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'title': self.title,
            'specialty': self.specialty,
            'role': self.role,
            'is_active': self.is_active,
            'full_name': self.full_name,
            'created_at': self.created_at.isoformat(),
            'last_login': self.last_login.isoformat() if self.last_login else None
        }

class AuditLog(db.Model):
    __tablename__ = 'audit_logs'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    action = db.Column(db.String(100), nullable=False)
    resource_type = db.Column(db.String(50))  # patient, study, report, etc.
    resource_id = db.Column(db.String(50))
    details = db.Column(db.Text)  # JSON string with additional details
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # HIPAA compliance fields
    phi_accessed = db.Column(db.Boolean, default=False)
    access_reason = db.Column(db.String(200))
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'action': self.action,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'details': self.details,
            'timestamp': self.timestamp.isoformat(),
            'phi_accessed': self.phi_accessed
        }

class Session(db.Model):
    __tablename__ = 'sessions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(500), unique=True, nullable=False)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.String(500))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    
    def is_expired(self):
        return datetime.utcnow() > self.expires_at
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'ip_address': self.ip_address,
            'created_at': self.created_at.isoformat(),
            'expires_at': self.expires_at.isoformat(),
            'is_active': self.is_active
        }