from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity, verify_jwt_in_request
from datetime import datetime
import uuid
from services.doctor_notes_vector_store import DoctorNotesVectorStore

doctor_notes_bp = Blueprint('doctor_notes', __name__)

# Initialize vector store
vector_store = DoctorNotesVectorStore()

@doctor_notes_bp.route('/notes', methods=['POST'])
def create_note():
    """
    Create a new doctor consultation note.
    Stores the note in FAISS vector database with embeddings.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in create_note: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('content'):
            return jsonify({'error': 'Note content is required'}), 400
        
        # Generate unique ID
        note_id = str(uuid.uuid4())
        
        # Prepare note data with user_id
        note_data = {
            'id': note_id,
            'user_id': user_id,  # Link to user
            'date': data.get('date', datetime.utcnow().isoformat()),
            'doctor': data.get('doctor', 'Dr. Unknown'),
            'patient_context': {
                'conditions': data.get('conditions', []),
                'medications': data.get('medications', []),
                'patient_name': data.get('patient_name', 'Unknown Patient')
            },
            'type': data.get('type', 'Consultation'),
            'title': data.get('title', 'Consultation Note')
        }
        
        # Add to vector store
        index = vector_store.add_note(data['content'], note_data)
        
        return jsonify({
            'success': True,
            'message': 'Note saved successfully',
            'note_id': note_id,
            'index': index
        }), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes', methods=['GET'])
def get_all_notes():
    """
    Get all doctor notes for the logged-in user from the vector store.
    Excludes deleted notes and returns only the latest version of each note ID.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_all_notes: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        all_notes = vector_store.get_all_notes()
        
        # Filter by user_id, and filter out deleted notes
        user_notes = [
            note for note in all_notes 
            if note.get('user_id') == user_id and not note.get('deleted', False)
        ]
        
        # Remove duplicates - keep only the latest version of each note ID
        # (When updating, we mark old as deleted and create new with same ID)
        seen_ids = {}
        for note in user_notes:
            note_id = note.get('id')
            if note_id:
                # Keep the note with the latest created_at timestamp
                if note_id not in seen_ids:
                    seen_ids[note_id] = note
                else:
                    # Compare timestamps and keep the newer one
                    existing_time = seen_ids[note_id].get('created_at', '')
                    current_time = note.get('created_at', '')
                    if current_time > existing_time:
                        seen_ids[note_id] = note
        
        # Convert back to list
        unique_notes = list(seen_ids.values())
        
        # Sort by date (newest first)
        unique_notes.sort(key=lambda x: x.get('created_at', ''), reverse=True)
        
        return jsonify({
            'success': True,
            'notes': unique_notes,
            'count': len(unique_notes)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes/<note_id>', methods=['GET'])
def get_note(note_id):
    """
    Get a specific note by ID for the logged-in user.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in get_note: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        note = vector_store.get_note_by_id(note_id)
        
        if not note or note.get('user_id') != user_id:
            return jsonify({'error': 'Note not found'}), 404
        
        if note.get('deleted', False):
            return jsonify({'error': 'Note has been deleted'}), 404
        
        return jsonify({
            'success': True,
            'note': note
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes/<note_id>', methods=['PUT'])
def update_note(note_id):
    """
    Update an existing note for the logged-in user.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in update_note: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Verify note belongs to user
        existing_note = vector_store.get_note_by_id(note_id)
        print(f"DEBUG update_note: note_id={note_id}, user_id={user_id}, type(user_id)={type(user_id)}")
        if existing_note:
            print(f"DEBUG update_note: existing_note user_id={existing_note.get('user_id')}, type={type(existing_note.get('user_id'))}")
        else:
            print("DEBUG update_note: existing_note is None")
            
        if not existing_note or existing_note.get('user_id') != user_id:
            return jsonify({'error': 'Note not found'}), 404
        
        data = request.get_json()
        
        if not data.get('content'):
            return jsonify({'error': 'Note content is required'}), 400
        
        # Prepare updated note data
        note_data = {
            'id': note_id,
            'user_id': user_id,
            'date': data.get('date', datetime.utcnow().isoformat()),
            'doctor': data.get('doctor', 'Dr. Unknown'),
            'patient_context': {
                'conditions': data.get('conditions', []),
                'medications': data.get('medications', []),
                'patient_name': data.get('patient_name', 'Unknown Patient')
            },
            'type': data.get('type', 'Consultation'),
            'title': data.get('title', 'Consultation Note')
        }
        
        # Update in vector store
        index = vector_store.update_note(note_id, data['content'], note_data)
        
        if index is None:
            return jsonify({'error': 'Note not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Note updated successfully',
            'note_id': note_id,
            'index': index
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes/<note_id>', methods=['DELETE'])
def delete_note(note_id):
    """
    Delete a note (soft delete) for the logged-in user.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in delete_note: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        # Verify note belongs to user
        existing_note = vector_store.get_note_by_id(note_id)
        if not existing_note or existing_note.get('user_id') != user_id:
            return jsonify({'error': 'Note not found'}), 404
        
        success = vector_store.delete_note(note_id)
        
        if not success:
            return jsonify({'error': 'Note not found'}), 404
        
        return jsonify({
            'success': True,
            'message': 'Note deleted successfully'
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes/search', methods=['POST'])
def search_notes():
    """
    Search for similar notes using semantic search for the logged-in user.
    """
    # Verify JWT
    try:
        verify_jwt_in_request()
        user_id = int(get_jwt_identity())
    except Exception as e:
        print(f"DEBUG: JWT Error in search_notes: {str(e)}")
        return jsonify({'error': 'Authentication required'}), 401
    
    try:
        data = request.get_json()
        
        if not data.get('query'):
            return jsonify({'error': 'Search query is required'}), 400
        
        k = data.get('k', 5)  # Number of results to return
        
        # Search in vector store
        results = vector_store.search_similar_notes(data['query'], k)
        
        # Filter by user_id and filter out deleted notes
        active_results = [
            r for r in results 
            if r.get('user_id') == user_id and not r.get('deleted', False)
        ]
        
        return jsonify({
            'success': True,
            'query': data['query'],
            'results': active_results,
            'count': len(active_results)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@doctor_notes_bp.route('/notes/stats', methods=['GET'])
def get_stats():
    """
    Get statistics about the doctor notes vector store.
    """
    try:
        stats = vector_store.get_stats()
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
