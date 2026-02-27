
import { Sparkles, Heart, Gift, Star } from "lucide-react";

const CatalogHeader = () => {
  return (
    <div className="text-center mb-8 relative">
      {/* Decorative floating elements */}
      <div className="absolute -top-4 left-1/4 w-8 h-8 bg-toy-coral/20 rounded-full animate-gentle-bounce"></div>
      <div className="absolute -top-2 right-1/4 w-6 h-6 bg-toy-mint/30 rounded-full animate-float"></div>
      <div className="absolute top-4 left-1/3 w-4 h-4 bg-toy-sunshine/40 rounded-full animate-wiggle"></div>
      
      <div className="flex justify-center items-center gap-3 mb-6">
        <Gift className="w-8 h-8 text-toy-coral animate-gentle-bounce" />
        <Sparkles className="w-10 h-10 text-toy-sunshine animate-wiggle" />
        <Heart className="w-8 h-8 text-toy-mint animate-float" />
      </div>
      
      <h1 className="text-4xl font-comic font-bold mb-4 playful-heading">
        <span className="text-toy-coral">Toys that grow</span> <span className="text-primary">with your child</span>
      </h1>
      
      <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-source leading-relaxed">
        Every toy is selected to support your child's development — motor skills, problem solving, creativity and early learning.
        So playtime isn't just fun, <span className="text-emerald-600 font-bold">it's meaningful progress.</span>
      </p>

      {/* Value prop: 3 toys + 1 book worth ₹6K–15K every month */}
      <div className="inline-flex flex-wrap items-center justify-center gap-2 mt-5 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border border-orange-200/60 dark:border-orange-700/50 rounded-2xl px-5 py-3 shadow-sm">
        <span className="font-semibold text-foreground">3 premium branded toys + 1 book</span>
        <span className="text-muted-foreground">every month</span>
        <span className="font-bold text-toy-coral">worth ₹6,000–15,000</span>
      </div>
      
      {/* Playful divider */}
      <div className="flex justify-center items-center gap-2 mt-6">
        <div className="w-8 h-1 bg-toy-coral rounded-full"></div>
        <Star className="w-4 h-4 text-toy-sunshine animate-wiggle" />
        <div className="w-8 h-1 bg-toy-mint rounded-full"></div>
        <Heart className="w-4 h-4 text-toy-coral animate-gentle-bounce" />
        <div className="w-8 h-1 bg-toy-sky rounded-full"></div>
      </div>
    </div>
  );
};

export default CatalogHeader;
