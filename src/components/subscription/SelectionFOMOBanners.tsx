import React from "react";
import { Toy } from "@/hooks/useToys";
import { cn } from "@/lib/utils";
import {
  isFOMOStep,
  FOMO_SECTION_COPY,
  FOMO_FIRST_ROW_COUNT,
  FOMO_SECOND_ROW_COUNT,
  getFOMOTagLabelForStep,
} from "@/constants/fomoSelection";

interface SelectionFOMOBannersProps {
  subscriptionCategory: string | undefined;
  toys: Toy[];
  onToyAction?: (toy: Toy, e: React.MouseEvent) => void;
  onViewProduct?: (toyId: string) => void;
  selectedToyIds?: string[];
  isMobile?: boolean;
}

/**
 * FOMO banner for selection steps (STEM, Educational, Books):
 * Section title + subline (e.g. "Chosen by 500+ Toyflix parents this month"),
 * then two rows of toys with tags: 🔥 High Demand, ⭐ Parent Favourite, 🏆 Toyflix Bestseller.
 * Not rendered on Big Toys step.
 */
export function SelectionFOMOBanners({
  subscriptionCategory,
  toys,
  onToyAction,
  selectedToyIds = [],
  isMobile = false,
}: SelectionFOMOBannersProps) {
  if (!isFOMOStep(subscriptionCategory) || !toys.length) return null;

  const selectedSet = new Set(selectedToyIds);
  const copy = FOMO_SECTION_COPY[subscriptionCategory as keyof typeof FOMO_SECTION_COPY];
  if (!copy?.title) return null;

  const row1 = toys.slice(0, FOMO_FIRST_ROW_COUNT);
  const row2 = toys.slice(FOMO_FIRST_ROW_COUNT, FOMO_FIRST_ROW_COUNT + FOMO_SECOND_ROW_COUNT);

  const renderToyCard = (toy: Toy, rank: number) => {
    const isSelected = selectedSet.has(toy.id);
    const imageUrl = toy.image_url
      ? toy.image_url.replace("/storage/v1/s3/", "/storage/v1/object/public/")
      : null;
    const tagLabel = getFOMOTagLabelForStep(
      subscriptionCategory as 'educational_toys' | 'developmental_toys' | 'books',
      rank
    );

    const cardWidth = isMobile ? 140 : 152;
    return (
      <button
        key={toy.id}
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToyAction?.(toy, e);
        }}
        className={cn(
          "flex-shrink-0 rounded-xl border-2 bg-card text-left transition-all focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          isMobile && "snap-center",
          isSelected
            ? "border-primary bg-primary/5 shadow-md"
            : "border-border hover:border-primary/50 hover:shadow"
        )}
        style={{ width: cardWidth, minWidth: cardWidth, maxWidth: cardWidth }}
      >
        <div className="relative aspect-square w-full overflow-hidden rounded-t-xl bg-muted">
          {imageUrl ? (
            <img src={imageUrl} alt="" className="h-full w-full object-cover object-center" />
          ) : (
            <div className="h-full w-full flex items-center justify-center text-4xl">
              🧸
            </div>
          )}
          {tagLabel && (
            <div className="absolute top-1.5 left-1.5">
              <span className="rounded-md bg-black/70 text-white text-[10px] font-medium px-1.5 py-0.5 shadow">
                {tagLabel}
              </span>
            </div>
          )}
          {isSelected && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/20 rounded-t-xl">
              <span className="rounded-full bg-primary text-primary-foreground p-1.5">
                ✓
              </span>
            </div>
          )}
        </div>
        <div className="p-2">
          <p className="text-sm font-medium line-clamp-2">{toy.name}</p>
        </div>
      </button>
    );
  };

  return (
    <div className="mb-6 w-full min-w-0 overflow-hidden rounded-lg border bg-muted/30 p-4">
      {/* Section title + subline (creates serious FOMO) */}
      <section aria-label={copy.title} className="mb-4 min-w-0">
        <h3 className="text-base font-semibold text-foreground flex items-center gap-2 mb-1">
          <span aria-hidden>{copy.icon}</span>
          {copy.title}
        </h3>
        <p className="text-sm text-muted-foreground border-b border-border pb-3 mb-3">
          {copy.subline}
        </p>

        {/* Row 1 - scroll contained within section */}
        <div
          className={cn(
            "flex gap-3 overflow-x-auto pb-3 min-w-0 w-full",
            isMobile ? "snap-x snap-mandatory" : ""
          )}
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          {row1.map((toy, i) => renderToyCard(toy, i))}
        </div>

        {/* Row 2 */}
        {row2.length > 0 && (
          <div
            className={cn(
              "flex gap-3 overflow-x-auto pb-2 min-w-0 w-full",
              isMobile ? "snap-x snap-mandatory" : ""
            )}
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {row2.map((toy, i) => renderToyCard(toy, FOMO_FIRST_ROW_COUNT + i))}
          </div>
        )}
      </section>
    </div>
  );
}

export default SelectionFOMOBanners;
