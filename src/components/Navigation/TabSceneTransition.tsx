import React, { createContext, useContext } from 'react';
import { SharedValue } from 'react-native-reanimated';

export interface TabReplaySlot {
  tabIndex: number;
  epochSV: SharedValue<number>;
  activeSV: SharedValue<boolean>;
}

const TabReplayContext = createContext<TabReplaySlot | null>(null);

export const useTabReplayContext = (): TabReplaySlot | null =>
  useContext(TabReplayContext);

export const useTabMotionController = () => null;

export const TabDirectionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => <>{children}</>;

export const TabSceneTransition: React.FC<{
  tabIndex: number;
  children: React.ReactNode;
}> = ({ children }) => <>{children}</>;

export function withTabSceneTransition<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  _tabIndex: number
): React.FC<P> {
  return WrappedComponent as React.FC<P>;
}

export default TabSceneTransition;
