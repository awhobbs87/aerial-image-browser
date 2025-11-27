import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import FilterPanel from "../FilterPanel";
import type { Filters } from "../filterPanelConfig";
import type { ReactElement } from "react";

const wrapWithTheme = (ui: ReactElement) => {
  return <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>;
};

const baseFilters: Filters = {
  startDate: null,
  endDate: null,
  selectedScales: [],
  layerTypes: { aerial: true, ortho: true, digital: true },
};

const availableScales = [2000, 7000, 20000, 50000];

describe("FilterPanel scale selection", () => {
  it("clears scale filter when the last selected category is toggled off", async () => {
    const onFiltersChange = vi.fn();
    const filters: Filters = {
      ...baseFilters,
      selectedScales: [7000], // preselect "Detailed" category
    };

    render(
      wrapWithTheme(
        <FilterPanel
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableScales={availableScales}
          dateRange={{ min: 1950, max: 2020 }}
        />
      )
    );

    const detailedLabel = screen.getAllByText("Detailed").slice(-1)[0];
    fireEvent.click(detailedLabel);

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalled();
    });

    const lastCall = onFiltersChange.mock.calls.at(-1)?.[0] as Filters;
    expect(lastCall.selectedScales).toEqual([]);
  });

  it("updates selected scales when removing one category from the full set", async () => {
    const onFiltersChange = vi.fn();

    render(
      wrapWithTheme(
        <FilterPanel
          filters={baseFilters}
          onFiltersChange={onFiltersChange}
          availableScales={availableScales}
          dateRange={{ min: 1950, max: 2020 }}
        />
      )
    );

    const veryDetailedLabel = screen.getAllByText("Very Detailed").slice(-1)[0];
    fireEvent.click(veryDetailedLabel); // remove that category from the full selection

    await waitFor(() => {
      expect(onFiltersChange).toHaveBeenCalled();
    });

    const lastCall = onFiltersChange.mock.calls.at(-1)?.[0] as Filters;
    expect(lastCall.selectedScales).toEqual(expect.arrayContaining([7000, 20000, 50000]));
    expect(lastCall.selectedScales).not.toContain(2000);
  });
});
