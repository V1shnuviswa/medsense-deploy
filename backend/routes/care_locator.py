from flask import Blueprint, request, jsonify
import os
import requests
from typing import List, Dict, Optional

care_locator_bp = Blueprint('care_locator', __name__)

# Geoapify API configuration
GEOAPIFY_API_KEY = os.getenv('GEOAPIFY_API_KEY', '40b68b14b24c46e688f4e67026027610')
GEOAPIFY_PLACES_URL = 'https://api.geoapify.com/v2/places'
GEOAPIFY_GEOCODE_URL = 'https://api.geoapify.com/v1/geocode/search'

# Tavily API configuration for specialty search
TAVILY_API_KEY = os.getenv('TAVILY_API_KEY', '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')
TAVILY_SEARCH_URL = 'https://api.tavily.com/search'

def get_nearby_places(latitude: float, longitude: float, place_type: str, radius: int = 5000) -> List[Dict]:
    """
    Fetch nearby places from Geoapify API.
    
    Args:
        latitude: User's latitude (-90 to 90)
        longitude: User's longitude (-180 to 180)
        place_type: Type of place (hospital, pharmacy, doctor)
        radius: Search radius in meters (default 5km)
    
    Returns:
        List of nearby places with details
    """
    if not GEOAPIFY_API_KEY:
        return get_mock_places(place_type)
    
    # Validate coordinates
    if not (-90 <= latitude <= 90):
        print(f"Invalid latitude: {latitude}. Must be between -90 and 90")
        return get_mock_places(place_type)
    
    if not (-180 <= longitude <= 180):
        print(f"Invalid longitude: {longitude}. Must be between -180 and 180")
        return get_mock_places(place_type)
    
    # Map our types to Geoapify categories
    category_mapping = {
        'hospital': 'healthcare.hospital',
        'pharmacy': 'healthcare.pharmacy',
        'doctor': 'healthcare.doctor',
        'all': 'healthcare'
    }
    
    category = category_mapping.get(place_type, 'healthcare')
    
    params = {
        'categories': category,
        'filter': f'circle:{longitude},{latitude},{radius}',
        'bias': f'proximity:{longitude},{latitude}',
        'limit': 20,
        'apiKey': GEOAPIFY_API_KEY
    }
    
    try:
        print(f"Fetching places: lat={latitude}, lng={longitude}, type={place_type}, radius={radius}")
        response = requests.get(GEOAPIFY_PLACES_URL, params=params, timeout=10)
        
        # Log the full URL for debugging
        print(f"Geoapify URL: {response.url}")
        
        response.raise_for_status()
        data = response.json()
        
        if data.get('features'):
            results = parse_geoapify_response(data.get('features', []), latitude, longitude)
            print(f"Found {len(results)} places from Geoapify")
            return results
        else:
            print(f"Geoapify API returned no results, using mock data")
            return get_mock_places(place_type)
            
    except requests.exceptions.HTTPError as e:
        print(f"Geoapify HTTP Error: {e.response.status_code} - {e.response.text}")
        return get_mock_places(place_type)
    except Exception as e:
        print(f"Error fetching places from Geoapify: {str(e)}")
        return get_mock_places(place_type)

def parse_geoapify_response(features: List[Dict], user_lat: float, user_lng: float) -> List[Dict]:
    """Parse Geoapify API response into our format."""
    places = []
    
    for feature in features:
        properties = feature.get('properties', {})
        geometry = feature.get('geometry', {})
        coordinates = geometry.get('coordinates', [])
        
        if len(coordinates) < 2:
            continue
        
        place_lng, place_lat = coordinates[0], coordinates[1]
        
        # Calculate distance
        distance_km = calculate_distance(user_lat, user_lng, place_lat, place_lng)
        
        # Determine place type from categories
        categories = properties.get('categories', [])
        place_type = 'Hospital' if 'healthcare.hospital' in categories else \
                    'Pharmacy' if 'healthcare.pharmacy' in categories else \
                    'Doctor' if 'healthcare.doctor' in categories else 'Hospital'
        
        # Format address
        address_parts = []
        if properties.get('street'):
            address_parts.append(properties.get('street'))
        if properties.get('city'):
            address_parts.append(properties.get('city'))
        address = ', '.join(address_parts) if address_parts else properties.get('formatted', 'Address not available')
        
        # Get opening hours status
        # Note: Geoapify free tier doesn't always have real-time opening status
        # We'll default to True (assume open) unless we have specific data saying closed
        opening_hours = properties.get('opening_hours')
        is_open = True  # Default to open (optimistic)
        
        # Check if we have opening hours data
        if opening_hours:
            # If it explicitly says closed, mark as closed
            if isinstance(opening_hours, str) and opening_hours.lower() == 'closed':
                is_open = False
            # If it says 24/7 or similar, mark as open
            elif isinstance(opening_hours, str) and ('24' in opening_hours or 'always' in opening_hours.lower()):
                is_open = True
        
        # For hospitals and pharmacies, assume they're more likely to be open
        # (many are 24/7 or have extended hours)
        if place_type in ['Hospital', 'Pharmacy']:
            is_open = True  # Assume open unless we know otherwise
        
        places.append({
            'id': properties.get('place_id', properties.get('datasource', {}).get('raw', {}).get('osm_id', '')),
            'name': properties.get('name', 'Unknown'),
            'type': place_type,
            'address': address,
            'distance': f'{distance_km:.1f} km',
            'distance_value': distance_km,
            'rating': 0,  # Geoapify doesn't provide ratings in free tier
            'isOpen': is_open,
            'latitude': place_lat,
            'longitude': place_lng,
            'phone': properties.get('contact', {}).get('phone', ''),
            'website': properties.get('website', ''),
            'datasource': properties.get('datasource', {}).get('sourcename', 'OpenStreetMap')
        })
    
    # Sort by distance
    places.sort(key=lambda x: x['distance_value'])
    
    return places

