import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { STATIC_BODY_SVG, resolveMuscleSlugsForGroup } from '../metrics/muscleMapSvgCache';
import { resolveExerciseTargetMuscle } from '../../../utils/gymUtils';
import { DARK_TOKENS, LIGHT_TOKENS } from '../../../theme/tokens';
import { useGymProfile } from '../../../hooks/useGymProfile';

export interface MiniDualBodyMapProps {
  exercises?: Array<{ name: string; muscle?: string }>;
  targetMuscles?: string[];
  activeColor?: string;
  avatarHeight?: number;
  avatarWidth?: number;
  isDark?: boolean;
  customMuscleColors?: Record<string, string>;
  gap?: number;
  style?: any;
}

export const MiniDualBodyMap: React.FC<MiniDualBodyMapProps> = React.memo(({
  exercises = [],
  targetMuscles,
  activeColor = DARK_TOKENS.accent.primary,
  avatarHeight = 44,
  avatarWidth = 20,
  isDark = true,
  customMuscleColors,
  gap = 4,
  style,
}) => {
  const activeStrokeColor = isDark ? DARK_TOKENS.text.primary : LIGHT_TOKENS.bg.surface;
  // Compute active muscle slugs via canonical MuscleMapSvgCache (includes Core & Abs)
  const activeSlugs = useMemo(() => {
    const slugs = new Set<string>();

    if (targetMuscles && targetMuscles.length > 0) {
      for (const m of targetMuscles) {
        resolveMuscleSlugsForGroup(m).forEach(s => slugs.add(s));
      }
      return slugs;
    }

    for (const ex of exercises) {
      if (!ex.name) continue;
      const { targetMuscle, canonicalGroup } = resolveExerciseTargetMuscle(ex.name, ex.muscle);
      const groupKey = canonicalGroup && canonicalGroup !== 'Mixed' && canonicalGroup !== 'Other'
        ? canonicalGroup
        : targetMuscle;
      resolveMuscleSlugsForGroup(groupKey).forEach(s => slugs.add(s));
    }
    return slugs;
  }, [exercises, targetMuscles]);

  const { gymProfile } = useGymProfile();
  const genderSvg = STATIC_BODY_SVG[gymProfile?.gender === 'female' ? 'female' : 'male'] || STATIC_BODY_SVG.male;
  const frontView = genderSvg.front;
  const backView = genderSvg.back;

  const inertFill = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.07)';
  const inertStroke = isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.1)';

  return (
    <View style={[styles.container, { gap }, style]}>
      {/* Front silhouette */}
      <View style={[styles.avatarBox, { width: avatarWidth, height: avatarHeight }]}>
        <Svg viewBox={frontView.vb} width={avatarWidth} height={avatarHeight}>
          <G>
            <Path d={frontView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
            {frontView.slugs.map(slug => {
              const customColor = customMuscleColors ? customMuscleColors[slug] : null;
              const isActive = activeSlugs.has(slug);
              const pathD = frontView.paths[slug];
              if (!pathD) return null;

              const fill = customColor || (isActive ? activeColor : inertFill);
              const stroke = customColor || isActive ? activeStrokeColor : inertStroke;
              const strokeWidth = customColor || isActive ? 1.3 : 0.8;

              return (
                <Path
                  key={`front-${slug}`}
                  d={pathD}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
              );
            })}
          </G>
        </Svg>
      </View>

      {/* Back silhouette */}
      <View style={[styles.avatarBox, { width: avatarWidth, height: avatarHeight }]}>
        <Svg viewBox={backView.vb} width={avatarWidth} height={avatarHeight}>
          <G>
            <Path d={backView.inertD} fill={inertFill} stroke={inertStroke} strokeWidth={0.8} />
            {backView.slugs.map(slug => {
              const customColor = customMuscleColors ? customMuscleColors[slug] : null;
              const isActive = activeSlugs.has(slug);
              const pathD = backView.paths[slug];
              if (!pathD) return null;

              const fill = customColor || (isActive ? activeColor : inertFill);
              const stroke = customColor || isActive ? activeStrokeColor : inertStroke;
              const strokeWidth = customColor || isActive ? 1.3 : 0.8;

              return (
                <Path
                  key={`back-${slug}`}
                  d={pathD}
                  fill={fill}
                  stroke={stroke}
                  strokeWidth={strokeWidth}
                />
              );
            })}
          </G>
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  avatarBox: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MiniDualBodyMap;

