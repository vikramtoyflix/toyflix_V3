import React, { useState } from 'react';
import { useCarouselSlides, CarouselSlide } from '@/hooks/useCarouselSlides';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PlusCircle, Edit, Trash2, CheckCircle2, XCircle, Loader2, Hash } from 'lucide-react';
import CarouselSlideForm from './CarouselSlideForm';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useIsMobile } from "@/hooks/use-mobile";
import { Badge } from "@/components/ui/badge";

const AdminCarousel = () => {
  const { slides, isLoading, addSlide, updateSlide, deleteSlide } = useCarouselSlides();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [selectedSlide, setSelectedSlide] = useState<CarouselSlide | undefined>(undefined);
  const [slideToDelete, setSlideToDelete] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handleAddClick = () => {
    setSelectedSlide(undefined);
    setIsFormOpen(true);
  };

  const handleEditClick = (slide: CarouselSlide) => {
    setSelectedSlide(slide);
    setIsFormOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setSlideToDelete(id);
    setIsConfirmOpen(true);
  };
  
  const confirmDelete = () => {
    if (slideToDelete) {
      deleteSlide(slideToDelete);
      setSlideToDelete(null);
    }
    setIsConfirmOpen(false);
  };

  const handleFormSubmit = async (data: any) => {
    if (selectedSlide) {
      await updateSlide({ ...data, id: selectedSlide.id });
    } else {
      await addSlide(data);
    }
  };

  // Mobile card layout for carousel slides
  const MobileSlidesList = () => (
    <div className="space-y-3">
      {slides?.map((slide) => (
        <Card key={slide.id} className="p-4">
          <div className="space-y-3">
            {/* Slide Preview */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0">
                <img 
                  src={slide.image_url} 
                  alt={slide.title} 
                  className="w-20 h-12 object-cover rounded-md border"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-sm truncate">{slide.title}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={slide.is_active ? "default" : "secondary"} className="text-xs">
                    {slide.is_active ? "Active" : "Inactive"}
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Hash className="w-3 h-3" />
                    <span>{slide.display_order}</span>
                  </div>
                </div>
              </div>
            </div>



            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-2">
                {slide.is_active ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className="text-xs text-muted-foreground">
                  Order: {slide.display_order}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handleEditClick(slide)}
                  className="h-8 px-2"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  onClick={() => handleDeleteClick(slide.id)}
                  className="h-8 px-2"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );

  if (isLoading) {
    return <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  }

  return (
    <Card>
      <CardHeader>
        <div className={`flex ${isMobile ? 'flex-col gap-3' : 'justify-between items-center'}`}>
          <div>
            <CardTitle className={isMobile ? 'text-lg' : ''}>Carousel Slides</CardTitle>
            <CardDescription className={isMobile ? 'text-sm' : ''}>
              Manage the slides on your homepage carousel.
            </CardDescription>
          </div>
          <Button 
            onClick={handleAddClick}
            size={isMobile ? "sm" : "default"}
            className={isMobile ? 'w-full' : ''}
          >
            <PlusCircle className="mr-2 h-4 w-4" /> 
            Add New Slide
          </Button>
        </div>
      </CardHeader>
      <CardContent className={isMobile ? 'pt-0' : ''}>
        {isMobile ? (
          <MobileSlidesList />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Image</TableHead>
                <TableHead>Title</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slides?.map(slide => (
                <TableRow key={slide.id}>
                  <TableCell>{slide.display_order}</TableCell>
                  <TableCell>
                    <img src={slide.image_url} alt={slide.title} className="h-16 w-32 object-cover rounded-md" />
                  </TableCell>
                  <TableCell className="font-medium">{slide.title}</TableCell>
                  <TableCell>
                    {slide.is_active ? <CheckCircle2 className="text-green-500" /> : <XCircle className="text-red-500" />}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="icon" onClick={() => handleEditClick(slide)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="destructive" size="icon" onClick={() => handleDeleteClick(slide.id)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      <CarouselSlideForm
        isOpen={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSubmit={handleFormSubmit}
        slide={selectedSlide}
      />

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the slide and its image from storage.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

export default AdminCarousel;
