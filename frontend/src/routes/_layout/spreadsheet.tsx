import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, useEffect, useCallback } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import type Handsontable from 'handsontable';
import 'handsontable/styles/handsontable.css';
import 'handsontable/styles/ht-theme-main.css';
import { useTheme } from '@/components/theme-provider';
import {
  useSpreadsheetContext,
  type SpreadsheetAction,
} from '@/hooks/useSpreadsheetContext';

registerAllModules();

// Default sample data with headers in first row
const DEFAULT_DATA: (string | number | null)[][] = [
  ['Product', 'Price', 'Quantity', 'Total', 'Category'],
  ['Laptop', 999, 5, 4995, 'Electronics'],
  ['Mouse', 25, 10, 250, 'Electronics'],
  ['Keyboard', 75, 8, 600, 'Electronics'],
  ['Monitor', 300, 3, 900, 'Electronics'],
  ['Desk', 450, 2, 900, 'Furniture'],
  ['Chair', 200, 4, 800, 'Furniture'],
  ['Lamp', 45, 6, 270, 'Accessories'],
  ['Notebook', 12, 20, 240, 'Office Supplies'],
  ['Pen Set', 8, 15, 120, 'Office Supplies'],
];

export const Route = createFileRoute('/_layout/spreadsheet')({
  component: SpreadsheetView,
  head: () => ({
    meta: [{ title: 'Spreadsheet – ChatSheet' }],
  }),
});

