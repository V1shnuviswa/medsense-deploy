import faiss
import numpy as np
import pickle
import os
from sentence_transformers import SentenceTransformer
from datetime import datetime
import json

class DoctorNotesVectorStore:
    """
    FAISS-based vector store for doctor consultation notes.
    Stores notes with embeddings for semantic search and retrieval.
    """
    
    def __init__(self, index_path='instance/doctor_notes_faiss.index', metadata_path='instance/doctor_notes_metadata.pkl'):
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.dimension = 384  # all-MiniLM-L6-v2 embedding dimension
        
        # Initialize sentence transformer model
        self.model = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Load or create FAISS index
        if os.path.exists(self.index_path):
            self.index = faiss.read_index(self.index_path)
        else:
            # Create a new FAISS index (using L2 distance)
            self.index = faiss.IndexFlatL2(self.dimension)
        
        # Load or create metadata store
        if os.path.exists(self.metadata_path):
            with open(self.metadata_path, 'rb') as f:
                self.metadata = pickle.load(f)
        else:
            self.metadata = []
    
    def add_note(self, note_content, note_data):
        """
        Add a doctor note to the vector store.
        
        Args:
            note_content: The text content of the note
            note_data: Dictionary containing metadata (id, date, doctor, patient_context, etc.)
        
        Returns:
            The index position where the note was added
        """
        # Generate embedding
        embedding = self.model.encode([note_content])[0]
        embedding = np.array([embedding], dtype='float32')
        
        # Add to FAISS index
        self.index.add(embedding)
        
        # Store metadata
        metadata_entry = {
            'id': note_data.get('id'),
            'user_id': note_data.get('user_id'),  # Store user_id
            'content': note_content,
            'date': note_data.get('date', datetime.utcnow().isoformat()),
            'doctor': note_data.get('doctor', 'Unknown'),
            'patient_context': note_data.get('patient_context', {}),
            'type': note_data.get('type', 'Consultation'),
            'title': note_data.get('title', 'Consultation Note'),
            'created_at': datetime.utcnow().isoformat()
        }
        self.metadata.append(metadata_entry)
        
        # Save to disk
        self._save()
        
        return len(self.metadata) - 1
    
    def search_similar_notes(self, query, k=5):
        """
        Search for similar notes using semantic similarity.
        
        Args:
            query: Search query text
            k: Number of similar notes to return
        
        Returns:
            List of similar notes with their metadata and similarity scores
        """
        if self.index.ntotal == 0:
            return []
        
        # Generate query embedding
        query_embedding = self.model.encode([query])[0]
        query_embedding = np.array([query_embedding], dtype='float32')
        
        # Search in FAISS
        k = min(k, self.index.ntotal)  # Don't search for more than we have
        distances, indices = self.index.search(query_embedding, k)
        
        # Retrieve metadata for results
        results = []
        for i, (distance, idx) in enumerate(zip(distances[0], indices[0])):
            if idx < len(self.metadata):
                result = self.metadata[idx].copy()
                result['similarity_score'] = float(1 / (1 + distance))  # Convert distance to similarity
                result['rank'] = i + 1
                results.append(result)
        
        return results
    
    def get_all_notes(self):
        """
        Get all notes from the vector store.
        
        Returns:
            List of all notes with metadata
        """
        return self.metadata
    
    def get_note_by_id(self, note_id):
        """
        Get a specific note by ID.
        
        Args:
            note_id: The ID of the note to retrieve
        
        Returns:
            The note metadata or None if not found
        """
        for note in self.metadata:
            if note.get('id') == note_id:
                return note
        return None
    
    def delete_note(self, note_id):
        """
        Delete a note from the vector store.
        Note: FAISS doesn't support deletion, so we mark it as deleted in metadata.
        This marks ALL instances of the note_id as deleted (in case of duplicates from updates).
        
        Args:
            note_id: The ID of the note to delete
        
        Returns:
            True if at least one note was deleted, False if not found
        """
        found = False
        for i, note in enumerate(self.metadata):
            if note.get('id') == note_id:
                self.metadata[i]['deleted'] = True
                found = True
        
        if found:
            self._save()
        
        return found
    
    def update_note(self, note_id, note_content, note_data):
        """
        Update a note in the vector store.
        This marks the old note as deleted and adds a new one.
        
        Args:
            note_id: The ID of the note to update
            note_content: New content
            note_data: New metadata
        
        Returns:
            The new index position or None if original not found
        """
        # Mark old note as deleted
        if self.delete_note(note_id):
            # Add new version
            note_data['id'] = note_id
            note_data['updated_at'] = datetime.utcnow().isoformat()
            return self.add_note(note_content, note_data)
        return None
    
    def _save(self):
        """Save the FAISS index and metadata to disk."""
        # Ensure directory exists
        os.makedirs(os.path.dirname(self.index_path) if os.path.dirname(self.index_path) else '.', exist_ok=True)
        
        # Save FAISS index
        faiss.write_index(self.index, self.index_path)
        
        # Save metadata
        with open(self.metadata_path, 'wb') as f:
            pickle.dump(self.metadata, f)
    
    def get_stats(self):
        """
        Get statistics about the vector store.
        
        Returns:
            Dictionary with stats
        """
        active_notes = [n for n in self.metadata if not n.get('deleted', False)]
        return {
            'total_notes': len(self.metadata),
            'active_notes': len(active_notes),
            'deleted_notes': len(self.metadata) - len(active_notes),
            'index_size': self.index.ntotal,
            'dimension': self.dimension
        }
