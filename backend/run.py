#!/usr/bin/env python3
"""
OpenRad Backend Server
Medical Imaging Platform with AI Analysis
"""

import os
from app import app, db

def create_app():
    """Create and configure the Flask application"""
    
    # Create upload directories
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    os.makedirs('dicom_storage', exist_ok=True)
    os.makedirs('models', exist_ok=True)
    
    # Initialize database
    with app.app_context():
        db.create_all()
        print("Database initialized successfully")
    
    return app

if __name__ == '__main__':
    application = create_app()
    
    print("🏥 OpenRad Medical Imaging Platform")
    print("=" * 50)
    print("🚀 Starting Flask backend server...")
    print("📡 API endpoints available at: http://localhost:5000/api/")
    print("🔒 HIPAA compliant medical imaging platform")
    print("=" * 50)
    
    # Run the application
    application.run(
        debug=True,
        host='0.0.0.0',
        port=5000,
        threaded=True
    )