import { useState } from 'react';
import LocationPicker from '@/components/profile/LocationPicker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const LocationPickerDemo = () => {
  const [selectedLocation, setSelectedLocation] = useState<any>(null);

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Enhanced Location Picker</h1>
          <p className="text-muted-foreground">
            Test the Google Maps integration with mobile device location
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>📍 Location Picker</CardTitle>
            </CardHeader>
            <CardContent>
              <LocationPicker
                onLocationSelect={setSelectedLocation}
                onError={() => console.log('Maps error occurred')}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>📋 Selected Location</CardTitle>
            </CardHeader>
            <CardContent>
              {selectedLocation ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Address</h3>
                    <p className="text-sm bg-muted p-2 rounded">
                      {selectedLocation.address}
                    </p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Coordinates</h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary">
                        Lat: {selectedLocation.lat.toFixed(6)}
                      </Badge>
                      <Badge variant="secondary">
                        Lng: {selectedLocation.lng.toFixed(6)}
                      </Badge>
                    </div>
                  </div>

                  {(selectedLocation.plus_code || selectedLocation.plus_code_data) && (
                    <div>
                      <h3 className="font-semibold mb-2">Plus Code</h3>
                      <div className="space-y-2">
                        {selectedLocation.plus_code && (
                          <div className="flex gap-2">
                            <Badge variant="outline" className="font-mono">
                              {selectedLocation.plus_code}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              Primary
                            </Badge>
                          </div>
                        )}
                        
                        {selectedLocation.plus_code_data && (
                          <div className="space-y-1">
                            {selectedLocation.plus_code_data.clean && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Clean Code:</span>
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {selectedLocation.plus_code_data.clean}
                                </code>
                              </div>
                            )}
                            {selectedLocation.plus_code_data.global && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Global Code:</span>
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {selectedLocation.plus_code_data.global}
                                </code>
                              </div>
                            )}
                            {selectedLocation.plus_code_data.compound && (
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Compound Code:</span>
                                <code className="bg-muted px-2 py-1 rounded text-xs">
                                  {selectedLocation.plus_code_data.compound}
                                </code>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Enhanced Plus Code data for precise location sharing
                      </p>
                    </div>
                  )}

                  <div>
                    <h3 className="font-semibold mb-2">Address Components</h3>
                    <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Country / Region *</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.country || 'India'}
                          </div>
                        </div>
                        <div></div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Street Address including Apartment/Suite *</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.address_line1 || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Apartment</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.apartment || ''}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Town / City *</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.city || 'N/A'}
                          </div>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">State *</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.state || 'N/A'}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-gray-600">PIN Code *</label>
                          <div className="bg-white p-2 rounded border text-sm">
                            {selectedLocation.addressComponents.zip_code || 'N/A'}
                          </div>
                        </div>
                        <div></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>📍 Select a location to see details</p>
                  <p className="text-sm mt-2">
                    Use the "Current Location" button or search for an address
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>✨ Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-bold">📍</span>
                </div>
                <div>
                  <h4 className="font-semibold">Device Location</h4>
                  <p className="text-sm text-muted-foreground">
                    Access your mobile device's GPS location
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                  <span className="text-green-600 font-bold">🔍</span>
                </div>
                <div>
                  <h4 className="font-semibold">Address Search</h4>
                  <p className="text-sm text-muted-foreground">
                    Search for any address using Google Places
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-purple-600 font-bold">🎯</span>
                </div>
                <div>
                  <h4 className="font-semibold">Click to Select</h4>
                  <p className="text-sm text-muted-foreground">
                    Click anywhere on the map to set location
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                  <span className="text-orange-600 font-bold">🏷️</span>
                </div>
                <div>
                  <h4 className="font-semibold">Plus Code</h4>
                  <p className="text-sm text-muted-foreground">
                    Generate Google Plus Codes for precise location sharing
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default LocationPickerDemo; 