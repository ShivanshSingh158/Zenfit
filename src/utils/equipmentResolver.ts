/**
 * equipmentResolver.ts — ZenFit
 *
 * Deterministic equipment and anatomical muscle group resolver for exercise cataloguing.
 * Powers Hevy-grade 2-column filter grids with 0ms evaluation.
 */

export type EquipmentCategory =
  | 'All'
  | 'None'
  | 'Barbell'
  | 'Dumbbell'
  | 'Cable'
  | 'Machine'
  | 'Kettlebell'
  | 'Plate'
  | 'Resistance Band'
  | 'Other';

export interface EquipmentOption {
  id: EquipmentCategory;
  label: string;
  iconName: string;
  iconType: 'ionicons' | 'material';
}

export const EQUIPMENT_OPTIONS: EquipmentOption[] = [
  { id: 'None', label: 'None (Bodyweight)', iconName: 'body-outline', iconType: 'ionicons' },
  { id: 'Barbell', label: 'Barbell', iconName: 'barbell-outline', iconType: 'ionicons' },
  { id: 'Dumbbell', label: 'Dumbbell', iconName: 'dumbbell', iconType: 'material' },
  { id: 'Cable', label: 'Cable', iconName: 'git-commit-outline', iconType: 'ionicons' },
  { id: 'Machine', label: 'Machine', iconName: 'hardware-chip-outline', iconType: 'ionicons' },
  { id: 'Kettlebell', label: 'Kettlebell', iconName: 'fitness-outline', iconType: 'ionicons' },
  { id: 'Plate', label: 'Weight Plate', iconName: 'disc-outline', iconType: 'ionicons' },
  { id: 'Resistance Band', label: 'Resistance Band', iconName: 'infinite-outline', iconType: 'ionicons' },
  { id: 'Other', label: 'Other', iconName: 'ellipsis-horizontal-circle-outline', iconType: 'ionicons' },
];

export interface MuscleGroupOption {
  id: string;
  label: string;
  region: 'Upper Body' | 'Lower Body' | 'Core' | 'Cardio & Full Body';
  icon: string;
}

export const MUSCLE_GROUP_OPTIONS: MuscleGroupOption[] = [
  // Upper Body
  { id: 'Chest', label: 'Chest', region: 'Upper Body', icon: 'shield-outline' },
  { id: 'Upper Back', label: 'Upper Back & Traps', region: 'Upper Body', icon: 'layers-outline' },
  { id: 'Lats', label: 'Lats (Width)', region: 'Upper Body', icon: 'airplane-outline' },
  { id: 'Shoulders', label: 'Shoulders (Delts)', region: 'Upper Body', icon: 'ellipse-outline' },
  { id: 'Biceps', label: 'Biceps', region: 'Upper Body', icon: 'flash-outline' },
  { id: 'Triceps', label: 'Triceps', region: 'Upper Body', icon: 'git-pull-request-outline' },
  { id: 'Forearms', label: 'Forearms', region: 'Upper Body', icon: 'hand-left-outline' },

  // Lower Body
  { id: 'Quads', label: 'Quads', region: 'Lower Body', icon: 'walk-outline' },
  { id: 'Hamstrings', label: 'Hamstrings', region: 'Lower Body', icon: 'repeat-outline' },
  { id: 'Glutes', label: 'Glutes', region: 'Lower Body', icon: 'fitness-outline' },
  { id: 'Calves', label: 'Calves', region: 'Lower Body', icon: 'footsteps-outline' },

  // Core
  { id: 'Abdominals', label: 'Abdominals', region: 'Core', icon: 'grid-outline' },
  { id: 'Lower Back', label: 'Lower Back', region: 'Core', icon: 'body-outline' },

  // Cardio & Full Body
  { id: 'Olympic / Full Body', label: 'Olympic / Full Body', region: 'Cardio & Full Body', icon: 'flame-outline' },
  { id: 'Cardio', label: 'Cardio & Conditioning', region: 'Cardio & Full Body', icon: 'heart-outline' },
];

/**
 * Resolves the equipment type deterministically from an exercise name and its aliases.
 */
