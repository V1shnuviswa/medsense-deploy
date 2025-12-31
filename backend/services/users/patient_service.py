from models.medical import Patient
from extensions import db
from datetime import datetime
import uuid

class PatientService:
    @staticmethod
    def get_all_patients(limit=50, offset=0):
        return Patient.query.limit(limit).offset(offset).all()

    @staticmethod
    def get_patient_by_id(patient_id):
        return Patient.query.get(patient_id)

    @staticmethod
    def create_patient(data):
        new_patient = Patient(
            name=data.get('name'),
            age=data.get('age'),
            gender=data.get('gender'),
            mrn=data.get('mrn'),
            date_of_birth=datetime.strptime(data.get('date_of_birth'), '%Y-%m-%d') if data.get('date_of_birth') else None,
            diagnosis=data.get('diagnosis'),
            physician=data.get('physician'),
            priority=data.get('priority', 'Medium'),
            status=data.get('status', 'Active')
        )
        db.session.add(new_patient)
        db.session.commit()
        return new_patient

    @staticmethod
    def update_patient(patient_id, data):
        patient = Patient.query.get(patient_id)
        if not patient:
            return None
        
        if 'name' in data: patient.name = data['name']
        if 'age' in data: patient.age = data['age']
        if 'gender' in data: patient.gender = data['gender']
        if 'diagnosis' in data: patient.diagnosis = data['diagnosis']
        if 'physician' in data: patient.physician = data['physician']
        if 'priority' in data: patient.priority = data['priority']
        if 'status' in data: patient.status = data['status']
        
        db.session.commit()
        return patient

    @staticmethod
    def delete_patient(patient_id):
        patient = Patient.query.get(patient_id)
        if not patient:
            return False
        db.session.delete(patient)
        db.session.commit()
        return True
