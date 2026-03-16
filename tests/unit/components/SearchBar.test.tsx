import { render } from '../../test-utils';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { SearchBar } from '@/components/search/SearchBar';
import { useSearchStore } from '@/stores/searchStore';
import { useUIStore } from '@/stores/uiStore';

vi.mock('@/lib/geocoding', () => ({
  geocodeSearch: vi.fn().mockResolvedValue([]),
}));

vi.mock('@/components/search/SearchBar.module.css', () => ({
  default: {
    wrapper: 'wrapper',
    input: 'input',
    dropdown: 'dropdown',
    result: 'result',
    active: 'active',
  },
}));

describe('SearchBar', () => {
  beforeEach(() => {
    useSearchStore.getState().reset();
    useUIStore.setState({ searchFocused: false });
  });

  it('renders with placeholder text "Search Tasmania..."', () => {
    render(<SearchBar />);
    expect(screen.getByPlaceholderText('Search Tasmania...')).toBeInTheDocument();
  });

  it('shows popular locations when focused with empty input', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search Tasmania...');
    fireEvent.focus(input);

    await waitFor(() => {
      expect(screen.getByText('Popular')).toBeInTheDocument();
    });

    expect(screen.getByText('Hobart')).toBeInTheDocument();
    expect(screen.getByText('Launceston')).toBeInTheDocument();
  });

  it('updates input value on type', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search Tasmania...');
    fireEvent.change(input, { target: { value: 'Hobart CBD' } });

    expect(input).toHaveValue('Hobart CBD');
  });

  it('shows clear button when input has value and clears on click', async () => {
    render(<SearchBar />);
    const input = screen.getByPlaceholderText('Search Tasmania...');
    fireEvent.change(input, { target: { value: 'test' } });

    const clearButton = await screen.findByLabelText('Clear search');
    expect(clearButton).toBeInTheDocument();

    fireEvent.click(clearButton);
    expect(input).toHaveValue('');
  });
});
