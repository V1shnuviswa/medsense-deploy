"""
Database Inspector - Check what's in the database
"""
from app import app
from extensions import db
from models.auth import User
from models.medical import HealthRecord, Medication, SymptomCheck

with app.app_context():
    print("\n" + "="*60)
    print("MedSense Database Inspector")
    print("="*60)
    
    # Users
    print("\n📊 USERS:")
    print("-" * 60)
    users = User.query.all()
    for user in users:
        print(f"  ID: {user.id}")
        print(f"  Username: {user.username}")
        print(f"  Email: {user.email}")
        print(f"  Name: {user.first_name} {user.last_name}")
        print(f"  Role: {user.role}")
        print(f"  Last Login: {user.last_login}")
        print(f"  Created: {user.created_at}")
        print("-" * 60)
    
    # Health Records
    print("\n📋 HEALTH RECORDS:")
    print("-" * 60)
    records = HealthRecord.query.all()
    if records:
        for record in records:
            print(f"  Type: {record.type}")
            print(f"  Title: {record.title}")
            print(f"  Doctor: {record.doctor}")
            print(f"  Date: {record.date}")
            print("-" * 60)
    else:
        print("  No health records found")
    
    # Medications
    print("\n💊 MEDICATIONS:")
    print("-" * 60)
    meds = Medication.query.all()
    if meds:
        for med in meds:
            print(f"  Name: {med.name}")
            print(f"  Dosage: {med.dosage}")
            print(f"  Frequency: {med.frequency}")
            print(f"  Status: {med.status}")
            print("-" * 60)
    else:
        print("  No medications found")
    
    # Symptom Checks
    print("\n🔍 SYMPTOM CHECKS:")
    print("-" * 60)
    checks = SymptomCheck.query.all()
    if checks:
        for check in checks:
            print(f"  User ID: {check.user_id}")
            print(f"  Description: {check.description[:50]}...")
            print(f"  Severity: {check.severity}")
            print(f"  Created: {check.created_at}")
            print("-" * 60)
    else:
        print("  No symptom checks found")
    
    # Statistics
    print("\n📈 STATISTICS:")
    print("-" * 60)
    print(f"  Total Users: {User.query.count()}")
    print(f"  Total Health Records: {HealthRecord.query.count()}")
    print(f"  Total Medications: {Medication.query.count()}")
    print(f"  Total Symptom Checks: {SymptomCheck.query.count()}")
    print("="*60 + "\n")
