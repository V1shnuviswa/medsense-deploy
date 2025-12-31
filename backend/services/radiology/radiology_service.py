import os
import uuid
from datetime import datetime
from werkzeug.utils import secure_filename
from flask import current_app
from extensions import db
from models.medical import Study, DicomFile, Patient, NiftiFile
from utils.dicom_processor import DicomProcessor
from utils.nifti_processor import NiftiProcessor

class RadiologyService:
    @staticmethod
    def process_dicom_upload(file, patient_id=None):
        """
        Process an uploaded DICOM file.
        - Saves the file.
        - Extracts metadata.
        - Creates/Updates Patient (if needed).
        - Creates/Updates Study.
        - Creates DicomFile.
        """
        filename = secure_filename(file.filename)
        # Create a unique filename to avoid collisions
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        # Ensure upload directory exists
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'dicom')
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        try:
            # Extract metadata
            metadata = DicomProcessor.read_dicom_metadata(file_path)
            
            # Handle Patient
            if not patient_id:
                # Try to find patient by MRN or create new
                mrn = metadata.get('patient_id', 'UNKNOWN')
                patient = Patient.query.filter_by(mrn=mrn).first()
                
                if not patient:
                    patient = Patient(
                        name=metadata.get('patient_name', 'Unknown'),
                        mrn=mrn,
                        gender=metadata.get('patient_sex'),
                        # Parse date if possible, else None
                        date_of_birth=RadiologyService._parse_dicom_date(metadata.get('patient_birth_date'))
                    )
                    db.session.add(patient)
                    db.session.flush() # Get ID
                patient_id = patient.id
            
            # Handle Study
            study_uid = metadata.get('study_instance_uid')
            study = Study.query.filter_by(study_instance_uid=study_uid).first()
            
            if not study:
                study = Study(
                    patient_id=patient_id,
                    study_instance_uid=study_uid,
                    study_date=RadiologyService._parse_dicom_date(metadata.get('study_date')),
                    modality=metadata.get('modality', 'OT'),
                    body_part=metadata.get('body_part_examined'),
                    description=metadata.get('study_description'),
                    accession_number=metadata.get('accession_number')
                )
                db.session.add(study)
                db.session.flush()
            
            # Create DicomFile record
            dicom_file = DicomFile(
                study_id=study.id,
                filename=unique_filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                series_instance_uid=metadata.get('series_instance_uid'),
                sop_instance_uid=metadata.get('sop_instance_uid'),
                series_number=int(metadata.get('series_number')) if metadata.get('series_number') else None,
                instance_number=int(metadata.get('instance_number')) if metadata.get('instance_number') else None,
                slice_location=float(metadata.get('slice_location')) if metadata.get('slice_location') else None,
                rows=metadata.get('rows'),
                columns=metadata.get('columns')
            )
            
            db.session.add(dicom_file)
            
            # Update study counts
            study.instance_count = (study.instance_count or 0) + 1
            # Recalculate series count (simplified)
            # In a real app, we'd query distinct series_instance_uids
            
            db.session.commit()
            
            return {
                'success': True,
                'study_id': study.id,
                'patient_id': patient_id,
                'file_id': dicom_file.id,
                'metadata': metadata
            }
            
        except Exception as e:
            # Clean up file if processing failed
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    @staticmethod
    def _parse_dicom_date(date_str):
        if not date_str:
            return None
        try:
            return datetime.strptime(date_str, '%Y%m%d')
        except ValueError:
            return None

    @staticmethod
    def get_study(study_id):
        return Study.query.get(study_id)
    
    @staticmethod
    def get_study_images(study_id):
        return DicomFile.query.filter_by(study_id=study_id).order_by(DicomFile.instance_number).all()

    @staticmethod
    def get_metadata_only(file):
        """
        Extract metadata without saving to DB (for preview).
        """
        filename = secure_filename(file.filename)
        temp_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, filename)
        
        file.save(temp_path)
        try:
            metadata = DicomProcessor.read_dicom_metadata(temp_path)
            os.remove(temp_path)
            return metadata
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e

    @staticmethod
    def process_nifti_upload(file, patient_id=None, study_id=None):
        """
        Process an uploaded NIfTI file.
        """
        filename = secure_filename(file.filename)
        unique_filename = f"{uuid.uuid4()}_{filename}"
        
        upload_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'nifti')
        os.makedirs(upload_dir, exist_ok=True)
        
        file_path = os.path.join(upload_dir, unique_filename)
        file.save(file_path)
        
        try:
            metadata = NiftiProcessor.read_nifti_metadata(file_path)
            
            # If no study_id provided, create a new study (and patient if needed)
            if not study_id:
                if not patient_id:
                    # For NIfTI, we might not have patient info in metadata, so create a placeholder or require it
                    # Here we'll create a placeholder if not provided
                    patient = Patient(
                        name="Unknown (NIfTI)",
                        mrn=f"NIFTI_{uuid.uuid4().hex[:8]}",
                        gender="Unknown"
                    )
                    db.session.add(patient)
                    db.session.flush()
                    patient_id = patient.id
                
                study = Study(
                    patient_id=patient_id,
                    study_date=datetime.utcnow(),
                    modality="NIfTI", # Generic modality for NIfTI
                    description=metadata.get('description', 'NIfTI Upload'),
                    status="Completed"
                )
                db.session.add(study)
                db.session.flush()
                study_id = study.id
            
            # Create NiftiFile record
            nifti_file = NiftiFile(
                study_id=study_id,
                filename=unique_filename,
                file_path=file_path,
                file_size=os.path.getsize(file_path),
                data_type=metadata.get('data_type'),
                dims=str(metadata.get('dims')),
                voxel_sizes=str(metadata.get('voxel_sizes')),
                description=metadata.get('description')
            )
            
            db.session.add(nifti_file)
            db.session.commit()
            
            return {
                'success': True,
                'study_id': study_id,
                'patient_id': patient_id,
                'file_id': nifti_file.id,
                'metadata': metadata
            }
            
        except Exception as e:
            if os.path.exists(file_path):
                os.remove(file_path)
            raise e

    @staticmethod
    def convert_study_to_nifti(study_id):
        """
        Convert all DICOM files in a study to NIfTI.
        """
        study = Study.query.get(study_id)
        if not study:
            raise ValueError("Study not found")
            
        dicom_files = DicomFile.query.filter_by(study_id=study_id).all()
        if not dicom_files:
            raise ValueError("No DICOM files found in study")
            
        # Group by series
        series_dict = {}
        for df in dicom_files:
            series_uid = df.series_instance_uid or 'unknown'
            if series_uid not in series_dict:
                series_dict[series_uid] = []
            series_dict[series_uid].append(df.file_path)
            
        converted_files = []
        
        # Create output directory
        nifti_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'nifti')
        os.makedirs(nifti_dir, exist_ok=True)
        
        # Process each series
        for series_uid, file_paths in series_dict.items():
            # Create a temporary directory for this series' DICOM files
            # dicom2nifti requires a directory input
            temp_dicom_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'temp', f"dicom_{series_uid}")
            os.makedirs(temp_dicom_dir, exist_ok=True)
            
            # Symlink or copy files to temp dir
            for fp in file_paths:
                try:
                    os.symlink(fp, os.path.join(temp_dicom_dir, os.path.basename(fp)))
                except OSError:
                    # Fallback to copy if symlink fails (e.g. Windows)
                    import shutil
                    shutil.copy(fp, os.path.join(temp_dicom_dir, os.path.basename(fp)))
            
            try:
                # Convert
                output_file = NiftiProcessor.convert_dicom_to_nifti(temp_dicom_dir, nifti_dir)
                
                # Create NiftiFile record
                metadata = NiftiProcessor.read_nifti_metadata(output_file)
                
                nifti_file = NiftiFile(
                    study_id=study_id,
                    filename=os.path.basename(output_file),
                    file_path=output_file,
                    file_size=os.path.getsize(output_file),
                    data_type=metadata.get('data_type'),
                    dims=str(metadata.get('dims')),
                    voxel_sizes=str(metadata.get('voxel_sizes')),
                    description=f"Converted from DICOM Series {series_uid}"
                )
                
                db.session.add(nifti_file)
                converted_files.append(nifti_file)
                
            except Exception as e:
                print(f"Conversion failed for series {series_uid}: {e}")
                # Continue with other series
                continue
            finally:
                # Cleanup temp dir
                import shutil
                if os.path.exists(temp_dicom_dir):
                    shutil.rmtree(temp_dicom_dir)
        
        if not converted_files:
            raise Exception("Failed to convert any series to NIfTI")
            
        db.session.commit()
        return [f.to_dict() for f in converted_files]

    @staticmethod
    def get_nifti_metadata_only(file):
        """
        Extract NIfTI metadata without saving (preview)
        """
        filename = secure_filename(file.filename)
        temp_dir = os.path.join(current_app.config.get('UPLOAD_FOLDER', 'uploads'), 'temp')
        os.makedirs(temp_dir, exist_ok=True)
        temp_path = os.path.join(temp_dir, filename)
        
        file.save(temp_path)
        try:
            metadata = NiftiProcessor.read_nifti_metadata(temp_path)
            os.remove(temp_path)
            return metadata
        except Exception as e:
            if os.path.exists(temp_path):
                os.remove(temp_path)
            raise e
