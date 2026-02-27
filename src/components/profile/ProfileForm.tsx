
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useProfile, useUpdateProfile } from '@/hooks/useProfile';
import { useEffect, useState } from 'react';
import LocationPicker from './LocationPicker';
import { toast } from 'sonner';
import { Skeleton } from '../ui/skeleton';

const profileFormSchema = z.object({
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  address_line1: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  zip_code: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

const ProfileForm = ({ onSave }: { onSave: () => void }) => {
  const { data: profile, isLoading } = useProfile();
  const updateProfile = useUpdateProfile();
  const [mapHasError, setMapHasError] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      address_line1: null,
      city: null,
      state: null,
      zip_code: null,
      latitude: null,
      longitude: null,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        address_line1: profile.address_line1,
        city: profile.city,
        state: profile.state,
        zip_code: profile.zip_code,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
    }
  }, [profile, form]);
  
  const onSubmit = async (values: ProfileFormValues) => {
    try {
      await updateProfile.mutateAsync(values);
      toast.success('Profile updated successfully!');
      onSave();
    } catch (error: any) {
      console.error('Profile update failed:', error);
      toast.error(`Failed to update profile: ${error.message || 'An unknown error occurred.'}`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-80 w-full" />
        <Skeleton className="h-10 w-24" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="first_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="last_name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div>
          <FormLabel>Address</FormLabel>
          <LocationPicker
            initialPosition={profile?.latitude && profile?.longitude ? { lat: profile.latitude, lng: profile.longitude } : undefined}
            onLocationSelect={({ lat, lng, addressComponents }) => {
              form.setValue('address_line1', addressComponents.address_line1);
              form.setValue('city', addressComponents.city);
              form.setValue('state', addressComponents.state);
              form.setValue('zip_code', addressComponents.zip_code);
              form.setValue('latitude', lat);
              form.setValue('longitude', lng);
            }}
            onError={() => setMapHasError(true)}
          />
        </div>
        {mapHasError && (
          <div className="space-y-4 p-4 border border-dashed rounded-md">
             <p className="text-sm text-muted-foreground">Please enter your address manually.</p>
            <FormField
              control={form.control}
              name="address_line1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address Line 1</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="state"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>State</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="zip_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value || ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        )}
        <Button type="submit" disabled={updateProfile.isPending}>
          {updateProfile.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </form>
    </Form>
  );
};

export default ProfileForm;
