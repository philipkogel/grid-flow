import { createFileRoute } from '@tanstack/react-router';
import { useRef, useState, useEffect } from 'react';
import { HotTable } from '@handsontable/react';
import { registerAllModules } from 'handsontable/registry';
import 'handsontable/styles/handsontable.css';
import 'handsontable/styles/ht-theme-main.css';
import { useTheme } from '@/components/theme-provider';

registerAllModules();

const sampleData: any[][] = [
  ['Product', 'Price', 'Quantity', 'Total'],
  ['Laptop', 999, 5, 4995],
  ['Mouse', 25, 10, 250],
  ['Keyboard', 75, 8, 600],
  ['Monitor', 300, 3, 900],
];

export const Route = createFileRoute('/_layout/spreadsheet')({
  component: SpreadsheetView,
  head: () => ({
    meta: [{ title: 'Spreadsheet – ChatSheet' }],
  }),
});

function SpreadsheetView() {
  const { resolvedTheme } = useTheme();
  const [themeName, setThemeName] = useState('ht-theme-main-dark-auto');
  const hotRef = useRef(null);
  const [output, setOutput] = useState('Click "Load" to load data from server');
  console.log('Resolved theme:', resolvedTheme);
  // Update theme when resolvedTheme changes
  useEffect(() => {
    setThemeName(
      resolvedTheme === 'dark' ? 'ht-theme-main-dark-auto' : 'ht-theme-main',
    );
  }, [resolvedTheme]);

  const loadClickCallback = (event: any) => {
    const hot = hotRef.current?.hotInstance;

    hot?.loadData([
      ['', 'Kia', 'Nissan', 'Toyota', 'Honda', 'Mazda', 'Ford'],
      ['2012', 10, 11, 12, 13, 15, 16],
      ['2013', 10, 11, 12, 13, 15, 16],
      ['2014', 10, 11, 12, 13, 15, 16],
      ['2015', 10, 11, 12, 13, 15, 16],
      ['2016', 10, 11, 12, 13, 15, 16],
    ]);
    setOutput('Data loaded');
  };

  return (
    <>
      <div className='example-controls-container'>
        <div className='controls'>
          <button
            id='load'
            className='button button--primary button--blue'
            onClick={loadClickCallback}
          >
            Load data
          </button>
        </div>
        <output className='console' id='output'>
          {output}
        </output>
      </div>
      <HotTable
        themeName={themeName}
        ref={hotRef}
        minCols={20}
        startRows={20}
        startCols={20}
        rowHeaders={true}
        colHeaders={true}
        height='auto'
        // autoWrapRow={true}
        // autoWrapCol={true}
        licenseKey='non-commercial-and-evaluation'
        afterChange={function (change, source) {
          if (source === 'loadData') {
            return; // don't save this change
          }

          if (!isAutosave) {
            return;
          }
          // todo: add cors or use the paylaod from https://handsontable.com/docs/react-data-grid/saving-data/
          fetch('https://handsontable.com/docs/scripts/json/save.json', {
            method: 'POST',
            mode: 'no-cors',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ data: change }),
          }).then(() => {
            setOutput(
              `Autosaved (${change?.length} cell${(change?.length || 0) > 1 ? 's' : ''})`,
            );
            console.log(
              'The POST request is only used here for the demo purposes',
            );
          });
        }}
      />
    </>
  );
}

export default SpreadsheetView;
