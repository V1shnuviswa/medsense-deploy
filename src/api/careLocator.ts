// API client for Care Locator functionality

const API_BASE_URL = 'http://localhost:5001/api/care-locator';

export interface CareLocation {
    id: string;
    name: string;
    type: 'Pharmacy' | 'Hospital' | 'Doctor';
    address: string;
    distance: string;
    distance_value?: number;
    rating: number;
    phone: string;
    isOpen: boolean;
    latitude?: number;
    longitude?: number;
}

export interface UserLocation {
    latitude: number;
    longitude: number;
}

export interface NearbyPlacesRequest {
    latitude: number;
    longitude: number;
    type?: 'all' | 'hospital' | 'pharmacy' | 'doctor';
    radius?: number; // in meters
    specialty?: string; // medical specialty for hospital search
}

export interface GeocodeRequest {
    address: string;
}

export const careLocatorAPI = {
    /**
     * Get nearby care providers based on user location
     */
    async getNearbyPlaces(request: NearbyPlacesRequest): Promise<{
        success: boolean;
        location: UserLocation;
        places: CareLocation[];
        count: number;
        using_mock_data: boolean;
    }> {
        const response = await fetch(`${API_BASE_URL}/nearby`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch nearby places');
        }

        return response.json();
    },

    /**
     * Convert address/pincode to coordinates
     */
    async geocodeAddress(request: GeocodeRequest): Promise<{
        success: boolean;
        location: {
            latitude: number;
            longitude: number;
            address: string;
        };
        using_mock_data: boolean;
    }> {
        const response = await fetch(`${API_BASE_URL}/geocode`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(request),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to geocode address');
        }

        return response.json();
    },

    /**
     * Get user's current location using browser Geolocation API
     */
    async getCurrentLocation(): Promise<UserLocation> {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                    });
                },
                (error) => {
                    let errorMessage = 'Failed to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable location access in your browser settings.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable. Please check your GPS settings.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out. Please try again.';
                            break;
                    }
                    reject(new Error(errorMessage));
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0,
                }
            );
        });
    },
};