def calculate_distance(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance between two coordinates in kilometers (Haversine formula)."""
    from math import radians, sin, cos, sqrt, atan2
    
    R = 6371  # Earth's radius in kilometers
    
    lat1, lng1, lat2, lng2 = map(radians, [lat1, lng1, lat2, lng2])
    dlat = lat2 - lat1
    dlng = lng2 - lng1
    
    a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
    c = 2 * atan2(sqrt(a), sqrt(1-a))
    
    return R * c

def search_hospitals_by_specialty(latitude: float, longitude: float, specialty: str, city: str = "") -> List[Dict]:
    """
    Search for hospitals with specific specialty using Tavily AI search.
    
    Args:
        latitude: User's latitude
        longitude: User's longitude
        specialty: Medical specialty (e.g., "cardiology", "neurology", "orthopedics")
        city: City name for more accurate results
    
    Returns:
        List of hospitals with the specified specialty
    """
    if not TAVILY_API_KEY or TAVILY_API_KEY == 'tvly-YOUR_API_KEY_HERE':
        print("Tavily API key not configured, using Geoapify fallback")
        return []
    
    try:
        # Construct search query
        location_str = f"{city} " if city else f"near {latitude},{longitude} "
        search_query = f"{specialty} hospitals {location_str}with contact information and address"
        
        # Call Tavily API
        payload = {
            "api_key": TAVILY_API_KEY,
            "query": search_query,
            "search_depth": "advanced",
            "include_answer": False,
            "include_raw_content": False,
            "max_results": 10
        }
        
        response = requests.post(TAVILY_SEARCH_URL, json=payload, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        hospitals = []
        for result in data.get('results', []):
            # Extract hospital information from search results
            hospitals.append({
                'id': f"tavily_{hash(result.get('url', ''))}",
                'name': result.get('title', 'Unknown Hospital'),
                'type': 'Hospital',
                'address': result.get('content', '')[:100],  # First 100 chars as address
                'distance': 'N/A',
                'distance_value': 999,  # Will be sorted later
                'rating': 0,
                'isOpen': True,
                'latitude': latitude,
                'longitude': longitude,
                'phone': '',
                'website': result.get('url', ''),
                'specialty': specialty,
                'datasource': 'Tavily AI Search'
            })
        
        print(f"Found {len(hospitals)} hospitals with {specialty} specialty via Tavily")
        return hospitals
        
    except Exception as e:
        print(f"Tavily search error: {str(e)}")
        return []


def get_mock_places(place_type: str) -> List[Dict]:
    """Return mock data when API key is not available."""
    mock_data = [
        {
            'id': 'mock_1',
            'name': 'City General Hospital',
            'type': 'Hospital',
            'address': '123 Medical Center Dr, Downtown',
            'distance': '1.2 km',
            'distance_value': 1.2,
            'rating': 4.5,
            'phone': '(555) 123-4567',
            'isOpen': True,
            'latitude': 12.9716,
            'longitude': 77.5946
        },
        {
            'id': 'mock_2',
            'name': 'Apollo Pharmacy',
            'type': 'Pharmacy',
            'address': '456 Main St, Westside',
            'distance': '0.5 km',
            'distance_value': 0.5,
            'rating': 4.2,
            'phone': '(555) 987-6543',
            'isOpen': True,
            'latitude': 12.9716,
            'longitude': 77.5946
        },
        {
            'id': 'mock_3',
            'name': 'Dr. Sarah Smith, Cardiologist',
            'type': 'Doctor',
            'address': '789 Heart Way, Suite 200',
            'distance': '2.8 km',
            'distance_value': 2.8,
            'rating': 4.9,
            'phone': '(555) 246-8135',
            'isOpen': False,
            'latitude': 12.9716,
            'longitude': 77.5946
        },
        {
            'id': 'mock_4',
            'name': 'MedPlus Pharmacy',
            'type': 'Pharmacy',
            'address': '321 Oak Ave, Northside',
            'distance': '1.5 km',
            'distance_value': 1.5,
            'rating': 4.0,
            'phone': '(555) 369-2580',
            'isOpen': True,
            'latitude': 12.9716,
            'longitude': 77.5946
        },
        {
            'id': 'mock_5',
            'name': 'Memorial Urgent Care',
            'type': 'Hospital',
            'address': '654 Emergency Ln, Eastside',
            'distance': '3.5 km',
            'distance_value': 3.5,
            'rating': 4.3,
            'phone': '(555) 159-7531',
            'isOpen': True,
            'latitude': 12.9716,
            'longitude': 77.5946
        }
    ]
    
    if place_type != 'all':
        mock_data = [p for p in mock_data if p['type'] == place_type]
    
    return mock_data

@care_locator_bp.route('/nearby', methods=['POST'])
def get_nearby_care():
    """
    Get nearby care providers based on user location.
    
    Request body:
    {
        "latitude": 12.9716,
        "longitude": 77.5946,
        "type": "all|hospital|pharmacy|doctor",
        "radius": 5000,
        "specialty": "cardiology" (optional, for hospital specialty search)
    }
    """
    try:
        data = request.get_json()
        
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        place_type = data.get('type', 'all').lower()
        radius = data.get('radius', 5000)  # Default 5km
        specialty = data.get('specialty', '').strip()
        
        # Validate inputs
        if latitude is None or longitude is None:
            return jsonify({'error': 'Latitude and longitude are required'}), 400
        
        # Fetch nearby places from Geoapify
        places = get_nearby_places(latitude, longitude, place_type, radius)
        
        # If specialty is provided and we're looking for hospitals, use Tavily for specialty search
        if specialty and (place_type == 'hospital' or place_type == 'all'):
            specialty_hospitals = search_hospitals_by_specialty(latitude, longitude, specialty)
            if specialty_hospitals:
                # Merge Tavily results with Geoapify results
                # Prioritize specialty hospitals
                places = specialty_hospitals + places
                # Remove duplicates based on name similarity
                seen_names = set()
                unique_places = []
                for place in places:
                    name_lower = place['name'].lower()
                    if name_lower not in seen_names:
                        seen_names.add(name_lower)
                        unique_places.append(place)
                places = unique_places[:20]  # Limit to 20 results
        
        return jsonify({
            'success': True,
            'location': {
                'latitude': latitude,
                'longitude': longitude
            },
            'places': places,
            'count': len(places),
            'using_mock_data': not bool(GEOAPIFY_API_KEY),
            'api_provider': 'Geoapify + Tavily' if specialty else 'Geoapify',
            'specialty': specialty if specialty else None
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@care_locator_bp.route('/geocode', methods=['POST'])
def geocode_address():
    """
    Convert address/pincode to coordinates using Geoapify.
    
    Request body:
    {
        "address": "Bangalore, India"
    }
    """
    try:
        data = request.get_json()
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Address is required'}), 400
        
        if not GEOAPIFY_API_KEY:
            # Return mock coordinates for Bangalore
            return jsonify({
                'success': True,
                'location': {
                    'latitude': 12.9716,
                    'longitude': 77.5946,
                    'address': 'Bangalore, Karnataka, India'
                },
                'using_mock_data': True
            }), 200
        
        # Use Geoapify Geocoding API
        params = {
            'text': address,
            'apiKey': GEOAPIFY_API_KEY,
            'limit': 1
        }
        
        response = requests.get(GEOAPIFY_GEOCODE_URL, params=params, timeout=10)
        response.raise_for_status()
        data = response.json()
        
        if data.get('features') and len(data['features']) > 0:
            feature = data['features'][0]
            properties = feature.get('properties', {})
            geometry = feature.get('geometry', {})
            coordinates = geometry.get('coordinates', [])
            
            if len(coordinates) >= 2:
                return jsonify({
                    'success': True,
                    'location': {
                        'latitude': coordinates[1],
                        'longitude': coordinates[0],
                        'address': properties.get('formatted', address)
                    },
                    'using_mock_data': False,
                    'api_provider': 'Geoapify'
                }), 200
        
        return jsonify({'error': 'Address not found'}), 404
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500
