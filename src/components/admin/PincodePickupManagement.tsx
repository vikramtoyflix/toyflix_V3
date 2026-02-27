/**
 * Pincode Pickup Management Component
 * Manages day-wise pincode assignments for pickup scheduling
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { 
  Plus,
  Trash2,
  MapPin,
  Calendar,
  AlertTriangle,
  Check,
  X,
  Download,
  Upload,
  Search,
  Filter
} from 'lucide-react';

import { 
  PickupDay
} from '@/utils/pincodeValidation';
import { PickupManagementService } from '@/services/pickupManagementService';

interface PincodePickupManagementProps {
  className?: string;
}

// Create service instance
const pickupService = new PickupManagementService();

interface PincodeInfo {
  pincode: string;
  area: string;
  zone: string;
  isActive: boolean;
}

const PincodePickupManagement: React.FC<PincodePickupManagementProps> = ({ className }) => {
  const [activeDay, setActiveDay] = useState<PickupDay>('monday');
  const [pincodeData, setPincodeData] = useState<Record<PickupDay, PincodeInfo[]>>({
    monday: [],
    tuesday: [],
    wednesday: [],
    thursday: [],
    friday: [],
    saturday: [],
    sunday: []
  });
  const [isLoading, setIsLoading] = useState(false);
  const [newPincode, setNewPincode] = useState('');
  const [areaName, setAreaName] = useState('');
  const [zone, setZone] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const DAYS_OF_WEEK: PickupDay[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  useEffect(() => {
    loadPincodeData();
  }, []);

  const loadPincodeData = async () => {
    setIsLoading(true);
    try {
      // Get pincode schedule from database
      const scheduleData = await pickupService.getPincodeSchedule();
      
      // Group by pickup day
      const data: Record<PickupDay, PincodeInfo[]> = {
        monday: [],
        tuesday: [],
        wednesday: [],
        thursday: [],
        friday: [],
        saturday: [],
        sunday: []
      };

      scheduleData.forEach(item => {
        data[item.pickup_day].push({
          pincode: item.pincode,
          area: item.area_name || getAreaForPincode(item.pincode),
          zone: item.zone || getZoneForPincode(item.pincode),
          isActive: item.is_active
        });
      });

      setPincodeData(data);
    } catch (error) {
      console.error('Failed to load pincode data:', error);
      toast.error('Failed to load pincode data');
    } finally {
      setIsLoading(false);
    }
  };

  const getAreaForPincode = (pincode: string): string => {
    const areaMap: Record<string, string> = {
      '560002': 'Bangalore City',
      '560003': 'Malleshwaram',
      '560004': 'Bangalore Cantonment',
      '560005': 'Seshadripuram',
      '560006': 'Rajajinagar',
      '560007': 'Chamarajpet',
      '560008': 'Chickpet',
      '560009': 'Bangalore Fort',
      '560010': 'Yeshwantpur',
      '560011': 'Shivajinagar',
      '560012': 'High Grounds',
      '560013': 'Sadashivanagar',
      '560020': 'Rajajinagar',
      '560021': 'Yeshwantpur',
      '560025': 'Jalahalli',
      '560034': 'Bommanahalli',
      '560037': 'Whitefield',
      '560040': 'Jayanagar',
      '560041': 'Jayanagar',
      '560042': 'Jayanagar',
      '560043': 'Jayanagar',
      '560047': 'Padmanabhanagar',
      '560048': 'ITPL',
      '560049': 'ITPL',
      '560050': 'Bilekahalli',
      '560066': 'Whitefield',
      '560067': 'Whitefield',
      '560068': 'Electronic City',
      '560076': 'BTM Layout',
      '560078': 'Koramangala',
      '560080': 'Indiranagar',
      '560087': 'Varthur',
      '560093': 'Jakkur',
      '560100': 'Electronic City',
      '560103': 'Sarjapur'
    };
    return areaMap[pincode] || 'Bangalore';
  };

  const getZoneForPincode = (pincode: string): string => {
    const zoneMap: Record<string, string> = {
      '560002': 'Central',
      '560003': 'North',
      '560004': 'Central',
      '560005': 'Central',
      '560006': 'West',
      '560007': 'South',
      '560008': 'Central',
      '560009': 'Central',
      '560010': 'West',
      '560011': 'Central',
      '560012': 'North',
      '560013': 'North',
      '560020': 'West',
      '560021': 'West',
      '560025': 'North',
      '560034': 'South',
      '560037': 'East',
      '560040': 'South',
      '560041': 'South',
      '560042': 'South',
      '560043': 'South',
      '560047': 'South',
      '560048': 'East',
      '560049': 'East',
      '560050': 'South',
      '560066': 'East',
      '560067': 'East',
      '560068': 'South',
      '560076': 'South',
      '560078': 'South',
      '560080': 'East',
      '560087': 'East',
      '560093': 'North',
      '560100': 'South',
      '560103': 'East'
    };
    return zoneMap[pincode] || 'Central';
  };

  const handleAddPincode = async () => {
    if (!newPincode.trim()) {
      toast.error('Please enter a pincode');
      return;
    }

    // Basic validation
    const cleanPincode = newPincode.trim();
    if (!/^\d{6}$/.test(cleanPincode)) {
      toast.error('Please enter a valid 6-digit pincode');
      return;
    }

    // Check if already exists in any day
    const exists = Object.values(pincodeData).some(dayData => 
      dayData.some(p => p.pincode === cleanPincode)
    );

    if (exists) {
      toast.error('This pincode is already assigned to a day');
      return;
    }

    try {
      // Save to database
      const success = await pickupService.updatePincodeSchedule(
        cleanPincode, 
        activeDay, 
        areaName || getAreaForPincode(cleanPincode), 
        zone || getZoneForPincode(cleanPincode)
      );

      if (success) {
        toast.success(`Pincode ${cleanPincode} added to ${activeDay}`);
        setNewPincode('');
        setAreaName('');
        setZone('');
        // Reload data to reflect changes
        loadPincodeData();
      } else {
        toast.error('Failed to add pincode');
      }
    } catch (error) {
      console.error('Error adding pincode:', error);
      toast.error('Failed to add pincode');
    }
  };

  const handleRemovePincode = async (pincode: string) => {
    try {
      // Remove from database by setting inactive
      const success = await pickupService.deletePincodeSchedule(pincode);

      if (success) {
        toast.success(`Pincode ${pincode} removed from ${activeDay}`);
        // Reload data to reflect changes
        loadPincodeData();
      } else {
        toast.error('Failed to remove pincode');
      }
    } catch (error) {
      console.error('Error removing pincode:', error);
      toast.error('Failed to remove pincode');
    }
  };

  const handleBulkAdd = async () => {
    const pincodes = newPincode.split(',').map(p => p.trim()).filter(p => p);
    
    if (pincodes.length === 0) {
      toast.error('Please enter pincodes separated by commas');
      return;
    }

    try {
      const validUpdates = [];
      let invalidCount = 0;
      let existingCount = 0;
      
      for (const pincode of pincodes) {
        if (!/^\d{6}$/.test(pincode)) {
          invalidCount++;
          continue;
        }

        // Check if already exists
        const exists = Object.values(pincodeData).some(dayData => 
          dayData.some(p => p.pincode === pincode)
        );

        if (exists) {
          existingCount++;
          continue;
        }

        validUpdates.push({
          pincode,
          pickup_day: activeDay,
          area_name: getAreaForPincode(pincode),
          zone: getZoneForPincode(pincode)
        });
      }

      if (validUpdates.length > 0) {
        const success = await pickupService.bulkUpdatePincodeSchedules(validUpdates);
        
        if (success) {
          toast.success(`Added ${validUpdates.length} pincodes to ${activeDay}${invalidCount > 0 ? `. ${invalidCount} invalid pincodes skipped` : ''}${existingCount > 0 ? `. ${existingCount} already assigned` : ''}`);
          setNewPincode('');
          // Reload data to reflect changes
          loadPincodeData();
        } else {
          toast.error('Failed to add pincodes');
        }
      } else {
        toast.error('No valid pincodes to add');
      }
    } catch (error) {
      console.error('Error bulk adding pincodes:', error);
      toast.error('Failed to add pincodes');
    }
  };

  const getDaySummary = (day: PickupDay) => {
    const dayData = pincodeData[day];
    const totalPincodes = dayData.length;
    const zones = [...new Set(dayData.map(p => p.zone))];
    return { totalPincodes, zones: zones.length };
  };

  const filteredPincodes = pincodeData[activeDay]?.filter(pincode =>
    searchTerm === '' || 
    pincode.pincode.includes(searchTerm) ||
    pincode.area.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pincode.zone.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  return (
    <div className={`space-y-6 p-6 ${className}`}>
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Pincode Pickup Setup</h1>
          <p className="text-muted-foreground">
            Configure day-wise pincode assignments for pickup scheduling
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={loadPincodeData} disabled={isLoading} size="sm" variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {DAYS_OF_WEEK.map((day) => {
          const summary = getDaySummary(day);
          return (
            <Card key={day} className={`cursor-pointer transition-all ${
              activeDay === day ? 'ring-2 ring-primary' : ''
            }`} onClick={() => setActiveDay(day)}>
              <CardContent className="p-4">
                <div className="text-center">
                  <div className="text-lg font-semibold capitalize">{day}</div>
                  <div className="text-2xl font-bold text-primary">{summary.totalPincodes}</div>
                  <div className="text-xs text-muted-foreground">{summary.zones} zones</div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Add Pincode Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Plus className="w-5 h-5" />
              <span>Add Pincodes to {activeDay.charAt(0).toUpperCase() + activeDay.slice(1)}</span>
            </CardTitle>
            <CardDescription>
              Add single pincode or multiple pincodes separated by commas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="pincode">Pincode(s)</Label>
              <Input
                id="pincode"
                value={newPincode}
                onChange={(e) => setNewPincode(e.target.value)}
                placeholder="560001 or 560001,560002,560003"
                className="mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="area">Area (Optional)</Label>
                <Input
                  id="area"
                  value={areaName}
                  onChange={(e) => setAreaName(e.target.value)}
                  placeholder="e.g., Koramangala"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="zone">Zone (Optional)</Label>
                <Select value={zone} onValueChange={setZone}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Central">Central</SelectItem>
                    <SelectItem value="North">North</SelectItem>
                    <SelectItem value="South">South</SelectItem>
                    <SelectItem value="East">East</SelectItem>
                    <SelectItem value="West">West</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex space-x-2">
              <Button onClick={handleAddPincode} className="flex-1">
                <Plus className="w-4 h-4 mr-2" />
                Add Single
              </Button>
              <Button onClick={handleBulkAdd} variant="outline" className="flex-1">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pincode List */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="capitalize">
                {activeDay} Pickups ({filteredPincodes.length})
              </CardTitle>
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search pincodes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-64"
                  />
                </div>
              </div>
            </div>
            <CardDescription>
              Pincodes assigned to {activeDay} for pickup scheduling
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : filteredPincodes.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p>No pincodes assigned to {activeDay}</p>
                <p className="text-sm">Add pincodes using the form on the left</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredPincodes.map((pincodeInfo) => (
                  <div
                    key={pincodeInfo.pincode}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="font-mono font-medium">{pincodeInfo.pincode}</span>
                      </div>
                      <Badge variant="secondary">{pincodeInfo.zone}</Badge>
                      <span className="text-sm text-muted-foreground">{pincodeInfo.area}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pincodeInfo.isActive ? (
                        <Badge variant="default" className="flex items-center space-x-1">
                          <Check className="h-3 w-3" />
                          <span>Active</span>
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="flex items-center space-x-1">
                          <X className="h-3 w-3" />
                          <span>Inactive</span>
                        </Badge>
                      )}
                      <Button
                        onClick={() => handleRemovePincode(pincodeInfo.pincode)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Coverage Summary</CardTitle>
          <CardDescription>
            Overview of pincode distribution across pickup days
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {DAYS_OF_WEEK.map((day) => {
              const summary = getDaySummary(day);
              const zones = [...new Set(pincodeData[day]?.map(p => p.zone) || [])];
              
              return (
                <div key={day} className="text-center p-4 border rounded-lg">
                  <div className="font-medium capitalize mb-2">{day}</div>
                  <div className="text-2xl font-bold text-primary mb-1">{summary.totalPincodes}</div>
                  <div className="text-sm text-muted-foreground mb-2">pincodes</div>
                  <div className="flex flex-wrap justify-center gap-1">
                    {zones.map((zone) => (
                      <Badge key={zone} variant="outline" className="text-xs">
                        {zone}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Information Alert */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          This system matches your previous WordPress setup with day-wise pincode assignments. 
          Pickup schedules will automatically use these assignments for route optimization.
          All changes are saved to the database and will be reflected in real-time pickup scheduling.
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default PincodePickupManagement; 