import {
  createContext,
  useCallback,
  useContext,
  useRef,
  type ReactNode,
} from 'react';

// Types matching the backend schema
export interface SpreadsheetContext {
  columns: string[];
  rows: (string | number | boolean | null)[][];
  selection?: {
    startRow: number;
    startCol: number;
    endRow: number;
    endCol: number;
  };
}

export interface SpreadsheetAction {
  type:
    | 'update_cell'
    | 'add_row'
    | 'add_column'
    | 'delete_row'
    | 'delete_column'
    | 'sort'
    | 'filter';
  [key: string]: unknown;
}

interface SpreadsheetContextState {
  getContext: () => SpreadsheetContext | null;
  setContext: (context: SpreadsheetContext | null) => void;
  applyAction: (action: SpreadsheetAction) => void;
  setActionHandler: (
    handler: ((action: SpreadsheetAction) => void) | undefined,
  ) => void;
}

const initialState: SpreadsheetContextState = {
  getContext: () => null,
  setContext: () => {},
  applyAction: () => {},
  setActionHandler: () => {},
};

const SpreadsheetProviderContext =
  createContext<SpreadsheetContextState>(initialState);

interface SpreadsheetProviderProps {
  children: ReactNode;
}

export function SpreadsheetProvider({ children }: SpreadsheetProviderProps) {
  // Use refs to avoid re-renders when context changes
  const contextRef = useRef<SpreadsheetContext | null>(null);
  const actionHandlerRef = useRef<
    ((action: SpreadsheetAction) => void) | undefined
  >(undefined);

  const getContext = useCallback(() => {
    return contextRef.current;
  }, []);

  const setContext = useCallback((newContext: SpreadsheetContext | null) => {
    contextRef.current = newContext;
  }, []);

  const applyAction = useCallback((action: SpreadsheetAction) => {
    if (actionHandlerRef.current) {
      actionHandlerRef.current(action);
    }
  }, []);

  const setActionHandler = useCallback(
    (handler: ((action: SpreadsheetAction) => void) | undefined) => {
      actionHandlerRef.current = handler;
    },
    [],
  );

  return (
    <SpreadsheetProviderContext.Provider
      value={{
        getContext,
        setContext,
        applyAction,
        setActionHandler,
      }}
    >
      {children}
    </SpreadsheetProviderContext.Provider>
  );
}

export function useSpreadsheetContext() {
  const context = useContext(SpreadsheetProviderContext);

  if (context === undefined) {
    throw new Error(
      'useSpreadsheetContext must be used within a SpreadsheetProvider',
    );
  }

  return context;
}
