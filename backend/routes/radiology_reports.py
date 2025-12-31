"""
Report generation API routes
"""

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
import io
import json
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

from services.radiology.report_generator import report_generator
from models.medical import Report, Patient, Study
from models.auth import User
from extensions import db

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/templates', methods=['GET'])
@jwt_required()
def get_report_templates():
    """Get available report templates"""
    try:
        templates = report_generator.get_available_templates()
        return jsonify({
            'success': True,
            'templates': templates,
            'message': f'Retrieved {len(templates)} templates'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/generate', methods=['POST'])
@jwt_required()
def generate_report():
    """Generate a structured radiology report"""
    try:
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['template_name', 'patient_info', 'findings_text']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        
        # Validate template and data
        validation_errors = report_generator.validate_report_data(
            data['template_name'],
            data['patient_info']
        )
        
        if validation_errors:
            return jsonify({
                'success': False,
                'error': 'Validation failed',
                'validation_errors': validation_errors
            }), 400
        
        # Generate report
        report_data = report_generator.generate_report(
            template_name=data['template_name'],
            patient_info=data['patient_info'],
            findings_text=data['findings_text'],
            ai_analysis=data.get('ai_analysis'),
            segmentation_results=data.get('segmentation_results')
        )
        
        # Save to database
        report = Report(
            id=report_data['report_id'],
            study_id=data.get('study_id'),
            template_name=data['template_name'],
            clinical_history=report_data['sections'].get('clinical_history', ''),
            technique=report_data['sections'].get('technique', ''),
            findings=report_data['sections'].get('findings', ''),
            impression=report_data['sections'].get('impression', ''),
            recommendations=report_data['sections'].get('recommendations', ''),
            status='Draft',
            created_by=get_jwt_identity()
        )
        
        db.session.add(report)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'report': report_data,
            'message': 'Report generated successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/<report_id>', methods=['GET'])
@jwt_required()
def get_report(report_id):
    """Get a specific report"""
    try:
        report = Report.query.get_or_404(report_id)
        
        return jsonify({
            'success': True,
            'report': report.to_dict(),
            'message': 'Report retrieved successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/<report_id>', methods=['PUT'])
@jwt_required()
def update_report(report_id):
    """Update a report"""
    try:
        report = Report.query.get_or_404(report_id)
        data = request.get_json()
        
        # Update fields
        if 'clinical_history' in data:
            report.clinical_history = data['clinical_history']
        if 'technique' in data:
            report.technique = data['technique']
        if 'findings' in data:
            report.findings = data['findings']
        if 'impression' in data:
            report.impression = data['impression']
        if 'recommendations' in data:
            report.recommendations = data['recommendations']
        if 'status' in data:
            report.status = data['status']
        
        report.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'report': report.to_dict(),
            'message': 'Report updated successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/<report_id>/finalize', methods=['POST'])
@jwt_required()
def finalize_report(report_id):
    """Finalize a report (make it read-only)"""
    try:
        report = Report.query.get_or_404(report_id)
        
        report.status = 'Final'
        report.is_final = True
        report.finalized_at = datetime.utcnow()
        report.finalized_by = get_jwt_identity()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'report': report.to_dict(),
            'message': 'Report finalized successfully'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/<report_id>/export/pdf', methods=['GET'])
@jwt_required()
def export_report_pdf(report_id):
    """Export report as PDF"""
    try:
        report = Report.query.get_or_404(report_id)
        
        # Create PDF buffer
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter)
        
        # Get styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=16,
            spaceAfter=30,
            alignment=1  # Center alignment
        )
        
        # Build PDF content
        story = []
        
        # Title
        story.append(Paragraph("RADIOLOGY REPORT", title_style))
        story.append(Spacer(1, 12))
        
        # Patient info (if available)
        if report.study and report.study.patient:
            patient = report.study.patient
            story.append(Paragraph(f"<b>Patient:</b> {patient.name}", styles['Normal']))
            story.append(Paragraph(f"<b>MRN:</b> {patient.mrn}", styles['Normal']))
            story.append(Paragraph(f"<b>Age:</b> {patient.age} years", styles['Normal']))
            story.append(Paragraph(f"<b>Gender:</b> {patient.gender}", styles['Normal']))
            story.append(Spacer(1, 12))
        
        # Study info
        if report.study:
            story.append(Paragraph(f"<b>Study Date:</b> {report.study.study_date.strftime('%Y-%m-%d')}", styles['Normal']))
            story.append(Paragraph(f"<b>Modality:</b> {report.study.modality}", styles['Normal']))
            story.append(Spacer(1, 12))
        
        # Report sections
        sections = [
            ('CLINICAL HISTORY', report.clinical_history),
            ('TECHNIQUE', report.technique),
            ('FINDINGS', report.findings),
            ('IMPRESSION', report.impression),
            ('RECOMMENDATIONS', report.recommendations)
        ]
        
        for section_title, section_content in sections:
            if section_content:
                story.append(Paragraph(f"<b>{section_title}:</b>", styles['Heading2']))
                story.append(Paragraph(section_content, styles['Normal']))
                story.append(Spacer(1, 12))
        
        # Footer
        story.append(Spacer(1, 24))
        story.append(Paragraph(f"Report generated on {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", styles['Normal']))
        story.append(Paragraph("AI-assisted structured reporting system", styles['Normal']))
        
        # Build PDF
        doc.build(story)
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"report_{report_id}.pdf",
            mimetype='application/pdf'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/<report_id>/export/json', methods=['GET'])
