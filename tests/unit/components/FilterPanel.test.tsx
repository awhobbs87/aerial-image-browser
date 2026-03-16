import { render } from '../../test-utils';
import { screen } from '@testing-library/react';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { useFilterStore } from '@/stores/filterStore';

vi.mock('@/components/filters/FilterPresets', () => ({
  FilterPresets: () => <div data-testid="filter-presets">Presets</div>,
}));

describe('FilterPanel', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('renders image type buttons', () => {
    render(<FilterPanel />);
    expect(screen.getByRole('button', { name: 'Aerial' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ortho' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Digital' })).toBeInTheDocument();
  });

  it('renders date range inputs', () => {
    render(<FilterPanel />);
    expect(screen.getByPlaceholderText('From')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('To')).toBeInTheDocument();
  });

  it('renders quick filters section', () => {
    render(<FilterPanel />);
    expect(screen.getByTestId('filter-presets')).toBeInTheDocument();
  });

  it('renders scale category buttons', () => {
    render(<FilterPanel />);
    expect(screen.getByRole('button', { name: 'Very detailed (≤ 1:5,000)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Detailed (1:5,000–15,000)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Standard (1:15,000–40,000)' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Overview (> 1:40,000)' })).toBeInTheDocument();
  });
});
