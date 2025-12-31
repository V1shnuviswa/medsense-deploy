const API_BASE_URL = 'http://localhost:5001/api/doctor-notes';

// Helper function to get auth headers
const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
};

export interface DoctorNote {
    id: string;
    content: string;
    date: string;
    doctor: string;
    patient_context: {
        conditions: string[];
        medications: string[];
        patient_name: string;
    };
    type: string;
    title: string;
    created_at: string;
    updated_at?: string;
}

export interface SearchResult extends DoctorNote {
    similarity_score: number;
    rank: number;
}

export const doctorNotesAPI = {
    // Create a new note
    async createNote(noteData: {
        content: string;
        date?: string;
        doctor?: string;
        conditions?: string[];
        medications?: string[];
        patient_name?: string;
        type?: string;
        title?: string;
    }): Promise<{ success: boolean; note_id: string; index: number }> {
        const response = await fetch(`${API_BASE_URL}/notes`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(noteData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create note');
        }

        return response.json();
    },

    // Get all notes
    async getAllNotes(): Promise<{ success: boolean; notes: DoctorNote[]; count: number }> {
        // Add cache-busting parameter to prevent browser caching
        const timestamp = new Date().getTime();
        const response = await fetch(`${API_BASE_URL}/notes?_t=${timestamp}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch notes');
        }

        return response.json();
    },

    // Get a specific note by ID
    async getNote(noteId: string): Promise<{ success: boolean; note: DoctorNote }> {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch note');
        }

        return response.json();
    },

    // Update a note
    async updateNote(
        noteId: string,
        noteData: {
            content: string;
            date?: string;
            doctor?: string;
            conditions?: string[];
            medications?: string[];
            patient_name?: string;
            type?: string;
            title?: string;
        }
    ): Promise<{ success: boolean; note_id: string; index: number }> {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(noteData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update note');
        }

        return response.json();
    },

    // Delete a note
    async deleteNote(noteId: string): Promise<{ success: boolean; message: string }> {
        const response = await fetch(`${API_BASE_URL}/notes/${noteId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete note');
        }

        return response.json();
    },

    // Search for similar notes
    async searchNotes(
        query: string,
        k: number = 5
    ): Promise<{ success: boolean; query: string; results: SearchResult[]; count: number }> {
        const response = await fetch(`${API_BASE_URL}/notes/search`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ query, k }),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to search notes');
        }

        return response.json();
    },

    // Get statistics
    async getStats(): Promise<{
        success: boolean;
        stats: {
            total_notes: number;
            active_notes: number;
            deleted_notes: number;
            index_size: number;
            dimension: number;
        };
    }> {
        const response = await fetch(`${API_BASE_URL}/notes/stats`, {
            headers: getAuthHeaders()
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch stats');
        }

        return response.json();
    },
};
