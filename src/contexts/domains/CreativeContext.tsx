import React, { createContext, useContext } from 'react';

interface CreativeContextType {
  storageNodes: any[];
  notes: any[];
  optimisticAddStorageNode: (node: any) => void;
  optimisticUpdateStorageNode: (id: string, partial: any) => void;
  optimisticDeleteStorageNode: (id: string) => void;
}

const CreativeContext = createContext<CreativeContextType>({
  storageNodes: [],
  notes: [],
  optimisticAddStorageNode: () => {},
  optimisticUpdateStorageNode: () => {},
  optimisticDeleteStorageNode: () => {},
});

export function CreativeDataProvider({ children }: { children: React.ReactNode }) {
  return (
    <CreativeContext.Provider
      value={{
        storageNodes: [],
        notes: [],
        optimisticAddStorageNode: () => {},
        optimisticUpdateStorageNode: () => {},
        optimisticDeleteStorageNode: () => {},
      }}
    >
      {children}
    </CreativeContext.Provider>
  );
}

export function useCreativeData() {
  return useContext(CreativeContext);
}
