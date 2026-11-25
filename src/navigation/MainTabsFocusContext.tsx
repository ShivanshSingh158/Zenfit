import React, { createContext, useContext } from 'react';

const MainTabsFocusContext = createContext<boolean>(true);

export const MainTabsFocusProvider: React.FC<{
  focused: boolean;
  children: React.ReactNode;
}> = ({ focused, children }) => (
  <MainTabsFocusContext.Provider value={focused}>
    {children}
  </MainTabsFocusContext.Provider>
);

export const useMainTabsFocused = (): boolean => useContext(MainTabsFocusContext);
