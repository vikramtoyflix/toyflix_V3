
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { CarouselSlide, uploadCarouselImage } from '@/hooks/useCarouselSlides';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  subtitle: z.string().min(1, 'Subtitle is required'),
  button_text: z.string().min(1, 'Button text is required'),
  button_link: z.string().min(1, 'Button link is required'),
  image_url: z.string().optional(),
  image_file: z.instanceof(FileList).optional(),
  is_active: z.boolean(),
  display_order: z.coerce.number(),
}).refine(data => data.image_url || (data.image_file && data.image_file.length > 0), {
  message: 'An image is required.',
  path: ['image_file'],
});

type CarouselSlideFormValues = z.infer<typeof formSchema>;

interface CarouselSlideFormProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (data: any) => Promise<void>;
  slide?: CarouselSlide;
}

const CarouselSlideForm: React.FC<CarouselSlideFormProps> = ({ isOpen, onOpenChange, onSubmit, slide }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<CarouselSlideFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: slide?.title || '',
      subtitle: slide?.subtitle || '',
      button_text: slide?.button_text || '',
      button_link: slide?.button_link || '',
      image_url: slide?.image_url || '',
      is_active: slide?.is_active ?? true,
      display_order: slide?.display_order || 0,
    },
  });

  React.useEffect(() => {
    if (slide) {
      form.reset({
        title: slide.title,
        subtitle: slide.subtitle,
        button_text: slide.button_text,
        button_link: slide.button_link,
        image_url: slide.image_url,
        is_active: slide.is_active,
        display_order: slide.display_order,
      });
    } else {
      form.reset({
        title: '',
        subtitle: '',
        button_text: '',
        button_link: '',
        image_url: '',
        is_active: true,
        display_order: 0,
      });
    }
  }, [slide, form]);
  
  const handleFormSubmit = async (values: CarouselSlideFormValues) => {
    setIsSubmitting(true);
    try {
      let imageUrl = values.image_url;
      if (values.image_file && values.image_file.length > 0) {
        toast.info('Uploading image...');
        imageUrl = await uploadCarouselImage(values.image_file[0]);
        toast.success('Image uploaded!');
      }

      await onSubmit({ ...values, image_url: imageUrl });
      onOpenChange(false);
    } catch (error) {
      toast.error('An error occurred.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{slide ? 'Edit Slide' : 'Add New Slide'}</DialogTitle>
          <DialogDescription>
            Fill in the details for the carousel slide. The image will be uploaded to the `toy-images` storage bucket.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-4">
            <FormField control={form.control} name="title" render={({ field }) => (
              <FormItem><FormLabel>Title</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="subtitle" render={({ field }) => (
              <FormItem><FormLabel>Subtitle</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="button_text" render={({ field }) => (
                <FormItem><FormLabel>Button Text</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="button_link" render={({ field }) => (
                <FormItem><FormLabel>Button Link</FormLabel><FormControl><Input {...field} placeholder="/plans" /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
            <FormField control={form.control} name="image_file" render={({ field }) => (
                <FormItem>
                    <FormLabel>Image</FormLabel>
                    <FormControl><Input type="file" {...form.register('image_file')} /></FormControl>
                    {slide?.image_url && <p className="text-sm text-muted-foreground">Current image: <a href={slide.image_url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a></p>}
                    <FormMessage />
                </FormItem>
            )} />
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="display_order" render={({ field }) => (
                <FormItem><FormLabel>Display Order</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="is_active" render={({ field }) => (
                <FormItem className="flex flex-col"><FormLabel>Active</FormLabel><FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl><FormMessage /></FormItem>
                )} />
             </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {slide ? 'Save Changes' : 'Add Slide'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

export default CarouselSlideForm;
