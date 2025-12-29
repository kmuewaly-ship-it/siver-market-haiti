import { useEffect, useRef, useState, useMemo } from 'react';
import type * as LType from 'leaflet';
import { PickupPoint } from '@/hooks/usePickupPoints';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { MapPin, Navigation, Loader2, Phone, CheckCircle } from 'lucide-react';

interface PickupPointsMapProps {
  pickupPoints: PickupPoint[];
  selectedPointId?: string | null;
  onSelectPoint: (pointId: string) => void;
  userLocation?: { lat: number; lng: number } | null;
  showDistances?: boolean;
  height?: string;
}

// Geocoding cache to avoid repeated API calls
const geocodeCache: Record<string, { lat: number; lng: number }> = {};

// Haiti default center (Port-au-Prince)
const HAITI_CENTER = { lat: 18.5944, lng: -72.3074 };

// Calculate distance between two points (Haversine formula)
export const calculateDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Geocode address using Nominatim (free OpenStreetMap service)
export const geocodeAddress = async (
  address: string,
  city: string,
  country: string | null
): Promise<{ lat: number; lng: number } | null> => {
  const fullAddress = `${address}, ${city}, ${country || 'Haiti'}`;
  
  // Check cache first
  if (geocodeCache[fullAddress]) {
    return geocodeCache[fullAddress];
  }
  
  try {
    const query = encodeURIComponent(fullAddress);
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${query}&limit=1`,
      {
        headers: {
          'User-Agent': 'SilverMarketHaiti/1.0',
        },
      }
    );
    
    const data = await response.json();
    if (data && data.length > 0) {
      const result = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      geocodeCache[fullAddress] = result;
      return result;
    }
  } catch (error) {
    console.error('Geocoding error:', error);
  }
  
  return null;
};

const PickupPointsMap = ({
  pickupPoints,
  selectedPointId,
  onSelectPoint,
  userLocation,
  showDistances = true,
  height = '400px',
}: PickupPointsMapProps) => {
  const mapRef = useRef<LType.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Record<string, LType.Marker>>({});
  const leafletRef = useRef<typeof LType | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLeafletLoaded, setIsLeafletLoaded] = useState(false);
  const [currentUserLocation, setCurrentUserLocation] = useState<{ lat: number; lng: number } | null>(
    userLocation || null
  );
  const [pointCoordinates, setPointCoordinates] = useState<Record<string, { lat: number; lng: number }>>({});
  const [isLoadingCoords, setIsLoadingCoords] = useState(true);

  // Load Leaflet dynamically
  useEffect(() => {
    const loadLeaflet = async () => {
      try {
        const L = await import('leaflet');
        await import('leaflet/dist/leaflet.css');
        
        // Fix for default marker icons
        try {
          delete (L.Icon.Default.prototype as any)._getIconUrl;
          L.Icon.Default.mergeOptions({
            iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
            iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
          });
        } catch (e) {
          console.warn('Leaflet icon fix failed:', e);
        }
        
        leafletRef.current = L;
        setIsLeafletLoaded(true);
      } catch (error) {
        console.error('Failed to load Leaflet:', error);
      }
    };
    
    loadLeaflet();
  }, []);

  // Geocode all pickup points on mount
  useEffect(() => {
    const geocodeAll = async () => {
      setIsLoadingCoords(true);
      const coords: Record<string, { lat: number; lng: number }> = {};
      
      for (const point of pickupPoints) {
        // Check if point has coordinates in metadata or directly
        if (point.latitude && point.longitude) {
          coords[point.id] = { lat: point.latitude, lng: point.longitude };
        } else {
          const metadata = point.metadata as Record<string, any> | null;
          if (metadata?.lat && metadata?.lng) {
            coords[point.id] = { lat: metadata.lat, lng: metadata.lng };
          } else {
            const result = await geocodeAddress(point.address, point.city, point.country);
            if (result) {
              coords[point.id] = result;
            }
          }
        }
      }
      
      setPointCoordinates(coords);
      setIsLoadingCoords(false);
    };
    
    if (pickupPoints.length > 0) {
      geocodeAll();
    } else {
      setIsLoadingCoords(false);
    }
  }, [pickupPoints]);

  // Calculate distances from user location
  const pointsWithDistance = useMemo(() => {
    if (!currentUserLocation) return pickupPoints.map(p => ({ ...p, distance: null }));
    
    return pickupPoints
      .map(point => {
        const coords = pointCoordinates[point.id];
        const distance = coords
          ? calculateDistance(
              currentUserLocation.lat,
              currentUserLocation.lng,
              coords.lat,
              coords.lng
            )
          : null;
        return { ...point, distance };
      })
      .sort((a, b) => {
        if (a.distance === null) return 1;
        if (b.distance === null) return -1;
        return a.distance - b.distance;
      });
  }, [pickupPoints, pointCoordinates, currentUserLocation]);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current || !isLeafletLoaded || !leafletRef.current) return;
    
    const L = leafletRef.current;
    
    mapRef.current = L.map(mapContainerRef.current, {
      center: [HAITI_CENTER.lat, HAITI_CENTER.lng],
      zoom: 9,
      scrollWheelZoom: true,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [isLeafletLoaded]);

  // Add markers when coordinates are loaded
  useEffect(() => {
    if (!mapRef.current || isLoadingCoords || !isLeafletLoaded || !leafletRef.current) return;

    const L = leafletRef.current;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    const bounds = L.latLngBounds([]);

    // Add pickup point markers
    pickupPoints.forEach(point => {
      const coords = pointCoordinates[point.id];
      if (!coords) return;

      const isSelected = point.id === selectedPointId;
      
      // Custom icon for selected/unselected state
      const icon = L.divIcon({
        className: 'custom-marker',
        html: `
          <div style="
            background-color: ${isSelected ? '#071d7f' : '#ffffff'};
            border: 3px solid ${isSelected ? '#071d7f' : '#374151'};
            border-radius: 50%;
            width: 32px;
            height: 32px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="${isSelected ? '#ffffff' : '#374151'}" stroke-width="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon })
        .addTo(mapRef.current!);
      
      marker.bindPopup(`
        <div style="min-width: 200px;">
          <strong>${point.name}</strong><br/>
          <small>${point.address}</small><br/>
          <small>${point.city}, ${point.country || 'Haiti'}</small>
          ${point.phone ? `<br/><small>📞 ${point.phone}</small>` : ''}
        </div>
      `);

      marker.on('click', () => onSelectPoint(point.id));
      
      markersRef.current[point.id] = marker;
      bounds.extend([coords.lat, coords.lng]);
    });

    // Add user location marker
    if (currentUserLocation) {
      const userIcon = L.divIcon({
        className: 'user-marker',
        html: `
          <div style="
            background-color: #3b82f6;
            border: 3px solid #ffffff;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            box-shadow: 0 2px 8px rgba(59,130,246,0.5);
          "></div>
        `,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
      });

      L.marker([currentUserLocation.lat, currentUserLocation.lng], { icon: userIcon })
        .addTo(mapRef.current)
        .bindPopup('Tu ubicación');
      
      bounds.extend([currentUserLocation.lat, currentUserLocation.lng]);
    }

    // Fit bounds if we have points
    if (bounds.isValid()) {
      mapRef.current.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [pointCoordinates, selectedPointId, currentUserLocation, isLoadingCoords, pickupPoints, onSelectPoint, isLeafletLoaded]);

  // Center on selected point
  useEffect(() => {
    if (!mapRef.current || !selectedPointId) return;
    
    const coords = pointCoordinates[selectedPointId];
    if (coords) {
      mapRef.current.setView([coords.lat, coords.lng], 15);
      markersRef.current[selectedPointId]?.openPopup();
    }
  }, [selectedPointId, pointCoordinates]);

  // Get user location
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocalización no soportada');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentUserLocation(loc);
        setIsLocating(false);
        
        if (mapRef.current) {
          mapRef.current.setView([loc.lat, loc.lng], 12);
        }
      },
      (error) => {
        console.error('Geolocation error:', error);
        setIsLocating(false);
        alert('No se pudo obtener tu ubicación');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (isLoadingCoords || !isLeafletLoaded) {
    return (
      <div className="flex items-center justify-center bg-muted rounded-lg" style={{ height }}>
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Cargando mapa...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Map Container */}
      <div className="relative rounded-lg overflow-hidden border">
        <div ref={mapContainerRef} style={{ height, width: '100%' }} />
        
        {/* Location Button */}
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-4 right-4 z-[1000] shadow-lg"
          onClick={handleGetLocation}
          disabled={isLocating}
        >
          {isLocating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Navigation className="h-4 w-4" />
          )}
          <span className="ml-2 hidden sm:inline">Mi ubicación</span>
        </Button>
      </div>

      {/* Points List with Distances */}
      {showDistances && (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {pointsWithDistance.map((point) => {
            const isSelected = point.id === selectedPointId;
            return (
              <Card
                key={point.id}
                className={`p-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                    : 'hover:border-muted-foreground'
                }`}
                onClick={() => onSelectPoint(point.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate">{point.name}</p>
                      {isSelected && <CheckCircle className="h-4 w-4 text-primary" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{point.address}</p>
                    <p className="text-xs text-muted-foreground">
                      {point.city}, {point.country || 'Haiti'}
                    </p>
                    {point.phone && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Phone className="h-3 w-3" />
                        {point.phone}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {point.distance !== null && (
                      <Badge variant="secondary" className="text-xs">
                        {point.distance < 1
                          ? `${Math.round(point.distance * 1000)}m`
                          : `${point.distance.toFixed(1)}km`}
                      </Badge>
                    )}
                    {point.is_active && (
                      <Badge variant="outline" className="text-green-600 text-xs mt-1 block">
                        Activo
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PickupPointsMap;