export function resolveExerciseEquipment(name: string, aliases: string[] = []): EquipmentCategory {
  const primary = (name || '').toLowerCase().trim();
  const text = `${name} ${(aliases || []).join(' ')}`.toLowerCase().trim();

  // 0. Explicit Parentheses Tags (Highest Priority)
  if (primary.includes('(barbell)') || primary.includes('(ez bar)') || primary.includes('(ez-bar)') || primary.includes('(trap bar)')) {
    return 'Barbell';
  }
  if (primary.includes('(dumbbell)')) {
    return 'Dumbbell';
  }
  if (primary.includes('(cable)')) {
    return 'Cable';
  }
  if (
    primary.includes('(machine)') ||
    primary.includes('(smith machine)') ||
    primary.includes('(machine plates)') ||
    primary.includes('(plate loaded)') ||
    primary.includes('(assisted)')
  ) {
    return 'Machine';
  }
  if (primary.includes('(kettlebell)')) {
    return 'Kettlebell';
  }
  if (primary.includes('(plate') || primary.includes('(weighted)')) {
    return 'Plate';
  }
  if (primary.includes('(band)') || primary.includes('(resistance band)')) {
    return 'Resistance Band';
  }
  if (primary.includes('(bodyweight)') || primary.includes('(suspended)')) {
    return 'None';
  }

  // 1. Machine & Assisted Special Cases (checked before generic bodyweight / cable)
  if (
    primary.includes('assisted') ||
    primary.includes('reverse hyperextension') ||
    primary.includes('glute ham raise') ||
    primary.includes('iso-lateral') ||
    primary.includes('torso rotation') ||
    primary.includes('ski erg') ||
    primary.includes('skierg') ||
    primary.includes('pec deck') ||
    primary.includes('seated calf raise') ||
    primary.includes('calf raise machine') ||
    primary.includes('hack squat (machine)') ||
    primary.includes('leg press') ||
    primary.includes('leg extension') ||
    primary.includes('pendulum') ||
    primary.includes('hammer strength') ||
    primary.includes('smith')
  ) {
    return 'Machine';
  }

  // 2. Swiss Ball / Suspension / Calisthenics Overrides
  if (primary.includes('front lever') || primary.includes('swiss ball') || primary.includes('stability ball')) {
    return 'None';
  }

  // 3. Barbell Named Staples (without parenthesis in name)
  if (
    primary.includes('barbell') ||
    primary.includes('deadlift high pull') ||
    primary.includes('jump shrug') ||
    primary.includes('rack pull') ||
    primary.includes('push press') ||
    primary.includes('21s bicep curl') ||
    primary.includes('drag curl') ||
    primary.includes('full squat') ||
    primary.includes('front squat') ||
    primary.includes('overhead squat') ||
    primary.includes('zercher') ||
    primary.includes('sumo deadlift') ||
    primary.includes('straight leg deadlift') ||
    primary.includes('clean and jerk') ||
    primary.includes('power clean') ||
    primary.includes('hang clean') ||
    primary.includes('snatch') ||
    primary.includes('power snatch') ||
    primary.includes('hang snatch') ||
    primary === 'hack squat' ||
    primary.includes('landmine') ||
    primary.includes('meadows row') ||
    primary.includes('seal row') ||
    primary.includes('t-bar row') ||
    primary.includes('t bar row')
  ) {
    return 'Barbell';
  }

  // 4. Dumbbell Named Staples (without parenthesis in name)
  if (
    primary.includes('dumbbell') ||
    primary.includes('around the world') ||
    primary.includes('seated triceps press') ||
    primary.includes('concentration curl') ||
    primary.includes('cross body hammer curl') ||
    primary.includes('reverse grip concentration curl') ||
    primary.includes('seated palms up wrist curl') ||
    primary.includes('farmers walk') ||
    primary.includes('goblet squat') ||
    primary.includes('arnold press') ||
    primary.includes('tate press') ||
    primary.includes('waiter curl') ||
    primary.includes('pinwheel curl') ||
    primary.includes('squeeze press')
  ) {
    return 'Dumbbell';
  }

  // 5. Resistance Band
  if (primary.includes('band') || primary.includes('tubing')) {
    return 'Resistance Band';
  }

  // 6. Kettlebell
  if (primary.includes('kettlebell') || primary.includes('kb ')) {
    return 'Kettlebell';
  }

  // 7. Cable & Pulley
  if (
    primary.includes('cable') ||
    primary.includes('pulldown') ||
    primary.includes('pushdown') ||
    primary.includes('crossover') ||
    primary.includes('pulley') ||
    primary.includes('face pull')
  ) {
    return 'Cable';
  }

  // 8. Plate
  if (primary.includes('plate') || primary.includes('pinch') || primary.includes('svend')) {
    return 'Plate';
  }

  // 9. Calisthenics & Bodyweight
  if (
    primary.includes('running') ||
    primary.includes('swimming') ||
    primary.includes('sprint') ||
    primary.includes('cycling') ||
    primary.includes('walking') ||
    primary.includes('hiking') ||
    primary.includes('jumping') ||
    primary.includes('yoga') ||
    primary.includes('pilates') ||
    primary.includes('push up') ||
    primary.includes('pull up') ||
    primary.includes('chin up') ||
    primary.includes('dip') ||
    primary.includes('plank') ||
    primary.includes('crunch') ||
    primary.includes('sit up') ||
    primary.includes('air squat') ||
    primary.includes('burpee') ||
    primary.includes('lunge') ||
    primary.includes('calf raise') ||
    primary.includes('leg raise') ||
    primary.includes('knee raise') ||
    primary.includes('dead bug') ||
    primary.includes('vacuum') ||
    primary.includes('nordic') ||
    primary.includes('glute bridge') ||
    primary.includes('climbing') ||
    primary.includes('skiing') ||
    primary.includes('snowboarding') ||
    text.includes('bodyweight')
  ) {
    return 'None';
  }

  return 'None';
}

