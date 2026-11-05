import React, { useMemo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { hapticSelection } from '../../../utils/haptics';
import { BODY_PATHS, getMergedInertPath, getMergedMusclePath } from '../metrics/bodyPaths';
import { INERT, MuscleSlug } from '../../../services/muscleRecoveryService';
import { resolveExerciseTargetMuscle, canonicalizeMuscle } from '../../../utils/gymUtils';

const GROUP_TO_SLUGS: Record<string, MuscleSlug[]> = {
  Chest: ['chest'],
  Back: ['upper-back', 'lower-back', 'trapezius'],
  Shoulders: ['deltoids'],
  Biceps: ['biceps'],
  Triceps: ['triceps'],
  Quads: ['quadriceps'],
  Hamstrings: ['hamstring'],
  Calves: ['calves'],
  Abs: ['abs', 'obliques'],
  Forearms: ['forearm'],
  Glutes: ['gluteal'],
  Traps: ['trapezius'],
};

export interface MiniMannequinButtonProps {
  onPress: () => void;
  hasWorkedMuscles?: boolean;
  exercises?: Array<{
    name: string;
    muscle?: string;
    setsLog?: Array<{ completed?: boolean }>;
  }>;
}

export const MiniMannequinButton: React.FC<MiniMannequinButtonProps> = React.memo(({
  onPress,
  hasWorkedMuscles = false,
  exercises,
}) => {
  const frontGeo = BODY_PATHS.male.front;
  const backGeo = BODY_PATHS.male.back;

  const frontInertD = useMemo(() => getMergedInertPath(frontGeo, INERT), [frontGeo]);
  const backInertD = useMemo(() => getMergedInertPath(backGeo, INERT), [backGeo]);

  const { workedSlugs, pendingSlugs } = useMemo(() => {
    const worked = new Set<string>();
    const pending = new Set<string>();

    if (!exercises || exercises.length === 0) {
      if (hasWorkedMuscles) {
        worked.add('chest');
        worked.add('deltoids');
        worked.add('upper-back');
      }
      return { workedSlugs: worked, pendingSlugs: pending };
    }

    for (const ex of exercises) {
      const target = resolveExerciseTargetMuscle(ex.name, ex.muscle).targetMuscle;
      const canonical = canonicalizeMuscle(target || ex.muscle || '');
      const slugs = GROUP_TO_SLUGS[canonical] || [];

      const completed = ex.setsLog?.filter(s => s.completed).length || 0;
      if (completed > 0) {
        slugs.forEach(s => worked.add(s));
      } else {
        slugs.forEach(s => pending.add(s));
      }
    }

    return { workedSlugs: worked, pendingSlugs: pending };
  }, [exercises, hasWorkedMuscles]);

  const baseColor = '#545458'; // Sleek Apple dark gray silhouette (identical to OpenGym standard)
  const workedColor = '#30D158'; // High-vis neon green for completed muscles
  const pendingColor = '#243A2B'; // Subtle dark green tint for planned muscles

  const renderMuscle = (geo: any, slug: string) => {
    const d = getMergedMusclePath(geo, slug);
    if (!d) return null;

    let fill = baseColor;
    if (workedSlugs.has(slug)) {
      fill = workedColor;
    } else if (pendingSlugs.has(slug)) {
      fill = pendingColor;
    }

    return <Path key={slug} d={d} fill={fill} />;
  };

  return (
    <TouchableOpacity
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      style={styles.pill}
      activeOpacity={0.75}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      {/* Front Body Silhouette */}
      <Svg viewBox={frontGeo.vb} width={15} height={26}>
        <G>
          <Path d={frontInertD} fill={baseColor} />
          {Object.keys(frontGeo.p).map(slug => renderMuscle(frontGeo, slug))}
        </G>
      </Svg>

      {/* Back Body Silhouette */}
      <Svg viewBox={backGeo.vb} width={15} height={26}>
        <G>
          <Path d={backInertD} fill={baseColor} />
          {Object.keys(backGeo.p).map(slug => renderMuscle(backGeo, slug))}
        </G>
      </Svg>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  pill: {
    width: 44,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#1C1C1E',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});

export default MiniMannequinButton;
