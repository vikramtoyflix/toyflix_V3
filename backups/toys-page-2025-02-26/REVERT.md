# Toys Page Backup — Revert Instructions

**Backup date:** 2025-02-26

This folder contains a snapshot of the Toys page and related components before any redesign. Use these files to restore the original version if needed.

## Files backed up

| Backup file | Original location |
|-------------|-------------------|
| `Toys.tsx` | `src/pages/Toys.tsx` |
| `CatalogHeader.tsx` | `src/components/catalog/CatalogHeader.tsx` |
| `PromotionalCatalogView.tsx` | `src/components/catalog/PromotionalCatalogView.tsx` |

## How to revert

**Option A: Manual copy**  
Copy each file from this backup folder to its original path above (overwrite the current files).

**Option B: Using terminal**

```bash
# From project root
cp backups/toys-page-2025-02-26/Toys.tsx src/pages/Toys.tsx
cp backups/toys-page-2025-02-26/CatalogHeader.tsx src/components/catalog/CatalogHeader.tsx
cp backups/toys-page-2025-02-26/PromotionalCatalogView.tsx src/components/catalog/PromotionalCatalogView.tsx
```
