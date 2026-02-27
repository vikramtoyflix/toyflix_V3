# Complete Version Backup — Feb 27, 2026

This backup preserves the **complete version** of the UI updates as of Feb 27, 2026. No further changes requested.

## Files in this backup

| File | Source path |
|------|-------------|
| HomeCarousel.tsx | `src/components/HomeCarousel.tsx` |
| HeroCarousel.tsx | `src/components/HeroCarousel.tsx` |
| RideOnToysCarouselHeader.tsx | `src/components/toy-carousel/RideOnToysCarouselHeader.tsx` |
| ToyCarouselHeader.tsx | `src/components/toy-carousel/ToyCarouselHeader.tsx` |
| tailwind.config.ts | `tailwind.config.ts` (root) |

## Changes included

### Banner / Hero
- **HomeCarousel (mobile)**: Single orange “How it works” button, pricing button removed, carousel nav arrows removed
- **HeroCarousel (desktop)**: Orange gradient buttons, carousel nav arrows removed, dot indicators kept at bottom

### Section headers
- **Ride On Toys**: Car/bike icons, coral → rose gradient text, flicker animation
- **Featured Toys**: Gradient heading (coral → terracotta → sunshine), toy-coral label, Sparkles icon

### Tailwind
- Added `flicker` keyframe and `animate-flicker` for Ride On Toys header

## How to restore

To restore these files from backup:

```bash
# From project root
cp backups/complete-version-2026-02-27/HomeCarousel.tsx src/components/
cp backups/complete-version-2026-02-27/HeroCarousel.tsx src/components/
cp backups/complete-version-2026-02-27/RideOnToysCarouselHeader.tsx src/components/toy-carousel/
cp backups/complete-version-2026-02-27/ToyCarouselHeader.tsx src/components/toy-carousel/
cp backups/complete-version-2026-02-27/tailwind.config.ts ./
```
