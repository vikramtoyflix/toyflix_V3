import { useJsApiLoader, GoogleMap, Autocomplete, Marker, InfoWindow, Libraries } from '@react-google-maps/api';
import { GOOGLE_MAPS_API_KEY } from '@/config';
import { useCallback, useState, useRef, useEffect, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { MapPin, Loader2, HelpCircle, X } from 'lucide-react';
import { toast } from 'sonner';

interface LocationPickerProps {
  onLocationSelect: (location: {
    address: string;
    lat: number;
    lng: number;
    plus_code?: string;
    plus_code_data?: { 
      global?: string; 
      compound?: string; 
      clean?: string 
    };
    addressComponents: {
      country: string;
      address_line1: string;
      apartment: string;
      city: string;
      state: string;
      zip_code: string;
    }
  }) => void;
  initialPosition?: { lat: number; lng: number };
  onError?: () => void;
}

const libraries: Libraries = ['places'];

// Cache for geocoding results to reduce API calls
const geocodingCache = new Map<string, any>();

// Function to get Plus Code from Google Maps Geocoding API (similar to PHP version)
const getPlusCodeFromApi = async (latitude: number, longitude: number): Promise<string | null> => {
  try {
    const apiEndpoint = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${GOOGLE_MAPS_API_KEY}`;
    
    const response = await fetch(apiEndpoint);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.plus_code && data.plus_code.compound_code) {
      // Extract Plus Code from response (similar to PHP version)
      const plusCode = data.plus_code.compound_code;
      const trimmedCode = plusCode.substring(0, plusCode.indexOf(' '));
      return trimmedCode;
    } else if (data.plus_code && data.plus_code.global_code) {
      // Fallback to global code if compound code not available
      return data.plus_code.global_code;
    }
    
    return null;
  } catch (error) {
    console.error('Error retrieving Plus Code:', error);
    return null;
  }
};

const LocationPicker = ({ onLocationSelect, initialPosition, onError }: LocationPickerProps) => {
  const { isLoaded, loadError } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY,
    libraries,
  });

  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markerPosition, setMarkerPosition] = useState(initialPosition || { lat: 12.9716, lng: 77.5946 });
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [showLocationHelp, setShowLocationHelp] = useState(false);
  const [showInfoWindow, setShowInfoWindow] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const autocompleteRef = useRef<google.maps.places.Autocomplete>(null);

  useEffect(() => {
    if (loadError && onError) {
      onError();
    }
  }, [loadError, onError]);

  useEffect(() => {
    if (initialPosition) {
      setMarkerPosition(initialPosition);
      map?.panTo(initialPosition);
    }
  }, [initialPosition, map]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
    if(initialPosition) {
      mapInstance.panTo(initialPosition);
    }
    
    // Disable default info windows and ensure our click handler takes precedence
    mapInstance.addListener('click', (event: google.maps.MapMouseEvent) => {
      // Clear any existing info windows
      mapInstance.set('clickableIcons', false);
      
      // Hide previous InfoWindow when clicking on a new location
      setShowInfoWindow(false);
      
      if (event.latLng) {
        const lat = event.latLng.lat();
        const lng = event.latLng.lng();
        setMarkerPosition({ lat, lng });
        
        // Call reverse geocoding directly here
        if (!isLoaded || !window.google) {
          return;
        }
        
        const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        if (geocodingCache.has(cacheKey)) {
          const cachedResult = geocodingCache.get(cacheKey);
          setCurrentAddress(cachedResult.address);
          setShowInfoWindow(true);
          onLocationSelect(cachedResult);
          toast.success("Address selected and populated!");
          return;
        }
        
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat, lng };
        
        geocoder.geocode({ location: latlng }, async (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const place = results[0];
            const address = place.formatted_address || '';
            
            // Show the address in InfoWindow
            setCurrentAddress(address);
            setShowInfoWindow(true);
            
            const addressComponents = {
              country: '',
              address_line1: '',
              apartment: '',
              city: '',
              state: '',
              zip_code: '',
            };

            place.address_components?.forEach(component => {
              const types = component.types;
              
              // Build address line 1 with street number and route only
              if (types.includes('street_number')) {
                addressComponents.address_line1 = component.long_name;
              }
              if (types.includes('route')) {
                addressComponents.address_line1 = `${addressComponents.address_line1} ${component.long_name}`.trim();
              }
              
              // Separate apartment/suite information
              if (types.includes('subpremise') || types.includes('floor')) {
                addressComponents.apartment = component.long_name;
              }
              
              // City with enhanced fallbacks for Indian addresses
              if (types.includes('locality')) {
                addressComponents.city = component.long_name;
              } else if (types.includes('sublocality_level_1') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              } else if (types.includes('administrative_area_level_2') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              } else if (types.includes('administrative_area_level_3') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              }
              
              // State - use long name for Indian states (Karnataka, not KA)
              if (types.includes('administrative_area_level_1')) {
                addressComponents.state = component.long_name;
              }
              
              // Postal code
              if (types.includes('postal_code')) {
                addressComponents.zip_code = component.long_name;
              } else if (types.includes('postal_code_prefix') && !addressComponents.zip_code) {
                addressComponents.zip_code = component.long_name;
              }
              
              // Country - set to India for Indian addresses
              if (types.includes('country')) {
                addressComponents.country = component.long_name; // "India" instead of "IN"
              }
            });
            
            let plusCode: string | undefined;
            let plusCodeData: { global?: string; compound?: string; clean?: string } = {};
            
            if (place.plus_code) {
              if (place.plus_code.compound_code) {
                plusCodeData.compound = place.plus_code.compound_code;
                plusCodeData.clean = place.plus_code.compound_code.substring(0, place.plus_code.compound_code.indexOf(' '));
                plusCode = plusCodeData.clean;
              }
              if (place.plus_code.global_code) {
                plusCodeData.global = place.plus_code.global_code;
                if (!plusCode) plusCode = place.plus_code.global_code;
              }
            }
            
            if (!plusCode) {
              const apiPlusCode = await getPlusCodeFromApi(lat, lng);
              if (apiPlusCode) {
                plusCode = apiPlusCode;
                plusCodeData.clean = apiPlusCode;
              }
            }
            
            const locationData = { 
              address, 
              lat, 
              lng, 
              plus_code: plusCode,
              plus_code_data: plusCodeData,
              addressComponents 
            };
            
            geocodingCache.set(cacheKey, locationData);
            
            // Auto-populate the address fields
            onLocationSelect(locationData);
            toast.success("Address selected and populated!");
          } else if (status === 'ZERO_RESULTS') {
            setShowInfoWindow(false);
            toast.error("No address found for this location. Try clicking on a road or building.");
          } else if (status === 'OVER_QUERY_LIMIT') {
            setShowInfoWindow(false);
            toast.error("Geocoding quota exceeded. Please try again later.");
          } else if (status === 'REQUEST_DENIED') {
            setShowInfoWindow(false);
            toast.error("Geocoding request denied. Please enable the Geocoding API in Google Cloud Console.");
          } else {
            setShowInfoWindow(false);
            toast.error(`Unable to get address for this location. Status: ${status}`);
          }
        });
      }
    });
  }, [initialPosition, isLoaded, onLocationSelect]);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  const getCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by this browser");
      return;
    }

    // Check if we're on HTTPS (required for location access)
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') {
      toast.error("Location access requires a secure connection (HTTPS)");
      return;
    }

    setIsGettingLocation(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        
        setMarkerPosition({ lat, lng });
        map?.panTo({ lat, lng });
        
        // Inline reverse geocoding for current location
        if (!isLoaded || !window.google) {
          setIsGettingLocation(false);
          return;
        }
        
        const cacheKey = `${lat.toFixed(6)},${lng.toFixed(6)}`;
        
        if (geocodingCache.has(cacheKey)) {
          const cachedResult = geocodingCache.get(cacheKey);
          setCurrentAddress(cachedResult.address);
          setShowInfoWindow(true);
          onLocationSelect(cachedResult);
          toast.success("Address selected and populated!");
          setIsGettingLocation(false);
          return;
        }
        
        const geocoder = new window.google.maps.Geocoder();
        const latlng = { lat, lng };
        
        geocoder.geocode({ location: latlng }, async (results, status) => {
          if (status === 'OK' && results && results[0]) {
            const place = results[0];
            const address = place.formatted_address || '';
            
            // Show the address in InfoWindow
            setCurrentAddress(address);
            setShowInfoWindow(true);
            
            const addressComponents = {
              country: '',
              address_line1: '',
              apartment: '',
              city: '',
              state: '',
              zip_code: '',
            };

            place.address_components?.forEach(component => {
              const types = component.types;
              
              // Build address line 1 with street number and route only
              if (types.includes('street_number')) {
                addressComponents.address_line1 = component.long_name;
              }
              if (types.includes('route')) {
                addressComponents.address_line1 = `${addressComponents.address_line1} ${component.long_name}`.trim();
              }
              
              // Separate apartment/suite information
              if (types.includes('subpremise') || types.includes('floor')) {
                addressComponents.apartment = component.long_name;
              }
              
              // City with enhanced fallbacks for Indian addresses
              if (types.includes('locality')) {
                addressComponents.city = component.long_name;
              } else if (types.includes('sublocality_level_1') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              } else if (types.includes('administrative_area_level_2') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              } else if (types.includes('administrative_area_level_3') && !addressComponents.city) {
                addressComponents.city = component.long_name;
              }
              
              // State - use long name for Indian states (Karnataka, not KA)
              if (types.includes('administrative_area_level_1')) {
                addressComponents.state = component.long_name;
              }
              
              // Postal code
              if (types.includes('postal_code')) {
                addressComponents.zip_code = component.long_name;
              } else if (types.includes('postal_code_prefix') && !addressComponents.zip_code) {
                addressComponents.zip_code = component.long_name;
              }
              
              // Country - set to India for Indian addresses
              if (types.includes('country')) {
                addressComponents.country = component.long_name; // "India" instead of "IN"
              }
            });
            
            let plusCode: string | undefined;
            let plusCodeData: { global?: string; compound?: string; clean?: string } = {};
            
            if (place.plus_code) {
              if (place.plus_code.compound_code) {
                plusCodeData.compound = place.plus_code.compound_code;
                plusCodeData.clean = place.plus_code.compound_code.substring(0, place.plus_code.compound_code.indexOf(' '));
                plusCode = plusCodeData.clean;
              }
              if (place.plus_code.global_code) {
                plusCodeData.global = place.plus_code.global_code;
                if (!plusCode) plusCode = place.plus_code.global_code;
              }
            }
            
            if (!plusCode) {
              const apiPlusCode = await getPlusCodeFromApi(lat, lng);
              if (apiPlusCode) {
                plusCode = apiPlusCode;
                plusCodeData.clean = apiPlusCode;
              }
            }
            
            const locationData = { 
              address, 
              lat, 
              lng, 
              plus_code: plusCode,
              plus_code_data: plusCodeData,
              addressComponents 
            };
            
            geocodingCache.set(cacheKey, locationData);
            
            // Auto-populate the address fields
            onLocationSelect(locationData);
            toast.success("Address selected and populated!");
          } else {
            toast.error("Unable to get address for your current location");
          }
          setIsGettingLocation(false);
        });
      },
      (error) => {
        setIsGettingLocation(false);
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            toast.error("🚫 Location access denied. Please enable location permissions and try again.", {
              duration: 6000,
              action: {
                label: "How to Enable",
                onClick: () => setShowLocationHelp(true)
              }
            });
            break;
          case error.POSITION_UNAVAILABLE:
            toast.error("📍 Your location is currently unavailable. Please try again or search for your address manually.");
            break;
          case error.TIMEOUT:
            toast.error("⏰ Location request timed out. Please try again or search manually.");
            break;
          default:
            toast.error("Unable to get your location. Please search for your address manually.");
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000, // Increased timeout
        maximumAge: 300000 // 5 minutes
      }
    );
  }, [map, isLoaded, onLocationSelect]);

  const onPlaceChanged = async () => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();
      if (place.geometry && place.geometry.location) {
        const lat = place.geometry.location.lat();
        const lng = place.geometry.location.lng();
        const address = place.formatted_address || '';
        
        setMarkerPosition({ lat, lng });
        map?.panTo({ lat, lng });

        // Show the address in InfoWindow for search results
        setCurrentAddress(address);
        setShowInfoWindow(true);

        const addressComponents = {
          country: '',
          address_line1: '',
          apartment: '',
          city: '',
          state: '',
          zip_code: '',
        };

        // Enhanced address component extraction with fallbacks (same as reverseGeocode)
        place.address_components?.forEach(component => {
          const types = component.types;
          
          // Build address line 1 with street number and route only
          if (types.includes('street_number')) {
            addressComponents.address_line1 = component.long_name;
          }
          if (types.includes('route')) {
            addressComponents.address_line1 = `${addressComponents.address_line1} ${component.long_name}`.trim();
          }
          
          // Separate apartment/suite information
          if (types.includes('subpremise') || types.includes('floor')) {
            addressComponents.apartment = component.long_name;
          }
          
          // City with enhanced fallbacks for Indian addresses
          if (types.includes('locality')) {
            addressComponents.city = component.long_name;
          } else if (types.includes('sublocality_level_1') && !addressComponents.city) {
            addressComponents.city = component.long_name;
          } else if (types.includes('administrative_area_level_2') && !addressComponents.city) {
            addressComponents.city = component.long_name;
          } else if (types.includes('administrative_area_level_3') && !addressComponents.city) {
            addressComponents.city = component.long_name;
          }
          
          // State - use long name for Indian states (Karnataka, not KA)
          if (types.includes('administrative_area_level_1')) {
            addressComponents.state = component.long_name;
          }
          
          // Postal code
          if (types.includes('postal_code')) {
            addressComponents.zip_code = component.long_name;
          } else if (types.includes('postal_code_prefix') && !addressComponents.zip_code) {
            addressComponents.zip_code = component.long_name;
          }
          
          // Country - set to India for Indian addresses
          if (types.includes('country')) {
            addressComponents.country = component.long_name; // "India" instead of "IN"
          }
        });
        
        // Try to get Plus Code from the place result
        let plusCode: string | undefined;
        let plusCodeData: { global?: string; compound?: string; clean?: string } = {};
        
        if (place.plus_code) {
          if (place.plus_code.compound_code) {
            plusCodeData.compound = place.plus_code.compound_code;
            plusCodeData.clean = place.plus_code.compound_code.substring(0, place.plus_code.compound_code.indexOf(' '));
            plusCode = plusCodeData.clean; // Maintain backward compatibility
          }
          if (place.plus_code.global_code) {
            plusCodeData.global = place.plus_code.global_code;
            if (!plusCode) plusCode = place.plus_code.global_code; // Fallback
          }
        }
        
        // If Plus Code not available from autocomplete, try HTTP API
        if (!plusCode) {
          const apiPlusCode = await getPlusCodeFromApi(lat, lng);
          if (apiPlusCode) {
            plusCode = apiPlusCode;
            plusCodeData.clean = apiPlusCode;
          }
        }
        
        onLocationSelect({ address, lat, lng, plus_code: plusCode, plus_code_data: plusCodeData, addressComponents });
      }
    }
  };

  if (loadError) {
    return (
      <div className="p-4 border border-destructive/50 bg-destructive/10 text-destructive rounded-md mt-4">
        <h3 className="font-bold">Could not load Google Maps</h3>
        <p className="text-sm">
          There was an issue loading the map. This is often due to an incorrect Google Maps API key configuration.
        </p>
         <p className="text-sm mt-2">
          Please check the browser's developer console for specific error messages from Google. Common issues include:
        </p>
        <ul className="list-disc list-inside text-sm mt-2">
          <li>Billing not enabled for the Google Cloud project.</li>
          <li>"Maps JavaScript API" and "Places API" not enabled in the Google Cloud Console.</li>
          <li>API key restrictions (HTTP referrers) not correctly configured for this website's domain.</li>
        </ul>
      </div>
    );
  }

  if (!isLoaded) {
    return <Skeleton className="h-80 w-full" />;
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Autocomplete
          onLoad={(ref) => (autocompleteRef.current = ref)}
          onPlaceChanged={onPlaceChanged}
          options={{
            fields: ['geometry', 'name', 'formatted_address', 'address_components', 'place_id', 'plus_code'],
            types: ['address'],
            componentRestrictions: { country: ['in'] }, // Restrict to India for better relevance
          }}
        >
          <Input type="text" placeholder="Search for your address" />
        </Autocomplete>
        
        <div className="flex items-center justify-center">
          <span className="text-sm text-muted-foreground">or</span>
        </div>
        
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={getCurrentLocation}
            disabled={isGettingLocation}
            className="flex-1"
          >
            {isGettingLocation ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Getting your location...
              </>
            ) : (
              <>
                <MapPin className="w-4 h-4 mr-2" />
                Use Current Location
              </>
            )}
          </Button>
          
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => setShowLocationHelp(true)}
            className="shrink-0"
            title="Need help with location access?"
          >
            <HelpCircle className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      <GoogleMap
        mapContainerStyle={{ height: '300px', width: '100%', borderRadius: '0.5rem' }}
        center={markerPosition}
        zoom={initialPosition ? 15 : 10}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          // Disable default info windows and click behavior
          clickableIcons: false,
          disableDefaultUI: false,
          // Enhanced UX options
          gestureHandling: 'cooperative',
          disableDoubleClickZoom: false,
          scrollwheel: true,
          // Styling for better visibility
          styles: [
            {
              featureType: 'poi.business',
              stylers: [{ visibility: 'off' }]
            },
            {
              featureType: 'poi.park',
              elementType: 'labels.text',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }}
      >
        <Marker 
          position={markerPosition}
          animation={window.google?.maps?.Animation?.DROP}
        />
        
        {showInfoWindow && currentAddress && (
          <InfoWindow
            position={markerPosition}
            onCloseClick={() => setShowInfoWindow(false)}
            options={{
              pixelOffset: new window.google.maps.Size(0, -30)
            }}
          >
            <div className="p-2 max-w-xs">
              <div className="font-medium text-sm text-gray-800 mb-1">Selected Address:</div>
              <div className="text-xs text-gray-600 leading-relaxed">
                {currentAddress}
              </div>
              <div className="mt-2 text-xs text-blue-600">
                ✓ Address populated in form
              </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
      
      <p className="text-xs text-muted-foreground text-center">
        💡 Tip: Click on the map to fine-tune your location
      </p>

      {/* Location Help Dialog */}
      <Dialog open={showLocationHelp} onOpenChange={setShowLocationHelp}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Enable Location Access
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To use your current location, please enable location permissions:
            </p>
            
            <div className="space-y-3">
              <div className="border rounded-lg p-3 bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">📱 On Mobile:</h4>
                <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Look for the location icon in your browser's address bar</li>
                  <li>Tap it and select "Allow" or "Always allow"</li>
                  <li>If you don't see it, go to your browser settings</li>
                  <li>Find "Site permissions" or "Location"</li>
                  <li>Allow location access for this website</li>
                </ol>
              </div>
              
              <div className="border rounded-lg p-3 bg-muted/50">
                <h4 className="font-semibold text-sm mb-2">💻 On Desktop:</h4>
                <ol className="text-xs space-y-1 list-decimal list-inside text-muted-foreground">
                  <li>Click the location icon in your browser's address bar</li>
                  <li>Select "Always allow" or "Allow"</li>
                  <li>Or go to browser Settings → Privacy → Site permissions</li>
                  <li>Find "Location" and allow access for this site</li>
                </ol>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowLocationHelp(false)} 
                className="flex-1"
              >
                Got it!
              </Button>
              <Button 
                variant="outline" 
                onClick={() => getCurrentLocation()}
                className="flex-1"
              >
                Try Again
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LocationPicker;
