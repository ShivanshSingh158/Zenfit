import React from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';
import { useTheme } from '../../contexts/ThemeContext';

export interface AppIconProps extends Omit<LucideProps, 'strokeWidth'> {
  icon: LucideIcon;
  size?: number;
  color?: string;
}

/**
 * AppIcon — Enforces strictly unified 2px stroke width across all Lucide icons.
 */
export function AppIcon({
  icon: IconComponent,
  size,
  color,
  ...rest
}: AppIconProps) {
  const { tokens } = useTheme();

  return (
    <IconComponent
      size={size ?? tokens.icon.md}
      color={color ?? tokens.text.primary}
      strokeWidth={tokens.icon.strokeWidth}
      {...rest}
    />
  );
}

export default AppIcon;