@jwt_required()
def export_report_json(report_id):
    """Export report as JSON"""
    try:
        report = Report.query.get_or_404(report_id)
        
        # Create structured JSON export
        export_data = {
            'report_id': report.id,
            'template_name': report.template_name,
            'status': report.status,
            'created_at': report.created_at.isoformat(),
            'updated_at': report.updated_at.isoformat(),
            'sections': {
                'clinical_history': report.clinical_history,
                'technique': report.technique,
                'findings': report.findings,
                'impression': report.impression,
                'recommendations': report.recommendations
            }
        }
        
        # Add patient info if available
        if report.study and report.study.patient:
            patient = report.study.patient
            export_data['patient'] = {
                'name': patient.name,
                'mrn': patient.mrn,
                'age': patient.age,
                'gender': patient.gender
            }
        
        # Add study info
        if report.study:
            export_data['study'] = {
                'study_date': report.study.study_date.isoformat(),
                'modality': report.study.modality,
                'description': report.study.description
            }
        
        # Create JSON buffer
        buffer = io.BytesIO()
        buffer.write(json.dumps(export_data, indent=2).encode('utf-8'))
        buffer.seek(0)
        
        return send_file(
            buffer,
            as_attachment=True,
            download_name=f"report_{report_id}.json",
            mimetype='application/json'
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@reports_bp.route('/list', methods=['GET'])
@jwt_required()
def list_reports():
    """List reports with filtering"""
    try:
        # Get query parameters
        status = request.args.get('status')
        patient_id = request.args.get('patient_id')
        study_id = request.args.get('study_id')
        limit = int(request.args.get('limit', 50))
        offset = int(request.args.get('offset', 0))
        
        # Build query
        query = Report.query
        
        if status:
            query = query.filter(Report.status == status)
        if patient_id:
            query = query.join(Study).filter(Study.patient_id == patient_id)
        if study_id:
            query = query.filter(Report.study_id == study_id)
        
        # Get total count
        total_count = query.count()
        
        # Apply pagination
        reports = query.offset(offset).limit(limit).all()
        
        return jsonify({
            'success': True,
            'reports': [report.to_dict() for report in reports],
            'total_count': total_count,
            'limit': limit,
            'offset': offset,
            'message': f'Retrieved {len(reports)} reports'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500