import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomAuth } from "@/hooks/useCustomAuth";
import { Toy } from "@/hooks/useToys";
import { useToysForAgeGroup, useAgeGroupToysCounts } from "@/hooks/useToysWithAgeBands";
import { logToyDistribution } from "@/utils/toyOrdering";
import ToyGrid from "./ToyGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Package, Baby, Users, GraduationCap, Gamepad2, Box, BookOpen, Cpu, Book } from "lucide-react";

interface PromotionalCatalogViewProps {
  toys: Toy[];
  isLoading: boolean;
  onToyAction: (toy: Toy, e: React.MouseEvent) => void;
  onAddToWishlist: (toyId: string, e: React.MouseEvent) => void;
  onViewProduct: (toyId: string) => void;
  isRideOnView?: boolean;
  searchQuery?: string;
}

const PromotionalCatalogView = ({
  toys,
  isLoading,
  onToyAction,
  onAddToWishlist,
  onViewProduct,
  isRideOnView = false,
  searchQuery = ""
}: PromotionalCatalogViewProps) => {
  // Default to show all ages and all categories
  const [selectedAge, setSelectedAge] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "big_toys" | "educational_toys" | "developmental_toys" | "books">("all");
  const { user } = useCustomAuth();
  const navigate = useNavigate();

  // RESTORED: Use age-based filtering hook for regular toys with category ordering
  const { data: ageFilteredToys, isLoading: isLoadingAgeFiltered } = useToysForAgeGroup(selectedAge);
  
  // Get toy counts for all age groups
  const { data: ageCounts, isLoading: isLoadingCounts } = useAgeGroupToysCounts();

  // Determine which toys to show (age + search filter) and sort with out-of-stock toys last
  const filteredToys = useMemo(() => {
    let toysToSort = isRideOnView 
      ? toys 
      : (ageFilteredToys || []);

    // Apply search filter by name (and brand)
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      toysToSort = toysToSort.filter(
        (toy) =>
          toy.name.toLowerCase().includes(query) ||
          (toy.brand?.toLowerCase().includes(query) ?? false)
      );
    }

    // Apply category filter (Big Toys, Educational, Developmental, Books)
    if (!isRideOnView && selectedCategory !== "all") {
      toysToSort = toysToSort.filter((toy) => {
        const category = toy.category;
        if (!category) return false;

        // Educational tab should also surface STEM toys
        if (selectedCategory === "educational_toys") {
          return category === "educational_toys" || category === "stem_toys";
        }

        // Developmental tab should show only developmental toys
        if (selectedCategory === "developmental_toys") {
          return category === "developmental_toys";
        }

        // Big toys, books, etc. - exact category match
        return category === selectedCategory;
      });
    }

    // Sort toys with out-of-stock toys displayed last
    return toysToSort.sort((a, b) => {
      const aInStock = (a.available_quantity || 0) > 0 ? 1 : 0;
      const bInStock = (b.available_quantity || 0) > 0 ? 1 : 0;
      
      // In-stock toys first (1), out-of-stock toys last (0)
      if (aInStock !== bInStock) {
        return bInStock - aInStock;
      }
      
      // Within same stock status, maintain original order
      return 0;
    });
  }, [isRideOnView, toys, ageFilteredToys, searchQuery, selectedCategory]);

  const isLoadingToys = isRideOnView ? isLoading : isLoadingAgeFiltered;

  // Debug logging with category distribution
  console.log('🎯 PromotionalCatalogView Debug (Age-Based):', {
    selectedAge,
    toysReceived: toys.length,
    ageFilteredToys: ageFilteredToys?.length || 0,
    filteredToys: filteredToys.length,
    isLoading: isLoadingToys,
    isRideOnView
  });

  // Log category distribution
  if (filteredToys.length > 0) {
    logToyDistribution(filteredToys, `PromotionalCatalogView - ${isRideOnView ? 'Ride-On' : selectedAge}`);
  }

  const getAgeIcon = (ageGroup: string) => {
    if (ageGroup.includes('0-1') || ageGroup.includes('1-2')) return Baby;
    if (ageGroup.includes('2-3') || ageGroup.includes('3-4')) return Users;
    if (ageGroup.includes('4-6') || ageGroup.includes('6-8')) return GraduationCap;
    return Gamepad2;
  };

  // Category bifurcation - Row 1: All, Big Toys, Books | Row 2: Educational, Developmental
  const toyCategories = [
    { value: "all" as const, label: "All Toys", icon: Package },
    { value: "big_toys" as const, label: "Big Toys", icon: Box },
    { value: "books" as const, label: "Books", icon: Book },
    { value: "educational_toys" as const, label: "Educational Toys", icon: BookOpen },
    { value: "developmental_toys" as const, label: "Developmental Toys", icon: Cpu },
  ];

  const ageGroups = [
    { value: "all", label: "All Ages", icon: Gamepad2, count: null },
    { value: "1-2", label: "6m-2 years", icon: Baby, count: ageCounts?.['1-2'] },
    { value: "2-3", label: "2-3 years", icon: Users, count: ageCounts?.['2-3'] },
    { value: "3-4", label: "3-4 years", icon: Users, count: ageCounts?.['3-4'] },
    { value: "4-6", label: "4-6 years", icon: GraduationCap, count: ageCounts?.['4-6'] },
    { value: "6-8", label: "6-8 years", icon: Gamepad2, count: ageCounts?.['6-8'] },
  ];

  return (
    <>
      {/* Highlighted Toy Count Display */}
      <div className="mb-4 md:mb-6 relative overflow-hidden">
        <div className={`${isRideOnView 
          ? 'bg-gradient-to-r from-orange-200/30 via-red-200/30 to-pink-200/30 border-orange-300 animate-pulse' 
          : 'bg-gradient-to-r from-toy-sky/20 via-toy-mint/20 to-toy-sunshine/20 border-white/50'
        } backdrop-blur-sm border-2 rounded-xl md:rounded-2xl p-4 md:p-6 shadow-lg`}>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4">
            <div className="flex items-center gap-2 md:gap-3">
              <div className={`p-2 md:p-3 ${isRideOnView 
                ? 'bg-gradient-to-br from-orange-500 to-pink-500 animate-ride-on-bounce' 
                : 'bg-gradient-to-br from-toy-coral to-toy-sunshine'
              } rounded-full shadow-lg`}>
                {isRideOnView ? (
                  <span className="text-lg md:text-xl">🚗</span>
                ) : (
                  <Package className="w-5 h-5 md:w-6 md:h-6 text-white" />
                )}
              </div>
              <div className="text-center sm:text-left">
                <div className={`text-2xl md:text-3xl font-bold ${isRideOnView 
                  ? 'bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse' 
                  : 'bg-gradient-to-r from-toy-coral to-toy-sunshine bg-clip-text text-transparent'
                }`}>
                  {isLoadingToys ? "..." : filteredToys.length}
                </div>
                <div className="text-xs md:text-sm text-gray-600 font-medium">
                  {isLoadingToys ? "Loading toys..." : isRideOnView 
                    ? (filteredToys.length === 1 ? "🏍️ Ride-On Toy Available" : "🏍️ Ride-On Toys Available")
                    : (filteredToys.length === 1 ? "Toy Available" : "Toys Available")
                  }
                </div>
              </div>
            </div>
            <div className={`px-3 py-1.5 md:px-4 md:py-2 ${isRideOnView 
              ? 'bg-gradient-to-r from-orange-300/40 to-pink-300/40 border-orange-400/50 animate-bounce' 
              : 'bg-gradient-to-r from-toy-sunshine/30 to-toy-mint/30 border-toy-sunshine/40'
            } rounded-full border shadow-sm`}>
              <div className="flex items-center gap-1.5 md:gap-2">
                {isRideOnView ? (
                  <span className="text-lg">🎯</span>
                ) : (
                  <Sparkles className="w-3 h-3 md:w-4 md:h-4 text-toy-coral flex-shrink-0" />
                )}
                <span className={`text-xs md:text-sm font-semibold text-center ${isRideOnView 
                  ? 'text-orange-700 animate-pulse' 
                  : 'text-gray-700'
                }`}>
                  {isRideOnView ? "🚗 No Age Restrictions" : selectedAge === "all" ? "All Ages" : `Age: ${selectedAge} years`}
                </span>
              </div>
            </div>
          </div>

          {/* Decorative elements - Enhanced for ride-on toys */}
          <div className={`hidden md:block absolute top-2 right-2 w-12 h-12 ${isRideOnView 
            ? 'bg-orange-300/20 animate-ride-on-bounce' 
            : 'bg-toy-sunshine/10 animate-float'
          } rounded-full`}></div>
          <div className={`hidden md:block absolute bottom-2 left-2 w-8 h-8 ${isRideOnView 
            ? 'bg-pink-300/20 animate-ride-on-bounce' 
            : 'bg-toy-mint/10 animate-float'
          } rounded-full`} style={{animationDelay: '1s'}}></div>
          {isRideOnView && (
            <div className="hidden md:block absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl opacity-10 animate-spin-slow">
              🏍️
            </div>
          )}
        </div>
      </div>

      {/* User subscription prompts */}
      {user && (
        <Alert className="mt-4 mb-6">
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="font-bold">
                Include hundreds of expert curated premium branded toys — without buying or storing them
              </span>
              <Button onClick={() => navigate('/subscription-flow')} className="shrink-0 w-full sm:w-auto">
                Subscribe Now
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Not logged in info */}
      {!user && (
        <Alert className="mt-4 mb-6">
          <AlertDescription>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <span className="font-bold">
                Include hundreds of expert curated premium branded toys — without buying or storing them
              </span>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" onClick={() => navigate('/auth?mode=signin')}>
                  Sign In
                </Button>
                <Button onClick={() => navigate('/auth?redirect=%2Fsubscription-flow')}>
                  Subscribe
                </Button>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Category bifurcation - polished UI, single row on desktop */}
      {!isRideOnView && (
        <div className="mb-6">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/50 dark:bg-slate-900/30 dark:border-slate-800 p-4 md:p-5">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-3 px-1">
              Browse by Category
            </h3>
            <div className="flex flex-wrap gap-2 md:gap-3">
              {toyCategories.map((cat) => {
                const Icon = cat.icon;
                const isSelected = selectedCategory === cat.value;
                return (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => setSelectedCategory(cat.value)}
                    className={`
                      flex-shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
                      transition-all duration-200 ease-out
                      ${isSelected 
                        ? "bg-gradient-to-r from-toy-coral to-toy-sunshine text-white shadow-md ring-2 ring-toy-coral/20" 
                        : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-toy-coral/40 hover:shadow-sm"
                      }
                    `}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isSelected ? "text-white" : "text-toy-coral"}`} />
                    <span>{cat.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Age Filter Buttons - Only show for regular toys, not ride-on */}
      {!isRideOnView && (
        <div className="mb-6">
          <div className="space-y-4">
            <h3 className="text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 md:w-5 md:h-5 text-toy-coral" />
              Filter by Age Group
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:flex md:flex-wrap gap-2 md:gap-3">
              {ageGroups.map((age) => {
                const Icon = age.icon;
                const isSelected = selectedAge === age.value;
                
                return (
                  <Button
                    key={age.value}
                    onClick={() => setSelectedAge(age.value)}
                    className={`
                      relative overflow-hidden transition-all duration-300 ease-out
                      flex items-center justify-center gap-1.5 md:gap-2 
                      px-2 py-2 md:px-4 md:py-2 rounded-full
                      font-medium text-xs md:text-sm min-h-[36px] md:min-h-[40px]
                      w-full md:w-auto
                      ${isSelected 
                        ? 'bg-gradient-to-r from-toy-coral to-toy-sunshine text-white shadow-lg transform scale-105 hover:shadow-xl' 
                        : 'bg-white hover:bg-gradient-to-r hover:from-toy-sky/20 hover:to-toy-mint/20 text-gray-700 border-2 border-gray-200 hover:border-toy-mint/30 hover:shadow-md'
                      }
                    `}
                  >
                    <Icon className={`w-3 h-3 md:w-4 md:h-4 ${isSelected ? 'text-white' : 'text-toy-coral'} flex-shrink-0`} />
                    <span className="font-medium truncate">{age.label}</span>
                    {age.count !== null && (
                      <div className={`
                        px-1.5 py-0.5 md:px-2 md:py-0.5 rounded-full text-xs font-bold min-w-[18px] md:min-w-[20px] text-center flex-shrink-0
                        ${isSelected 
                          ? 'bg-white/20 text-white' 
                          : 'bg-toy-sunshine/20 text-toy-coral border border-toy-sunshine/30'
                        }
                      `}>
                        {isLoadingCounts ? "..." : age.count}
                      </div>
                    )}
                    {isSelected && (
                      <div className="absolute inset-0 bg-gradient-to-r from-toy-coral/20 to-toy-sunshine/20 animate-pulse-glow rounded-full" />
                    )}
                  </Button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Toy Grid with Age-Based Filtering and Category Ordering */}
      <ToyGrid
        toys={filteredToys}
        isLoading={isLoadingToys}
        onToyAction={onToyAction}
        onAddToWishlist={onAddToWishlist}
        onViewProduct={onViewProduct}
        isSubscriptionView={false}
      />
    </>
  );
};

export default PromotionalCatalogView;
