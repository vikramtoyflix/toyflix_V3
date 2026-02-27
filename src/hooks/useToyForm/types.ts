
import { ToyFormData } from "@/types/toy";

export interface ToyFormState {
  formData: ToyFormData;
  isLoading: boolean;
  primaryImageIndex: number;
}

export interface ToyFormActions {
  setFormData: (data: ToyFormData) => void;
  setPrimaryImageIndex: (index: number) => void;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
}