function SpreadsheetView() {
  const { resolvedTheme } = useTheme();
  const { setContext, setActionHandler } = useSpreadsheetContext();
  const [themeName, setThemeName] = useState('ht-theme-main-dark-auto');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hotRef = useRef<any>(null);
  // Use ref to track data without triggering re-renders
  const dataRef = useRef<(string | number | null)[][]>(DEFAULT_DATA);
  const [isAutosave, setIsAutosave] = useState(false);

  // Update theme when resolvedTheme changes
  useEffect(() => {
    setThemeName(
      resolvedTheme === 'dark' ? 'ht-theme-main-dark-auto' : 'ht-theme-main',
    );
  }, [resolvedTheme]);

  // Sync context with current data (ref-based, no re-renders)
  const syncContext = useCallback(() => {
    // Try to get data from HotTable if available, otherwise use ref
    const hot = hotRef.current?.hotInstance;
    const data = hot
      ? (hot.getData() as (string | number | null)[][])
      : dataRef.current;

    if (data.length === 0) {
      setContext({ columns: [], rows: [] });
      return;
    }
    const columns = data[0].map((cell) => String(cell ?? ''));
    const rows = data.slice(1);
    console.log('Syncing context:', { columns, rowCount: rows.length });
    setContext({ columns, rows });
  }, [setContext]);

  // Initial context sync on mount only - with slight delay to ensure HotTable is ready
  useEffect(() => {
    // Sync immediately with default data
    syncContext();
    // Also sync after a short delay to get HotTable data
    const timer = setTimeout(syncContext, 100);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle actions from the chat AI
  const handleAction = useCallback(
    (action: SpreadsheetAction) => {
      const hot = hotRef.current?.hotInstance;
      if (!hot) {
        console.warn('HotTable not ready for action:', action);
        return;
      }

      console.log('Executing action:', action);

      try {
        switch (action.type) {
          case 'update_cell': {
            const { row, col, value } = action as {
              type: string;
              row: number;
              col: number;
              value: unknown;
            };
            // Validate indices
            if (typeof row !== 'number' || typeof col !== 'number') {
              console.error('Invalid row/col for update_cell:', { row, col });
              return;
            }
            // Add 1 to row because we skip header row
            hot.setDataAtCell(row + 1, col, value);
            break;
          }

          case 'add_row': {
            const { data: rowData } = action as {
              type: string;
              data: unknown[];
            };
            if (!Array.isArray(rowData)) {
              console.error('Invalid data for add_row:', rowData);
              return;
            }
            const currentData = hot.getData() as (string | number | null)[][];
            const colCount = currentData[0]?.length ?? 0;
            // Normalize row data to match column count
            const normalizedRow = Array(colCount)
              .fill(null)
              .map((_, i) => rowData[i] ?? null) as (string | number | null)[];
            hot.loadData([...currentData, normalizedRow]);
            // Sync context after a brief delay for loadData to complete
            setTimeout(syncContext, 50);
            break;
          }

          case 'add_column': {
            const { name, data: colData } = action as {
              type: string;
              name: string;
              data: unknown[];
            };
            const currentData = hot.getData() as (string | number | null)[][];
            const newData = currentData.map((row, index) => {
              if (index === 0) return [...row, name ?? 'New Column'];
              return [...row, colData?.[index - 1] ?? null];
            });
            hot.loadData(newData);
            setTimeout(syncContext, 50);
            break;
          }

          case 'delete_row': {
            const { row } = action as { type: string; row: number };
            if (typeof row !== 'number') {
              console.error('Invalid row for delete_row:', row);
              return;
            }
            // Add 1 because we skip header row
            hot.alter('remove_row', row + 1);
            setTimeout(syncContext, 50);
            break;
          }

          case 'delete_column': {
            const { col } = action as { type: string; col: number };
            if (typeof col !== 'number') {
              console.error('Invalid col for delete_column:', col);
              return;
            }
            hot.alter('remove_col', col);
            setTimeout(syncContext, 50);
            break;
          }

          case 'sort': {
            const { column, order } = action as {
              type: string;
              column: number;
              order: 'asc' | 'desc';
            };
            const plugin = hot.getPlugin('columnSorting');
            plugin.sort({
              column,
              sortOrder: order,
            });
            setTimeout(syncContext, 50);
            break;
          }

          default:
            console.warn('Unknown action type:', action.type);
        }
      } catch (error) {
        console.error('Error executing action:', action, error);
      }
    },
    [syncContext],
  );

  // Register action handler with context
  useEffect(() => {
    setActionHandler(handleAction);
    return () => setActionHandler(undefined);
  }, [setActionHandler, handleAction]);

  // Handle data changes from Handsontable - only sync context, don't trigger re-render
  const handleAfterChange = useCallback(
    (
      changes: Handsontable.CellChange[] | null,
      source: Handsontable.ChangeSource,
    ) => {
      if (source === 'loadData') {
        // On loadData, sync the ref and context
        const hot = hotRef.current?.hotInstance;
        if (hot) {
          dataRef.current = hot.getData() as (string | number | null)[][];
          syncContext();
        }
        return;
      }

      // Update ref with current data
      const hot = hotRef.current?.hotInstance;
      if (hot) {
        dataRef.current = hot.getData() as (string | number | null)[][];
        syncContext();
      }

      // Optional: autosave to backend
      if (isAutosave && changes) {
        console.log('Autosaving changes:', changes);
        // TODO: Implement backend save
      }
    },
    [isAutosave, syncContext],
  );

  // Handle structural changes (row/column add/remove)
  const handleAfterCreateRow = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      dataRef.current = hot.getData() as (string | number | null)[][];
      syncContext();
    }
  }, [syncContext]);

  const handleAfterRemoveRow = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      dataRef.current = hot.getData() as (string | number | null)[][];
      syncContext();
    }
  }, [syncContext]);

  const handleAfterCreateCol = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      dataRef.current = hot.getData() as (string | number | null)[][];
      syncContext();
    }
  }, [syncContext]);

  const handleAfterRemoveCol = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      dataRef.current = hot.getData() as (string | number | null)[][];
      syncContext();
    }
  }, [syncContext]);

  const loadSampleData = useCallback(() => {
    const sampleData: (string | number | null)[][] = [
      ['Year', 'Kia', 'Nissan', 'Toyota', 'Honda', 'Mazda', 'Ford'],
      [2020, 1200, 1500, 1800, 1400, 900, 1100],
      [2021, 1350, 1600, 1900, 1500, 950, 1200],
      [2022, 1400, 1700, 2000, 1600, 1000, 1300],
      [2023, 1500, 1800, 2100, 1700, 1100, 1400],
      [2024, 1600, 1900, 2200, 1800, 1200, 1500],
    ];

    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(sampleData);
    }
  }, []);

  const resetData = useCallback(() => {
    const hot = hotRef.current?.hotInstance;
    if (hot) {
      hot.loadData(DEFAULT_DATA);
    }
  }, []);

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between'>
        <div className='flex gap-2'>
          <button
            className='rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors'
            onClick={loadSampleData}
          >
            Load Sample Data
          </button>
          <button
            className='rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors'
            onClick={resetData}
          >
            Reset
          </button>
        </div>
        <label className='flex items-center gap-2 text-sm'>
          <input
            type='checkbox'
            checked={isAutosave}
            onChange={(e) => setIsAutosave(e.target.checked)}
            className='h-4 w-4 rounded border-input'
          />
          Autosave
        </label>
      </div>

      <div className='rounded-lg border border-border overflow-hidden'>
        <HotTable
          themeName={themeName}
          ref={hotRef}
          data={DEFAULT_DATA}
          minCols={10}
          minRows={15}
          rowHeaders={true}
          colHeaders={true}
          height='600'
          width='100%'
          licenseKey='non-commercial-and-evaluation'
          columnSorting={true}
          filters={true}
          dropdownMenu={true}
          contextMenu={true}
          manualColumnResize={true}
          manualRowResize={true}
          afterChange={handleAfterChange}
          afterCreateRow={handleAfterCreateRow}
          afterRemoveRow={handleAfterRemoveRow}
          afterCreateCol={handleAfterCreateCol}
          afterRemoveCol={handleAfterRemoveCol}
          stretchH='all'
        />
      </div>

      <p className='text-xs text-muted-foreground'>
        💡 Tip: Ask the AI assistant to help you analyze your data, calculate
        totals, or perform operations on the spreadsheet.
      </p>
    </div>
  );
}

export default SpreadsheetView;
