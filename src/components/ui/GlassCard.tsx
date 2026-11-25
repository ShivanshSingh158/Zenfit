import React, { useMemo } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../contexts/ThemeContext';
import { SHADOW } from '../../theme/tokens';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  padding?: number;
  borderRadius?: number;
  noBorder?: boolean;
}

/**
 * GlassCard — Layered surface card separating outer elevation shadow from clipped inner glass sheen.
 */
function GlassCardComponent({
  children,
  style,
  padding,
  borderRadius,
  noBorder = false,
}: GlassCardProps) {
  const { tokens } = useTheme();
  const resolvedRadius = borderRadius ?? tokens.radius.card;
  const resolvedPadding = padding ?? tokens.space.md;

  const styles = useMemo(() => makeStyles(tokens), [tokens]);

  return (
    <View style={[{ borderRadius: resolvedRadius }, SHADOW.md, style]}>
      <View
        style={[
          styles.container,
          {
            borderRadius: resolvedRadius,
            borderWidth: noBorder ? 0 : tokens.border.hairlineWidth,
          },
        ]}
      >
        <View
          style={[
            StyleSheet.absoluteFillObject,
            {
              borderRadius: resolvedRadius,
              backgroundColor: tokens.bg.glass,
            },
          ]}
        />
        <LinearGradient
          colors={tokens.gradients.surfaceSheen}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={[StyleSheet.absoluteFillObject, { borderRadius: resolvedRadius }]}
          pointerEvents="none"
        />
        <View style={{ padding: resolvedPadding }}>{children}</View>
      </View>
    </View>
  );
}

const makeStyles = (tokens: ReturnType<typeof useTheme>['tokens']) =>
  StyleSheet.create({
    container: {
      overflow: 'hidden',
      borderColor: tokens.border.subtle,
      backgroundColor: tokens.bg.surface,
    },
  });

export default React.memo(GlassCardComponent);
