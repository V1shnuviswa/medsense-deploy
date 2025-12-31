from models.auth import User
from models.medical import Patient
from extensions import db

class ClinicianService:
    @staticmethod
    def get_clinician_profile(user_id):
        return User.query.get(user_id)

    @staticmethod
    def get_assigned_patients(user_id):
        # Assuming 'physician' field in Patient matches the clinician's full name or username
        # This is a loose coupling for now based on the current model
        clinician = User.query.get(user_id)
        if not clinician:
            return []
        
        # Try matching by full name or username
        patients = Patient.query.filter(
            (Patient.physician == clinician.full_name) | 
            (Patient.physician == clinician.username)
        ).all()
        return patients

    @staticmethod
    def update_profile(user_id, data):
        clinician = User.query.get(user_id)
        if not clinician:
            return None
        
        if 'first_name' in data: clinician.first_name = data['first_name']
        if 'last_name' in data: clinician.last_name = data['last_name']
        if 'specialty' in data: clinician.specialty = data['specialty']
        if 'title' in data: clinician.title = data['title']
        
        db.session.commit()
        return clinician
