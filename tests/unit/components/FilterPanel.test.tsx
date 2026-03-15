import { render } from '../../test-utils';
import { screen } from '@testing-library/react';
import { FilterPanel } from '@/components/filters/FilterPanel';
import { useFilterStore } from '@/stores/filterStore';

vi.mock('@/components/filters/FilterPresets', () => ({
  FilterPresets: () => <div data-testid="filter-presets">Presets</div>,
}));

vi.mock('@/components/filters/FilterPanel.module.css', () => ({
  default: {
    panel: 'panel',
  },
}));

describe('FilterPanel', () => {
  beforeEach(() => {
    useFilterStore.getState().resetFilters();
  });

  it('renders all three layer checkboxes', () => {
    render(<FilterPanel />);
    expect(screen.getByLabelText('Aerial Photos')).toBeInTheDocument();
    expect(screen.getByLabelText('Orthophotos')).toBeInTheDocument();
    expect(screen.getByLabelText('Digital Imagery')).toBeInTheDocument();
  });

  it('renders date range inputs (From / To labels)', () => {
    render(<FilterPanel />);
    expect(screen.getByLabelText('From')).toBeInTheDocument();
    expect(screen.getByLabelText('To')).toBeInTheDocument();
  });

  it('renders "Quick Filters" section', () => {
    render(<FilterPanel />);
    expect(screen.getByTestId('filter-presets')).toBeInTheDocument();
  });

  it('renders scale category chips', () => {
    render(<FilterPanel />);
    expect(screen.getByText('< 1:5,000')).toBeInTheDocument();
    expect(screen.getByText('1:5,000 - 1:15,000')).toBeInTheDocument();
    expect(screen.getByText('1:15,000 - 1:30,000')).toBeInTheDocument();
    expect(screen.getByText('1:30,000 - 1:50,000')).toBeInTheDocument();
    expect(screen.getByText('> 1:50,000')).toBeInTheDocument();
  });
});
