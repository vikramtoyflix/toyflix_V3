import { describe, it, expect } from 'vitest';
import {
  FOMO_SELECTION_STEPS,
  isFOMOStep,
  FOMO_FIRST_ROW_COUNT,
  FOMO_SECOND_ROW_COUNT,
  FOMO_SECTION_COPY,
  getFOMOTagForRank,
  FOMO_TOY_TAG_LABELS,
} from '../fomoSelection';

describe('fomoSelection', () => {
  describe('FOMO_SELECTION_STEPS', () => {
    it('excludes big_toys', () => {
      expect(FOMO_SELECTION_STEPS).not.toContain('big_toys');
    });
    it('includes educational_toys, developmental_toys, books', () => {
      expect(FOMO_SELECTION_STEPS).toContain('educational_toys');
      expect(FOMO_SELECTION_STEPS).toContain('developmental_toys');
      expect(FOMO_SELECTION_STEPS).toContain('books');
    });
  });

  describe('isFOMOStep', () => {
    it('returns true for educational_toys, developmental_toys, books', () => {
      expect(isFOMOStep('educational_toys')).toBe(true);
      expect(isFOMOStep('developmental_toys')).toBe(true);
      expect(isFOMOStep('books')).toBe(true);
    });
    it('returns false for big_toys', () => {
      expect(isFOMOStep('big_toys')).toBe(false);
    });
    it('returns false for undefined or empty', () => {
      expect(isFOMOStep(undefined)).toBe(false);
      expect(isFOMOStep('')).toBe(false);
    });
  });

  describe('row counts', () => {
    it('defines 4 toys per row', () => {
      expect(FOMO_FIRST_ROW_COUNT).toBe(4);
      expect(FOMO_SECOND_ROW_COUNT).toBe(4);
    });
  });

  describe('FOMO_SECTION_COPY', () => {
    it('has title and subline for educational_toys (UI: Educational)', () => {
      expect(FOMO_SECTION_COPY.educational_toys.title).toContain("Parents' Favourite Learning Toys");
      expect(FOMO_SECTION_COPY.educational_toys.subline).toContain("500+ Toyflix parents");
    });
    it('has title and subline for developmental_toys (UI: Developmental)', () => {
      expect(FOMO_SECTION_COPY.developmental_toys.title).toContain("Parents' Top Picks for Development");
      expect(FOMO_SECTION_COPY.developmental_toys.subline).toContain("Bangalore");
    });
  });

  describe('getFOMOTagForRank', () => {
    it('returns bestseller for rank 0', () => {
      expect(getFOMOTagForRank(0)).toBe('bestseller');
    });
    it('returns high_demand for rank 1', () => {
      expect(getFOMOTagForRank(1)).toBe('high_demand');
    });
    it('returns parent_favourite for rank 2 and 3', () => {
      expect(getFOMOTagForRank(2)).toBe('parent_favourite');
      expect(getFOMOTagForRank(3)).toBe('parent_favourite');
    });
    it('returns null for rank >= 4', () => {
      expect(getFOMOTagForRank(4)).toBeNull();
    });
  });

  describe('FOMO_TOY_TAG_LABELS', () => {
    it('has labels for all tag types', () => {
      expect(FOMO_TOY_TAG_LABELS.high_demand).toContain('High Demand');
      expect(FOMO_TOY_TAG_LABELS.parent_favourite).toContain('Parent Favourite');
      expect(FOMO_TOY_TAG_LABELS.bestseller).toContain('Toyflix Bestseller');
    });
  });
});
