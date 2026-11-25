import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { useTheme } from '../../contexts/ThemeContext';
import { useGymProfile } from '../../hooks/useGymProfile';
import { STATIC_BODY_SVG, resolveMuscleSlugsForGroup } from '../Gym/metrics/muscleMapSvgCache';
import { resolveExerciseTargetMuscle, canonicalizeMuscle } from '../../utils/gymUtils';
import { TactileButton } from '../ui/TactileButton';

export interface MiniMannequinButtonProps {
  onPress: () => void;
  hasWorkedMuscles?: boolean;
  exercises?: Array<{
    name: string;
    muscle?: string;
    setsLog?: Array<{ completed?: boolean }>;
  }>;
}

export const MiniMannequinButton: React.FC<MiniMannequinButtonProps> = React.memo(
  ({ onPress, hasWorkedMuscles = false, exercises }) => {
    const { tokens } = useTheme();
    const { gymProfile } = useGymProfile();
    const genderKey = gymProfile?.gender === 'female' ? 'female' : 'male';
    const frontView = STATIC_BODY_SVG[genderKey].front;
    const backView = STATIC_BODY_SVG[genderKey].back;

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
        const slugs = resolveMuscleSlugsForGroup(canonical || target);

        const completed = ex.setsLog?.filter((s) => s.completed).length || 0;
        if (completed > 0) {
          slugs.forEach((s) => worked.add(s));
        } else {
          slugs.forEach((s) => pending.add(s));
        }
      }

      return { workedSlugs: worked, pendingSlugs: pending };
    }, [exercises, hasWorkedMuscles]);

    const baseColor = tokens.text.muted;
    const workedColor = tokens.status.success;
    const pendingColor = tokens.status.successDim;

    const renderMuscle = (view: typeof frontView, slug: string) => {
      const d = view.paths[slug];
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
      <TactileButton
        variant="custom"
        haptic="selection"
        onPress={onPress}
        style={[
          styles.pill,
          {
            borderRadius: tokens.radius.inner,
            backgroundColor: tokens.bg.elevated,
            borderColor: tokens.border.subtle,
          },
        ]}
        hitSlop={tokens.touch.hitSlop}
        accessibilityLabel="View muscles hit in this session"
      >
        <Svg viewBox={frontView.vb} width={15} height={26}>
          <G>
            <Path d={frontView.inertD} fill={baseColor} />
            {frontView.slugs.map((slug) => renderMuscle(frontView, slug))}
          </G>
        </Svg>

        <Svg viewBox={backView.vb} width={15} height={26}>
          <G>
            <Path d={backView.inertD} fill={baseColor} />
            {backView.slugs.map((slug) => renderMuscle(backView, slug))}
          </G>
        </Svg>
      </TactileButton>
    );
  }
);

const styles = StyleSheet.create({
  pill: {
    width: 48,
    height: 36,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
});

export default MiniMannequinButton;
