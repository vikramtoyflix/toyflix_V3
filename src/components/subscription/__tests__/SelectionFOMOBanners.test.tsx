import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SelectionFOMOBanners } from '../SelectionFOMOBanners';
import { Toy } from '@/hooks/useToys';

const mockToys: Toy[] = [
  { id: '1', name: 'Toy A', available_quantity: 10 } as Toy,
  { id: '2', name: 'Toy B', available_quantity: 8 } as Toy,
  { id: '3', name: 'Toy C', available_quantity: 6 } as Toy,
  { id: '4', name: 'Toy D', available_quantity: 4 } as Toy,
  { id: '5', name: 'Toy E', available_quantity: 3 } as Toy,
];

describe('SelectionFOMOBanners', () => {
  it('renders nothing for big_toys step', () => {
    const { container } = render(
      <SelectionFOMOBanners
        subscriptionCategory="big_toys"
        toys={mockToys}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders banner for educational_toys step (UI: Developmental) with section title and subline', () => {
    render(
      <SelectionFOMOBanners
        subscriptionCategory="educational_toys"
        toys={mockToys}
      />
    );
    expect(screen.getByText(/Parents' Top Picks for Development/i)).toBeInTheDocument();
    expect(screen.getByText(/Helping kids build key skills across Bangalore/i)).toBeInTheDocument();
  });

  it('renders banner for stem_toys step (UI: Educational) with section title and subline', () => {
    render(
      <SelectionFOMOBanners
        subscriptionCategory="stem_toys"
        toys={mockToys}
      />
    );
    expect(screen.getByText(/Parents' Favourite Learning Toys/i)).toBeInTheDocument();
    expect(screen.getByText(/Chosen by 500\+ Toyflix parents this month/i)).toBeInTheDocument();
  });

  it('renders nothing when toys array is empty', () => {
    const { container } = render(
      <SelectionFOMOBanners
        subscriptionCategory="stem_toys"
        toys={[]}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('shows first 4 toys in section', () => {
    render(
      <SelectionFOMOBanners
        subscriptionCategory="educational_toys"
        toys={mockToys}
      />
    );
    expect(screen.getByText('Toy A')).toBeInTheDocument();
    expect(screen.getByText('Toy B')).toBeInTheDocument();
    expect(screen.getByText('Toy C')).toBeInTheDocument();
    expect(screen.getByText('Toy D')).toBeInTheDocument();
  });

  it('shows toy tags (Bestseller, High Demand, Kids Favourite)', () => {
    render(
      <SelectionFOMOBanners
        subscriptionCategory="educational_toys"
        toys={mockToys}
      />
    );
    expect(screen.getByText(/Toyflix Bestseller/)).toBeInTheDocument();
    expect(screen.getByText(/High Demand/)).toBeInTheDocument();
    expect(screen.getAllByText(/Kids Favourite/).length).toBeGreaterThanOrEqual(1);
  });
});
