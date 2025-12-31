import { apiService } from './api';

export interface Camera {
    id: string;
    name: string;
    location: string;
    url: string;
    status: string;
    fps: number;
}

export interface FallEvent {
    id: string;
    camera_id: string;
    camera_name: string;
    location: string;
    timestamp: string;
    confidence: number;
    severity: 'High' | 'Medium' | 'Low';
    status: 'New' | 'Acknowledged' | 'False Alarm';
    snapshot_path?: string;
}

export interface FallStats {
    total_events: number;
    active_cameras: number;
    recent_falls_24h: number;
}

class FallDetectionService {
    private baseUrl = '/api/fall-detection';

    async getCameras(): Promise<Camera[]> {
        try {
            const response = await fetch(`${this.baseUrl}/cameras`, {
                headers: apiService.getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch cameras');
            return await response.json();
        } catch (error) {
            console.error('Error fetching cameras:', error);
            return [];
        }
    }

    async getEvents(): Promise<FallEvent[]> {
        try {
            const response = await fetch(`${this.baseUrl}/events`, {
                headers: apiService.getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch events');
            return await response.json();
        } catch (error) {
            console.error('Error fetching events:', error);
            return [];
        }
    }

    async getStats(): Promise<FallStats> {
        try {
            const response = await fetch(`${this.baseUrl}/stats`, {
                headers: apiService.getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to fetch stats');
            return await response.json();
        } catch (error) {
            console.error('Error fetching stats:', error);
            return { total_events: 0, active_cameras: 0, recent_falls_24h: 0 };
        }
    }

    async inferFrame(cameraId: string): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/infer/frame`, {
                method: 'POST',
                headers: apiService.getHeaders(),
                body: JSON.stringify({ camera_id: cameraId }),
            });
            if (!response.ok) throw new Error('Failed to run inference');
            return await response.json();
        } catch (error) {
            console.error('Error running inference:', error);
            return null;
        }
    }

    async detectWebcam(): Promise<any> {
        try {
            const response = await fetch(`${this.baseUrl}/cameras/detect-webcam`, {
                method: 'POST',
                headers: apiService.getHeaders(),
            });
            if (!response.ok) throw new Error('Failed to detect webcam');
            return await response.json();
        } catch (error) {
            console.error('Error detecting webcam:', error);
            return null;
        }
    }
}

export const fallDetectionService = new FallDetectionService();
export default fallDetectionService;
