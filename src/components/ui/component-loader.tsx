interface ComponentLoaderProps {
  text?: string;
}

export const ComponentLoader = ({ text = "Loading..." }: ComponentLoaderProps) => (
  <div className="flex items-center justify-center py-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    <span className="ml-2 text-sm text-muted-foreground">{text}</span>
  </div>
); 