// Generated from zenfit_scientific_exercise_fractional_set_volume_database.md
import { MuscleSlug } from '../services/muscleRecoveryService';

export interface ScientificExerciseMeta {
  name: string;
  tier: string;
  pattern: string;
  weights: Partial<Record<MuscleSlug, number>>;
}

export const SCIENTIFIC_EXERCISE_MAP: Record<string, ScientificExerciseMeta> = {
  "upper_chest_incline_dumbbell_press": {
    "name": "Incline Bench Press (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4,
      "serratus": 0.2
    }
  },
  "upper_chest_incline_barbell_bench_press": {
    "name": "Incline Bench Press (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "upper_chest_incline_machine_press": {
    "name": "Incline Chest Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "upper_chest_low_to_high_cable_fly": {
    "name": "Low Cable Fly Crossovers",
    "tier": "S Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3,
      "biceps": 0.2
    }
  },
  "upper_chest_incline_dumbbell_fly": {
    "name": "Incline Chest Fly (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3,
      "biceps": 0.2
    }
  },
  "upper_chest_landmine_chest_press": {
    "name": "Single Arm Landmine Press (Barbell)",
    "tier": "B Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.6,
      "triceps": 0.4,
      "serratus": 0.3,
      "obliques": 0.3
    }
  },
  "upper_chest_converging_incline_chest_press": {
    "name": "Converging Incline Chest Press (Plate Loaded)",
    "tier": "S Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "upper_chest_incline_hex_press": {
    "name": "Hex Press (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.4
    }
  },
  "upper_chest_reverse_grip_incline_barbell_press": {
    "name": "Reverse Grip Incline Bench Press (Barbell)",
    "tier": "A Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4,
      "biceps": 0.2
    }
  },
  "upper_chest_cable_upper_chest_scoops": {
    "name": "Low Cable Scoop Fly (Cable)",
    "tier": "C Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "biceps": 0.2
    }
  },
  "upper_chest_single_arm_incline_cable_press": {
    "name": "Single Arm Cable Crossover",
    "tier": "C Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.3,
      "obliques": 0.2
    }
  },
  "upper_chest_decline_push_up": {
    "name": "Decline Push Up",
    "tier": "B Tier",
    "pattern": "Push (Incline / Vertical)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4,
      "abs": 0.3
    }
  },
  "mid_chest_flat_barbell_bench_press": {
    "name": "Bench Press (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "mid_chest_barbell_floor_press": {
    "name": "Floor Press (Barbell)",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.4
    }
  },
  "mid_chest_flat_dumbbell_press": {
    "name": "Bench Press (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "mid_chest_pec_deck_fly": {
    "name": "Butterfly (Pec Deck)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3
    }
  },
  "mid_chest_cable_crossovers": {
    "name": "Cable Fly Crossovers",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3
    }
  },
  "mid_chest_flat_dumbbell_fly": {
    "name": "Chest Fly (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3,
      "biceps": 0.2
    }
  },
  "mid_chest_pushups": {
    "name": "Push Up",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4,
      "serratus": 0.3,
      "abs": 0.3
    }
  },
  "mid_chest_seated_machine_chest_press": {
    "name": "Chest Press (Machine)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4
    }
  },
  "mid_chest_plate_press": {
    "name": "Plate Press",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.2
    }
  },
  "uncategorized_hammer_strength_chest_press": {
    "name": "Iso-Lateral Chest Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4
    }
  },
  "serratus_anterior_scapular_pushup": {
    "name": "Scapular Push Up",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "serratus": 1,
      "chest": 0.2,
      "abs": 0.3,
      "deltoids": 0.2
    }
  },
  "mid_chest_deficit_pushup": {
    "name": "Deficit Push Up",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4,
      "abs": 0.3
    }
  },
  "upper_chest_smith_machine_guillotine_incline_press": {
    "name": "Guillotine Press (Smith Machine)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4
    }
  },
  "mid_chest_spoto_press": {
    "name": "Spoto Bench Press (Barbell)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.5
    }
  },
  "mid_chest_floor_dumbbell_flyes": {
    "name": "Floor Chest Fly (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3,
      "biceps": 0.2
    }
  },
  "mid_chest_resistance_band_pushups": {
    "name": "Push Up (Band)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.4,
      "abs": 0.3
    }
  },
  "mid_chest_isometric_squeeze_machine_fly": {
    "name": "Chest Fly (Machine)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3
    }
  },
  "mid_chest_around_the_world": {
    "name": "Around The World",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "serratus": 0.3
    }
  },
  "mid_chest_bench_press_cable": {
    "name": "Bench Press (Cable)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.3
    }
  },
  "mid_chest_bench_press_smith_machine": {
    "name": "Bench Press (Smith Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4
    }
  },
  "mid_chest_bench_press_wide_grip_barbell": {
    "name": "Bench Press - Wide Grip (Barbell)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.3
    }
  },
  "mid_chest_chest_fly_band": {
    "name": "Chest Fly (Band)",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3
    }
  },
  "mid_chest_chest_fly_suspension": {
    "name": "Chest Fly (Suspension)",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "abs": 0.4,
      "biceps": 0.2
    }
  },
  "mid_chest_chest_press_band": {
    "name": "Chest Press (Band)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4
    }
  },
  "mid_chest_clap_push_ups": {
    "name": "Clap Push Ups",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.4,
      "abs": 0.3
    }
  },
  "mid_chest_dumbbell_squeeze_press": {
    "name": "Dumbbell Squeeze Press",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.4
    }
  },
  "mid_chest_feet_up_bench_press_barbell": {
    "name": "Feet Up Bench Press (Barbell)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.5,
      "abs": 0.2
    }
  },
  "mid_chest_floor_press_dumbbell": {
    "name": "Floor Press (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.4
    }
  },
  "mid_chest_kneeling_push_up": {
    "name": "Kneeling Push Up",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.4,
      "triceps": 0.4,
      "abs": 0.2
    }
  },
  "mid_chest_one_arm_push_up": {
    "name": "One Arm Push Up",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.5,
      "obliques": 0.5,
      "serratus": 0.4
    }
  },
  "mid_chest_plank_pushup": {
    "name": "Plank Pushup",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "abs": 0.5,
      "deltoids": 0.4,
      "obliques": 0.3
    }
  },
  "mid_chest_push_up_weighted": {
    "name": "Push Up (Weighted)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.5,
      "serratus": 0.3,
      "abs": 0.4
    }
  },
  "mid_chest_ring_push_up": {
    "name": "Ring Push Up",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.5,
      "triceps": 0.4,
      "abs": 0.4
    }
  },
  "mid_chest_seated_chest_flys_cable": {
    "name": "Seated Chest Flys (Cable)",
    "tier": "S Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.3
    }
  },
  "lower_chest_chest_dips": {
    "name": "Chest Dip",
    "tier": "S Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.5,
      "serratus": 0.3
    }
  },
  "lower_chest_decline_barbell_bench_press": {
    "name": "Decline Bench Press (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lower_chest_decline_dumbbell_press": {
    "name": "Decline Bench Press (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lower_chest_decline_dumbbell_flyes": {
    "name": "Decline Chest Fly (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "deltoids": 0.2,
      "biceps": 0.2
    }
  },
  "lower_chest_hammer_strength_decline_press": {
    "name": "Decline Bench Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lower_chest_smith_machine_decline_press": {
    "name": "Decline Bench Press (Smith Machine)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lower_chest_gironda_dips": {
    "name": "Gironda Dip (Chest)",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.5,
      "deltoids": 0.5,
      "serratus": 0.3
    }
  },
  "lower_chest_chest_dip_assisted": {
    "name": "Chest Dip (Assisted)",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.4
    }
  },
  "lower_chest_chest_dip_weighted": {
    "name": "Chest Dip (Weighted)",
    "tier": "S Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.5,
      "serratus": 0.3
    }
  },
  "lower_chest_incline_push_ups": {
    "name": "Incline Push Ups",
    "tier": "C Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.4,
      "deltoids": 0.3,
      "abs": 0.2
    }
  },
  "lower_chest_ring_dips": {
    "name": "Ring Dips",
    "tier": "A Tier",
    "pattern": "Push (Horizontal)",
    "weights": {
      "chest": 1,
      "triceps": 0.6,
      "deltoids": 0.5,
      "serratus": 0.4
    }
  },
  "front_delts_standing_overhead_barbell_press": {
    "name": "Standing Military Press (Barbell)",
    "tier": "S Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.4,
      "trapezius": 0.3,
      "abs": 0.3
    }
  },
  "front_delts_seated_dumbbell_shoulder_press": {
    "name": "Shoulder Press (Dumbbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.3,
      "trapezius": 0.3
    }
  },
  "front_delts_machine_overhead_press": {
    "name": "Seated Shoulder Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.3
    }
  },
  "front_delts_arnold_press": {
    "name": "Arnold Press (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.3,
      "trapezius": 0.3
    }
  },
  "front_delts_dumbbell_front_raise": {
    "name": "Front Raise (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.4,
      "trapezius": 0.2
    }
  },
  "front_delts_dumbbell_press_shoulder": {
    "name": "Overhead Press (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "trapezius": 0.3,
      "abs": 0.3
    }
  },
  "front_delts_landmine_shoulder_press": {
    "name": "Shoulder Press (Landmine)",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.5,
      "triceps": 0.4,
      "serratus": 0.3,
      "obliques": 0.3
    }
  },
  "front_delts_push_press": {
    "name": "Push Press",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "quadriceps": 0.5,
      "triceps": 0.5,
      "trapezius": 0.4,
      "gluteal": 0.3
    }
  },
  "front_delts_seated_barbell_shoulder_press": {
    "name": "Seated Overhead Press (Barbell)",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.4,
      "trapezius": 0.3
    }
  },
  "front_delts_seated_machine_press": {
    "name": "Shoulder Press (Machine Plates)",
    "tier": "A+ Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.3
    }
  },
  "front_delts_standing_barbell_overhead_press": {
    "name": "Overhead Press (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.4,
      "trapezius": 0.3,
      "abs": 0.3
    }
  },
  "front_delts_z_press": {
    "name": "Z-Press (Barbell)",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "abs": 0.5,
      "trapezius": 0.3
    }
  },
  "front_delts_half_kneeling_landmine_shoulder_press": {
    "name": "Half-Kneeling Shoulder Press (Landmine)",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.5,
      "triceps": 0.4,
      "serratus": 0.3,
      "obliques": 0.3
    }
  },
  "front_delts_front_raise_band": {
    "name": "Front Raise (Band)",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.3,
      "trapezius": 0.2
    }
  },
  "front_delts_front_raise_barbell": {
    "name": "Front Raise (Barbell)",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.4,
      "trapezius": 0.2
    }
  },
  "front_delts_front_raise_cable": {
    "name": "Front Raise (Cable)",
    "tier": "A Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.4,
      "trapezius": 0.2
    }
  },
  "front_delts_front_raise_suspension": {
    "name": "Front Raise (Suspension)",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.4,
      "upper-back": 0.3,
      "abs": 0.3
    }
  },
  "front_delts_handstand_hold": {
    "name": "Handstand Hold",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "triceps": 0.5,
      "abs": 0.4
    }
  },
  "front_delts_handstand_push_up": {
    "name": "Handstand Push Up",
    "tier": "A Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.6,
      "trapezius": 0.5,
      "chest": 0.3,
      "abs": 0.4
    }
  },
  "front_delts_kettlebell_shoulder_press": {
    "name": "Kettlebell Shoulder Press",
    "tier": "A Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "serratus": 0.3,
      "obliques": 0.3
    }
  },
  "front_delts_overhead_press_smith_machine": {
    "name": "Overhead Press (Smith Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.4
    }
  },
  "front_delts_pike_pushup": {
    "name": "Pike Pushup",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.4,
      "trapezius": 0.3
    }
  },
  "front_delts_plate_front_raise": {
    "name": "Plate Front Raise",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "chest": 0.4,
      "trapezius": 0.3,
      "forearm": 0.2
    }
  },
  "front_delts_press_under": {
    "name": "Press Under",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "triceps": 0.5,
      "quadriceps": 0.4,
      "upper-back": 0.4
    }
  },
  "front_delts_seated_overhead_press_dumbbell": {
    "name": "Seated Overhead Press (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "triceps": 0.5,
      "chest": 0.3,
      "trapezius": 0.3
    }
  },
  "front_delts_shoulder_taps": {
    "name": "Shoulder Taps",
    "tier": "C Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "abs": 0.6,
      "obliques": 0.5,
      "serratus": 0.4,
      "triceps": 0.3
    }
  },
  "front_delts_overhead_plate_raise": {
    "name": "Overhead Plate Raise",
    "tier": "B Tier",
    "pattern": "Push (Vertical / Overhead)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.5,
      "serratus": 0.3
    }
  },
  "side_delts_dumbbell_lateral_raises": {
    "name": "Lateral Raise (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.3,
      "forearm": 0.2
    }
  },
  "side_delts_cable_lateral_raises": {
    "name": "Lateral Raise (Cable)",
    "tier": "S Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.3
    }
  },
  "side_delts_machine_lateral_raise": {
    "name": "Lateral Raise (Machine)",
    "tier": "A+ Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.2
    }
  },
  "side_delts_upright_rows": {
    "name": "Upright Row (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "biceps": 0.3
    }
  },
  "side_delts_lean_away_cable_lateral_raise": {
    "name": "Lean-Away Lateral Raise (Cable)",
    "tier": "S Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.3
    }
  },
  "side_delts_seated_dumbbell_lateral_raise": {
    "name": "Seated Lateral Raise (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.2
    }
  },
  "side_delts_wide_grip_upright_row": {
    "name": "Upright Row (Barbell)",
    "tier": "C Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "forearm": 0.3
    }
  },
  "mid_back_chest_supported_y_raise": {
    "name": "Chest Supported Y Raise (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.7,
      "trapezius": 0.5
    }
  },
  "side_delts_dual_cable_cross_body_lateral_raise": {
    "name": "Cross-Body Lateral Raise (Cable)",
    "tier": "C Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.3
    }
  },
  "side_delts_lu_raise": {
    "name": "Lu Lateral Raise (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "serratus": 0.3
    }
  },
  "side_delts_kneeling_cable_lateral_raise": {
    "name": "Kneeling Lateral Raise (Cable)",
    "tier": "S Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.2
    }
  },
  "side_delts_bottoms_up_kettlebell_lateral_raise": {
    "name": "Bottoms-Up Lateral Raise (Kettlebell)",
    "tier": "B Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "forearm": 0.4,
      "trapezius": 0.3
    }
  },
  "side_delts_seated_chest_supported_lateral_raise": {
    "name": "Chest Supported Lateral Raise (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.2
    }
  },
  "side_delts_lateral_raise_band": {
    "name": "Lateral Raise (Band)",
    "tier": "B Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.3
    }
  },
  "side_delts_standing_y_raise_cable": {
    "name": "Standing Y Raise (Cable)",
    "tier": "A+ Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.6,
      "trapezius": 0.5
    }
  },
  "side_delts_upright_row_cable": {
    "name": "Upright Row (Cable)",
    "tier": "A+ Tier",
    "pattern": "Shoulder Abduction (Isolation)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.6,
      "biceps": 0.3
    }
  },
  "rear_delts_reverse_pec_deck": {
    "name": "Rear Delt Reverse Fly (Machine)",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.5,
      "trapezius": 0.2
    }
  },
  "rear_delts_face_pulls": {
    "name": "Face Pull",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.6,
      "trapezius": 0.4,
      "forearm": 0.2
    }
  },
  "rear_delts_rear_delt_dumbbell_flyes": {
    "name": "Rear Delt Reverse Fly (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.5,
      "trapezius": 0.3,
      "lower-back": 0.2
    }
  },
  "rear_delts_rear_delt_cable_flyes": {
    "name": "Rear Delt Reverse Fly (Cable)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.5,
      "trapezius": 0.2
    }
  },
  "rear_delts_high_cable_rear_delt_row": {
    "name": "High Rear Delt Row (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.6,
      "trapezius": 0.4,
      "biceps": 0.3
    }
  },
  "rear_delts_incline_rear_delt_dumbbell_fly": {
    "name": "Chest Supported Reverse Fly (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.5,
      "trapezius": 0.2
    }
  },
  "upper_traps_cable_rope_face_pull_overhead_reach": {
    "name": "Face Pull with Overhead Reach (Cable)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.7,
      "trapezius": 0.5
    }
  },
  "rear_delts_prone_incline_rear_delt_w_raise": {
    "name": "Incline W-Raise (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.6,
      "trapezius": 0.3
    }
  },
  "rear_delts_single_arm_cable_rear_delt_pull": {
    "name": "Reverse Fly Single Arm (Cable)",
    "tier": "B Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.4,
      "triceps": 0.2
    }
  },
  "rear_delts_skiier_rear_delt_swings": {
    "name": "Skier Rear Delt Swing (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.4,
      "triceps": 0.3
    }
  },
  "shoulders_cable_external_shoulder_rotation": {
    "name": "External Shoulder Rotation (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "upper-back": 0.3
    }
  },
  "shoulders_cuban_press": {
    "name": "Cuban Press (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.4,
      "upper-back": 0.4
    }
  },
  "traps_cable_shrugs": {
    "name": "Shrug (Cable)",
    "tier": "A+ Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.4,
      "forearm": 0.3
    }
  },
  "traps_barbell_shrugs": {
    "name": "Shrug (Barbell)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.4,
      "forearm": 0.4
    }
  },
  "traps_dumbbell_shrugs": {
    "name": "Shrug (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.4,
      "forearm": 0.4
    }
  },
  "neck_flexors_neck_curl": {
    "name": "Lying Neck Curls (Weighted)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "abs": 0.2
    }
  },
  "neck_extensors_neck_extension": {
    "name": "Lying Neck Extension (Weighted)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.3
    }
  },
  "mid_back_kelso_shrug": {
    "name": "Kelso Shrug (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "upper-back": 1,
      "trapezius": 0.7,
      "deltoids": 0.3,
      "forearm": 0.3
    }
  },
  "mid_back_incline_prone_dumbbell_shrug": {
    "name": "Prone Incline Shrug (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.7,
      "deltoids": 0.2,
      "forearm": 0.3
    }
  },
  "upper_traps_behind_the_back_smith_machine_shrug": {
    "name": "Shrug (Smith Machine)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.5,
      "forearm": 0.3
    }
  },
  "upper_traps_deadlift_high_pull": {
    "name": "Deadlift High Pull",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "hamstring": 0.7,
      "gluteal": 0.7,
      "deltoids": 0.6,
      "lower-back": 0.6,
      "forearm": 0.4
    }
  },
  "upper_traps_jump_shrug": {
    "name": "Jump Shrug",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "gluteal": 0.6,
      "quadriceps": 0.5,
      "hamstring": 0.5,
      "calves": 0.4,
      "forearm": 0.4
    }
  },
  "upper_traps_kettlebell_high_pull": {
    "name": "Kettlebell High Pull",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "gluteal": 0.6,
      "deltoids": 0.6,
      "hamstring": 0.5,
      "lower-back": 0.4
    }
  },
  "upper_traps_lying_neck_curls": {
    "name": "Lying Neck Curls",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "abs": 0.1
    }
  },
  "upper_traps_lying_neck_extension": {
    "name": "Lying Neck Extension",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.2
    }
  },
  "upper_traps_shrug_machine": {
    "name": "Shrug (Machine)",
    "tier": "A+ Tier",
    "pattern": "Other",
    "weights": {
      "trapezius": 1,
      "upper-back": 0.4,
      "forearm": 0.3
    }
  },
  "lat_width_lat_pulldowns_standard": {
    "name": "Lat Pulldown (Cable)",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3,
      "forearm": 0.2
    }
  },
  "lat_width_neutral_grip_lat_pulldowns": {
    "name": "Lat Pulldown - Close Grip (Cable)",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.5,
      "deltoids": 0.3,
      "forearm": 0.2
    }
  },
  "lat_width_pull_ups_chin_ups": {
    "name": "Pull Up",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.5,
      "deltoids": 0.3,
      "abs": 0.3,
      "forearm": 0.3
    }
  },
  "lat_width_single_arm_cable_rows_low_pull": {
    "name": "Single Arm Cable Row",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "biceps": 0.4
    }
  },
  "lat_width_straight_arm_cable_pulldown": {
    "name": "Straight Arm Lat Pulldown (Cable)",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "triceps": 0.4,
      "chest": 0.3,
      "serratus": 0.3,
      "abs": 0.3
    }
  },
  "lat_width_single_arm_dumbbell_row": {
    "name": "Dumbbell Row",
    "tier": "A+ Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "forearm": 0.3
    }
  },
  "lat_width__lats__assisted_chin_ups": {
    "name": "Chin Up (Assisted)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.6,
      "deltoids": 0.3
    }
  },
  "lat_width__lats__kneeling_cable_lat_pulldown": {
    "name": "Kneeling Lat Pulldown (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lat_width__lats__reverse_grip_lat_pulldown": {
    "name": "Reverse Grip Lat Pulldown (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.6,
      "deltoids": 0.3
    }
  },
  "lat_width__lats__single_arm_lat_pulldown": {
    "name": "Single Arm Lat Pulldown",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "obliques": 0.2
    }
  },
  "lat_width__lats__wide_grip_pull_ups": {
    "name": "Wide Pull Up",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3,
      "forearm": 0.3
    }
  },
  "lat_med_tricep__lateral___medial_head__rope_lat_pushdown": {
    "name": "Rope Straight Arm Pulldown",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "triceps": 0.4,
      "serratus": 0.3,
      "chest": 0.3,
      "abs": 0.2
    }
  },
  "lat_width_single_arm_iliac_lat_pulldown": {
    "name": "Iliac Lat Pulldown (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "obliques": 0.2
    }
  },
  "lat_width_lat_prayer_cable_pullover": {
    "name": "Lat Prayer (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "triceps": 0.4,
      "chest": 0.3,
      "serratus": 0.3,
      "abs": 0.3
    }
  },
  "lat_width_half_kneeling_single_arm_lat_pulldown": {
    "name": "Half-Kneeling Lat Pulldown (Cable)",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.2
    }
  },
  "lat_width_meadows_single_arm_lat_pulldown": {
    "name": "Meadows Lat Pulldown (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "forearm": 0.3
    }
  },
  "lat_width_cross_body_cable_lat_extension": {
    "name": "Cross-Body Lat Extension (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "triceps": 0.3
    }
  },
  "forearms_towel_grip_pull_ups": {
    "name": "Towel Grip Pull Up",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "forearm": 0.8,
      "biceps": 0.5
    }
  },
  "lat_width_lats_chin_up": {
    "name": "Chin Up",
    "tier": "A+ Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.6,
      "deltoids": 0.3,
      "abs": 0.3
    }
  },
  "lat_width_lats_chin_up_weighted": {
    "name": "Chin Up (Weighted)",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.6,
      "forearm": 0.3,
      "abs": 0.3
    }
  },
  "lat_width_lats_front_lever_hold": {
    "name": "Front Lever Hold",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "abs": 0.7,
      "triceps": 0.5,
      "deltoids": 0.4
    }
  },
  "lat_width_lats_front_lever_raise": {
    "name": "Front Lever Raise",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "abs": 0.7,
      "triceps": 0.5,
      "deltoids": 0.4
    }
  },
  "lat_width_lats_iso_lateral_high_row_machine": {
    "name": "Iso-Lateral High Row (Machine)",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.4
    }
  },
  "lat_width_lats_kipping_pull_up": {
    "name": "Kipping Pull Up",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.3,
      "forearm": 0.4,
      "abs": 0.3
    }
  },
  "lat_width_lats_kneeling_pulldown_band": {
    "name": "Kneeling Pulldown (Band)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.3
    }
  },
  "lat_width_lats_lat_pulldown_band": {
    "name": "Lat Pulldown (Band)",
    "tier": "C Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.3
    }
  },
  "lat_width_lats_lat_pulldown_machine": {
    "name": "Lat Pulldown (Machine)",
    "tier": "A+ Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lat_width_lats_muscle_up": {
    "name": "Muscle Up",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "chest": 0.7,
      "triceps": 0.7,
      "deltoids": 0.5,
      "biceps": 0.4,
      "abs": 0.4
    }
  },
  "lat_width_lats_negative_pull_up": {
    "name": "Negative Pull Up",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.5,
      "forearm": 0.3
    }
  },
  "lat_width_lats_pull_up_assisted": {
    "name": "Pull Up (Assisted)",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lat_width_lats_pull_up_band": {
    "name": "Pull Up (Band)",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3
    }
  },
  "lat_width_lats_pull_up_weighted": {
    "name": "Pull Up (Weighted)",
    "tier": "S Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.5,
      "deltoids": 0.3,
      "forearm": 0.4,
      "abs": 0.3
    }
  },
  "lat_width_lats_ring_pull_up": {
    "name": "Ring Pull Up",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.5,
      "deltoids": 0.3,
      "forearm": 0.3
    }
  },
  "lat_width_lats_scapular_pull_ups": {
    "name": "Scapular Pull Ups",
    "tier": "B Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "serratus": 0.4,
      "forearm": 0.3
    }
  },
  "lat_width_lats_sternum_pull_up_gironda": {
    "name": "Sternum Pull Up (Gironda)",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.5
    }
  },
  "lat_width_lats_vertical_traction_machine": {
    "name": "Vertical Traction (Machine)",
    "tier": "A Tier",
    "pattern": "Pull (Vertical)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4
    }
  },
  "mid_back_chest_supported_t_bar_row": {
    "name": "Chest Supported T Bar Row",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_barbell_bent_over_row": {
    "name": "Bent Over Row (Barbell)",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.6,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.4,
      "forearm": 0.3
    }
  },
  "mid_back_seated_cable_rows": {
    "name": "Seated Cable Row - V Grip (Cable)",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "biceps": 0.4,
      "lower-back": 0.3,
      "trapezius": 0.3
    }
  },
  "mid_back_conventional_barbell_deadlift": {
    "name": "Deadlift (Barbell)",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.8,
      "upper-back": 0.6,
      "trapezius": 0.5,
      "quadriceps": 0.4,
      "forearm": 0.4
    }
  },
  "mid_back_chest_supported_dumbbell_row": {
    "name": "Chest Supported Incline Row (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_hammer_strength_row": {
    "name": "Iso-Lateral Row (Machine)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_landmine_t_bar_row": {
    "name": "Landmine Row",
    "tier": "B Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.6,
      "deltoids": 0.4,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_machine_seated_row": {
    "name": "Seated Row (Machine)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_meadows_row": {
    "name": "Meadows Rows (Barbell)",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.6,
      "forearm": 0.5,
      "biceps": 0.4,
      "trapezius": 0.4,
      "lower-back": 0.3
    }
  },
  "mid_back_seal_row": {
    "name": "Seal Row (Barbell)",
    "tier": "S Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_two_arm_dumbbell_row": {
    "name": "Bent Over Row (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.5,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_wide_grip_seated_row": {
    "name": "Seated Cable Row - Bar Grip",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.6,
      "trapezius": 0.4,
      "biceps": 0.4,
      "lower-back": 0.3
    }
  },
  "mid_back_seal_row_bench_elevated": {
    "name": "Seal Row (Dumbbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_fat_gripz_barbell_bent_over_row": {
    "name": "Bent Over Row - Fat Gripz (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "forearm": 0.7,
      "lower-back": 0.6,
      "deltoids": 0.4,
      "biceps": 0.4
    }
  },
  "mid_back_wide_grip_seated_cable_row_to_sternum": {
    "name": "Seated Cable Row - Bar Wide Grip",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.7,
      "trapezius": 0.5,
      "biceps": 0.4
    }
  },
  "mid_back_landmine_single_arm_meadows_row": {
    "name": "Meadows Row (Landmine)",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.6,
      "forearm": 0.5,
      "trapezius": 0.4
    }
  },
  "mid_back_batwing_row": {
    "name": "Batwing Row (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "trapezius": 0.4,
      "biceps": 0.4
    }
  },
  "mid_back_band_pullaparts": {
    "name": "Band Pullaparts",
    "tier": "B Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.8,
      "trapezius": 0.4
    }
  },
  "mid_back_bent_over_row_band": {
    "name": "Bent Over Row (Band)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.4,
      "biceps": 0.3,
      "lower-back": 0.3
    }
  },
  "mid_back_bent_over_row_smith_machine": {
    "name": "Bent Over Row (Smith Machine)",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.5,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3
    }
  },
  "mid_back_gorilla_row_kettlebell": {
    "name": "Gorilla Row (Kettlebell)",
    "tier": "B Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.5,
      "gluteal": 0.4,
      "deltoids": 0.4,
      "biceps": 0.4,
      "obliques": 0.3
    }
  },
  "mid_back_inverted_row": {
    "name": "Inverted Row",
    "tier": "A Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.3,
      "abs": 0.3
    }
  },
  "mid_back_iso_lateral_low_row": {
    "name": "Iso-Lateral Low Row",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "biceps": 0.4,
      "deltoids": 0.3
    }
  },
  "mid_back_low_row_suspension": {
    "name": "Low Row (Suspension)",
    "tier": "B Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.5,
      "biceps": 0.4,
      "abs": 0.3
    }
  },
  "mid_back_pendlay_row_barbell": {
    "name": "Pendlay Row (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.6,
      "deltoids": 0.5,
      "trapezius": 0.4,
      "biceps": 0.4,
      "hamstring": 0.3
    }
  },
  "mid_back_renegade_row_dumbbell": {
    "name": "Renegade Row (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "abs": 0.7,
      "obliques": 0.7,
      "chest": 0.4,
      "deltoids": 0.4,
      "biceps": 0.3
    }
  },
  "mid_back_t_bar_row": {
    "name": "T Bar Row",
    "tier": "A+ Tier",
    "pattern": "Pull (Horizontal)",
    "weights": {
      "upper-back": 1,
      "lower-back": 0.6,
      "deltoids": 0.5,
      "biceps": 0.4,
      "trapezius": 0.4
    }
  },
  "short_bicep_standing_ez_bar_curls": {
    "name": "EZ Bar Biceps Curl",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep_alternating_dumbbell_curls_w_supination": {
    "name": "Bicep Curl (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4,
      "deltoids": 0.2
    }
  },
  "short_bicep_preacher_curl": {
    "name": "Preacher Curl (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep_spider_curls": {
    "name": "Spider Curl (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep_concentration_curls": {
    "name": "Concentration Curl",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep__inner_head__machine_preacher_curls": {
    "name": "Preacher Curl (Machine)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep__inner_head__rope_cable_curl": {
    "name": "Rope Cable Curl",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.6
    }
  },
  "short_bicep__inner_head__single_arm_preacher_curl": {
    "name": "Preacher Curl (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep__inner_head__standing_barbell_curls": {
    "name": "Bicep Curl (Barbell)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep__inner_head__standing_cable_curls": {
    "name": "Bicep Curl (Cable)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep_ez_bar_21s": {
    "name": "21s Bicep Curl",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep_hercules_cable_curl": {
    "name": "Overhead Curl (Cable)",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep_fat_gripz_dumbbell_preacher_curl": {
    "name": "Preacher Curl - Fat Gripz (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.6
    }
  },
  "short_bicep_inner_head_bicep_curl_machine": {
    "name": "Bicep Curl (Machine)",
    "tier": "A+ Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep_inner_head_bicep_curl_suspension": {
    "name": "Bicep Curl (Suspension)",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "abs": 0.3,
      "forearm": 0.3
    }
  },
  "short_bicep_inner_head_kettlebell_curl": {
    "name": "Kettlebell Curl",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.4
    }
  },
  "short_bicep_inner_head_single_arm_curl_cable": {
    "name": "Single Arm Curl (Cable)",
    "tier": "A+ Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "short_bicep_inner_head_waiter_curl_dumbbell": {
    "name": "Waiter Curl (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3,
      "deltoids": 0.2
    }
  },
  "short_bicep_biceps_spider_curl_barbell": {
    "name": "Spider Curl (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "long_bicep_incline_dumbbell_curls": {
    "name": "Seated Incline Curl (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "long_bicep_face_away_cable_curls": {
    "name": "Behind the Back Curl (Cable)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.3
    }
  },
  "long_bicep__outer_peak__drag_curls": {
    "name": "Drag Curl",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "deltoids": 0.4,
      "forearm": 0.4
    }
  },
  "brachialis_dumbbell_hammer_curls": {
    "name": "Hammer Curl (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.8
    }
  },
  "brachialis_cable_hammer_curl": {
    "name": "Hammer Curl (Cable)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.8
    }
  },
  "brachioradialis__upper_forearm__zottman_curl": {
    "name": "Zottman Curl (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.8
    }
  },
  "brachialis_preacher_hammer_curl": {
    "name": "Preacher Hammer Curl (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.7
    }
  },
  "brachialis_cross_body_pinwheel_curl": {
    "name": "Pinwheel Curl (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.9
    }
  },
  "brachialis_cross_body_hammer_curl": {
    "name": "Cross Body Hammer Curl",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.9
    }
  },
  "brachialis_hammer_curl_band": {
    "name": "Hammer Curl (Band)",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.7
    }
  },
  "brachialis_plate_curl": {
    "name": "Plate Curl",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.7
    }
  },
  "brachialis_reverse_grip_concentration_curl": {
    "name": "Reverse Grip Concentration Curl",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.9
    }
  },
  "brachialis_seated_incline_hammer_curl_dumbbell": {
    "name": "Seated Incline Hammer Curl (Dumbbell)",
    "tier": "A+ Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "biceps": 1,
      "forearm": 0.7
    }
  },
  "brachioradialis_reverse_cable_curls": {
    "name": "Reverse Curl (Cable)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "forearm": 1,
      "biceps": 0.8
    }
  },
  "forearm_extensors__outside__dumbbell_farmer_carry": {
    "name": "Farmers Walk",
    "tier": "B Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "forearm": 1,
      "trapezius": 0.8,
      "abs": 0.5,
      "obliques": 0.5,
      "gluteal": 0.4,
      "calves": 0.3
    }
  },
  "brachioradialis__upper_forearm__reverse_dumbbell_curl": {
    "name": "Reverse Curl (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "forearm": 1,
      "biceps": 0.8
    }
  },
  "brachioradialis_forearms_biceps_reverse_curl_barbell": {
    "name": "Reverse Curl (Barbell)",
    "tier": "A Tier",
    "pattern": "Pull (Elbow Flexion)",
    "weights": {
      "forearm": 1,
      "biceps": 0.8
    }
  },
  "forearm_flexors_standing_behind_back_wrist_curls": {
    "name": "Behind the Back Wrist Curl (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearm_flexors_machine_wrist_curls": {
    "name": "Wrist Curl (Machine)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearm_flexors__inside__dumbbell_wrist_curl": {
    "name": "Seated Palms Up Wrist Curl",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearms_dumbbell_finger_curls": {
    "name": "Finger Curl (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearm_flexors_seated_wrist_curl_barbell": {
    "name": "Seated Wrist Curl (Barbell)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearm_extensors_machine_reverse_wrist_curls": {
    "name": "Reverse Wrist Curl (Machine)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearms_reverse_barbell_wrist_curl": {
    "name": "Seated Wrist Extension (Barbell)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "forearm_extensors_reverse_wrist_curl_dumbbell": {
    "name": "Reverse Wrist Curl (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1
    }
  },
  "lat_med_tricep_dual_rope_tricep_pushdowns": {
    "name": "Triceps Rope Pushdown",
    "tier": "S Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "lat_med_tricep_straight_bar_tricep_pushdown": {
    "name": "Triceps Pushdown",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "lat_med_tricep_cable_cross_body_tricep_extensions": {
    "name": "Cross-Body Triceps Extension (Cable)",
    "tier": "S Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "deltoids": 0.2
    }
  },
  "lat_med_tricep_close_grip_barbell_bench_press": {
    "name": "Bench Press - Close Grip (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.7,
      "deltoids": 0.5
    }
  },
  "lat_med_tricep__lateral___medial_head__assisted_tricep_dips": {
    "name": "Triceps Dip (Assisted)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.6,
      "deltoids": 0.4
    }
  },
  "lat_med_tricep__lateral___medial_head__bench_dips": {
    "name": "Bench Dip",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "deltoids": 0.5,
      "chest": 0.4
    }
  },
  "lat_med_tricep__lateral___medial_head__cable_kickback": {
    "name": "Triceps Kickback (Cable)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "deltoids": 0.3
    }
  },
  "lat_med_tricep__lateral___medial_head__dumbbell_tricep_kickbacks": {
    "name": "Triceps Kickback (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "deltoids": 0.3
    }
  },
  "lat_med_tricep__lateral___medial_head__reverse_grip_tricep_pushdown": {
    "name": "Reverse Grip Triceps Pushdown",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "forearm": 0.3
    }
  },
  "lat_med_tricep__lateral___medial_head__single_arm_tricep_pushdown": {
    "name": "Single Arm Triceps Pushdown (Cable)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "lat_med_tricep__lateral___medial_head__tate_press": {
    "name": "Tate Press (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.3,
      "deltoids": 0.2
    }
  },
  "lat_med_tricep__lateral___medial_head__tricep_dips": {
    "name": "Triceps Dip",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.7,
      "deltoids": 0.5
    }
  },
  "lat_med_tricep__lateral___medial_head__v_bar_cable_pushdowns": {
    "name": "Triceps Pressdown",
    "tier": "A Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "lat_med_tricep__lateral___medial_head__weighted_tricep_dips": {
    "name": "Triceps Dip (Weighted)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.7,
      "deltoids": 0.5
    }
  },
  "lat_med_tricep_lateral_medial_head_diamond_push_up": {
    "name": "Diamond Push Up",
    "tier": "A Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.7,
      "deltoids": 0.4,
      "abs": 0.3
    }
  },
  "lat_med_tricep_lateral_medial_head_floor_triceps_dip": {
    "name": "Floor Triceps Dip",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "deltoids": 0.4,
      "chest": 0.3
    }
  },
  "lat_med_tricep_lateral_medial_head_jm_press_barbell": {
    "name": "JM Press (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.4,
      "deltoids": 0.4
    }
  },
  "lat_med_tricep_lateral_medial_head_push_up_close_grip": {
    "name": "Push Up - Close Grip",
    "tier": "B Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.7,
      "deltoids": 0.4,
      "abs": 0.3
    }
  },
  "lat_med_tricep_lateral_medial_head_seated_dip_machine": {
    "name": "Seated Dip Machine",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "chest": 0.6,
      "deltoids": 0.4
    }
  },
  "lat_med_tricep_lateral_medial_head_triceps_extension_machine": {
    "name": "Triceps Extension (Machine)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep_ez_bar_skullcrushers": {
    "name": "Triceps Extension (Barbell)",
    "tier": "S Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "forearm": 0.2
    }
  },
  "long_tricep_overhead_cable_extensions": {
    "name": "Overhead Triceps Extension (Cable)",
    "tier": "S Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "abs": 0.2
    }
  },
  "long_tricep_katana_cable_extensions": {
    "name": "Katana Triceps Extension (Cable)",
    "tier": "S Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep_dumbbell_overhead_triceps_extension": {
    "name": "Triceps Extension (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep__long_head__barbell_skull_crushers": {
    "name": "Skullcrusher (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "forearm": 0.2
    }
  },
  "long_tricep__long_head__cable_french_press": {
    "name": "Triceps Extension (Cable)",
    "tier": "A Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep__long_head__seated_dumbbell_overhead_tricep_extension": {
    "name": "Seated Triceps Press",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep__long_head__single_arm_overhead_cable_extension": {
    "name": "Single Arm Overhead Cable Extension",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep_floor_ez_bar_skull_crusher_dead_stop": {
    "name": "Dead-Stop Skullcrusher (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "upper-back": 0.2
    }
  },
  "long_tricep_incline_cable_skull_crusher_30_deg": {
    "name": "Incline Skullcrusher (Cable)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "lat_med_tricep_barbell_bodyweight_tricep_extension": {
    "name": "Bodyweight Triceps Extension (Barbell)",
    "tier": "C Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "abs": 0.4,
      "upper-back": 0.2
    }
  },
  "long_tricep_long_head_single_arm_tricep_extension_dumbbell": {
    "name": "Single Arm Tricep Extension (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep_long_head_skullcrusher_dumbbell": {
    "name": "Skullcrusher (Dumbbell)",
    "tier": "A+ Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1
    }
  },
  "long_tricep_long_head_triceps_extension_suspension": {
    "name": "Triceps Extension (Suspension)",
    "tier": "B Tier",
    "pattern": "Push (Elbow Extension)",
    "weights": {
      "triceps": 1,
      "abs": 0.4
    }
  },
  "quads_barbell_back_squat": {
    "name": "Squat (Barbell)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.6,
      "lower-back": 0.5,
      "abs": 0.3
    }
  },
  "quads_hack_squats": {
    "name": "Hack Squat (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4
    }
  },
  "quads_45_degree_leg_press": {
    "name": "Leg Press (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.5
    }
  },
  "quads_leg_extensions": {
    "name": "Leg Extension (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "tibialis": 0.1
    }
  },
  "quads_bulgarian_split_squats": {
    "name": "Bulgarian Split Squat (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.5,
      "forearm": 0.3
    }
  },
  "quad_teardrop_heel_elevated_goblet_squats": {
    "name": "Heel-Elevated Goblet Squat (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "abs": 0.4,
      "upper-back": 0.3,
      "biceps": 0.2
    }
  },
  "glutes_quads_dumbbell_walking_reverse_lunges": {
    "name": "Reverse Lunge (Dumbbell)",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4,
      "forearm": 0.3
    }
  },
  "quad_teardrop__vmo__pendulum_squat": {
    "name": "Pendulum Squat (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4
    }
  },
  "quads_glutes__compound_leg_focus__barbell_reverse_lunge": {
    "name": "Reverse Lunge (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4,
      "lower-back": 0.3
    }
  },
  "quads_glutes__compound_leg_focus__dumbbell_goblet_squat": {
    "name": "Goblet Squat",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4,
      "abs": 0.4,
      "upper-back": 0.3
    }
  },
  "quads_glutes__compound_leg_focus__dumbbell_step_ups": {
    "name": "Dumbbell Step Up",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "forearm": 0.3,
      "calves": 0.2
    }
  },
  "quads_glutes__compound_leg_focus__dumbbell_walking_lunges": {
    "name": "Walking Lunge (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4,
      "forearm": 0.3,
      "hamstring": 0.2
    }
  },
  "quads_glutes__compound_leg_focus__forward_lunges": {
    "name": "Lunge",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.4
    }
  },
  "quads_glutes__compound_leg_focus__kettlebell_goblet_squat": {
    "name": "Kettlebell Goblet Squat",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4,
      "abs": 0.4,
      "upper-back": 0.3
    }
  },
  "quads_glutes__compound_leg_focus__reverse_lunge": {
    "name": "Reverse Lunge",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4
    }
  },
  "quads_glutes__compound_leg_focus__single_leg_press": {
    "name": "Single Leg Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4
    }
  },
  "quads_glutes__compound_leg_focus__smith_machine_squat": {
    "name": "Squat (Smith Machine)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.5,
      "lower-back": 0.3
    }
  },
  "quads_glutes__compound_leg_focus__spanish_squat": {
    "name": "Spanish Squat (Band)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.4,
      "abs": 0.2
    }
  },
  "quads_glutes__compound_leg_focus__split_squat": {
    "name": "Split Squat (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.4,
      "forearm": 0.3
    }
  },
  "quads_glutes__compound_leg_focus__step_ups": {
    "name": "Step Up",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.2
    }
  },
  "quads_glutes__compound_leg_focus__walking_lunge": {
    "name": "Walking Lunge",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.4
    }
  },
  "quads_glutes__compound_leg_focus__zercher_squat": {
    "name": "Zercher Squat",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "upper-back": 0.7,
      "lower-back": 0.6,
      "abs": 0.6,
      "biceps": 0.5,
      "adductors": 0.5
    }
  },
  "quads_belt_squat": {
    "name": "Belt Squat (Machine)",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.5
    }
  },
  "quads_bulgarian_split_squat_front_foot_elevated": {
    "name": "Bulgarian Split Squat (Barbell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "adductors": 0.5,
      "lower-back": 0.3
    }
  },
  "quads_cyclist_squat_heels_high_wedge": {
    "name": "Cyclist Squat (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.4,
      "forearm": 0.3,
      "lower-back": 0.3
    }
  },
  "quads_high_box_step_up": {
    "name": "High Box Step Up",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "adductors": 0.4
    }
  },
  "quads_assisted_pistol_squats": {
    "name": "Assisted Pistol Squats",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "tibialis": 0.3
    }
  },
  "quads_box_jump": {
    "name": "Box Jump",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.5,
      "hamstring": 0.3
    }
  },
  "quads_box_squat_barbell": {
    "name": "Box Squat (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.6,
      "lower-back": 0.6,
      "hamstring": 0.3
    }
  },
  "quads_front_squat": {
    "name": "Front Squat",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "upper-back": 0.6,
      "lower-back": 0.5,
      "adductors": 0.5,
      "abs": 0.5
    }
  },
  "quads_full_squat": {
    "name": "Full Squat",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "adductors": 0.7,
      "lower-back": 0.5,
      "abs": 0.4
    }
  },
  "quads_hack_squat": {
    "name": "Hack Squat",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "lower-back": 0.5,
      "forearm": 0.4,
      "trapezius": 0.3
    }
  },
  "quads_jump_squat": {
    "name": "Jump Squat",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.5
    }
  },
  "quads_jumping_lunge": {
    "name": "Jumping Lunge",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.5
    }
  },
  "quads_landmine_squat_and_press": {
    "name": "Landmine Squat and Press",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "deltoids": 0.8,
      "gluteal": 0.7,
      "chest": 0.4,
      "triceps": 0.4,
      "abs": 0.4
    }
  },
  "quads_lateral_box_jump": {
    "name": "Lateral Box Jump",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.5,
      "calves": 0.5
    }
  },
  "quads_lateral_lunge": {
    "name": "Lateral Lunge",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.7
    }
  },
  "quads_lateral_squat": {
    "name": "Lateral Squat",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.7
    }
  },
  "quads_leg_press_horizontal_machine": {
    "name": "Leg Press Horizontal (Machine)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "adductors": 0.4
    }
  },
  "quads_lunge_barbell": {
    "name": "Lunge (Barbell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4,
      "lower-back": 0.3
    }
  },
  "quads_lunge_dumbbell": {
    "name": "Lunge (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.4,
      "forearm": 0.3
    }
  },
  "quads_overhead_dumbbell_lunge": {
    "name": "Overhead Dumbbell Lunge",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "deltoids": 0.5,
      "trapezius": 0.5,
      "abs": 0.5
    }
  },
  "quads_overhead_squat": {
    "name": "Overhead Squat",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "upper-back": 0.6,
      "trapezius": 0.6,
      "deltoids": 0.5,
      "lower-back": 0.5,
      "abs": 0.5
    }
  },
  "quads_pause_squat_barbell": {
    "name": "Pause Squat (Barbell)",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "adductors": 0.7,
      "lower-back": 0.6,
      "abs": 0.4
    }
  },
  "quads_pistol_squat": {
    "name": "Pistol Squat",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "abs": 0.4,
      "tibialis": 0.4
    }
  },
  "quads_single_leg_extensions": {
    "name": "Single Leg Extensions",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "tibialis": 0.1
    }
  },
  "quads_sissy_squat_weighted": {
    "name": "Sissy Squat (Weighted)",
    "tier": "A+ Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "abs": 0.3,
      "calves": 0.2
    }
  },
  "quads_sled_pull": {
    "name": "Sled Pull",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "tibialis": 0.4,
      "gluteal": 0.4,
      "upper-back": 0.3,
      "forearm": 0.3
    }
  },
  "quads_sled_push": {
    "name": "Sled Push",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.6,
      "deltoids": 0.4,
      "abs": 0.4
    }
  },
  "quads_squat_band": {
    "name": "Squat (Band)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "adductors": 0.3
    }
  },
  "quads_squat_bodyweight": {
    "name": "Squat (Bodyweight)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "adductors": 0.3
    }
  },
  "quads_squat_dumbbell": {
    "name": "Squat (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.4,
      "forearm": 0.4,
      "lower-back": 0.3
    }
  },
  "quads_squat_machine": {
    "name": "Squat (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.5
    }
  },
  "quads_squat_suspension": {
    "name": "Squat (Suspension)",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "upper-back": 0.2
    }
  },
  "quads_squat_row": {
    "name": "Squat Row",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "upper-back": 0.8,
      "gluteal": 0.6,
      "biceps": 0.3
    }
  },
  "quads_sumo_squat": {
    "name": "Sumo Squat",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.7
    }
  },
  "quads_sumo_squat_barbell": {
    "name": "Sumo Squat (Barbell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.8,
      "lower-back": 0.5
    }
  },
  "quads_sumo_squat_dumbbell": {
    "name": "Sumo Squat (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.8,
      "forearm": 0.3,
      "lower-back": 0.3
    }
  },
  "quads_sumo_squat_kettlebell": {
    "name": "Sumo Squat (Kettlebell)",
    "tier": "A Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.8,
      "forearm": 0.3,
      "lower-back": 0.3
    }
  },
  "quads_thruster_barbell": {
    "name": "Thruster (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "deltoids": 0.9,
      "gluteal": 0.7,
      "triceps": 0.5,
      "trapezius": 0.4,
      "abs": 0.4
    }
  },
  "quads_thruster_kettlebell": {
    "name": "Thruster (Kettlebell)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "deltoids": 0.9,
      "gluteal": 0.7,
      "triceps": 0.5,
      "abs": 0.4
    }
  },
  "quads_walking_lunge_sandbag": {
    "name": "Walking Lunge (Sandbag)",
    "tier": "B Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "obliques": 0.4,
      "abs": 0.4,
      "trapezius": 0.4
    }
  },
  "quads_wall_ball": {
    "name": "Wall Ball",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "deltoids": 0.7,
      "gluteal": 0.7,
      "triceps": 0.4,
      "abs": 0.3
    }
  },
  "quads_wall_sit": {
    "name": "Wall Sit",
    "tier": "C Tier",
    "pattern": "Legs (Anterior / Knee Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.3,
      "calves": 0.2
    }
  },
  "hamstrings_romanian_deadlifts_rdls": {
    "name": "Romanian Deadlift (Barbell)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.7,
      "adductors": 0.5,
      "forearm": 0.4,
      "trapezius": 0.4,
      "upper-back": 0.3
    }
  },
  "hamstrings_seated_leg_curls": {
    "name": "Seated Leg Curl (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "calves": 0.3,
      "tibialis": 0.1
    }
  },
  "hamstrings_lying_leg_curls": {
    "name": "Lying Leg Curl (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "calves": 0.3,
      "gluteal": 0.2
    }
  },
  "glutes_hams_barbell_good_morning": {
    "name": "Good Morning (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "lower-back": 0.9,
      "gluteal": 0.8,
      "adductors": 0.4,
      "abs": 0.3
    }
  },
  "glutes_hams_nordic_hamstring_curls": {
    "name": "Nordic Hamstrings Curls",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "calves": 0.4,
      "gluteal": 0.3,
      "lower-back": 0.2
    }
  },
  "glutes_hams_single_leg_rdl": {
    "name": "Single Leg Romanian Deadlift (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.5,
      "forearm": 0.3
    }
  },
  "glutes_hams_standing_leg_curl": {
    "name": "Standing Leg Curls",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "calves": 0.3
    }
  },
  "glutes_hams_stiff_leg_barbell_deadlift": {
    "name": "Straight Leg Deadlift",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "lower-back": 0.8,
      "gluteal": 0.8,
      "adductors": 0.4,
      "forearm": 0.4,
      "trapezius": 0.4
    }
  },
  "hamstrings_b_stance_romanian_deadlift": {
    "name": "B-Stance Romanian Deadlift (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.6,
      "forearm": 0.3
    }
  },
  "lower_back_snatch_grip_romanian_deadlift": {
    "name": "Snatch Grip Romanian Deadlift (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.8,
      "upper-back": 0.6,
      "trapezius": 0.6,
      "forearm": 0.5
    }
  },
  "lower_back_zercher_good_morning": {
    "name": "Good Morning - Zercher (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "lower-back": 0.9,
      "gluteal": 0.8,
      "upper-back": 0.7,
      "abs": 0.6,
      "biceps": 0.5
    }
  },
  "hamstrings_deficit_romanian_deadlift": {
    "name": "Deficit Romanian Deadlift (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.8,
      "adductors": 0.5,
      "forearm": 0.4
    }
  },
  "hamstrings_single_leg_kettlebell_rdl": {
    "name": "Single Leg Romanian Deadlift (Kettlebell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.5,
      "forearm": 0.3
    }
  },
  "hamstrings_glute_ham_raise_ghr": {
    "name": "Glute Ham Raise",
    "tier": "A+ Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.6,
      "calves": 0.5,
      "lower-back": 0.5
    }
  },
  "hamstrings_swiss_ball_leg_curl": {
    "name": "Leg Curl (Swiss Ball)",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.6,
      "lower-back": 0.4,
      "calves": 0.3,
      "abs": 0.3
    }
  },
  "hamstrings_romanian_deadlift_dumbbell": {
    "name": "Romanian Deadlift (Dumbbell)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.6,
      "adductors": 0.4,
      "forearm": 0.4,
      "trapezius": 0.3
    }
  },
  "hamstrings_romanian_deadlift_smith_machine": {
    "name": "Romanian Deadlift (Smith Machine)",
    "tier": "A+ Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.6,
      "adductors": 0.4,
      "forearm": 0.3
    }
  },
  "hamstrings_single_leg_romanian_deadlift_barbell": {
    "name": "Single Leg Romanian Deadlift (Barbell)",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.6,
      "forearm": 0.4
    }
  },
  "hamstrings_sumo_deadlift": {
    "name": "Sumo Deadlift",
    "tier": "A+ Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "quadriceps": 0.7,
      "adductors": 0.7,
      "lower-back": 0.6,
      "trapezius": 0.5,
      "forearm": 0.4
    }
  },
  "glutes_barbell_hip_thrust": {
    "name": "Hip Thrust (Barbell)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "adductors": 0.4,
      "quadriceps": 0.3,
      "lower-back": 0.3
    }
  },
  "glutes_cable_glute_kickbacks": {
    "name": "Standing Cable Glute Kickbacks",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "lower-back": 0.2
    }
  },
  "glutes_hams_american_kettlebell_swing": {
    "name": "Kettlebell Swing",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "lower-back": 0.6,
      "deltoids": 0.4,
      "trapezius": 0.4,
      "forearm": 0.4
    }
  },
  "glutes_abductors__outer_glutes__glute_bridge": {
    "name": "Glute Bridge",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "lower-back": 0.2,
      "quadriceps": 0.2
    }
  },
  "glutes_abductors__outer_glutes__single_leg_hip_thrust": {
    "name": "Single Leg Hip Thrust",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "quadriceps": 0.3
    }
  },
  "glutes_single_leg_hip_thrust": {
    "name": "Single Leg Hip Thrust (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "quadriceps": 0.3
    }
  },
  "glutes_cable_pull_through": {
    "name": "Cable Pull Through",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.7,
      "lower-back": 0.5,
      "adductors": 0.3
    }
  },
  "glutes_frog_pumps": {
    "name": "Frog Pumps (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "adductors": 0.3
    }
  },
  "glutes_eccentric_step_down": {
    "name": "Eccentric Step Down",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.2
    }
  },
  "glutes_glute_bridge_barbell": {
    "name": "Glute Bridge (Barbell)",
    "tier": "A Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "adductors": 0.3,
      "quadriceps": 0.2,
      "lower-back": 0.2
    }
  },
  "glutes_glute_kickback_machine": {
    "name": "Glute Kickback (Machine)",
    "tier": "A+ Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "quadriceps": 0.3
    }
  },
  "glutes_glute_kickback_on_floor": {
    "name": "Glute Kickback on Floor",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.3,
      "lower-back": 0.2,
      "abs": 0.2
    }
  },
  "glutes_hip_thrust": {
    "name": "Hip Thrust",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "quadriceps": 0.2,
      "lower-back": 0.2
    }
  },
  "glutes_hip_thrust_dumbbell": {
    "name": "Hip Thrust (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "adductors": 0.3,
      "quadriceps": 0.3,
      "lower-back": 0.2
    }
  },
  "glutes_hip_thrust_machine": {
    "name": "Hip Thrust (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "adductors": 0.4,
      "quadriceps": 0.3,
      "lower-back": 0.2
    }
  },
  "glutes_hip_thrust_smith_machine": {
    "name": "Hip Thrust (Smith Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "adductors": 0.4,
      "quadriceps": 0.3,
      "lower-back": 0.2
    }
  },
  "glutes_partial_glute_bridge_barbell": {
    "name": "Partial Glute Bridge (Barbell)",
    "tier": "A Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.2,
      "lower-back": 0.2
    }
  },
  "glutes_rear_kick_machine": {
    "name": "Rear Kick (Machine)",
    "tier": "A Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.4,
      "quadriceps": 0.3
    }
  },
  "glutes_single_leg_glute_bridge": {
    "name": "Single Leg Glute Bridge",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.5,
      "lower-back": 0.3
    }
  },
  "glutes_abductors_seated_machine_abductions": {
    "name": "Hip Abduction (Machine)",
    "tier": "S Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1
    }
  },
  "glutes_curtsy_lunge": {
    "name": "Curtsy Lunge (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "quadriceps": 0.9,
      "adductors": 0.4,
      "forearm": 0.2
    }
  },
  "glutes_abductors_outer_glutes_clamshell": {
    "name": "Clamshell",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1
    }
  },
  "glutes_abductors_outer_glutes_fire_hydrants": {
    "name": "Fire Hydrants",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "abs": 0.2
    }
  },
  "glutes_abductors_outer_glutes_hip_abduction_cable": {
    "name": "Hip Abduction (Cable)",
    "tier": "A+ Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "obliques": 0.2
    }
  },
  "glutes_abductors_outer_glutes_lateral_band_walks": {
    "name": "Lateral Band Walks",
    "tier": "B Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "quadriceps": 0.3
    }
  },
  "glutes_abductors_outer_glutes_lateral_leg_raises": {
    "name": "Lateral Leg Raises",
    "tier": "C Tier",
    "pattern": "Legs (Posterior / Hip Extension)",
    "weights": {
      "gluteal": 1,
      "obliques": 0.2
    }
  },
  "gastrocnemius_standing_machine_calf_raises": {
    "name": "Standing Calf Raise (Machine)",
    "tier": "S Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "gastrocnemius_donkey_calf_raise": {
    "name": "Donkey Calf Raise (Machine)",
    "tier": "B Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "soleus__lower_calf__barbell_calf_raise": {
    "name": "Standing Calf Raise (Barbell)",
    "tier": "C Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1,
      "trapezius": 0.2,
      "abs": 0.2
    }
  },
  "soleus__lower_calf__dumbbell_calf_raise": {
    "name": "Standing Calf Raise (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1,
      "forearm": 0.3
    }
  },
  "soleus__lower_calf__single_leg_calf_raise": {
    "name": "Single Leg Standing Calf Raise",
    "tier": "C Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "calves_single_leg_standing_db_calf_raise": {
    "name": "Single Leg Standing Calf Raise (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1,
      "forearm": 0.3
    }
  },
  "calves_leg_press_calf_extension": {
    "name": "Calf Press (Machine)",
    "tier": "A+ Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "calves_deficit_calf_raise_3s_stretch": {
    "name": "Deficit Calf Raise",
    "tier": "C Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "gastrocnemius_upper_calf_calf_extension_machine": {
    "name": "Calf Extension (Machine)",
    "tier": "A+ Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "gastrocnemius_upper_calf_single_leg_standing_calf_raise_barbell": {
    "name": "Single Leg Standing Calf Raise (Barbell)",
    "tier": "B Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1,
      "abs": 0.2
    }
  },
  "gastrocnemius_upper_calf_single_leg_standing_calf_raise_machine": {
    "name": "Single Leg Standing Calf Raise (Machine)",
    "tier": "S Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "gastrocnemius_upper_calf_standing_calf_raise_smith": {
    "name": "Standing Calf Raise (Smith)",
    "tier": "S Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "soleus_seated_calf_raises": {
    "name": "Seated Calf Raise",
    "tier": "A+ Tier",
    "pattern": "Calves / Ankle",
    "weights": {
      "calves": 1
    }
  },
  "upper_abs_kneeling_cable_crunches": {
    "name": "Cable Crunch",
    "tier": "S Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.4,
      "upper-back": 0.2
    }
  },
  "upper_abs_seated_ab_crunch_machine": {
    "name": "Crunch (Machine)",
    "tier": "A+ Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.4
    }
  },
  "upper_abs_bicycle_crunch": {
    "name": "Bicycle Crunch",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.8,
      "quadriceps": 0.2
    }
  },
  "lower_abs_dragon_flags": {
    "name": "Dragon Flag",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "upper-back": 0.4,
      "obliques": 0.4
    }
  },
  "upper_abs_swiss_ball_crunch_extended_stretch": {
    "name": "Crunch (Swiss Ball)",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.3
    }
  },
  "abs_ab_wheel_rollout_to_pike": {
    "name": "Ab Wheel Rollout to Pike",
    "tier": "A+ Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "upper-back": 0.4,
      "deltoids": 0.4,
      "triceps": 0.3
    }
  },
  "upper_abs_crunch_weighted": {
    "name": "Crunch (Weighted)",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.3
    }
  },
  "upper_abs_decline_crunch": {
    "name": "Decline Crunch",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.3
    }
  },
  "upper_abs_decline_crunch_weighted": {
    "name": "Decline Crunch (Weighted)",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.4
    }
  },
  "upper_abs_jackknife_sit_up": {
    "name": "Jackknife Sit Up",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.3
    }
  },
  "upper_abs_sit_up": {
    "name": "Sit Up",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.3
    }
  },
  "upper_abs_sit_up_weighted": {
    "name": "Sit Up (Weighted)",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.3
    }
  },
  "upper_abs_toe_touch": {
    "name": "Toe Touch",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.2
    }
  },
  "upper_abs_v_up": {
    "name": "V Up",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5,
      "obliques": 0.3
    }
  },
  "lower_abs_hanging_knee_raises": {
    "name": "Hanging Knee Raise",
    "tier": "S Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5,
      "forearm": 0.4,
      "obliques": 0.3,
      "upper-back": 0.2
    }
  },
  "lower_abs_reverse_crunches": {
    "name": "Reverse Crunch",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.4
    }
  },
  "lower_abs_lying_leg_raise": {
    "name": "Lying Leg Raise",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5
    }
  },
  "lower_abs_captain_chair_leg_raise": {
    "name": "Leg Raise Parallel Bars",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5,
      "obliques": 0.3,
      "chest": 0.2
    }
  },
  "hip_flexors_cable_hip_flexion": {
    "name": "Hip Flexion (Cable)",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.6
    }
  },
  "lower_abs_garhammer_raise": {
    "name": "Garhammer Raise",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.4,
      "forearm": 0.3,
      "quadriceps": 0.3
    }
  },
  "lower_abs_l_sit_hold_parallettes": {
    "name": "L-Sit Hold",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.7,
      "triceps": 0.5,
      "deltoids": 0.4,
      "serratus": 0.4
    }
  },
  "lower_abs_ab_scissors": {
    "name": "Ab Scissors",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5,
      "adductors": 0.3
    }
  },
  "lower_abs_dragonfly": {
    "name": "Dragonfly",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "upper-back": 0.4,
      "obliques": 0.4
    }
  },
  "lower_abs_flutter_kicks": {
    "name": "Flutter Kicks",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5
    }
  },
  "lower_abs_hanging_leg_raise": {
    "name": "Hanging Leg Raise",
    "tier": "S Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.6,
      "forearm": 0.4,
      "upper-back": 0.3,
      "obliques": 0.3
    }
  },
  "lower_abs_jack_knife_suspension": {
    "name": "Jack Knife (Suspension)",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "deltoids": 0.4,
      "quadriceps": 0.4,
      "serratus": 0.3
    }
  },
  "lower_abs_knee_raise_parallel_bars": {
    "name": "Knee Raise Parallel Bars",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.3
    }
  },
  "lower_abs_lying_knee_raise": {
    "name": "Lying Knee Raise",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.3
    }
  },
  "lower_abs_toes_to_bar": {
    "name": "Toes to Bar",
    "tier": "S Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.6,
      "upper-back": 0.5,
      "forearm": 0.5,
      "obliques": 0.3
    }
  },
  "obliques_cable_woodchoppers": {
    "name": "Cable Twist (Up to down)",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.5,
      "serratus": 0.3,
      "deltoids": 0.2
    }
  },
  "lower_abs_hanging_oblique_knee_raise": {
    "name": "Hanging Oblique Knee Raise",
    "tier": "A Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.8,
      "forearm": 0.4,
      "quadriceps": 0.4,
      "upper-back": 0.2
    }
  },
  "obliques_dumbbell_side_bend": {
    "name": "Side Bend (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "lower-back": 0.4,
      "forearm": 0.3,
      "abs": 0.2
    }
  },
  "obliques_side_bend": {
    "name": "Side Bend",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "lower-back": 0.3,
      "abs": 0.2
    }
  },
  "obliques_weighted_russian_twist": {
    "name": "Russian Twist (Weighted)",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.5,
      "quadriceps": 0.3
    }
  },
  "obliques_landmine_180s": {
    "name": "Landmine 180",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "deltoids": 0.5,
      "abs": 0.5,
      "gluteal": 0.3
    }
  },
  "obliques_standing_low_to_high_cable_woodchopper": {
    "name": "Cable Twist (Down to up)",
    "tier": "S Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.5,
      "deltoids": 0.4,
      "gluteal": 0.2
    }
  },
  "obliques_side_plank_with_hip_dips": {
    "name": "Side Plank",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.6,
      "gluteal": 0.5,
      "deltoids": 0.3
    }
  },
  "obliques_heavy_suitcase_carry": {
    "name": "Suitcase Carry (Dumbbell)",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "forearm": 0.7,
      "trapezius": 0.6,
      "abs": 0.5,
      "gluteal": 0.5
    }
  },
  "obliques_kettlebell_windmill": {
    "name": "Windmill (Kettlebell)",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "gluteal": 0.5,
      "hamstring": 0.5,
      "deltoids": 0.4,
      "lower-back": 0.4,
      "abs": 0.4
    }
  },
  "obliques_bicycle_crunch_raised_legs": {
    "name": "Bicycle Crunch Raised Legs",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.8,
      "quadriceps": 0.3
    }
  },
  "obliques_elbow_to_knee": {
    "name": "Elbow to Knee",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.7
    }
  },
  "obliques_heel_taps": {
    "name": "Heel Taps",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.5
    }
  },
  "obliques_oblique_crunch": {
    "name": "Oblique Crunch",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.5
    }
  },
  "obliques_russian_twist_bodyweight": {
    "name": "Russian Twist (Bodyweight)",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.4,
      "quadriceps": 0.2
    }
  },
  "obliques_spiderman": {
    "name": "Spiderman",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.7,
      "deltoids": 0.4,
      "gluteal": 0.3,
      "serratus": 0.3
    }
  },
  "obliques_torso_rotation": {
    "name": "Torso Rotation",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "obliques": 1,
      "abs": 0.4
    }
  },
  "transverse_abs_ab_wheel_rollout": {
    "name": "Ab Wheel",
    "tier": "A+ Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "upper-back": 0.5,
      "triceps": 0.4,
      "serratus": 0.3
    }
  },
  "transverse_abs_pallof_press": {
    "name": "Cable Core Pallof Press",
    "tier": "A+ Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.9,
      "gluteal": 0.3,
      "chest": 0.2,
      "deltoids": 0.2
    }
  },
  "transverse_abs__deep_core__bodyweight_plank": {
    "name": "Plank",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.5,
      "serratus": 0.3,
      "deltoids": 0.3
    }
  },
  "transverse_abs_deep_core_stomach_vacuum": {
    "name": "Stomach Vacuum",
    "tier": "B Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.2
    }
  },
  "transverse_abs_deep_core_bird_dog": {
    "name": "Bird Dog",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "lower-back": 0.6,
      "gluteal": 0.5,
      "deltoids": 0.3,
      "obliques": 0.3
    }
  },
  "transverse_abs_deep_core_dead_bug": {
    "name": "Dead Bug",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "obliques": 0.4,
      "quadriceps": 0.2
    }
  },
  "transverse_abs_deep_core_hollow_body_hold": {
    "name": "Hollow Rock",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.4,
      "obliques": 0.4
    }
  },
  "transverse_abs_deep_core_mountain_climber": {
    "name": "Mountain Climber",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "abs": 1,
      "quadriceps": 0.5,
      "deltoids": 0.4,
      "obliques": 0.4,
      "serratus": 0.3
    }
  },
  "transverse_abs_deep_core_reverse_plank": {
    "name": "Reverse Plank",
    "tier": "C Tier",
    "pattern": "Core / Trunk",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.7,
      "hamstring": 0.6,
      "abs": 0.6,
      "deltoids": 0.5,
      "triceps": 0.3
    }
  },
  "serratus___pec_minor_barbell_pullover": {
    "name": "Pullover (Barbell)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "serratus": 1,
      "upper-back": 0.8,
      "chest": 0.6,
      "triceps": 0.5,
      "abs": 0.3
    }
  },
  "serratus___pec_minor_machine_pullover": {
    "name": "Pullover (Machine)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "upper-back": 1,
      "serratus": 0.8,
      "chest": 0.5,
      "triceps": 0.4,
      "abs": 0.3
    }
  },
  "serratus___pec_minor_svend_press": {
    "name": "Plate Squeeze (Svend Press)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "chest": 1,
      "serratus": 0.6,
      "deltoids": 0.5,
      "triceps": 0.2
    }
  },
  "serratus_incline_dumbbell_pullover": {
    "name": "Pullover (Dumbbell)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "serratus": 1,
      "upper-back": 0.8,
      "chest": 0.6,
      "triceps": 0.4,
      "abs": 0.3
    }
  },
  "serratus_cable_serratus_punch": {
    "name": "Serratus Punch (Cable)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "serratus": 1,
      "deltoids": 0.4,
      "chest": 0.3,
      "obliques": 0.3
    }
  },
  "glutes_hams_45_degree_weighted_back_extensions": {
    "name": "Back Extension (Weighted Hyperextension)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.8,
      "hamstring": 0.8,
      "upper-back": 0.3
    }
  },
  "glutes_hams_back_extensions": {
    "name": "Back Extension (Hyperextension)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.8,
      "hamstring": 0.7
    }
  },
  "glutes_hams_deficit_deadlift": {
    "name": "Deficit Deadlift (Barbell)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.9,
      "lower-back": 0.8,
      "quadriceps": 0.6,
      "upper-back": 0.5,
      "trapezius": 0.5,
      "forearm": 0.4
    }
  },
  "glutes_hams_hex_bar_deadlift": {
    "name": "Deadlift (Trap bar)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "hamstring": 0.7,
      "lower-back": 0.7,
      "trapezius": 0.6,
      "forearm": 0.5
    }
  },
  "glutes_hams_kettlebell_deadlift": {
    "name": "Kettlebell Deadlift",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "lower-back": 0.6,
      "quadriceps": 0.5,
      "forearm": 0.3
    }
  },
  "lower_back_jefferson_curl": {
    "name": "Jefferson Curl (Barbell)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "hamstring": 0.7,
      "gluteal": 0.5,
      "forearm": 0.2
    }
  },
  "lower_back_back_extension_machine": {
    "name": "Back Extension (Machine)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.4,
      "hamstring": 0.2
    }
  },
  "lower_back_deadlift_band": {
    "name": "Deadlift (Band)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "lower-back": 0.7,
      "quadriceps": 0.3,
      "forearm": 0.3
    }
  },
  "lower_back_deadlift_dumbbell": {
    "name": "Deadlift (Dumbbell)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.7,
      "quadriceps": 0.5,
      "forearm": 0.4,
      "trapezius": 0.3
    }
  },
  "lower_back_deadlift_smith_machine": {
    "name": "Deadlift (Smith Machine)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "hamstring": 1,
      "gluteal": 0.8,
      "lower-back": 0.8,
      "upper-back": 0.5,
      "trapezius": 0.4,
      "forearm": 0.4
    }
  },
  "lower_back_rack_pull": {
    "name": "Rack Pull",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "upper-back": 0.8,
      "trapezius": 0.8,
      "gluteal": 0.7,
      "hamstring": 0.6,
      "forearm": 0.6
    }
  },
  "lower_back_reverse_hyperextension": {
    "name": "Reverse Hyperextension",
    "tier": "A+ Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.8,
      "hamstring": 0.7
    }
  },
  "lower_back_superman": {
    "name": "Superman",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "lower-back": 1,
      "gluteal": 0.5,
      "hamstring": 0.3,
      "upper-back": 0.3,
      "deltoids": 0.2
    }
  },
  "glutes_abductors__outer_glutes__machine_adductions": {
    "name": "Hip Adduction (Machine)",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "adductors": 1,
      "gluteal": 0.2
    }
  },
  "adductors_copenhagen_plank": {
    "name": "Copenhagen Plank",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "adductors": 1,
      "obliques": 0.7,
      "abs": 0.5,
      "gluteal": 0.4
    }
  },
  "adductors_hip_adduction_cable": {
    "name": "Hip Adduction (Cable)",
    "tier": "A Tier",
    "pattern": "Other",
    "weights": {
      "adductors": 1,
      "gluteal": 0.3,
      "abs": 0.2
    }
  },
  "gastrocnemius__upper_calf__tibialis_raise": {
    "name": "Tibialis Raise",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "tibialis": 1,
      "calves": 0.1
    }
  },
  "calves_seated_tibialis_bar_raise": {
    "name": "Tibialis Bar Raise",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "tibialis": 1,
      "quadriceps": 0.1
    }
  },
  "transverse_abs__deep_core__wrist_roller": {
    "name": "Wrist Roller",
    "tier": "C Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1,
      "deltoids": 0.5
    }
  },
  "forearm_extensors__outside__bar_hang": {
    "name": "Dead Hang",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1,
      "upper-back": 0.3
    }
  },
  "forearm_extensors__outside__pinch_hold": {
    "name": "Plate Pinch",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1,
      "trapezius": 0.2
    }
  },
  "upper_traps_trap_bar_farmers_carry": {
    "name": "Farmers Walk (Trap Bar)",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "forearm": 1,
      "trapezius": 0.9,
      "abs": 0.6,
      "obliques": 0.5,
      "quadriceps": 0.4,
      "gluteal": 0.4,
      "calves": 0.3
    }
  },
  "shoulders_kettlebell_halos": {
    "name": "Kettlebell Halo",
    "tier": "B Tier",
    "pattern": "Other",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.5,
      "triceps": 0.4,
      "abs": 0.4,
      "forearm": 0.3
    }
  },
  "cardio_aerobics": {
    "name": "Aerobics",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "calves": 0.7,
      "gluteal": 0.6,
      "hamstring": 0.4
    }
  },
  "cardio_hiit_air_bike": {
    "name": "Air Bike",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "chest": 0.5,
      "upper-back": 0.5,
      "deltoids": 0.5,
      "gluteal": 0.5,
      "hamstring": 0.4,
      "triceps": 0.3,
      "biceps": 0.3
    }
  },
  "conditioning_ball_slams": {
    "name": "Ball Slams",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "upper-back": 1,
      "abs": 0.8,
      "triceps": 0.5,
      "quadriceps": 0.5,
      "gluteal": 0.5,
      "deltoids": 0.4
    }
  },
  "conditioning_battle_ropes": {
    "name": "Battle Ropes",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "deltoids": 1,
      "trapezius": 0.5,
      "forearm": 0.5,
      "abs": 0.5,
      "biceps": 0.4,
      "triceps": 0.4
    }
  },
  "conditioning_bear_crawl": {
    "name": "Bear Crawl",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "deltoids": 0.8,
      "quadriceps": 0.7,
      "serratus": 0.6,
      "triceps": 0.5,
      "obliques": 0.5
    }
  },
  "cardio_combat_boxing": {
    "name": "Boxing",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "deltoids": 1,
      "obliques": 0.7,
      "serratus": 0.7,
      "triceps": 0.5,
      "calves": 0.5,
      "chest": 0.4,
      "upper-back": 0.4
    }
  },
  "conditioning_burpee": {
    "name": "Burpee",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "chest": 0.7,
      "deltoids": 0.6,
      "gluteal": 0.6,
      "abs": 0.5,
      "triceps": 0.5,
      "calves": 0.4
    }
  },
  "conditioning_burpee_broad_jumps": {
    "name": "Burpee Broad Jumps",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "chest": 0.7,
      "hamstring": 0.5,
      "calves": 0.5,
      "deltoids": 0.5,
      "abs": 0.5
    }
  },
  "conditioning_burpee_over_the_bar": {
    "name": "Burpee Over the Bar",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "chest": 0.7,
      "gluteal": 0.7,
      "calves": 0.6,
      "deltoids": 0.5,
      "abs": 0.5,
      "triceps": 0.4
    }
  },
  "sport_forearms_lats_climbing": {
    "name": "Climbing",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "forearm": 1,
      "upper-back": 0.9,
      "biceps": 0.7,
      "abs": 0.5
    }
  },
  "cardio_cycling": {
    "name": "Cycling",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "calves": 0.5,
      "hamstring": 0.4
    }
  },
  "mobility_stretching_downward_dog": {
    "name": "Downward Dog",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "deltoids": 1,
      "serratus": 0.6,
      "trapezius": 0.5,
      "triceps": 0.4,
      "hamstring": 0.3,
      "calves": 0.3
    }
  },
  "cardio_elliptical_trainer": {
    "name": "Elliptical Trainer",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.6,
      "hamstring": 0.5,
      "calves": 0.4,
      "upper-back": 0.3,
      "chest": 0.3
    }
  },
  "plyometrics_frog_jumps": {
    "name": "Frog Jumps",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "adductors": 0.6,
      "calves": 0.6
    }
  },
  "warmup_cardio_high_knee_skips": {
    "name": "High Knee Skips",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "calves": 1,
      "quadriceps": 0.7,
      "abs": 0.5,
      "gluteal": 0.5,
      "tibialis": 0.4
    }
  },
  "cardio_high_knees": {
    "name": "High Knees",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "quadriceps": 0.8,
      "calves": 0.8,
      "tibialis": 0.4
    }
  },
  "cardio_conditioning_hiit": {
    "name": "HIIT",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.6,
      "abs": 0.5,
      "deltoids": 0.4,
      "chest": 0.4
    }
  },
  "cardio_hiking": {
    "name": "Hiking",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.8,
      "calves": 0.7,
      "hamstring": 0.5,
      "tibialis": 0.4
    }
  },
  "cardio_calves_jump_rope": {
    "name": "Jump Rope",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "calves": 1,
      "tibialis": 0.4,
      "forearm": 0.4,
      "deltoids": 0.3,
      "quadriceps": 0.3
    }
  },
  "warmup_cardio_jumping_jack": {
    "name": "Jumping Jack",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "calves": 1,
      "deltoids": 0.5,
      "gluteal": 0.5,
      "adductors": 0.4,
      "quadriceps": 0.3
    }
  },
  "core_conditioning_kettlebell_around_the_world": {
    "name": "Kettlebell Around the World",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "obliques": 1,
      "abs": 0.8,
      "forearm": 0.6,
      "deltoids": 0.4,
      "trapezius": 0.4,
      "gluteal": 0.3
    }
  },
  "full_body_core_kettlebell_turkish_get_up": {
    "name": "Kettlebell Turkish Get Up",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "obliques": 0.8,
      "deltoids": 0.8,
      "gluteal": 0.7,
      "quadriceps": 0.7,
      "trapezius": 0.5,
      "serratus": 0.5
    }
  },
  "mobility_core_pilates": {
    "name": "Pilates",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "obliques": 0.6,
      "gluteal": 0.5
    }
  },
  "cardio_recumbent_bike": {
    "name": "Recumbent Bike",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "hamstring": 0.4,
      "calves": 0.3
    }
  },
  "cardio_upper_back_rowing_machine": {
    "name": "Rowing Machine",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "upper-back": 1,
      "quadriceps": 0.8,
      "gluteal": 0.7,
      "hamstring": 0.6,
      "lower-back": 0.6,
      "deltoids": 0.5,
      "biceps": 0.4
    }
  },
  "cardio_running": {
    "name": "Running",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "calves": 1,
      "quadriceps": 0.8,
      "hamstring": 0.8,
      "gluteal": 0.7,
      "tibialis": 0.5,
      "abs": 0.3
    }
  },
  "cardio_sport_skating": {
    "name": "Skating",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "adductors": 0.7,
      "lower-back": 0.5,
      "calves": 0.4
    }
  },
  "cardio_lats_ski_erg": {
    "name": "Ski Erg",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "upper-back": 1,
      "triceps": 0.7,
      "abs": 0.7,
      "chest": 0.4,
      "quadriceps": 0.4,
      "gluteal": 0.4
    }
  },
  "sport_skiing": {
    "name": "Skiing",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "adductors": 0.6,
      "abs": 0.5,
      "obliques": 0.5,
      "upper-back": 0.4
    }
  },
  "sport_snowboarding": {
    "name": "Snowboarding",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "calves": 0.7,
      "tibialis": 0.7,
      "gluteal": 0.6,
      "obliques": 0.6,
      "abs": 0.5
    }
  },
  "cardio_spinning": {
    "name": "Spinning",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.7,
      "calves": 0.5,
      "hamstring": 0.5
    }
  },
  "cardio_hamstrings_sprints": {
    "name": "Sprints",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "hamstring": 1,
      "gluteal": 1,
      "quadriceps": 0.8,
      "calves": 0.8,
      "abs": 0.6,
      "tibialis": 0.4
    }
  },
  "cardio_glutes_stair_machine_floors": {
    "name": "Stair Machine (Floors)",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "calves": 0.6,
      "hamstring": 0.3
    }
  },
  "cardio_glutes_stair_machine_steps": {
    "name": "Stair Machine (Steps)",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "calves": 0.6,
      "hamstring": 0.3
    }
  },
  "mobility_stretching": {
    "name": "Stretching",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "lower-back": 0.2,
      "gluteal": 0.2
    }
  },
  "cardio_swimming": {
    "name": "Swimming",
    "tier": "A Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "upper-back": 1,
      "deltoids": 0.7,
      "chest": 0.6,
      "triceps": 0.6,
      "abs": 0.5,
      "quadriceps": 0.5
    }
  },
  "cardio_treadmill": {
    "name": "Treadmill",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "calves": 0.9,
      "gluteal": 0.7,
      "hamstring": 0.7,
      "tibialis": 0.4
    }
  },
  "cardio_walking": {
    "name": "Walking",
    "tier": "B Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "calves": 1,
      "gluteal": 0.5,
      "quadriceps": 0.5,
      "tibialis": 0.5,
      "hamstring": 0.3
    }
  },
  "mobility_warm_up": {
    "name": "Warm Up",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.5,
      "deltoids": 0.4,
      "abs": 0.4,
      "upper-back": 0.4
    }
  },
  "mobility_yoga": {
    "name": "Yoga",
    "tier": "C Tier",
    "pattern": "Cardiovascular Conditioning",
    "weights": {
      "abs": 1,
      "deltoids": 0.6,
      "quadriceps": 0.6,
      "gluteal": 0.5,
      "obliques": 0.5,
      "upper-back": 0.4,
      "serratus": 0.4
    }
  },
  "olympic_lift_clean": {
    "name": "Clean",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "hamstring": 0.8,
      "trapezius": 0.8,
      "lower-back": 0.7,
      "upper-back": 0.6,
      "calves": 0.4,
      "forearm": 0.4
    }
  },
  "olympic_lift_clean_and_jerk": {
    "name": "Clean and Jerk",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "deltoids": 0.8,
      "trapezius": 0.8,
      "hamstring": 0.7,
      "lower-back": 0.7,
      "triceps": 0.6
    }
  },
  "olympic_lift_clean_and_press": {
    "name": "Clean and Press",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "deltoids": 1,
      "quadriceps": 0.8,
      "gluteal": 0.8,
      "trapezius": 0.8,
      "hamstring": 0.7,
      "lower-back": 0.7,
      "triceps": 0.6
    }
  },
  "olympic_lift_clean_pull": {
    "name": "Clean Pull",
    "tier": "B Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.9,
      "trapezius": 0.9,
      "lower-back": 0.8,
      "quadriceps": 0.7,
      "upper-back": 0.6,
      "calves": 0.5,
      "forearm": 0.5
    }
  },
  "olympic_power_dumbbell_snatch": {
    "name": "Dumbbell Snatch",
    "tier": "B Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "quadriceps": 0.8,
      "hamstring": 0.7,
      "trapezius": 0.7,
      "deltoids": 0.7,
      "lower-back": 0.6,
      "abs": 0.5
    }
  },
  "olympic_lift_hang_clean": {
    "name": "Hang Clean",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "quadriceps": 0.9,
      "trapezius": 0.8,
      "hamstring": 0.8,
      "lower-back": 0.7,
      "upper-back": 0.6,
      "forearm": 0.5,
      "calves": 0.4
    }
  },
  "olympic_lift_hang_snatch": {
    "name": "Hang Snatch",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "quadriceps": 0.9,
      "trapezius": 0.8,
      "hamstring": 0.8,
      "lower-back": 0.7,
      "deltoids": 0.6,
      "upper-back": 0.6
    }
  },
  "olympic_power_kettlebell_clean": {
    "name": "Kettlebell Clean",
    "tier": "B Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "trapezius": 0.6,
      "lower-back": 0.6,
      "forearm": 0.5,
      "abs": 0.4
    }
  },
  "olympic_power_kettlebell_snatch": {
    "name": "Kettlebell Snatch",
    "tier": "B Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "trapezius": 0.7,
      "deltoids": 0.6,
      "lower-back": 0.6,
      "forearm": 0.5,
      "abs": 0.5
    }
  },
  "olympic_lift_power_clean": {
    "name": "Power Clean",
    "tier": "A+ Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "trapezius": 0.8,
      "quadriceps": 0.8,
      "lower-back": 0.7,
      "upper-back": 0.6,
      "calves": 0.5,
      "forearm": 0.5
    }
  },
  "olympic_lift_power_snatch": {
    "name": "Power Snatch",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "gluteal": 1,
      "hamstring": 0.8,
      "trapezius": 0.8,
      "quadriceps": 0.8,
      "lower-back": 0.7,
      "deltoids": 0.6,
      "upper-back": 0.6
    }
  },
  "olympic_lift_snatch": {
    "name": "Snatch",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "quadriceps": 1,
      "gluteal": 0.9,
      "hamstring": 0.8,
      "trapezius": 0.8,
      "lower-back": 0.7,
      "upper-back": 0.7,
      "deltoids": 0.6
    }
  },
  "olympic_lift_split_jerk": {
    "name": "Split Jerk",
    "tier": "A Tier",
    "pattern": "Compound Power / Olympic",
    "weights": {
      "quadriceps": 1,
      "deltoids": 0.8,
      "gluteal": 0.8,
      "trapezius": 0.7,
      "triceps": 0.6,
      "abs": 0.5,
      "calves": 0.5
    }
  }
};

// Fast lookup by normalized name, id, and sanitized alphanumeric key
export const SCIENTIFIC_BY_NAME: Record<string, ScientificExerciseMeta> = {};
for (const [id, meta] of Object.entries(SCIENTIFIC_EXERCISE_MAP)) {
  const norm = meta.name.toLowerCase().trim();
  const sanitized = norm.replace(/[^a-z0-9]/g, '');
  SCIENTIFIC_BY_NAME[norm] = meta;
  SCIENTIFIC_BY_NAME[id] = meta;
  if (sanitized) SCIENTIFIC_BY_NAME[sanitized] = meta;
}
