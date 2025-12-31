import React, { useState, useEffect } from 'react';
import { MapPin, Search, Phone, Star, Navigation, Building2, Stethoscope, Pill, Loader2, AlertCircle, MapPinned, Locate } from 'lucide-react';
import { careLocatorAPI, CareLocation, UserLocation } from '../api/careLocator';

// Common medical specialties
const MEDICAL_SPECIALTIES = [
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Dermatology',
    'Oncology',
    'Gastroenterology',
    'Pulmonology',
    'Nephrology',
    'Endocrinology',
    'Psychiatry',
    'Ophthalmology',
    'ENT (Ear, Nose, Throat)',
    'Urology',
    'Gynecology',
    'Emergency Medicine',
    'General Surgery',
    'Radiology'
];


const Locator: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'all' | 'Pharmacy' | 'Hospital' | 'Doctor'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [locations, setLocations] = useState<CareLocation[]>([]);
    const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isGettingLocation, setIsGettingLocation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [manualAddress, setManualAddress] = useState('');
    const [showManualInput, setShowManualInput] = useState(false);
    const [usingMockData, setUsingMockData] = useState(false);

    // Load nearby places when user location changes
    useEffect(() => {
        if (userLocation) {
            loadNearbyPlaces();
        }
    }, [userLocation, activeTab, specialty]);

    const loadNearbyPlaces = async () => {
        if (!userLocation) return;

        setIsLoading(true);
        setError(null);

        try {
            const response = await careLocatorAPI.getNearbyPlaces({
                latitude: userLocation.latitude,
                longitude: userLocation.longitude,
                type: activeTab === 'all' ? 'all' : activeTab.toLowerCase() as any,
                radius: 5000, // 5km radius
                specialty: specialty || undefined, // Include specialty if provided
            });

            setLocations(response.places);
            setUsingMockData(response.using_mock_data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load nearby places');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGetCurrentLocation = async () => {
        setIsGettingLocation(true);
        setError(null);
        setShowManualInput(false);

        try {
            const location = await careLocatorAPI.getCurrentLocation();
            setUserLocation(location);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to get location');
            setShowManualInput(true);
        } finally {
            setIsGettingLocation(false);
        }
    };

    const handleManualLocation = async () => {
        if (!manualAddress.trim()) {
            setError('Please enter an address or pincode');
            return;
        }

        setIsLoading(true);
        setError(null); // Clear any previous errors

        try {
            const response = await careLocatorAPI.geocodeAddress({
                address: manualAddress,
            });

            setUserLocation({
                latitude: response.location.latitude,
                longitude: response.location.longitude,
            });
            setShowManualInput(false);
            setError(null); // Clear error on success
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to find location');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDirections = (location: CareLocation) => {
        if (location.latitude && location.longitude) {
            const url = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
            window.open(url, '_blank');
        }
    };

    const handleCall = (phone: string) => {
        if (phone) {
            window.location.href = `tel:${phone}`;
        }
    };

    const filteredLocations = locations.filter(loc =>
    (loc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        loc.address.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
        <div className="space-y-6 page-transition">
            {/* Header */}
            <div className="bg-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 shadow-xl">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white mb-2 flex items-center space-x-2">
                            <MapPin className="h-7 w-7 text-blue-400" />
                            <span>Care Locator</span>
                        </h1>
                        <p className="text-slate-400">Find pharmacies, hospitals, and doctors near you</p>
                    </div>
                    <button
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGettingLocation ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Getting location...</span>
                            </>
                        ) : (
                            <>
                                <Locate className="h-5 w-5" />
                                <span>Find care near me</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Error Message */}
                {error && (
                    <div className="mt-4 p-4 bg-red-900/20 border border-red-700/50 rounded-lg">
                        <div className="flex items-start space-x-2">
                            <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <p className="text-red-300 text-sm font-medium mb-2">{error}</p>
                                {error.includes('permission denied') && (
                                    <div className="text-xs text-red-200 space-y-1 mb-3">
                                        <p>✓ Click the lock icon (🔒) in your browser's address bar</p>
                                        <p>✓ Change Location from "Block" to "Allow"</p>
                                        <p>✓ Click "Try Again" below</p>
                                    </div>
                                )}
                                {error.includes('timed out') && (
                                    <div className="text-xs text-red-200 space-y-1 mb-3">
                                        <p>💡 Location is taking too long to acquire</p>
                                        <p>✓ Try clicking "Try Again" (sometimes it works on second attempt)</p>
                                        <p>✓ Or use "Manual Input" to type your city/address</p>
                                    </div>
                                )}
                                {error.includes('unavailable') && (
                                    <div className="text-xs text-red-200 space-y-1 mb-3">
                                        <p>💡 Location services may be disabled</p>
                                        <p>✓ Enable GPS/Location Services on your device</p>
                                        <p>✓ Or use "Manual Input" to type your city/address</p>
                                    </div>
                                )}
                                <div className="flex gap-2 mt-2">
                                    <button
                                        onClick={handleGetCurrentLocation}
                                        className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                    <button
                                        onClick={() => {
                                            setShowManualInput(true);
                                            setError(null);
                                        }}
                                        className="px-3 py-1.5 bg-slate-700 text-white text-xs rounded hover:bg-slate-600 transition-colors"
                                    >
                                        Use Manual Input Instead
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Mock Data Warning */}
                {usingMockData && userLocation && (
                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start space-x-2">
                        <AlertCircle className="h-5 w-5 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-yellow-300 text-sm">
                                Showing sample data. Add a Google Places API key to see real nearby locations.
                            </p>
                        </div>
                    </div>
                )}

                {/* Manual Location Input */}
                {showManualInput && (
                    <div className="mt-4 p-4 bg-slate-800/50 border border-slate-700 rounded-lg">
                        <h3 className="text-white font-medium mb-3 flex items-center space-x-2">
                            <MapPinned className="h-5 w-5 text-blue-400" />
                            <span>Enter your location manually</span>
                        </h3>
                        <div className="flex space-x-2">
                            <input
                                type="text"
                                placeholder="Enter city, address, or pincode..."
                                value={manualAddress}
                                onChange={(e) => setManualAddress(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
                                className="flex-1 px-4 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                                onClick={handleManualLocation}
                                disabled={isLoading}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Search'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {!userLocation ? (
                <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-12 text-center">
                    <MapPin className="h-16 w-16 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-white mb-2">Location Access Required</h3>
                    <p className="text-slate-400 mb-6 max-w-md mx-auto">
                        Click "Find care near me" to allow location access and discover nearby healthcare providers
                    </p>
                    <button
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 inline-flex items-center space-x-2"
                    >
                        {isGettingLocation ? (
                            <>
                                <Loader2 className="h-5 w-5 animate-spin" />
                                <span>Getting location...</span>
                            </>
                        ) : (
                            <>
                                <Locate className="h-5 w-5" />
                                <span>Enable Location</span>
                            </>
                        )}
                    </button>
                    <p className="text-xs text-slate-500 mt-4">
                        Or{' '}
                        <button
                            onClick={() => setShowManualInput(true)}
                            className="text-blue-400 hover:text-blue-300 underline"
                        >
                            enter your location manually
                        </button>
                    </p>
                </div>
            ) : (
                <>
                    {/* Search and Filters */}
                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name or address..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        {activeTab === 'Hospital' && (
                            <div className="relative flex-1">
                                <Stethoscope className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400 pointer-events-none z-10" />
                                <input
                                    list="specialties"
                                    type="text"
                                    placeholder="Select or type specialty (e.g., Cardiology)..."
                                    value={specialty}
                                    onChange={(e) => setSpecialty(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-800/50 border border-slate-600 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                                <datalist id="specialties">
                                    {MEDICAL_SPECIALTIES.map((spec) => (
                                        <option key={spec} value={spec} />
                                    ))}
                                </datalist>
                            </div>
                        )}
                        <div className="flex bg-slate-800/50 p-1 rounded-xl border border-slate-700">
                            {['all', 'Pharmacy', 'Hospital'].map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab as any)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === tab
                                        ? 'bg-blue-600 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                                        }`}
                                >
                                    {tab === 'all' ? 'All' : tab}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Results */}
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 text-blue-400 animate-spin" />
                            <span className="ml-3 text-slate-400">Loading nearby locations...</span>
                        </div>
                    ) : filteredLocations.length === 0 ? (
                        <div className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-12 text-center">
                            <MapPin className="h-12 w-12 text-slate-600 mx-auto mb-3" />
                            <p className="text-slate-400">No locations found</p>
                            <p className="text-sm text-slate-500 mt-2">Try adjusting your search or filters</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredLocations.map((loc) => (
                                <div
                                    key={loc.id}
                                    className="bg-slate-900/80 border border-slate-700/50 rounded-xl p-4 hover:bg-slate-800/50 transition-colors group"
                                >
                                    <div className="flex items-start justify-between mb-2">
                                        <div className="flex items-center space-x-3">
                                            <div
                                                className={`p-2 rounded-lg ${loc.type === 'Hospital'
                                                    ? 'bg-red-900/20 text-red-400'
                                                    : loc.type === 'Pharmacy'
                                                        ? 'bg-emerald-900/20 text-emerald-400'
                                                        : 'bg-blue-900/20 text-blue-400'
                                                    }`}
                                            >
                                                {loc.type === 'Hospital' ? (
                                                    <Building2 className="h-5 w-5" />
                                                ) : loc.type === 'Pharmacy' ? (
                                                    <Pill className="h-5 w-5" />
                                                ) : (
                                                    <Stethoscope className="h-5 w-5" />
                                                )}
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors">
                                                    {loc.name}
                                                </h3>
                                                <p className="text-xs text-slate-400">{loc.type}</p>
                                            </div>
                                        </div>
                                        {loc.rating > 0 && (
                                            <div className="flex items-center bg-slate-800 px-2 py-1 rounded text-xs text-yellow-400">
                                                <Star className="h-3 w-3 mr-1 fill-current" />
                                                {loc.rating}
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-2 text-sm text-slate-400 ml-11">
                                        <p>{loc.address}</p>
                                        <div className="flex items-center justify-between">
                                            <span className={loc.isOpen ? 'text-emerald-400' : 'text-red-400'}>
                                                {loc.isOpen ? 'Open Now' : 'Closed'}
                                            </span>
                                            <span className="font-medium text-blue-400">{loc.distance}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 flex gap-2 ml-11">
                                        <button
                                            onClick={() => handleDirections(loc)}
                                            className="flex-1 py-2 bg-blue-600/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-600/30 transition-colors flex items-center justify-center gap-2"
                                        >
                                            <Navigation className="h-4 w-4" /> Directions
                                        </button>
                                        {loc.phone && (
                                            <button
                                                onClick={() => handleCall(loc.phone)}
                                                className="flex-1 py-2 bg-slate-700/30 text-slate-300 rounded-lg text-sm font-medium hover:bg-slate-700/50 transition-colors flex items-center justify-center gap-2"
                                            >
                                                <Phone className="h-4 w-4" /> Call
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default Locator;