/**
 * Normalizes any specific muscle label to our standard 13 muscle categories.
 */
export function resolveExerciseMuscleGroup(rawMuscle: string): string {
  const m = (rawMuscle || '').toLowerCase();

  // 0. Cardio & Full Body / Olympic
  if (
    m.includes('olympic') ||
    m.includes('full body') ||
    m.includes('clean') ||
    m.includes('snatch') ||
    m.includes('jerk')
  ) {
    return 'Olympic / Full Body';
  }
  if (
    m.includes('cardio') ||
    m.includes('conditioning') ||
    m.includes('hiit') ||
    m.includes('sport') ||
    m.includes('mobility') ||
    m.includes('plyometric') ||
    m.includes('warmup') ||
    m.includes('warm up')
  ) {
    return 'Cardio';
  }

  // 1. Back divisions
  if (m.includes('lat') || m.includes('wing')) return 'Lats';
  if (
    m.includes('mid-back') ||
    m.includes('mid back') ||
    m.includes('trap') ||
    m.includes('upper back') ||
    m.includes('rhomboid')
  ) {
    return 'Upper Back';
  }
  if (m.includes('lower back') || m.includes('erector')) return 'Lower Back';

  // 2. Chest
  if (m.includes('chest') || m.includes('pec') || m.includes('serratus')) return 'Chest';

  // 3. Shoulders
  if (m.includes('shoulder') || m.includes('delt')) return 'Shoulders';

  // 4. Arms
  if (m.includes('tricep')) return 'Triceps';
  if (m.includes('brachioradialis') || m.includes('forearm') || m.includes('wrist') || m.includes('grip')) return 'Forearms';
  if (m.includes('bicep') || m.includes('brachialis')) return 'Biceps';

  // 5. Lower Body
  if (m.includes('calf') || m.includes('calves') || m.includes('soleus') || m.includes('gastrocnemius') || m.includes('tibialis')) return 'Calves';
  if (m.includes('hamstring') || m.includes('bicep femoris')) return 'Hamstrings';
  if (m.includes('glute') || m.includes('butt') || m.includes('abductor') || m.includes('adductor')) return 'Glutes';
  if (m.includes('quad') || m.includes('rectus femoris') || m.includes('vmo') || m.includes('leg')) return 'Quads';

  // 6. Core & Abdominals
  if (m.includes('ab') || m.includes('core') || m.includes('oblique') || m.includes('transverse') || m.includes('hip flexor')) return 'Abdominals';

  return 'Chest'; // fallback
}
