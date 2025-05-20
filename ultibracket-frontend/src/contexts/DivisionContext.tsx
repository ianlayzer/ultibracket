import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useMemo,
} from 'react';

export type Division = 'mens' | 'womens';

interface DivisionContextType {
  currentDivision: Division;
  setCurrentDivision: (division: Division) => void;
  getDivisionSpecificName: (baseName: string) => string;
  getDivisionSpecificMasterId: (baseMasterId: string) => string;
}

const DivisionContext = createContext<DivisionContextType | undefined>(
  undefined,
);

interface DivisionProviderProps {
  children: ReactNode;
}

export const DivisionProvider: React.FC<DivisionProviderProps> = ({
  children,
}) => {
  const [currentDivision, setCurrentDivisionState] = useState<Division>('mens'); // Default to Men's

  const setCurrentDivision = (division: Division) => {
    setCurrentDivisionState(division);
  };

  // Helper to append division to a base name for user brackets/tournaments
  const getDivisionSpecificName = (baseName: string): string => {
    return `${baseName} - ${currentDivision === 'mens' ? "Men's Division" : "Women's Division"}`;
  };

  // Helper to append division to a base master ID
  const getDivisionSpecificMasterId = (baseMasterId: string): string => {
    return `${baseMasterId}_${currentDivision.toUpperCase()}`;
  };

  const contextValue = useMemo(
    () => ({
      currentDivision,
      setCurrentDivision,
      getDivisionSpecificName,
      getDivisionSpecificMasterId,
    }),
    [currentDivision],
  );

  return (
    <DivisionContext.Provider value={contextValue}>
      {children}
    </DivisionContext.Provider>
  );
};

export const useDivision = (): DivisionContextType => {
  const context = useContext(DivisionContext);
  if (context === undefined) {
    throw new Error('useDivision must be used within a DivisionProvider');
  }
  return context;
};
