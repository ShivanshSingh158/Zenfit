export interface ExerciseDBEntry {
  id: string;
  name: string;
  aliases: string[];
  muscle: string;
  tier?: 'S Tier' | 'A+ Tier' | 'A Tier' | 'B Tier' | 'C Tier';
}

export const EXERCISE_DATABASE: ExerciseDBEntry[] = [
  {
    "id": "upper_chest_incline_dumbbell_press",
    "name": "Incline Bench Press (Dumbbell)",
    "muscle": "Upper Chest",
    "tier": "S Tier",
    "aliases": [
      "Incline Dumbbell Bench Press",
      "Incline DB Press",
      "Incline Dumbbell Chest Press",
      "DB Incline Press",
      "Dumbbell Incline Bench Press",
      "Incline DB Bench Press",
      "Incline Dumbbell Press"
    ]
  },
  {
    "id": "upper_chest_incline_barbell_bench_press",
    "name": "Incline Bench Press (Barbell)",
    "muscle": "Upper Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Incline Barbell Press",
      "Incline Bench Press",
      "Barbell Incline Bench Press",
      "Incline Chest Press",
      "Incline Barbell",
      "Incline Barbell Bench Press"
    ]
  },
  {
    "id": "upper_chest_incline_machine_press",
    "name": "Incline Chest Press (Machine)",
    "muscle": "Upper Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Hammer Strength Incline Press",
      "Smith Machine Incline Press",
      "Machine Incline Chest Press",
      "Converging Incline Machine Press",
      "Incline Chest Machine Press",
      "Incline Machine Press"
    ]
  },
  {
    "id": "upper_chest_low_to_high_cable_fly",
    "name": "Low Cable Fly Crossovers",
    "muscle": "Upper Chest",
    "tier": "S Tier",
    "aliases": [
      "Low-to-High Cable Fly",
      "Low to High Cable Flyes",
      "Low Cable Crossover",
      "Incline Cable Fly",
      "Incline Cable Flyes",
      "Low-to-High Cable Crossovers",
      "Low To High Cable Fly"
    ]
  },
  {
    "id": "upper_chest_incline_dumbbell_fly",
    "name": "Incline Chest Fly (Dumbbell)",
    "muscle": "Upper Chest",
    "tier": "A Tier",
    "aliases": [
      "Incline Dumbbell Flyes",
      "Incline DB Fly",
      "Incline DB Flyes",
      "Incline Dumbbell Fly"
    ]
  },
  {
    "id": "upper_chest_landmine_chest_press",
    "name": "Single Arm Landmine Press (Barbell)",
    "muscle": "Upper Chest",
    "tier": "B Tier",
    "aliases": [
      "Single Arm Landmine Press",
      "Landmine Incline Press",
      "Landmine Chest Press"
    ]
  },
  {
    "id": "mid_chest_flat_barbell_bench_press",
    "name": "Bench Press (Barbell)",
    "muscle": "Mid Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Barbell Bench Press",
      "Flat Barbell Press",
      "Bench Press",
      "Flat Bench Press",
      "Smith Machine Bench Press",
      "Flat Barbell Bench Press"
    ]
  },
  {
    "id": "mid_chest_barbell_floor_press",
    "name": "Floor Press (Barbell)",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "Floor Press",
      "BB Floor Press",
      "Dumbbell Floor Press",
      "DB Floor Press",
      "Barbell Floor Press"
    ]
  },
  {
    "id": "mid_chest_flat_dumbbell_press",
    "name": "Bench Press (Dumbbell)",
    "muscle": "Mid Chest",
    "tier": "S Tier",
    "aliases": [
      "Flat Dumbbell Bench Press",
      "Dumbbell Bench Press",
      "Dumbbell Press",
      "Flat DB Press",
      "DB Bench Press",
      "Flat Dumbbell Press"
    ]
  },
  {
    "id": "mid_chest_pec_deck_fly",
    "name": "Butterfly (Pec Deck)",
    "muscle": "Mid Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Pec Deck",
      "Pec Deck Flyes",
      "Machine Chest Fly",
      "Butterfly Machine Fly",
      "Butterfly Machine",
      "Pec Fly",
      "Machine Pec Deck Fly",
      "Seated Machine Fly",
      "Pec Deck Machine",
      "Machine Fly",
      "Pec Deck Fly"
    ]
  },
  {
    "id": "mid_chest_cable_crossovers",
    "name": "Cable Fly Crossovers",
    "muscle": "Mid Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Cable Crossover",
      "Middle Cable Chest Fly",
      "Standing Cable Chest Fly",
      "Standing Cable Fly",
      "Cable Chest Fly",
      "Middle Cable Fly",
      "Cable Crossovers",
      "High-to-Low Cable Crossover",
      "High to Low Cable Fly",
      "High to Low Cable Flyes",
      "Decline Cable Fly",
      "Decline Cable Crossover",
      "High To Low Cable Fly",
      "High-to-Low Cable Crossovers",
      "standing cable chest fly",
      "Cable Fly with Constant Tension",
      "high to low standing cable fly",
      "Decline Standing Cable Crossover"
    ]
  },
  {
    "id": "mid_chest_flat_dumbbell_fly",
    "name": "Chest Fly (Dumbbell)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "Flat Dumbbell Flyes",
      "Dumbbell Chest Fly",
      "DB Flyes",
      "Flat Dumbbell Fly"
    ]
  },
  {
    "id": "mid_chest_pushups",
    "name": "Push Up",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "Pushups",
      "Bodyweight Push Ups",
      "Weighted Push Ups",
      "Diamond Pushups",
      "Push-ups",
      "Push Ups"
    ]
  },
  {
    "id": "mid_chest_seated_machine_chest_press",
    "name": "Chest Press (Machine)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "Machine Chest Press",
      "Chest Press Machine",
      "Hammer Strength Flat Press",
      "Seated Machine Chest Press"
    ]
  },
  {
    "id": "lower_chest_chest_dips",
    "name": "Chest Dip",
    "muscle": "Lower Chest",
    "tier": "S Tier",
    "aliases": [
      "Dips",
      "Parallel Bar Dips",
      "Assisted Chest Dips",
      "Weighted Chest Dips",
      "Bodyweight Dips",
      "Weighted Dips",
      "Dip",
      "Chest Dips"
    ]
  },
  {
    "id": "lower_chest_decline_barbell_bench_press",
    "name": "Decline Bench Press (Barbell)",
    "muscle": "Lower Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Decline Barbell Press",
      "Decline Bench Press",
      "Barbell Decline Bench Press",
      "Decline Barbell Bench Press"
    ]
  },
  {
    "id": "lower_chest_decline_dumbbell_press",
    "name": "Decline Bench Press (Dumbbell)",
    "muscle": "Lower Chest",
    "tier": "A Tier",
    "aliases": [
      "Decline Dumbbell Bench Press",
      "Decline DB Press",
      "DB Decline Press",
      "Decline Dumbbell Press"
    ]
  },
  {
    "id": "lower_chest_decline_dumbbell_flyes",
    "name": "Decline Chest Fly (Dumbbell)",
    "muscle": "Lower Chest",
    "tier": "B Tier",
    "aliases": [
      "Decline DB Fly",
      "Decline Dumbbell Fly",
      "Decline DB Flyes",
      "Decline Dumbbell Flyes"
    ]
  },
  {
    "id": "front_delts_standing_overhead_barbell_press",
    "name": "Standing Military Press (Barbell)",
    "muscle": "Front Delts",
    "tier": "S Tier",
    "aliases": [
      "Military Press",
      "Barbell Military Press",
      "Overhead Press",
      "OHP",
      "Standing Barbell Military Press",
      "Standing Military Press",
      "Barbell Overhead Press",
      "Standing Overhead Barbell Press"
    ]
  },
  {
    "id": "front_delts_seated_dumbbell_shoulder_press",
    "name": "Shoulder Press (Dumbbell)",
    "muscle": "Front Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Dumbbell Shoulder Press",
      "Seated DB Shoulder Press",
      "Dumbbell Overhead Press",
      "Seated Dumbbell Overhead Press",
      "DB Shoulder Press",
      "Seated Dumbbell Shoulder Press"
    ]
  },
  {
    "id": "front_delts_machine_overhead_press",
    "name": "Seated Shoulder Press (Machine)",
    "muscle": "Front Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Machine Shoulder Press",
      "Hammer Strength Shoulder Press",
      "Smith Machine Shoulder Press",
      "Seated Machine Shoulder Press",
      "Shoulder Press Machine",
      "Machine Overhead Press"
    ]
  },
  {
    "id": "front_delts_arnold_press",
    "name": "Arnold Press (Dumbbell)",
    "muscle": "Front Delts",
    "tier": "A Tier",
    "aliases": [
      "Dumbbell Arnold Press",
      "Seated Arnold Press",
      "Arnold Dumbbell Press",
      "Arnold Press"
    ]
  },
  {
    "id": "front_delts_dumbbell_front_raise",
    "name": "Front Raise (Dumbbell)",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "Front Raises",
      "Front Raise",
      "Dumbbell Front Raise",
      "thumbs down front raise",
      "pronated db front raise",
      "Dumbbell Front Raise with Pronation"
    ]
  },
  {
    "id": "side_delts_dumbbell_lateral_raises",
    "name": "Lateral Raise (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "S Tier",
    "aliases": [
      "Dumbbell Lateral Raise",
      "Lateral Raise",
      "Lateral Raises",
      "Side Lateral Raise",
      "Side Lateral Raises",
      "Side Raises",
      "Incline Dumbbell Lateral Raise",
      "Leaning Lateral Raise",
      "DB Lateral Raise",
      "Dumbbell Lateral Raises",
      "slow eccentric lateral raise",
      "tempo db lateral raise",
      "Dumbbell Lateral Raise (3s Eccentric)"
    ]
  },
  {
    "id": "side_delts_cable_lateral_raises",
    "name": "Lateral Raise (Cable)",
    "muscle": "Side Delts",
    "tier": "S Tier",
    "aliases": [
      "Cable Lateral Raise",
      "Single-Arm Cable Lateral Raise",
      "Behind-the-Back Cable Lateral Raise",
      "Egyptian Cable Lateral Raise",
      "Dual Cable Lateral Raise",
      "Behind The Back Cable Lateral Raise",
      "Single Arm Cable Lateral Raise",
      "Cable Lateral Raises"
    ]
  },
  {
    "id": "side_delts_machine_lateral_raise",
    "name": "Lateral Raise (Machine)",
    "muscle": "Side Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Seated Machine Lateral Raise",
      "Side Delt Machine",
      "Lateral Raise Machine",
      "Machine Lateral Raise"
    ]
  },
  {
    "id": "side_delts_upright_rows",
    "name": "Upright Row (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "B Tier",
    "aliases": [
      "Barbell Upright Row",
      "Cable Upright Row",
      "Dumbbell Upright Row",
      "Upright Row",
      "Upright Rows"
    ]
  },
  {
    "id": "rear_delts_reverse_pec_deck",
    "name": "Rear Delt Reverse Fly (Machine)",
    "muscle": "Rear Delts",
    "tier": "S Tier",
    "aliases": [
      "Reverse Pec Deck Fly",
      "Rear Delt Fly Machine",
      "Machine Rear Delt Fly",
      "Reverse Fly Machine",
      "Reverse Pec Deck (Rear Delts)",
      "Rear Delt Machine",
      "Reverse Pec Deck",
      "Rear Delt Machine (Mid Back)",
      "Reverse Fly (Upper Back)",
      "Reverse Pec Deck (Back Focus)",
      "Rear Delt Machine Fly",
      "Reverse Machine Fly"
    ]
  },
  {
    "id": "rear_delts_face_pulls",
    "name": "Face Pull",
    "muscle": "Rear Delts",
    "tier": "S Tier",
    "aliases": [
      "Rope Face Pulls",
      "Cable Face Pulls",
      "Cable Face Pull",
      "Seated Face Pulls",
      "Face Pulls"
    ]
  },
  {
    "id": "rear_delts_rear_delt_dumbbell_flyes",
    "name": "Rear Delt Reverse Fly (Dumbbell)",
    "muscle": "Rear Delts",
    "tier": "A Tier",
    "aliases": [
      "Rear Delt Dumbbell Fly",
      "Bent-Over Dumbbell Lateral Raise",
      "Bent Over Rear Delt Fly",
      "Seated Rear Delt Dumbbell Fly",
      "Rear Delt Fly",
      "Rear Delt Dumbbell Flyes",
      "Seated Rear Delt Fly"
    ]
  },
  {
    "id": "rear_delts_rear_delt_cable_flyes",
    "name": "Rear Delt Reverse Fly (Cable)",
    "muscle": "Rear Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Rear Delt Cable Fly",
      "Cable Rear Delt Fly",
      "Cross Cable Rear Delt Fly",
      "Cable Reverse Fly",
      "Rear Delt Cable Flyes",
      "high cable rear delt crossover",
      "High Cable Rear Delt Fly",
      "cable rear delt crossover",
      "cuff rear delt fly",
      "Cross-Cable Rear Delt Fly (No Handles)"
    ]
  },
  {
    "id": "traps_cable_shrugs",
    "name": "Shrug (Cable)",
    "muscle": "Upper Traps",
    "tier": "A+ Tier",
    "aliases": [
      "Cable Shrug",
      "Dual Cable Shrugs",
      "Cable Shrugs"
    ]
  },
  {
    "id": "traps_barbell_shrugs",
    "name": "Shrug (Barbell)",
    "muscle": "Upper Traps",
    "tier": "A Tier",
    "aliases": [
      "Barbell Shrug",
      "Smith Machine Shrugs",
      "Behind the Back Shrugs",
      "Shrugs",
      "Barbell Shrugs"
    ]
  },
  {
    "id": "traps_dumbbell_shrugs",
    "name": "Shrug (Dumbbell)",
    "muscle": "Upper Traps",
    "tier": "A Tier",
    "aliases": [
      "Dumbbell Shrug",
      "DB Shrugs",
      "Seated Dumbbell Shrugs",
      "Dumbbell Shrugs"
    ]
  },
  {
    "id": "lat_width_lat_pulldowns_standard",
    "name": "Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "Lat Pulldown",
      "Wide Grip Lat Pulldown",
      "Wide-Grip Lat Pulldown",
      "Cable Lat Pulldown",
      "Lat Pulldowns",
      "Machine Lat Pulldown",
      "Lat Pull Down",
      "Wide-grip Lat Pulldown",
      "Lat Pulldowns (Standard)"
    ]
  },
  {
    "id": "lat_width_neutral_grip_lat_pulldowns",
    "name": "Lat Pulldown - Close Grip (Cable)",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "Close-Grip Lat Pulldown",
      "V-Bar Lat Pulldown",
      "Mag-Grip Lat Pulldown",
      "Parallel Grip Lat Pulldown",
      "Neutral Grip Lat Pulldown",
      "Close Grip Lat Pulldown",
      "V-bar Lat Pulldown",
      "Neutral-Grip Lat Pulldowns",
      "close grip reverse pulldown",
      "Neutral Underhand Close-Grip Pulldown"
    ]
  },
  {
    "id": "lat_width_pull_ups_chin_ups",
    "name": "Pull Up",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "Pull-Ups",
      "Pull Ups",
      "Pullups",
      "Chinups",
      "Assisted Pull-Ups / Chin-Ups",
      "Weighted Pull-Ups",
      "Weighted Chin-Ups",
      "Assisted Pull-Ups",
      "Assisted Pull Ups",
      "Pull-up",
      "Weighted Chin Ups",
      "Weighted Pull Ups",
      "Pull-Ups / Chin-Ups"
    ]
  },
  {
    "id": "lat_width_single_arm_cable_rows_low_pull",
    "name": "Single Arm Cable Row",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "Single-Arm Cable Row",
      "Single Arm Lat Cable Row",
      "Half-Kneeling Cable Row",
      "Low Cable Lat Row",
      "Single-Arm Cable Rows (low pull)"
    ]
  },
  {
    "id": "lat_width_straight_arm_cable_pulldown",
    "name": "Straight Arm Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "Straight Arm Pulldown",
      "Cable Pullover",
      "Dumbbell Pullover",
      "Lat Prayer",
      "Straight-Arm Lat Pulldown",
      "Straight Arm Lat Pulldown",
      "Straight-Arm Cable Pulldown",
      "Cable Lat Pushdown"
    ]
  },
  {
    "id": "lat_width_single_arm_dumbbell_row",
    "name": "Dumbbell Row",
    "muscle": "Lat Width",
    "tier": "A+ Tier",
    "aliases": [
      "One-Arm Dumbbell Row",
      "Single Arm DB Row",
      "Kroc Row",
      "DB Row",
      "Single-Arm Dumbbell Row"
    ]
  },
  {
    "id": "mid_back_chest_supported_t_bar_row",
    "name": "Chest Supported T Bar Row",
    "muscle": "Mid-Back",
    "tier": "S Tier",
    "aliases": [
      "T-Bar Row",
      "Chest Supported T-Bar Row",
      "Machine T-Bar Row",
      "Chest-Supported Row",
      "Chest Supported Machine Row",
      "T-bar Row",
      "Tbar Row",
      "Chest-Supported T-Bar Row",
      "Chest-supported T-bar"
    ]
  },
  {
    "id": "mid_back_barbell_bent_over_row",
    "name": "Bent Over Row (Barbell)",
    "muscle": "Mid-Back",
    "tier": "S Tier",
    "aliases": [
      "Barbell Row",
      "Bent Over Barbell Row",
      "Underhand Barbell Row",
      "Yates Row",
      "Bent-Over Row",
      "Barbell Bent-Over Row"
    ]
  },
  {
    "id": "mid_back_seated_cable_rows",
    "name": "Seated Cable Row - V Grip (Cable)",
    "muscle": "Mid-Back",
    "tier": "S Tier",
    "aliases": [
      "Seated Cable Row",
      "Cable Row",
      "Low Cable Row",
      "Seated Cable Rows V-Bar",
      "Close-Grip Cable Row",
      "Wide-Grip Cable Row",
      "Seated Row",
      "Seated Cable Rows",
      "V-bar Seated Row"
    ]
  },
  {
    "id": "mid_back_conventional_barbell_deadlift",
    "name": "Deadlift (Barbell)",
    "muscle": "Mid-Back",
    "tier": "S Tier",
    "aliases": [
      "Deadlift",
      "Barbell Deadlift",
      "Deadlifts",
      "Trap Bar Deadlift",
      "Rack Pulls",
      "Conventional Barbell Deadlift",
      "Standard Barbell Deadlifts"
    ]
  },
  {
    "id": "short_bicep_standing_ez_bar_curls",
    "name": "EZ Bar Biceps Curl",
    "muscle": "Short Bicep",
    "tier": "S Tier",
    "aliases": [
      "EZ-Bar Curl",
      "EZ Bar Bicep Curl",
      "Barbell Curl",
      "Standing Barbell Curl",
      "EZ Bar Curl",
      "Barbell Bicep Curl",
      "Ez-bar Curl",
      "Standing EZ-Bar Curls"
    ]
  },
  {
    "id": "short_bicep_alternating_dumbbell_curls_w_supination",
    "name": "Bicep Curl (Dumbbell)",
    "muscle": "Short Bicep",
    "tier": "S Tier",
    "aliases": [
      "Dumbbell Bicep Curl",
      "Dumbbell Curls",
      "Standing Dumbbell Curl",
      "Seated Dumbbell Curl",
      "Bicep Curls",
      "Dumbbell Curl",
      "Alternating Dumbbell Curls w/ Supination",
      "Alternating Dumbbell Curls",
      "Dumbbell Bicep Curls",
      "Seated Dumbbell Curls"
    ]
  },
  {
    "id": "long_bicep_incline_dumbbell_curls",
    "name": "Seated Incline Curl (Dumbbell)",
    "muscle": "Long Bicep",
    "tier": "S Tier",
    "aliases": [
      "Incline Dumbbell Curl",
      "Incline DB Curl",
      "Incline Bicep Curl",
      "Incline Curl",
      "Incline Dumbbell Curls",
      "Incline Bicep Curls",
      "incline supinating db curl",
      "Incline Dumbbell Curl with Supination"
    ]
  },
  {
    "id": "short_bicep_preacher_curl",
    "name": "Preacher Curl (Barbell)",
    "muscle": "Short Bicep",
    "tier": "A+ Tier",
    "aliases": [
      "EZ-Bar Preacher Curl",
      "Machine Preacher Curl",
      "Dumbbell Preacher Curl",
      "Preacher Curls",
      "Scott Curl",
      "One-Arm Preacher Curl",
      "Ez-bar Preacher Curl",
      "Preacher Curl"
    ]
  },
  {
    "id": "long_bicep_face_away_cable_curls",
    "name": "Behind the Back Curl (Cable)",
    "muscle": "Long Bicep",
    "tier": "S Tier",
    "aliases": [
      "Bayesian Cable Curl",
      "Cable Bicep Curl",
      "Behind-the-Back Cable Curl",
      "Cable Curl",
      "Dual Cable Curls",
      "Face Away Cable Curl",
      "Face-Away Cable Curls",
      "Bayesian Curls"
    ]
  },
  {
    "id": "brachialis_dumbbell_hammer_curls",
    "name": "Hammer Curl (Dumbbell)",
    "muscle": "Brachialis",
    "tier": "S Tier",
    "aliases": [
      "Hammer Curls",
      "Hammer Curl",
      "Dumbbell Hammer Curl",
      "Cross-Body Hammer Curl",
      "Rope Hammer Curl",
      "Cable Hammer Curls",
      "DB Hammer Curl",
      "Dumbbell Hammer Curls"
    ]
  },
  {
    "id": "short_bicep_spider_curls",
    "name": "Spider Curl (Dumbbell)",
    "muscle": "Short Bicep",
    "tier": "A Tier",
    "aliases": [
      "Spider Curl",
      "Dumbbell Spider Curl",
      "Barbell Spider Curl",
      "Spider Curls"
    ]
  },
  {
    "id": "short_bicep_concentration_curls",
    "name": "Concentration Curl",
    "muscle": "Short Bicep",
    "tier": "A Tier",
    "aliases": [
      "Dumbbell Concentration Curl",
      "Concentration Curls",
      "Dumbbell Concentration Curls"
    ]
  },
  {
    "id": "brachioradialis_reverse_cable_curls",
    "name": "Reverse Curl (Cable)",
    "muscle": "Brachioradialis",
    "tier": "A Tier",
    "aliases": [
      "Reverse Barbell Curl",
      "Reverse EZ-Bar Curl",
      "Reverse Curl",
      "Reverse Curls",
      "Reverse Ez Bar Curl",
      "Reverse Cable Curls"
    ]
  },
  {
    "id": "forearm_flexors_standing_behind_back_wrist_curls",
    "name": "Behind the Back Wrist Curl (Barbell)",
    "muscle": "Forearm Flexors",
    "tier": "A+ Tier",
    "aliases": [
      "Barbell Wrist Curls Behind Back",
      "Behind-the-Back Wrist Curl",
      "Behind Back Wrist Curl",
      "Standing Behind Back Wrist Curls",
      "standing wrist curl",
      "Behind-the-Back Barbell Wrist Curl"
    ]
  },
  {
    "id": "forearm_flexors_machine_wrist_curls",
    "name": "Wrist Curl (Machine)",
    "muscle": "Forearm Flexors",
    "tier": "A Tier",
    "aliases": [
      "Dumbbell Wrist Curls",
      "Seated Wrist Curl",
      "Wrist Curls",
      "Forearm Curls",
      "Wrist Curl",
      "Machine Wrist Curls"
    ]
  },
  {
    "id": "forearm_extensors_machine_reverse_wrist_curls",
    "name": "Reverse Wrist Curl (Machine)",
    "muscle": "Forearm Extensors",
    "tier": "A Tier",
    "aliases": [
      "Reverse Wrist Curls",
      "Dumbbell Reverse Wrist Curl",
      "Reverse Wrist Curl",
      "Reverse Forearm Curl",
      "Machine Reverse Wrist Curls"
    ]
  },
  {
    "id": "lat_med_tricep_dual_rope_tricep_pushdowns",
    "name": "Triceps Rope Pushdown",
    "muscle": "Lat/Med Tricep",
    "tier": "S Tier",
    "aliases": [
      "Rope Tricep Pushdowns",
      "Rope Tricep Pushdown",
      "Tricep Rope Pushdown",
      "Cable Tricep Pushdown",
      "Tricep Pushdowns",
      "Tricep Pushdown",
      "Dual-Rope Tricep Pushdowns",
      "Rope Pushdowns",
      "double rope pushdown",
      "long rope pushdowns",
      "Dual-Rope Tricep Pushdown"
    ]
  },
  {
    "id": "lat_med_tricep_straight_bar_tricep_pushdown",
    "name": "Triceps Pushdown",
    "muscle": "Lat/Med Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "V-Bar Tricep Pushdown",
      "Bar Tricep Pushdown",
      "Cable Bar Pushdown",
      "Straight-Bar Tricep Pushdown"
    ]
  },
  {
    "id": "long_tricep_ez_bar_skullcrushers",
    "name": "Triceps Extension (Barbell)",
    "muscle": "Long Tricep",
    "tier": "S Tier",
    "aliases": [
      "Skull Crushers",
      "Skullcrushers",
      "Lying Tricep Extension",
      "EZ-Bar Lying Triceps Extension",
      "Dumbbell Skull Crushers",
      "Incline Skull Crushers",
      "Decline Skull Crushers",
      "Skull Crusher",
      "EZ-Bar Skullcrushers"
    ]
  },
  {
    "id": "long_tricep_overhead_cable_extensions",
    "name": "Overhead Triceps Extension (Cable)",
    "muscle": "Long Tricep",
    "tier": "S Tier",
    "aliases": [
      "Overhead Cable Tricep Extension",
      "Rope Overhead Tricep Extension",
      "Cable Overhead Extension",
      "French Press",
      "Overhead Tricep Extension",
      "Overhead Cable Extensions"
    ]
  },
  {
    "id": "long_tricep_katana_cable_extensions",
    "name": "Katana Triceps Extension (Cable)",
    "muscle": "Long Tricep",
    "tier": "S Tier",
    "aliases": [
      "Cross-Body Overhead Cable Extension",
      "Katana Tricep Extension",
      "Dual Arm Katana Extension",
      "Katana Cable Extensions",
      "katana cable extension",
      "Katana Extension (Dual Cable Overhead)"
    ]
  },
  {
    "id": "lat_med_tricep_cable_cross_body_tricep_extensions",
    "name": "Cross-Body Triceps Extension (Cable)",
    "muscle": "Lat/Med Tricep",
    "tier": "S Tier",
    "aliases": [
      "Cross-Body Cable Pushdown",
      "Single-Arm Cable Tricep Extension",
      "Cable Cross Body Extension",
      "Cable Cross-Body Tricep Extensions",
      "cuffed cable tricep extension",
      "Cross-Body Cable Tricep Extension"
    ]
  },
  {
    "id": "lat_med_tricep_close_grip_barbell_bench_press",
    "name": "Bench Press - Close Grip (Barbell)",
    "muscle": "Lat/Med Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "Close Grip Bench Press",
      "Close-Grip Bench",
      "CG Bench Press",
      "Close-Grip Barbell Bench Press",
      "Close Grip Press"
    ]
  },
  {
    "id": "long_tricep_dumbbell_overhead_triceps_extension",
    "name": "Triceps Extension (Dumbbell)",
    "muscle": "Long Tricep",
    "tier": "A Tier",
    "aliases": [
      "Seated Dumbbell Overhead Extension",
      "Single-Arm Dumbbell Overhead Extension",
      "Dumbbell French Press",
      "DB Overhead Extension",
      "Overhead Dumbbell Triceps Extension",
      "Dumbbell Overhead Triceps Extension",
      "Standing Dumbbell Overhead Extension"
    ]
  },
  {
    "id": "quads_barbell_back_squat",
    "name": "Squat (Barbell)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Barbell Squat",
      "Back Squat",
      "Squats",
      "Squat",
      "Barbell Back Squats",
      "Pause Squat",
      "Barbell Front Squat",
      "Barbell Back Squat"
    ]
  },
  {
    "id": "quads_hack_squats",
    "name": "Hack Squat (Machine)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Machine Hack Squat",
      "Reverse Hack Squat",
      "Hack Squats"
    ]
  },
  {
    "id": "quads_45_degree_leg_press",
    "name": "Leg Press (Machine)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Leg Press",
      "Incline Leg Press",
      "Machine Leg Press",
      "Horizontal Leg Press",
      "45-Degree Leg Press"
    ]
  },
  {
    "id": "quads_leg_extensions",
    "name": "Leg Extension (Machine)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Leg Extension",
      "Machine Leg Extension",
      "Seated Leg Extension",
      "Single-Leg Extension",
      "Single Leg Extension",
      "Leg Extensions",
      "Seated Leg Extensions"
    ]
  },
  {
    "id": "quads_bulgarian_split_squats",
    "name": "Bulgarian Split Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Bulgarian Split Squat",
      "Dumbbell Split Squat",
      "Rear Foot Elevated Split Squat",
      "BSS",
      "Bulgarian Split Squats"
    ]
  },
  {
    "id": "quad_teardrop_heel_elevated_goblet_squats",
    "name": "Heel-Elevated Goblet Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Heel Elevated Squat",
      "Cyclist Squat",
      "Sissy Squat",
      "Goblet Squats",
      "Heel-Elevated Goblet Squats",
      "atg goblet squat",
      "Heel-Elevated Goblet Squat"
    ]
  },
  {
    "id": "glutes_quads_dumbbell_walking_reverse_lunges",
    "name": "Reverse Lunge (Dumbbell)",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "Walking Lunges",
      "Dumbbell Walking / Reverse Lunges",
      "Lunges",
      "Barbell Lunges",
      "Reverse Lunges",
      "Dumbbell Reverse Lunges"
    ]
  },
  {
    "id": "hamstrings_romanian_deadlifts_rdls",
    "name": "Romanian Deadlift (Barbell)",
    "muscle": "Hamstrings",
    "tier": "S Tier",
    "aliases": [
      "Romanian Deadlift",
      "RDL",
      "RDLs",
      "Barbell RDL",
      "Dumbbell RDL",
      "Dumbbell Romanian Deadlift",
      "Stiff-Leg Deadlift",
      "Stiff Legged Deadlift",
      "Romanian Deadlift (RDL)",
      "Romanian Deadlifts (RDL - Barbell)",
      "Barbell Rdl",
      "Dumbbell Rdl",
      "Rdl",
      "Stiff Leg Deadlift",
      "Romanian Deadlifts (RDLs)"
    ]
  },
  {
    "id": "hamstrings_seated_leg_curls",
    "name": "Seated Leg Curl (Machine)",
    "muscle": "Hamstrings",
    "tier": "S Tier",
    "aliases": [
      "Seated Leg Curl",
      "Machine Leg Curl",
      "Hamstring Curl",
      "Leg Curls (Seated)",
      "Leg Curls",
      "Seated Leg Curls",
      "forward lean seated leg curl",
      "Seated Leg Curl with Torso Lean"
    ]
  },
  {
    "id": "hamstrings_lying_leg_curls",
    "name": "Lying Leg Curl (Machine)",
    "muscle": "Hamstrings",
    "tier": "S Tier",
    "aliases": [
      "Lying Leg Curl",
      "Prone Leg Curl",
      "Lying Hamstring Curl",
      "Single-Leg Lying Curl",
      "Lying Leg Curls"
    ]
  },
  {
    "id": "glutes_barbell_hip_thrust",
    "name": "Hip Thrust (Barbell)",
    "muscle": "Glutes",
    "tier": "S Tier",
    "aliases": [
      "Barbell Glute Bridge",
      "Kas Glute Bridge",
      "Machine Hip Thrust",
      "Dumbbell Hip Thrust",
      "Barbell Hip Thrust",
      "Barbell Hip Thrusts"
    ]
  },
  {
    "id": "glutes_abductors_seated_machine_abductions",
    "name": "Hip Abduction (Machine)",
    "muscle": "Glutes/Abductors",
    "tier": "S Tier",
    "aliases": [
      "Hip Abduction Machine",
      "Seated Hip Abduction",
      "Cable Hip Abduction",
      "Glute Abduction",
      "Machine Abductions",
      "Seated Machine Abductions",
      "Hip Abductions"
    ]
  },
  {
    "id": "gastrocnemius_standing_machine_calf_raises",
    "name": "Standing Calf Raise (Machine)",
    "muscle": "Gastrocnemius",
    "tier": "S Tier",
    "aliases": [
      "Standing Calf Raises",
      "Standing Calf Raise",
      "Machine Calf Raise",
      "Smith Machine Calf Raise",
      "Calf Raises",
      "Standing Machine Calf Raises",
      "standing machine calf raises",
      "Standing Machine Calf Raise"
    ]
  },
  {
    "id": "gastrocnemius_donkey_calf_raise",
    "name": "Donkey Calf Raise (Machine)",
    "muscle": "Gastrocnemius",
    "tier": "B Tier",
    "aliases": [
      "Donkey Calf Raises",
      "Machine Donkey Calf Raise",
      "Donkey Calf Raise"
    ]
  },
  {
    "id": "soleus_seated_calf_raises",
    "name": "Seated Calf Raise",
    "muscle": "Soleus",
    "tier": "A+ Tier",
    "aliases": [
      "Machine Seated Calf Raise",
      "Dumbbell Seated Calf Raise",
      "Seated Calf Raises",
      "Seated Machine Calf Raise"
    ]
  },
  {
    "id": "upper_abs_kneeling_cable_crunches",
    "name": "Cable Crunch",
    "muscle": "Upper Abs",
    "tier": "S Tier",
    "aliases": [
      "Cable Crunches",
      "Rope Cable Crunch",
      "Kneeling Cable Crunch",
      "Kneeling Cable Crunches",
      "Cable Ab Crunches"
    ]
  },
  {
    "id": "lower_abs_hanging_knee_raises",
    "name": "Hanging Knee Raise",
    "muscle": "Lower Abs",
    "tier": "S Tier",
    "aliases": [
      "Hanging Knee / Leg Raises",
      "Hanging Leg Raises",
      "Captain's Chair Leg Raise",
      "Roman Chair Leg Raise",
      "Hanging Knee Raises"
    ]
  },
  {
    "id": "upper_abs_seated_ab_crunch_machine",
    "name": "Crunch (Machine)",
    "muscle": "Upper Abs",
    "tier": "A+ Tier",
    "aliases": [
      "Machine Crunch",
      "Ab Machine",
      "Ab Crunch Machine",
      "Abdominal Crunch Machine",
      "Seated Ab Crunch Machine",
      "Machine Ab Crunch",
      "Machine Ab Crunches"
    ]
  },
  {
    "id": "lower_abs_reverse_crunches",
    "name": "Reverse Crunch",
    "muscle": "Lower Abs",
    "tier": "A Tier",
    "aliases": [
      "Decline Reverse Crunch",
      "Reverse Crunches"
    ]
  },
  {
    "id": "lower_abs_lying_leg_raise",
    "name": "Lying Leg Raise",
    "muscle": "Lower Abs",
    "tier": "B Tier",
    "aliases": [
      "Lying Leg Raises",
      "Floor Leg Raise",
      "Straight Leg Raise"
    ]
  },
  {
    "id": "obliques_cable_woodchoppers",
    "name": "Cable Twist (Up to down)",
    "muscle": "Obliques",
    "tier": "A Tier",
    "aliases": [
      "Woodchoppers",
      "Cable Woodchopper",
      "High to Low Woodchoppers",
      "Low to High Woodchoppers",
      "Cable Woodchoppers",
      "High To Low Woodchoppers",
      "woodchoppers",
      "Woodchopper"
    ]
  },
  {
    "id": "transverse_abs_ab_wheel_rollout",
    "name": "Ab Wheel",
    "muscle": "Transverse Abs",
    "tier": "A+ Tier",
    "aliases": [
      "Ab Wheel Rollouts",
      "Ab Rollout",
      "Ab Roller",
      "Wheel Rollout",
      "Abs Wheel Roller",
      "Ab Wheel Rollout"
    ]
  },
  {
    "id": "transverse_abs_pallof_press",
    "name": "Cable Core Pallof Press",
    "muscle": "Transverse Abs",
    "tier": "A+ Tier",
    "aliases": [
      "Cable Pallof Press",
      "Band Pallof Press",
      "Pallof Press Hold",
      "Kneeling Pallof Press",
      "Pallof Press"
    ]
  },
  {
    "id": "mid_chest_plate_press",
    "name": "Plate Press",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "lower_chest_hammer_strength_decline_press",
    "name": "Decline Bench Press (Machine)",
    "muscle": "Lower Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Hammer Strength Decline Press",
      "hammer strength decline chest press",
      "Decline Hammer Strength Press"
    ]
  },
  {
    "id": "lower_chest_smith_machine_decline_press",
    "name": "Decline Bench Press (Smith Machine)",
    "muscle": "Lower Chest",
    "tier": "C Tier",
    "aliases": [
      "Smith Machine Decline Press"
    ]
  },
  {
    "id": "serratus___pec_minor_barbell_pullover",
    "name": "Pullover (Barbell)",
    "muscle": "Serratus / Pec Minor",
    "tier": "C Tier",
    "aliases": [
      "Barbell Pullover"
    ]
  },
  {
    "id": "serratus___pec_minor_machine_pullover",
    "name": "Pullover (Machine)",
    "muscle": "Serratus / Pec Minor",
    "tier": "C Tier",
    "aliases": [
      "Machine Pullover"
    ]
  },
  {
    "id": "serratus___pec_minor_svend_press",
    "name": "Plate Squeeze (Svend Press)",
    "muscle": "Serratus / Pec Minor",
    "tier": "C Tier",
    "aliases": [
      "Svend Press"
    ]
  },
  {
    "id": "lat_width__lats__assisted_chin_ups",
    "name": "Chin Up (Assisted)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "Assisted Chin Ups"
    ]
  },
  {
    "id": "lat_width__lats__kneeling_cable_lat_pulldown",
    "name": "Kneeling Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "Kneeling Cable Lat Pulldown"
    ]
  },
  {
    "id": "lat_width__lats__reverse_grip_lat_pulldown",
    "name": "Reverse Grip Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "Reverse Grip Lat Pulldown",
      "Underhand Lat Pulldown"
    ]
  },
  {
    "id": "lat_width__lats__single_arm_lat_pulldown",
    "name": "Single Arm Lat Pulldown",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "lat_width__lats__wide_grip_pull_ups",
    "name": "Wide Pull Up",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "Wide Grip Pull Ups"
    ]
  },
  {
    "id": "mid_back_chest_supported_dumbbell_row",
    "name": "Chest Supported Incline Row (Dumbbell)",
    "muscle": "Mid-Back",
    "tier": "A Tier",
    "aliases": [
      "Chest Supported Dumbbell Row",
      "Incline Dumbbell Row",
      "incline db row 45 degrees",
      "flared incline row",
      "Chest-Supported Incline Row (45° Elbows)"
    ]
  },
  {
    "id": "mid_back_hammer_strength_row",
    "name": "Iso-Lateral Row (Machine)",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "Hammer Strength Row"
    ]
  },
  {
    "id": "mid_back_landmine_t_bar_row",
    "name": "Landmine Row",
    "muscle": "Mid-Back",
    "tier": "B Tier",
    "aliases": [
      "Landmine T-bar Row"
    ]
  },
  {
    "id": "mid_back_machine_seated_row",
    "name": "Seated Row (Machine)",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "Machine Seated Row"
    ]
  },
  {
    "id": "mid_back_meadows_row",
    "name": "Meadows Rows (Barbell)",
    "muscle": "Mid-Back",
    "tier": "A Tier",
    "aliases": [
      "Meadows Row"
    ]
  },
  {
    "id": "mid_back_seal_row",
    "name": "Seal Row (Barbell)",
    "muscle": "Mid-Back",
    "tier": "S Tier",
    "aliases": [
      "Seal Row"
    ]
  },
  {
    "id": "mid_back_two_arm_dumbbell_row",
    "name": "Bent Over Row (Dumbbell)",
    "muscle": "Mid-Back",
    "tier": "C Tier",
    "aliases": [
      "Two Arm Dumbbell Row"
    ]
  },
  {
    "id": "mid_back_wide_grip_seated_row",
    "name": "Seated Cable Row - Bar Grip",
    "muscle": "Mid-Back",
    "tier": "C Tier",
    "aliases": [
      "Wide Grip Seated Row"
    ]
  },
  {
    "id": "front_delts_dumbbell_press_shoulder",
    "name": "Overhead Press (Dumbbell)",
    "muscle": "Front Delts",
    "tier": "A Tier",
    "aliases": [
      "Dumbbell Press Shoulder"
    ]
  },
  {
    "id": "front_delts_landmine_shoulder_press",
    "name": "Shoulder Press (Landmine)",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "Landmine Shoulder Press"
    ]
  },
  {
    "id": "front_delts_push_press",
    "name": "Push Press",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": []
  },
  {
    "id": "front_delts_seated_barbell_shoulder_press",
    "name": "Seated Overhead Press (Barbell)",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "Seated Barbell Shoulder Press"
    ]
  },
  {
    "id": "front_delts_seated_machine_press",
    "name": "Shoulder Press (Machine Plates)",
    "muscle": "Front Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Seated Machine Press"
    ]
  },
  {
    "id": "front_delts_standing_barbell_overhead_press",
    "name": "Overhead Press (Barbell)",
    "muscle": "Front Delts",
    "tier": "A+ Tier",
    "aliases": [
      "Standing Barbell Overhead Press"
    ]
  },
  {
    "id": "side_delts_lean_away_cable_lateral_raise",
    "name": "Lean-Away Lateral Raise (Cable)",
    "muscle": "Side Delts",
    "tier": "S Tier",
    "aliases": [
      "Lean-away Cable Lateral Raise"
    ]
  },
  {
    "id": "side_delts_seated_dumbbell_lateral_raise",
    "name": "Seated Lateral Raise (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "A Tier",
    "aliases": [
      "Seated Dumbbell Lateral Raise"
    ]
  },
  {
    "id": "side_delts_wide_grip_upright_row",
    "name": "Upright Row (Barbell)",
    "muscle": "Side Delts",
    "tier": "C Tier",
    "aliases": [
      "Wide Grip Upright Row"
    ]
  },
  {
    "id": "rear_delts_high_cable_rear_delt_row",
    "name": "High Rear Delt Row (Cable)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "High Cable Rear Delt Row"
    ]
  },
  {
    "id": "rear_delts_incline_rear_delt_dumbbell_fly",
    "name": "Chest Supported Reverse Fly (Dumbbell)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "Incline Rear Delt Dumbbell Fly",
      "incline flared db row",
      "Incline Bench Rear Delt Row"
    ]
  },
  {
    "id": "long_tricep__long_head__barbell_skull_crushers",
    "name": "Skullcrusher (Barbell)",
    "muscle": "Long Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "Barbell Skull Crushers"
    ]
  },
  {
    "id": "long_tricep__long_head__cable_french_press",
    "name": "Triceps Extension (Cable)",
    "muscle": "Long Tricep",
    "tier": "A Tier",
    "aliases": [
      "Cable French Press"
    ]
  },
  {
    "id": "long_tricep__long_head__seated_dumbbell_overhead_tricep_extension",
    "name": "Seated Triceps Press",
    "muscle": "Long Tricep",
    "tier": "C Tier",
    "aliases": [
      "Seated Dumbbell Overhead Tricep Extension",
      "seated two arm db overhead extension",
      "Two-Handed Overhead DB Extension"
    ]
  },
  {
    "id": "long_tricep__long_head__single_arm_overhead_cable_extension",
    "name": "Single Arm Overhead Cable Extension",
    "muscle": "Long Tricep",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__assisted_tricep_dips",
    "name": "Triceps Dip (Assisted)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Assisted Tricep Dips"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__bench_dips",
    "name": "Bench Dip",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Bench Dips"
    ]
  },
  {
    "id": "glutes_cable_glute_kickbacks",
    "name": "Standing Cable Glute Kickbacks",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": [
      "Cable Glute Kickbacks"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__cable_kickback",
    "name": "Triceps Kickback (Cable)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Cable Kickback",
      "Cable Tricep Kickbacks"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__dumbbell_tricep_kickbacks",
    "name": "Triceps Kickback (Dumbbell)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Tricep Kickbacks",
      "Dumbbell Kickbacks",
      "Tricep Kickback",
      "Kickbacks",
      "Dumbbell Tricep Kickback",
      "Dumbbell Tricep Kickbacks"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__reverse_grip_tricep_pushdown",
    "name": "Reverse Grip Triceps Pushdown",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Reverse Grip Tricep Pushdown",
      "one arm underhand tricep pushdown",
      "Single-Arm Reverse Grip Pushdown"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__rope_lat_pushdown",
    "name": "Rope Straight Arm Pulldown",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "Rope Lat Pushdown",
      "double rope lat pushdown",
      "long rope pullover",
      "Dual-Rope Straight-Arm Lat Pushdown"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__single_arm_tricep_pushdown",
    "name": "Single Arm Triceps Pushdown (Cable)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Single Arm Tricep Pushdown"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__tate_press",
    "name": "Tate Press (Dumbbell)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Tate Press",
      "dumbbell tate press",
      "Tate Press on Flat Bench"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__tricep_dips",
    "name": "Triceps Dip",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Tricep Dips"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__v_bar_cable_pushdowns",
    "name": "Triceps Pressdown",
    "muscle": "Lat/Med Tricep",
    "tier": "A Tier",
    "aliases": [
      "V-bar Cable Pushdowns",
      "V-bar Pushdown"
    ]
  },
  {
    "id": "lat_med_tricep__lateral___medial_head__weighted_tricep_dips",
    "name": "Triceps Dip (Weighted)",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "Weighted Tricep Dips"
    ]
  },
  {
    "id": "short_bicep__inner_head__machine_preacher_curls",
    "name": "Preacher Curl (Machine)",
    "muscle": "Short Bicep",
    "tier": "S Tier",
    "aliases": [
      "Machine Preacher Curls"
    ]
  },
  {
    "id": "short_bicep__inner_head__rope_cable_curl",
    "name": "Rope Cable Curl",
    "muscle": "Short Bicep",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "short_bicep__inner_head__single_arm_preacher_curl",
    "name": "Preacher Curl (Dumbbell)",
    "muscle": "Short Bicep",
    "tier": "S Tier",
    "aliases": [
      "Single Arm Preacher Curl"
    ]
  },
  {
    "id": "short_bicep__inner_head__standing_barbell_curls",
    "name": "Bicep Curl (Barbell)",
    "muscle": "Short Bicep",
    "tier": "A Tier",
    "aliases": [
      "Standing Barbell Curls"
    ]
  },
  {
    "id": "short_bicep__inner_head__standing_cable_curls",
    "name": "Bicep Curl (Cable)",
    "muscle": "Short Bicep",
    "tier": "A Tier",
    "aliases": [
      "Standing Cable Curls"
    ]
  },
  {
    "id": "long_bicep__outer_peak__drag_curls",
    "name": "Drag Curl",
    "muscle": "Long Bicep",
    "tier": "A Tier",
    "aliases": [
      "Drag Curls"
    ]
  },
  {
    "id": "brachialis_cable_hammer_curl",
    "name": "Hammer Curl (Cable)",
    "muscle": "Brachialis",
    "tier": "A Tier",
    "aliases": [
      "Cable Hammer Curl",
      "rope hammer curl",
      "Cable Rope Hammer Curl"
    ]
  },
  {
    "id": "quad_teardrop__vmo__pendulum_squat",
    "name": "Pendulum Squat (Machine)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "Pendulum Squat"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__barbell_reverse_lunge",
    "name": "Reverse Lunge (Barbell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "Barbell Reverse Lunge"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__dumbbell_goblet_squat",
    "name": "Goblet Squat",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "Dumbbell Goblet Squat"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__dumbbell_step_ups",
    "name": "Dumbbell Step Up",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "Dumbbell Step Ups"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__dumbbell_walking_lunges",
    "name": "Walking Lunge (Dumbbell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "Dumbbell Walking Lunges"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__forward_lunges",
    "name": "Lunge",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "Forward Lunges"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__kettlebell_goblet_squat",
    "name": "Kettlebell Goblet Squat",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": []
  },
  {
    "id": "quads_glutes__compound_leg_focus__reverse_lunge",
    "name": "Reverse Lunge",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "reverse lunges"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__single_leg_press",
    "name": "Single Leg Press (Machine)",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "Single Leg Press"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__smith_machine_squat",
    "name": "Squat (Smith Machine)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "smith machine squats",
      "Smith Machine Squat"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__spanish_squat",
    "name": "Spanish Squat (Band)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "Spanish Squat",
      "banded spanish squat",
      "Spanish Squat (Band Behind Knees)"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__split_squat",
    "name": "Split Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "Split Squat"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__step_ups",
    "name": "Step Up",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "Step Ups"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__walking_lunge",
    "name": "Walking Lunge",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "walking lunges"
    ]
  },
  {
    "id": "quads_glutes__compound_leg_focus__zercher_squat",
    "name": "Zercher Squat",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "glutes_hams_45_degree_weighted_back_extensions",
    "name": "Back Extension (Weighted Hyperextension)",
    "muscle": "Lower Back",
    "tier": "C Tier",
    "aliases": [
      "45-degree Weighted Back Extensions",
      "weighted back extension",
      "barbell back extension",
      "45-Degree Barbell Hyperextension"
    ]
  },
  {
    "id": "glutes_hams_american_kettlebell_swing",
    "name": "Kettlebell Swing",
    "muscle": "Glutes",
    "tier": "B Tier",
    "aliases": [
      "American Kettlebell Swing",
      "Kb Swing",
      "kettlebell swings",
      "Russian Kettlebell Swing"
    ]
  },
  {
    "id": "glutes_hams_back_extensions",
    "name": "Back Extension (Hyperextension)",
    "muscle": "Lower Back",
    "tier": "C Tier",
    "aliases": [
      "Back Extensions",
      "Hyperextensions"
    ]
  },
  {
    "id": "glutes_hams_barbell_good_morning",
    "name": "Good Morning (Barbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "barbell good mornings",
      "Barbell Good Morning",
      "good mornings",
      "Good Morning"
    ]
  },
  {
    "id": "glutes_hams_deficit_deadlift",
    "name": "Deficit Deadlift (Barbell)",
    "muscle": "Lower Back",
    "tier": "B Tier",
    "aliases": [
      "Deficit Deadlift"
    ]
  },
  {
    "id": "glutes_hams_hex_bar_deadlift",
    "name": "Deadlift (Trap bar)",
    "muscle": "Lower Back",
    "tier": "B Tier",
    "aliases": [
      "Hex Bar Deadlift"
    ]
  },
  {
    "id": "glutes_hams_kettlebell_deadlift",
    "name": "Kettlebell Deadlift",
    "muscle": "Lower Back",
    "tier": "B Tier",
    "aliases": []
  },
  {
    "id": "glutes_hams_nordic_hamstring_curls",
    "name": "Nordic Hamstrings Curls",
    "muscle": "Hamstrings",
    "tier": "C Tier",
    "aliases": [
      "Nordic Hamstring Curls",
      "nordic curl",
      "natural glute ham raise",
      "Nordic Hamstring Curl"
    ]
  },
  {
    "id": "glutes_hams_single_leg_rdl",
    "name": "Single Leg Romanian Deadlift (Dumbbell)",
    "muscle": "Hamstrings",
    "tier": "C Tier",
    "aliases": [
      "Single Leg Rdl"
    ]
  },
  {
    "id": "glutes_hams_standing_leg_curl",
    "name": "Standing Leg Curls",
    "muscle": "Hamstrings",
    "tier": "C Tier",
    "aliases": [
      "Standing Leg Curl"
    ]
  },
  {
    "id": "glutes_hams_stiff_leg_barbell_deadlift",
    "name": "Straight Leg Deadlift",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "Stiff-leg Barbell Deadlift"
    ]
  },
  {
    "id": "glutes_abductors__outer_glutes__glute_bridge",
    "name": "Glute Bridge",
    "muscle": "Glutes",
    "tier": "B Tier",
    "aliases": []
  },
  {
    "id": "glutes_abductors__outer_glutes__machine_adductions",
    "name": "Hip Adduction (Machine)",
    "muscle": "Adductors",
    "tier": "C Tier",
    "aliases": [
      "Machine Adductions"
    ]
  },
  {
    "id": "glutes_abductors__outer_glutes__single_leg_hip_thrust",
    "name": "Single Leg Hip Thrust",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": []
  },
  {
    "id": "gastrocnemius__upper_calf__tibialis_raise",
    "name": "Tibialis Raise",
    "muscle": "Tibialis Anterior",
    "tier": "B Tier",
    "aliases": [
      "tibialis raises"
    ]
  },
  {
    "id": "soleus__lower_calf__barbell_calf_raise",
    "name": "Standing Calf Raise (Barbell)",
    "muscle": "Gastrocnemius",
    "tier": "C Tier",
    "aliases": [
      "Barbell Calf Raise"
    ]
  },
  {
    "id": "soleus__lower_calf__dumbbell_calf_raise",
    "name": "Standing Calf Raise (Dumbbell)",
    "muscle": "Gastrocnemius",
    "tier": "C Tier",
    "aliases": [
      "Dumbbell Calf Raise"
    ]
  },
  {
    "id": "soleus__lower_calf__single_leg_calf_raise",
    "name": "Single Leg Standing Calf Raise",
    "muscle": "Gastrocnemius",
    "tier": "C Tier",
    "aliases": [
      "Single Leg Calf Raise"
    ]
  },
  {
    "id": "upper_abs_bicycle_crunch",
    "name": "Bicycle Crunch",
    "muscle": "Upper Abs",
    "tier": "C Tier",
    "aliases": [
      "Bicycle Crunches"
    ]
  },
  {
    "id": "lower_abs_captain_chair_leg_raise",
    "name": "Leg Raise Parallel Bars",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "Captain Chair Leg Raise"
    ]
  },
  {
    "id": "lower_abs_dragon_flags",
    "name": "Dragon Flag",
    "muscle": "Upper Abs",
    "tier": "C Tier",
    "aliases": [
      "Dragon Flags",
      "bruce lee dragon flag",
      "dragon flag on decline",
      "Decline Bench Dragon Flag"
    ]
  },
  {
    "id": "lower_abs_hanging_oblique_knee_raise",
    "name": "Hanging Oblique Knee Raise",
    "muscle": "Obliques",
    "tier": "A Tier",
    "aliases": [
      "hanging oblique knee raises",
      "Oblique Knee Raise"
    ]
  },
  {
    "id": "transverse_abs__deep_core__bodyweight_plank",
    "name": "Plank",
    "muscle": "Transverse Abs",
    "tier": "B Tier",
    "aliases": [
      "Planks",
      "Front Plank",
      "Standard Plank",
      "Bodyweight Plank"
    ]
  },
  {
    "id": "transverse_abs__deep_core__wrist_roller",
    "name": "Wrist Roller",
    "muscle": "Forearms",
    "tier": "C Tier",
    "aliases": [
      "wrist roller extension",
      "Wrist Roller (Plate on Rope)"
    ]
  },
  {
    "id": "obliques_dumbbell_side_bend",
    "name": "Side Bend (Dumbbell)",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "dumbbell side bends",
      "Dumbbell Side Bend"
    ]
  },
  {
    "id": "obliques_side_bend",
    "name": "Side Bend",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "side bends"
    ]
  },
  {
    "id": "obliques_weighted_russian_twist",
    "name": "Russian Twist (Weighted)",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "Russian Twists",
      "Russian Twist",
      "Weighted Russian Twists",
      "Weighted Russian Twist"
    ]
  },
  {
    "id": "forearm_flexors__inside__dumbbell_wrist_curl",
    "name": "Seated Palms Up Wrist Curl",
    "muscle": "Forearm Flexors",
    "tier": "A Tier",
    "aliases": [
      "dumbbell wrist curls",
      "Dumbbell Wrist Curl",
      "Seated Dumbbell Wrist Curls"
    ]
  },
  {
    "id": "forearm_extensors__outside__bar_hang",
    "name": "Dead Hang",
    "muscle": "Forearms",
    "tier": "B Tier",
    "aliases": [
      "Bar Hang",
      "dead hangs"
    ]
  },
  {
    "id": "forearm_extensors__outside__dumbbell_farmer_carry",
    "name": "Farmers Walk",
    "muscle": "Brachioradialis",
    "tier": "B Tier",
    "aliases": [
      "Dumbbell Farmer Carry",
      "Farmer Carry",
      "farmer walks",
      "Farmer Walk",
      "farmers carry",
      "farmer's carry",
      "Farmer's Walk"
    ]
  },
  {
    "id": "forearm_extensors__outside__pinch_hold",
    "name": "Plate Pinch",
    "muscle": "Forearms",
    "tier": "B Tier",
    "aliases": [
      "Pinch Hold",
      "Plate Pinches",
      "plate pinch hold",
      "Pinch-Grip Plate Hold"
    ]
  },
  {
    "id": "brachioradialis__upper_forearm__reverse_dumbbell_curl",
    "name": "Reverse Curl (Dumbbell)",
    "muscle": "Brachioradialis",
    "tier": "C Tier",
    "aliases": [
      "Reverse Dumbbell Curl"
    ]
  },
  {
    "id": "brachioradialis__upper_forearm__zottman_curl",
    "name": "Zottman Curl (Dumbbell)",
    "muscle": "Brachialis",
    "tier": "B Tier",
    "aliases": [
      "zottman curls",
      "Zottman Curl"
    ]
  },
  {
    "id": "uncategorized_hammer_strength_chest_press",
    "name": "Iso-Lateral Chest Press (Machine)",
    "muscle": "Mid Chest",
    "tier": "A+ Tier",
    "aliases": [
      "Hammer Strength Chest Press",
      "converging chest press",
      "Plate-Loaded Chest Press"
    ]
  },
  {
    "id": "transverse_abs_deep_core_stomach_vacuum",
    "name": "Stomach Vacuum",
    "muscle": "Transverse Abs",
    "tier": "B Tier",
    "aliases": [
      "vacuums",
      "stomach vacuums"
    ]
  },
  {
    "id": "transverse_abs_deep_core_bird_dog",
    "name": "Bird Dog",
    "muscle": "Transverse Abs",
    "tier": "C Tier",
    "aliases": [
      "bird dogs",
      "banded bird dog",
      "Bird Dog on Bench with Resistance Band"
    ]
  },
  {
    "id": "transverse_abs_deep_core_dead_bug",
    "name": "Dead Bug",
    "muscle": "Transverse Abs",
    "tier": "C Tier",
    "aliases": [
      "dead bugs"
    ]
  },
  {
    "id": "transverse_abs_deep_core_hollow_body_hold",
    "name": "Hollow Rock",
    "muscle": "Transverse Abs",
    "tier": "C Tier",
    "aliases": [
      "hollow hold",
      "Hollow Body Hold",
      "gymnastic hollow rock",
      "Hollow Body Rock"
    ]
  },
  {
    "id": "neck_flexors_neck_curl",
    "name": "Lying Neck Curls (Weighted)",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "neck flexion",
      "weight plate neck curl",
      "Neck Curl"
    ]
  },
  {
    "id": "neck_extensors_neck_extension",
    "name": "Lying Neck Extension (Weighted)",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "neck harness extension",
      "Neck Extension"
    ]
  },
  {
    "id": "hip_flexors_cable_hip_flexion",
    "name": "Hip Flexion (Cable)",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "cable knee raise",
      "Cable Hip Flexion"
    ]
  },
  {
    "id": "serratus_anterior_scapular_pushup",
    "name": "Scapular Push Up",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "scap pushups",
      "scap pushup",
      "Scapular Pushup"
    ]
  },
  {
    "id": "upper_chest_converging_incline_chest_press",
    "name": "Converging Incline Chest Press (Plate Loaded)",
    "muscle": "Upper Chest",
    "tier": "S Tier",
    "aliases": [
      "plate loaded incline press",
      "Converging Incline Chest Press"
    ]
  },
  {
    "id": "mid_chest_deficit_pushup",
    "name": "Deficit Push Up",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "deficit push-ups",
      "Deficit Pushup"
    ]
  },
  {
    "id": "lat_width_single_arm_iliac_lat_pulldown",
    "name": "Iliac Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "iliac lat pulldown",
      "Single Arm Iliac Lat Pulldown"
    ]
  },
  {
    "id": "lat_width_lat_prayer_cable_pullover",
    "name": "Lat Prayer (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "lat prayer",
      "cable lat pullover",
      "Lat Prayer (Kneeling Cable Pullover)"
    ]
  },
  {
    "id": "mid_back_kelso_shrug",
    "name": "Kelso Shrug (Dumbbell)",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "scapular retraction row",
      "Kelso Shrug"
    ]
  },
  {
    "id": "mid_back_chest_supported_y_raise",
    "name": "Chest Supported Y Raise (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "A Tier",
    "aliases": [
      "incline y raise",
      "lower trap y raise",
      "Chest Supported Incline Y-Raise"
    ]
  },
  {
    "id": "side_delts_dual_cable_cross_body_lateral_raise",
    "name": "Cross-Body Lateral Raise (Cable)",
    "muscle": "Side Delts",
    "tier": "C Tier",
    "aliases": [
      "cross body cable lateral raise",
      "Dual Cable Cross-Body Lateral Raise"
    ]
  },
  {
    "id": "side_delts_lu_raise",
    "name": "Lu Lateral Raise (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "A Tier",
    "aliases": [
      "olympic lateral raise",
      "Lu Raise"
    ]
  },
  {
    "id": "brachialis_preacher_hammer_curl",
    "name": "Preacher Hammer Curl (Dumbbell)",
    "muscle": "Brachialis",
    "tier": "B Tier",
    "aliases": [
      "dumbbell preacher hammer curl",
      "Preacher Hammer Curl"
    ]
  },
  {
    "id": "quads_belt_squat",
    "name": "Belt Squat (Machine)",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "pit shark belt squat",
      "Belt Squat"
    ]
  },
  {
    "id": "hamstrings_b_stance_romanian_deadlift",
    "name": "B-Stance Romanian Deadlift (Dumbbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "b-stance rdl",
      "B-Stance Romanian Deadlift"
    ]
  },
  {
    "id": "upper_chest_incline_hex_press",
    "name": "Hex Press (Dumbbell)",
    "muscle": "Upper Chest",
    "tier": "C Tier",
    "aliases": [
      "dumbbell hex press",
      "incline squeeze press",
      "Incline Hex Press"
    ]
  },
  {
    "id": "upper_chest_reverse_grip_incline_barbell_press",
    "name": "Reverse Grip Incline Bench Press (Barbell)",
    "muscle": "Upper Chest",
    "tier": "A Tier",
    "aliases": [
      "reverse grip incline bench press",
      "Reverse-Grip Incline Barbell Press"
    ]
  },
  {
    "id": "upper_chest_cable_upper_chest_scoops",
    "name": "Low Cable Scoop Fly (Cable)",
    "muscle": "Upper Chest",
    "tier": "C Tier",
    "aliases": [
      "low-to-high cable scoops",
      "cable chest scoops",
      "Cable Upper Chest Scoops"
    ]
  },
  {
    "id": "upper_chest_smith_machine_guillotine_incline_press",
    "name": "Guillotine Press (Smith Machine)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "incline guillotine press",
      "Smith Machine Guillotine Incline Press"
    ]
  },
  {
    "id": "upper_chest_single_arm_incline_cable_press",
    "name": "Single Arm Cable Crossover",
    "muscle": "Upper Chest",
    "tier": "C Tier",
    "aliases": [
      "one arm incline cable press",
      "Single-Arm Incline Cable Press"
    ]
  },
  {
    "id": "mid_chest_spoto_press",
    "name": "Spoto Bench Press (Barbell)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "paused bench press",
      "spoto bench",
      "Spoto Press"
    ]
  },
  {
    "id": "mid_chest_floor_dumbbell_flyes",
    "name": "Floor Chest Fly (Dumbbell)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "floor db fly",
      "dumbbell floor fly",
      "Floor Dumbbell Flyes"
    ]
  },
  {
    "id": "mid_chest_resistance_band_pushups",
    "name": "Push Up (Band)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "banded pushups",
      "banded push ups",
      "Resistance Band Pushups"
    ]
  },
  {
    "id": "mid_chest_isometric_squeeze_machine_fly",
    "name": "Chest Fly (Machine)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "paused machine chest fly",
      "Isometric Squeeze Machine Fly",
      "seated machine fly",
      "pec deck fly"
    ]
  },
  {
    "id": "lower_chest_gironda_dips",
    "name": "Gironda Dip (Chest)",
    "muscle": "Lower Chest",
    "tier": "C Tier",
    "aliases": [
      "vince gironda dips",
      "pec dips",
      "Gironda Dips (Flared Elbows)"
    ]
  },
  {
    "id": "serratus_incline_dumbbell_pullover",
    "name": "Pullover (Dumbbell)",
    "muscle": "Serratus / Pec Minor",
    "tier": "A Tier",
    "aliases": [
      "incline db pullover",
      "Incline Dumbbell Pullover"
    ]
  },
  {
    "id": "serratus_cable_serratus_punch",
    "name": "Serratus Punch (Cable)",
    "muscle": "Serratus / Pec Minor",
    "tier": "C Tier",
    "aliases": [
      "cable punch",
      "serratus push",
      "Cable Serratus Punch"
    ]
  },
  {
    "id": "lat_width_half_kneeling_single_arm_lat_pulldown",
    "name": "Half-Kneeling Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "kneeling single arm pulldown",
      "one arm kneeling pulldown",
      "Half-Kneeling Single-Arm Lat Pulldown"
    ]
  },
  {
    "id": "lat_width_meadows_single_arm_lat_pulldown",
    "name": "Meadows Lat Pulldown (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "meadows lat pulldown",
      "Meadows Single-Arm Lat Pulldown"
    ]
  },
  {
    "id": "lat_width_cross_body_cable_lat_extension",
    "name": "Cross-Body Lat Extension (Cable)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "cross body lat pullover",
      "Cross-Body Cable Lat Extension"
    ]
  },
  {
    "id": "mid_back_seal_row_bench_elevated",
    "name": "Seal Row (Dumbbell)",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "bench seal row",
      "elevated prone row",
      "Seal Row (Bench Elevated)"
    ]
  },
  {
    "id": "mid_back_fat_gripz_barbell_bent_over_row",
    "name": "Bent Over Row - Fat Gripz (Barbell)",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "thick bar bent over row",
      "Fat Gripz Barbell Bent-Over Row"
    ]
  },
  {
    "id": "mid_back_wide_grip_seated_cable_row_to_sternum",
    "name": "Seated Cable Row - Bar Wide Grip",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "wide cable row",
      "scapular retraction cable row",
      "Wide-Grip Seated Cable Row to Sternum"
    ]
  },
  {
    "id": "mid_back_landmine_single_arm_meadows_row",
    "name": "Meadows Row (Landmine)",
    "muscle": "Mid-Back",
    "tier": "A Tier",
    "aliases": [
      "landmine meadows row",
      "one arm landmine row",
      "Landmine Single-Arm Meadows Row"
    ]
  },
  {
    "id": "mid_back_batwing_row",
    "name": "Batwing Row (Dumbbell)",
    "muscle": "Mid-Back",
    "tier": "C Tier",
    "aliases": [
      "batwing db row",
      "paused prone row",
      "Batwing Row (Paused on Bench)"
    ]
  },
  {
    "id": "mid_back_incline_prone_dumbbell_shrug",
    "name": "Prone Incline Shrug (Dumbbell)",
    "muscle": "Upper Traps",
    "tier": "A Tier",
    "aliases": [
      "prone incline shrug",
      "lower trap shrug",
      "Incline Prone Dumbbell Shrug"
    ]
  },
  {
    "id": "upper_traps_behind_the_back_smith_machine_shrug",
    "name": "Shrug (Smith Machine)",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "smith machine rear shrug",
      "lee haney shrug",
      "Behind-the-Back Smith Machine Shrug"
    ]
  },
  {
    "id": "upper_traps_trap_bar_farmers_carry",
    "name": "Farmers Walk (Trap Bar)",
    "muscle": "Forearms",
    "tier": "B Tier",
    "aliases": [
      "trap bar carry",
      "farmer walk with trap bar",
      "Trap Bar Farmer's Carry"
    ]
  },
  {
    "id": "upper_traps_cable_rope_face_pull_overhead_reach",
    "name": "Face Pull with Overhead Reach (Cable)",
    "muscle": "Rear Delts",
    "tier": "A+ Tier",
    "aliases": [
      "face pull overhead press",
      "face pull y press",
      "Cable Rope Face Pull with Overhead Reach"
    ]
  },
  {
    "id": "lower_back_jefferson_curl",
    "name": "Jefferson Curl (Barbell)",
    "muscle": "Lower Back",
    "tier": "C Tier",
    "aliases": [
      "jefferson curls",
      "spinal flexion deadlift",
      "Jefferson Curl"
    ]
  },
  {
    "id": "lower_back_snatch_grip_romanian_deadlift",
    "name": "Snatch Grip Romanian Deadlift (Barbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "snatch grip rdl",
      "Snatch-Grip Romanian Deadlift"
    ]
  },
  {
    "id": "lower_back_zercher_good_morning",
    "name": "Good Morning - Zercher (Barbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "zercher good mornings",
      "Zercher Good Morning"
    ]
  },
  {
    "id": "side_delts_kneeling_cable_lateral_raise",
    "name": "Kneeling Lateral Raise (Cable)",
    "muscle": "Side Delts",
    "tier": "S Tier",
    "aliases": [
      "half kneeling lateral raise",
      "Kneeling Cable Lateral Raise"
    ]
  },
  {
    "id": "side_delts_bottoms_up_kettlebell_lateral_raise",
    "name": "Bottoms-Up Lateral Raise (Kettlebell)",
    "muscle": "Side Delts",
    "tier": "B Tier",
    "aliases": [
      "kettlebell lateral raise",
      "Bottoms-Up Kettlebell Lateral Raise"
    ]
  },
  {
    "id": "side_delts_seated_chest_supported_lateral_raise",
    "name": "Chest Supported Lateral Raise (Dumbbell)",
    "muscle": "Side Delts",
    "tier": "C Tier",
    "aliases": [
      "chest supported lateral raise",
      "strict seated lateral raise",
      "Seated Chest-Supported Lateral Raise"
    ]
  },
  {
    "id": "rear_delts_prone_incline_rear_delt_w_raise",
    "name": "Incline W-Raise (Dumbbell)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "incline w raise",
      "rear delt w raise",
      "Prone Incline Rear Delt W-Raise"
    ]
  },
  {
    "id": "rear_delts_single_arm_cable_rear_delt_pull",
    "name": "Reverse Fly Single Arm (Cable)",
    "muscle": "Rear Delts",
    "tier": "B Tier",
    "aliases": [
      "one arm rear delt cable fly",
      "Single-Arm Cable Rear Delt Pull"
    ]
  },
  {
    "id": "rear_delts_skiier_rear_delt_swings",
    "name": "Skier Rear Delt Swing (Dumbbell)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "rear delt swings",
      "meadows rear delt swings",
      "Skiier Rear Delt Swings"
    ]
  },
  {
    "id": "front_delts_z_press",
    "name": "Z-Press (Barbell)",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "seated z press",
      "floor overhead press",
      "Z-Press (Seated on Floor)"
    ]
  },
  {
    "id": "front_delts_half_kneeling_landmine_shoulder_press",
    "name": "Half-Kneeling Shoulder Press (Landmine)",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "half kneeling landmine press",
      "Half-Kneeling Landmine Shoulder Press"
    ]
  },
  {
    "id": "shoulders_kettlebell_halos",
    "name": "Kettlebell Halo",
    "muscle": "Shoulders",
    "tier": "B Tier",
    "aliases": [
      "kb halos",
      "shoulder halo",
      "Kettlebell Halos"
    ]
  },
  {
    "id": "shoulders_cable_external_shoulder_rotation",
    "name": "External Shoulder Rotation (Cable)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "rotator cuff external rotation",
      "Cable External Shoulder Rotation"
    ]
  },
  {
    "id": "shoulders_cuban_press",
    "name": "Cuban Press (Dumbbell)",
    "muscle": "Rear Delts",
    "tier": "C Tier",
    "aliases": [
      "cuban rotation press",
      "Cuban Press"
    ]
  },
  {
    "id": "short_bicep_ez_bar_21s",
    "name": "21s Bicep Curl",
    "muscle": "Short Bicep",
    "tier": "C Tier",
    "aliases": [
      "bicep 21s",
      "EZ-Bar 21s (7-7-7)"
    ]
  },
  {
    "id": "short_bicep_hercules_cable_curl",
    "name": "Overhead Curl (Cable)",
    "muscle": "Short Bicep",
    "tier": "C Tier",
    "aliases": [
      "high cable curl",
      "overhead bicep cable curl",
      "Hercules Cable Curl (High Pulley)"
    ]
  },
  {
    "id": "short_bicep_fat_gripz_dumbbell_preacher_curl",
    "name": "Preacher Curl - Fat Gripz (Dumbbell)",
    "muscle": "Short Bicep",
    "tier": "S Tier",
    "aliases": [
      "thick bar preacher curl",
      "Fat Gripz Dumbbell Preacher Curl"
    ]
  },
  {
    "id": "brachialis_cross_body_pinwheel_curl",
    "name": "Pinwheel Curl (Dumbbell)",
    "muscle": "Brachialis",
    "tier": "A Tier",
    "aliases": [
      "pinwheel curl",
      "cross body db hammer curl",
      "Cross-Body Pinwheel Curl"
    ]
  },
  {
    "id": "long_tricep_floor_ez_bar_skull_crusher_dead_stop",
    "name": "Dead-Stop Skullcrusher (Barbell)",
    "muscle": "Long Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "dead stop skull crusher",
      "floor skull crushers",
      "Floor EZ-Bar Skull Crusher (Dead-Stop)"
    ]
  },
  {
    "id": "long_tricep_incline_cable_skull_crusher_30_deg",
    "name": "Incline Skullcrusher (Cable)",
    "muscle": "Long Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "incline bench cable skull crusher",
      "Incline Cable Skull Crusher (30° Bench)"
    ]
  },
  {
    "id": "lat_med_tricep_barbell_bodyweight_tricep_extension",
    "name": "Bodyweight Triceps Extension (Barbell)",
    "muscle": "Long Tricep",
    "tier": "C Tier",
    "aliases": [
      "bodyweight skull crusher",
      "rack tricep extension",
      "Barbell Bodyweight Tricep Extension"
    ]
  },
  {
    "id": "forearms_reverse_barbell_wrist_curl",
    "name": "Seated Wrist Extension (Barbell)",
    "muscle": "Forearm Extensors",
    "tier": "C Tier",
    "aliases": [
      "overhand wrist curl",
      "Reverse Barbell Wrist Curl"
    ]
  },
  {
    "id": "forearms_dumbbell_finger_curls",
    "name": "Finger Curl (Dumbbell)",
    "muscle": "Forearm Flexors",
    "tier": "C Tier",
    "aliases": [
      "finger curls",
      "Dumbbell Finger Curls"
    ]
  },
  {
    "id": "forearms_towel_grip_pull_ups",
    "name": "Towel Grip Pull Up",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "towel pullups",
      "Towel Grip Pull-ups"
    ]
  },
  {
    "id": "quads_bulgarian_split_squat_front_foot_elevated",
    "name": "Bulgarian Split Squat (Barbell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "deficit bulgarian split squat",
      "Bulgarian Split Squat (Front Foot Elevated)"
    ]
  },
  {
    "id": "quads_cyclist_squat_heels_high_wedge",
    "name": "Cyclist Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "cyclist squat",
      "vmo squat",
      "Cyclist Squat (Heels High Wedge)"
    ]
  },
  {
    "id": "quads_high_box_step_up",
    "name": "High Box Step Up",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "deficit step up",
      "weighted high step up",
      "High Box Step-Up"
    ]
  },
  {
    "id": "hamstrings_deficit_romanian_deadlift",
    "name": "Deficit Romanian Deadlift (Barbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "deficit rdl",
      "Deficit Romanian Deadlift (Standing on Plate)"
    ]
  },
  {
    "id": "hamstrings_single_leg_kettlebell_rdl",
    "name": "Single Leg Romanian Deadlift (Kettlebell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "one leg kb rdl",
      "Single-Leg Kettlebell RDL"
    ]
  },
  {
    "id": "adductors_copenhagen_plank",
    "name": "Copenhagen Plank",
    "muscle": "Adductors",
    "tier": "B Tier",
    "aliases": [
      "copenhagen adductor plank"
    ]
  },
  {
    "id": "hamstrings_glute_ham_raise_ghr",
    "name": "Glute Ham Raise",
    "muscle": "Hamstrings",
    "tier": "A+ Tier",
    "aliases": [
      "ghr raise",
      "Glute-Ham Raise (GHR Machine)"
    ]
  },
  {
    "id": "hamstrings_swiss_ball_leg_curl",
    "name": "Leg Curl (Swiss Ball)",
    "muscle": "Hamstrings",
    "tier": "C Tier",
    "aliases": [
      "stability ball leg curl",
      "swiss ball hamstring curl",
      "Swiss Ball Leg Curl"
    ]
  },
  {
    "id": "glutes_single_leg_hip_thrust",
    "name": "Single Leg Hip Thrust (Dumbbell)",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": [
      "one leg hip thrust",
      "Single-Leg Barbell / DB Hip Thrust"
    ]
  },
  {
    "id": "glutes_cable_pull_through",
    "name": "Cable Pull Through",
    "muscle": "Glutes",
    "tier": "B Tier",
    "aliases": [
      "rope pull through",
      "Cable Pull-Through"
    ]
  },
  {
    "id": "glutes_curtsy_lunge",
    "name": "Curtsy Lunge (Dumbbell)",
    "muscle": "Glutes/Abductors",
    "tier": "C Tier",
    "aliases": [
      "dumbbell curtsy lunge",
      "Curtsy Lunge"
    ]
  },
  {
    "id": "glutes_frog_pumps",
    "name": "Frog Pumps (Dumbbell)",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": [
      "dumbbell frog pump",
      "Frog Pumps"
    ]
  },
  {
    "id": "glutes_eccentric_step_down",
    "name": "Eccentric Step Down",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": [
      "peterson step down",
      "Eccentric Step-Down"
    ]
  },
  {
    "id": "calves_single_leg_standing_db_calf_raise",
    "name": "Single Leg Standing Calf Raise (Dumbbell)",
    "muscle": "Gastrocnemius",
    "tier": "C Tier",
    "aliases": [
      "one leg standing calf raise",
      "Single-Leg Standing DB Calf Raise"
    ]
  },
  {
    "id": "calves_leg_press_calf_extension",
    "name": "Calf Press (Machine)",
    "muscle": "Gastrocnemius",
    "tier": "A+ Tier",
    "aliases": [
      "45 degree leg press calf press",
      "Leg Press Calf Raise",
      "Leg Press Calf Raises",
      "Calf Press on Leg Press",
      "Leg Press Calf Extension"
    ]
  },
  {
    "id": "calves_seated_tibialis_bar_raise",
    "name": "Tibialis Bar Raise",
    "muscle": "Tibialis Anterior",
    "tier": "B Tier",
    "aliases": [
      "tib bar raise",
      "Seated Tibialis Bar Raise"
    ]
  },
  {
    "id": "calves_deficit_calf_raise_3s_stretch",
    "name": "Deficit Calf Raise",
    "muscle": "Gastrocnemius",
    "tier": "C Tier",
    "aliases": [
      "paused deficit calf raise",
      "Deficit Calf Raise with 3-Second Stretch Pause"
    ]
  },
  {
    "id": "lower_abs_garhammer_raise",
    "name": "Garhammer Raise",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "hanging garhammer raise"
    ]
  },
  {
    "id": "upper_abs_swiss_ball_crunch_extended_stretch",
    "name": "Crunch (Swiss Ball)",
    "muscle": "Upper Abs",
    "tier": "C Tier",
    "aliases": [
      "stability ball crunch",
      "Swiss Ball Crunch (Extended Stretch)"
    ]
  },
  {
    "id": "lower_abs_l_sit_hold_parallettes",
    "name": "L-Sit Hold",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "parallette l sit hold",
      "L-Sit Hold on Parallettes"
    ]
  },
  {
    "id": "abs_ab_wheel_rollout_to_pike",
    "name": "Ab Wheel Rollout to Pike",
    "muscle": "Upper Abs",
    "tier": "A+ Tier",
    "aliases": [
      "rollout pike"
    ]
  },
  {
    "id": "obliques_landmine_180s",
    "name": "Landmine 180",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "landmine rotation",
      "landmine twists",
      "Landmine 180s (Rotations)"
    ]
  },
  {
    "id": "obliques_standing_low_to_high_cable_woodchopper",
    "name": "Cable Twist (Down to up)",
    "muscle": "Obliques",
    "tier": "S Tier",
    "aliases": [
      "diagonal cable woodchopper",
      "Standing Low-to-High Cable Woodchopper"
    ]
  },
  {
    "id": "obliques_side_plank_with_hip_dips",
    "name": "Side Plank",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "side plank hip drops",
      "Side Plank with Hip Dips",
      "Side Planks",
      "Isometric Side Plank",
      "Bodyweight Side Plank"
    ]
  },
  {
    "id": "obliques_heavy_suitcase_carry",
    "name": "Suitcase Carry (Dumbbell)",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "single arm farmer walk",
      "Heavy Suitcase Carry"
    ]
  },
  {
    "id": "obliques_kettlebell_windmill",
    "name": "Windmill (Kettlebell)",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "kb windmill",
      "Kettlebell Windmill"
    ]
  },
  {
    "id": "mid_chest_around_the_world",
    "name": "Around The World",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "dumbbell around the world",
      "lying chest around the worlds"
    ]
  },
  {
    "id": "mid_chest_bench_press_cable",
    "name": "Bench Press (Cable)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "lying cable bench press",
      "dual cable chest press"
    ]
  },
  {
    "id": "mid_chest_bench_press_smith_machine",
    "name": "Bench Press (Smith Machine)",
    "muscle": "Mid Chest",
    "tier": "A+ Tier",
    "aliases": [
      "flat smith machine bench press",
      "smith bench press"
    ]
  },
  {
    "id": "mid_chest_bench_press_wide_grip_barbell",
    "name": "Bench Press - Wide Grip (Barbell)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "wide grip barbell bench press",
      "wide bench press"
    ]
  },
  {
    "id": "lower_chest_chest_dip_assisted",
    "name": "Chest Dip (Assisted)",
    "muscle": "Lower Chest",
    "tier": "A Tier",
    "aliases": [
      "machine assisted chest dips",
      "band assisted chest dip"
    ]
  },
  {
    "id": "lower_chest_chest_dip_weighted",
    "name": "Chest Dip (Weighted)",
    "muscle": "Lower Chest",
    "tier": "S Tier",
    "aliases": [
      "weighted parallel bar dips",
      "belt weighted chest dips"
    ]
  },
  {
    "id": "mid_chest_chest_fly_band",
    "name": "Chest Fly (Band)",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "resistance band chest fly",
      "banded pec fly"
    ]
  },
  {
    "id": "mid_chest_chest_fly_suspension",
    "name": "Chest Fly (Suspension)",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "trx chest fly",
      "ring chest fly"
    ]
  },
  {
    "id": "mid_chest_chest_press_band",
    "name": "Chest Press (Band)",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "banded chest press",
      "standing band press"
    ]
  },
  {
    "id": "mid_chest_clap_push_ups",
    "name": "Clap Push Ups",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "plyo push up",
      "explosive clap pushup"
    ]
  },
  {
    "id": "upper_chest_decline_push_up",
    "name": "Decline Push Up",
    "muscle": "Upper Chest",
    "tier": "B Tier",
    "aliases": [
      "feet elevated push up",
      "decline bodyweight pushup"
    ]
  },
  {
    "id": "mid_chest_dumbbell_squeeze_press",
    "name": "Dumbbell Squeeze Press",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "flat hex press",
      "crush grip dumbbell press"
    ]
  },
  {
    "id": "mid_chest_feet_up_bench_press_barbell",
    "name": "Feet Up Bench Press (Barbell)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "larsen press",
      "feet elevated barbell bench press"
    ]
  },
  {
    "id": "mid_chest_floor_press_dumbbell",
    "name": "Floor Press (Dumbbell)",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "db floor press",
      "lying floor dumbbell press"
    ]
  },
  {
    "id": "lower_chest_incline_push_ups",
    "name": "Incline Push Ups",
    "muscle": "Lower Chest",
    "tier": "C Tier",
    "aliases": [
      "hands elevated push up",
      "bench push ups"
    ]
  },
  {
    "id": "mid_chest_kneeling_push_up",
    "name": "Kneeling Push Up",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "knee push ups",
      "modified push up"
    ]
  },
  {
    "id": "mid_chest_one_arm_push_up",
    "name": "One Arm Push Up",
    "muscle": "Mid Chest",
    "tier": "B Tier",
    "aliases": [
      "single arm pushup",
      "unilateral push up"
    ]
  },
  {
    "id": "mid_chest_plank_pushup",
    "name": "Plank Pushup",
    "muscle": "Mid Chest",
    "tier": "C Tier",
    "aliases": [
      "commando planks",
      "up and down plank"
    ]
  },
  {
    "id": "mid_chest_push_up_weighted",
    "name": "Push Up (Weighted)",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "plate weighted pushup",
      "vest push ups"
    ]
  },
  {
    "id": "lower_chest_ring_dips",
    "name": "Ring Dips",
    "muscle": "Lower Chest",
    "tier": "A Tier",
    "aliases": [
      "gymnastic ring dips",
      "bodyweight ring dip"
    ]
  },
  {
    "id": "mid_chest_ring_push_up",
    "name": "Ring Push Up",
    "muscle": "Mid Chest",
    "tier": "A Tier",
    "aliases": [
      "gymnastic ring pushups",
      "suspended ring push up"
    ]
  },
  {
    "id": "mid_chest_seated_chest_flys_cable",
    "name": "Seated Chest Flys (Cable)",
    "muscle": "Mid Chest",
    "tier": "S Tier",
    "aliases": [
      "seated cable crossover",
      "bench supported cable fly"
    ]
  },
  {
    "id": "mid_back_band_pullaparts",
    "name": "Band Pullaparts",
    "muscle": "Mid-Back",
    "tier": "B Tier",
    "aliases": [
      "band pull apart",
      "rear delt band pull-aparts"
    ]
  },
  {
    "id": "mid_back_bent_over_row_band",
    "name": "Bent Over Row (Band)",
    "muscle": "Mid-Back",
    "tier": "C Tier",
    "aliases": [
      "resistance band bent over row"
    ]
  },
  {
    "id": "mid_back_bent_over_row_smith_machine",
    "name": "Bent Over Row (Smith Machine)",
    "muscle": "Mid-Back",
    "tier": "A Tier",
    "aliases": [
      "smith machine barbell row",
      "smith bent row"
    ]
  },
  {
    "id": "upper_traps_deadlift_high_pull",
    "name": "Deadlift High Pull",
    "muscle": "Upper Traps",
    "tier": "B Tier",
    "aliases": [
      "sumo deadlift high pull",
      "barbell high pull"
    ]
  },
  {
    "id": "mid_back_gorilla_row_kettlebell",
    "name": "Gorilla Row (Kettlebell)",
    "muscle": "Mid-Back",
    "tier": "B Tier",
    "aliases": [
      "alternating kettlebell gorilla row"
    ]
  },
  {
    "id": "mid_back_inverted_row",
    "name": "Inverted Row",
    "muscle": "Mid-Back",
    "tier": "A Tier",
    "aliases": [
      "australian pull up",
      "bodyweight barbell row"
    ]
  },
  {
    "id": "mid_back_iso_lateral_low_row",
    "name": "Iso-Lateral Low Row",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "hammer strength low row",
      "unilateral machine row"
    ]
  },
  {
    "id": "upper_traps_jump_shrug",
    "name": "Jump Shrug",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "explosive barbell shrug",
      "power shrug"
    ]
  },
  {
    "id": "upper_traps_kettlebell_high_pull",
    "name": "Kettlebell High Pull",
    "muscle": "Upper Traps",
    "tier": "B Tier",
    "aliases": [
      "kb high pull",
      "kettlebell upright pull"
    ]
  },
  {
    "id": "mid_back_low_row_suspension",
    "name": "Low Row (Suspension)",
    "muscle": "Mid-Back",
    "tier": "B Tier",
    "aliases": [
      "trx row",
      "suspension trainer inverted row"
    ]
  },
  {
    "id": "upper_traps_lying_neck_curls",
    "name": "Lying Neck Curls",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "bodyweight neck flexion",
      "lying head raise"
    ]
  },
  {
    "id": "upper_traps_lying_neck_extension",
    "name": "Lying Neck Extension",
    "muscle": "Upper Traps",
    "tier": "C Tier",
    "aliases": [
      "bodyweight neck extension",
      "prone head raise"
    ]
  },
  {
    "id": "mid_back_pendlay_row_barbell",
    "name": "Pendlay Row (Barbell)",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "dead stop barbell row",
      "strict pendlay row"
    ]
  },
  {
    "id": "mid_back_renegade_row_dumbbell",
    "name": "Renegade Row (Dumbbell)",
    "muscle": "Mid-Back",
    "tier": "C Tier",
    "aliases": [
      "plank dumbbell row",
      "alternating renegade row"
    ]
  },
  {
    "id": "upper_traps_shrug_machine",
    "name": "Shrug (Machine)",
    "muscle": "Upper Traps",
    "tier": "A+ Tier",
    "aliases": [
      "seated/standing machine trap shrug",
      "hammer strength shrug"
    ]
  },
  {
    "id": "mid_back_t_bar_row",
    "name": "T Bar Row",
    "muscle": "Mid-Back",
    "tier": "A+ Tier",
    "aliases": [
      "standing t-bar row",
      "landmine v-grip row"
    ]
  },
  {
    "id": "lat_width_lats_chin_up",
    "name": "Chin Up",
    "muscle": "Lat Width",
    "tier": "A+ Tier",
    "aliases": [
      "underhand pull up",
      "supinated chin up"
    ]
  },
  {
    "id": "lat_width_lats_chin_up_weighted",
    "name": "Chin Up (Weighted)",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "belt weighted chin up",
      "weighted underhand pullup"
    ]
  },
  {
    "id": "lat_width_lats_front_lever_hold",
    "name": "Front Lever Hold",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "isometric front lever",
      "calisthenics front lever"
    ]
  },
  {
    "id": "lat_width_lats_front_lever_raise",
    "name": "Front Lever Raise",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "front lever pulls",
      "straight arm hanging pull"
    ]
  },
  {
    "id": "lat_width_lats_iso_lateral_high_row_machine",
    "name": "Iso-Lateral High Row (Machine)",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "hammer strength high row",
      "plate loaded high row"
    ]
  },
  {
    "id": "lat_width_lats_kipping_pull_up",
    "name": "Kipping Pull Up",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "crossfit pull up",
      "dynamic butterfly pullup"
    ]
  },
  {
    "id": "lat_width_lats_kneeling_pulldown_band",
    "name": "Kneeling Pulldown (Band)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "banded lat pulldown",
      "kneeling band pulldown"
    ]
  },
  {
    "id": "lat_width_lats_lat_pulldown_band",
    "name": "Lat Pulldown (Band)",
    "muscle": "Lat Width",
    "tier": "C Tier",
    "aliases": [
      "resistance band pulldown"
    ]
  },
  {
    "id": "lat_width_lats_lat_pulldown_machine",
    "name": "Lat Pulldown (Machine)",
    "muscle": "Lat Width",
    "tier": "A+ Tier",
    "aliases": [
      "fixed path lat pulldown machine"
    ]
  },
  {
    "id": "lat_width_lats_muscle_up",
    "name": "Muscle Up",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "bar muscle up",
      "ring muscle up"
    ]
  },
  {
    "id": "lat_width_lats_negative_pull_up",
    "name": "Negative Pull Up",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "eccentric pull up",
      "slow lowering pullup"
    ]
  },
  {
    "id": "lat_width_lats_pull_up_assisted",
    "name": "Pull Up (Assisted)",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "gravitron pull up",
      "machine assisted pullup"
    ]
  },
  {
    "id": "lat_width_lats_pull_up_band",
    "name": "Pull Up (Band)",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "band assisted pull up"
    ]
  },
  {
    "id": "lat_width_lats_pull_up_weighted",
    "name": "Pull Up (Weighted)",
    "muscle": "Lat Width",
    "tier": "S Tier",
    "aliases": [
      "dip belt weighted pull up"
    ]
  },
  {
    "id": "lat_width_lats_ring_pull_up",
    "name": "Ring Pull Up",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "gymnastic ring pull ups"
    ]
  },
  {
    "id": "lat_width_lats_scapular_pull_ups",
    "name": "Scapular Pull Ups",
    "muscle": "Lat Width",
    "tier": "B Tier",
    "aliases": [
      "scap pull up",
      "hanging scapular depression"
    ]
  },
  {
    "id": "lat_width_lats_sternum_pull_up_gironda",
    "name": "Sternum Pull Up (Gironda)",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "vince gironda sternum chin up",
      "arched back pullup"
    ]
  },
  {
    "id": "lat_width_lats_vertical_traction_machine",
    "name": "Vertical Traction (Machine)",
    "muscle": "Lat Width",
    "tier": "A Tier",
    "aliases": [
      "technogym vertical traction",
      "converging machine pulldown"
    ]
  },
  {
    "id": "front_delts_front_raise_band",
    "name": "Front Raise (Band)",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "banded front shoulder raise"
    ]
  },
  {
    "id": "front_delts_front_raise_barbell",
    "name": "Front Raise (Barbell)",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "standing barbell front raise",
      "ez-bar front raise"
    ]
  },
  {
    "id": "front_delts_front_raise_cable",
    "name": "Front Raise (Cable)",
    "muscle": "Front Delts",
    "tier": "A Tier",
    "aliases": [
      "low pulley cable front raise",
      "rope front raise"
    ]
  },
  {
    "id": "front_delts_front_raise_suspension",
    "name": "Front Raise (Suspension)",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "trx front raise",
      "suspension i-raise"
    ]
  },
  {
    "id": "front_delts_handstand_hold",
    "name": "Handstand Hold",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "wall handstand isometric hold"
    ]
  },
  {
    "id": "front_delts_handstand_push_up",
    "name": "Handstand Push Up",
    "muscle": "Front Delts",
    "tier": "A Tier",
    "aliases": [
      "hspu",
      "wall handstand press"
    ]
  },
  {
    "id": "front_delts_kettlebell_shoulder_press",
    "name": "Kettlebell Shoulder Press",
    "muscle": "Front Delts",
    "tier": "A Tier",
    "aliases": [
      "single arm kb overhead press",
      "kettlebell military press"
    ]
  },
  {
    "id": "side_delts_lateral_raise_band",
    "name": "Lateral Raise (Band)",
    "muscle": "Side Delts",
    "tier": "B Tier",
    "aliases": [
      "resistance band side lateral raise"
    ]
  },
  {
    "id": "front_delts_overhead_press_smith_machine",
    "name": "Overhead Press (Smith Machine)",
    "muscle": "Front Delts",
    "tier": "A+ Tier",
    "aliases": [
      "seated/standing smith machine shoulder press"
    ]
  },
  {
    "id": "front_delts_pike_pushup",
    "name": "Pike Pushup",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "bodyweight pike shoulder press"
    ]
  },
  {
    "id": "front_delts_plate_front_raise",
    "name": "Plate Front Raise",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "steering wheel raise",
      "weight plate front raise"
    ]
  },
  {
    "id": "front_delts_press_under",
    "name": "Press Under",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "Olympic sotts press",
      "snatch balance press under"
    ]
  },
  {
    "id": "front_delts_seated_overhead_press_dumbbell",
    "name": "Seated Overhead Press (Dumbbell)",
    "muscle": "Front Delts",
    "tier": "S Tier",
    "aliases": [
      "seated db military press",
      "dumbbell overhead press"
    ]
  },
  {
    "id": "front_delts_shoulder_taps",
    "name": "Shoulder Taps",
    "muscle": "Front Delts",
    "tier": "C Tier",
    "aliases": [
      "plank alternating shoulder taps"
    ]
  },
  {
    "id": "side_delts_standing_y_raise_cable",
    "name": "Standing Y Raise (Cable)",
    "muscle": "Side Delts",
    "tier": "A+ Tier",
    "aliases": [
      "dual cable y-raise",
      "lower trap/side delt y-raise"
    ]
  },
  {
    "id": "side_delts_upright_row_cable",
    "name": "Upright Row (Cable)",
    "muscle": "Side Delts",
    "tier": "A+ Tier",
    "aliases": [
      "rope upright row",
      "cable bar upright row"
    ]
  },
  {
    "id": "short_bicep_inner_head_bicep_curl_machine",
    "name": "Bicep Curl (Machine)",
    "muscle": "Short Bicep",
    "tier": "A+ Tier",
    "aliases": [
      "seated machine bicep curl",
      "selectorized curl"
    ]
  },
  {
    "id": "short_bicep_inner_head_bicep_curl_suspension",
    "name": "Bicep Curl (Suspension)",
    "muscle": "Short Bicep",
    "tier": "B Tier",
    "aliases": [
      "trx bicep curl",
      "bodyweight ring curl"
    ]
  },
  {
    "id": "brachialis_cross_body_hammer_curl",
    "name": "Cross Body Hammer Curl",
    "muscle": "Brachialis",
    "tier": "A Tier",
    "aliases": [
      "pinwheel curl",
      "alternating across chest hammer curl"
    ]
  },
  {
    "id": "brachialis_hammer_curl_band",
    "name": "Hammer Curl (Band)",
    "muscle": "Brachialis",
    "tier": "C Tier",
    "aliases": [
      "neutral grip band bicep curl"
    ]
  },
  {
    "id": "short_bicep_inner_head_kettlebell_curl",
    "name": "Kettlebell Curl",
    "muscle": "Short Bicep",
    "tier": "B Tier",
    "aliases": [
      "standing kettlebell bicep curl"
    ]
  },
  {
    "id": "brachialis_plate_curl",
    "name": "Plate Curl",
    "muscle": "Brachialis",
    "tier": "C Tier",
    "aliases": [
      "weight plate pinch curl"
    ]
  },
  {
    "id": "brachialis_reverse_grip_concentration_curl",
    "name": "Reverse Grip Concentration Curl",
    "muscle": "Brachialis",
    "tier": "B Tier",
    "aliases": [
      "seated pronated concentration curl"
    ]
  },
  {
    "id": "brachialis_seated_incline_hammer_curl_dumbbell",
    "name": "Seated Incline Hammer Curl (Dumbbell)",
    "muscle": "Brachialis",
    "tier": "A+ Tier",
    "aliases": [
      "incline neutral grip dumbbell curl"
    ]
  },
  {
    "id": "short_bicep_inner_head_single_arm_curl_cable",
    "name": "Single Arm Curl (Cable)",
    "muscle": "Short Bicep",
    "tier": "A+ Tier",
    "aliases": [
      "unilateral d-handle cable bicep curl"
    ]
  },
  {
    "id": "short_bicep_inner_head_waiter_curl_dumbbell",
    "name": "Waiter Curl (Dumbbell)",
    "muscle": "Short Bicep",
    "tier": "B Tier",
    "aliases": [
      "cupped palms single dumbbell peak curl"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_diamond_push_up",
    "name": "Diamond Push Up",
    "muscle": "Lat/Med Tricep",
    "tier": "A Tier",
    "aliases": [
      "triangle push up",
      "close hand tricep pushup"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_floor_triceps_dip",
    "name": "Floor Triceps Dip",
    "muscle": "Lat/Med Tricep",
    "tier": "C Tier",
    "aliases": [
      "bodyweight crab dips",
      "floor seated dips"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_jm_press_barbell",
    "name": "JM Press (Barbell)",
    "muscle": "Lat/Med Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "jm blakley press",
      "hybrid close-grip skullcrusher"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_push_up_close_grip",
    "name": "Push Up - Close Grip",
    "muscle": "Lat/Med Tricep",
    "tier": "B Tier",
    "aliases": [
      "narrow grip tricep push up",
      "elbows tucked pushup"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_seated_dip_machine",
    "name": "Seated Dip Machine",
    "muscle": "Lat/Med Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "lever tricep dip machine",
      "selectorized seated dip"
    ]
  },
  {
    "id": "long_tricep_long_head_single_arm_tricep_extension_dumbbell",
    "name": "Single Arm Tricep Extension (Dumbbell)",
    "muscle": "Long Tricep",
    "tier": "A Tier",
    "aliases": [
      "unilateral overhead dumbbell french press"
    ]
  },
  {
    "id": "long_tricep_long_head_skullcrusher_dumbbell",
    "name": "Skullcrusher (Dumbbell)",
    "muscle": "Long Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "lying dumbbell tricep extension",
      "neutral db skull crushers"
    ]
  },
  {
    "id": "lat_med_tricep_lateral_medial_head_triceps_extension_machine",
    "name": "Triceps Extension (Machine)",
    "muscle": "Lat/Med Tricep",
    "tier": "A+ Tier",
    "aliases": [
      "seated machine tricep extension"
    ]
  },
  {
    "id": "long_tricep_long_head_triceps_extension_suspension",
    "name": "Triceps Extension (Suspension)",
    "muscle": "Long Tricep",
    "tier": "B Tier",
    "aliases": [
      "trx overhead tricep extension",
      "bodyweight skullcrusher"
    ]
  },
  {
    "id": "brachioradialis_forearms_biceps_reverse_curl_barbell",
    "name": "Reverse Curl (Barbell)",
    "muscle": "Brachioradialis",
    "tier": "A Tier",
    "aliases": [
      "overhand barbell curl",
      "pronated ez-bar curl"
    ]
  },
  {
    "id": "short_bicep_biceps_spider_curl_barbell",
    "name": "Spider Curl (Barbell)",
    "muscle": "Short Bicep",
    "tier": "A+ Tier",
    "aliases": [
      "prone incline bench barbell curl",
      "ez-bar spider curl"
    ]
  },
  {
    "id": "quads_assisted_pistol_squats",
    "name": "Assisted Pistol Squats",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "trx pistol squat",
      "pole-assisted single leg squat"
    ]
  },
  {
    "id": "quads_box_jump",
    "name": "Box Jump",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "plyometric box jump",
      "explosive jump"
    ]
  },
  {
    "id": "quads_box_squat_barbell",
    "name": "Box Squat (Barbell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "westside barbell box squat",
      "paused seated squat"
    ]
  },
  {
    "id": "quads_front_squat",
    "name": "Front Squat",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "olympic barbell front squat",
      "cross-arm front squat"
    ]
  },
  {
    "id": "quads_full_squat",
    "name": "Full Squat",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "atg barbell squat",
      "deep olympic high-bar squat"
    ]
  },
  {
    "id": "quads_hack_squat",
    "name": "Hack Squat",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "behind the back barbell hack squat"
    ]
  },
  {
    "id": "quads_jump_squat",
    "name": "Jump Squat",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "bodyweight squat jump",
      "explosive plyo squat"
    ]
  },
  {
    "id": "quads_jumping_lunge",
    "name": "Jumping Lunge",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "plyometric split squat jump",
      "alternating jump lunges"
    ]
  },
  {
    "id": "quads_landmine_squat_and_press",
    "name": "Landmine Squat and Press",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "landmine thruster",
      "t-bar squat to press"
    ]
  },
  {
    "id": "quads_lateral_box_jump",
    "name": "Lateral Box Jump",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "side plyo box jump"
    ]
  },
  {
    "id": "quads_lateral_lunge",
    "name": "Lateral Lunge",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "side lunge",
      "cossack lunge"
    ]
  },
  {
    "id": "quads_lateral_squat",
    "name": "Lateral Squat",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "cossack squat",
      "side-to-side squat"
    ]
  },
  {
    "id": "quads_leg_press_horizontal_machine",
    "name": "Leg Press Horizontal (Machine)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "seated horizontal sled leg press"
    ]
  },
  {
    "id": "quads_lunge_barbell",
    "name": "Lunge (Barbell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "standing barbell forward lunge"
    ]
  },
  {
    "id": "quads_lunge_dumbbell",
    "name": "Lunge (Dumbbell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "standing dumbbell forward lunge"
    ]
  },
  {
    "id": "quads_overhead_dumbbell_lunge",
    "name": "Overhead Dumbbell Lunge",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "waiter walk lunge",
      "single/dual arm overhead db lunge"
    ]
  },
  {
    "id": "quads_overhead_squat",
    "name": "Overhead Squat",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "snatch grip barbell overhead squat"
    ]
  },
  {
    "id": "quads_pause_squat_barbell",
    "name": "Pause Squat (Barbell)",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "hole-paused barbell back squat",
      "isometric bottom squat"
    ]
  },
  {
    "id": "quads_pistol_squat",
    "name": "Pistol Squat",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "bodyweight single leg squat"
    ]
  },
  {
    "id": "quads_single_leg_extensions",
    "name": "Single Leg Extensions",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "unilateral machine leg extension",
      "one leg quad extension"
    ]
  },
  {
    "id": "quads_sissy_squat_weighted",
    "name": "Sissy Squat (Weighted)",
    "muscle": "Quads",
    "tier": "A+ Tier",
    "aliases": [
      "plate weighted sissy squat",
      "gironda sissy squat"
    ]
  },
  {
    "id": "quads_sled_pull",
    "name": "Sled Pull",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "backward sled drag",
      "reverse prowler walk"
    ]
  },
  {
    "id": "quads_sled_push",
    "name": "Sled Push",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "prowler push",
      "heavy turf sled drive"
    ]
  },
  {
    "id": "quads_squat_band",
    "name": "Squat (Band)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "banded squat",
      "resistance band front squat"
    ]
  },
  {
    "id": "quads_squat_bodyweight",
    "name": "Squat (Bodyweight)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "air squat",
      "prisoner squat"
    ]
  },
  {
    "id": "quads_squat_dumbbell",
    "name": "Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "suitcase dumbbell squat",
      "dual db squat"
    ]
  },
  {
    "id": "quads_squat_machine",
    "name": "Squat (Machine)",
    "muscle": "Quads",
    "tier": "S Tier",
    "aliases": [
      "lever squat machine",
      "v-squat machine"
    ]
  },
  {
    "id": "quads_squat_suspension",
    "name": "Squat (Suspension)",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "trx assisted squat"
    ]
  },
  {
    "id": "quads_squat_row",
    "name": "Squat Row",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "trx squat to row",
      "compound cable squat row"
    ]
  },
  {
    "id": "quads_sumo_squat",
    "name": "Sumo Squat",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "wide stance plie bodyweight squat"
    ]
  },
  {
    "id": "quads_sumo_squat_barbell",
    "name": "Sumo Squat (Barbell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "wide stance barbell back squat"
    ]
  },
  {
    "id": "quads_sumo_squat_dumbbell",
    "name": "Sumo Squat (Dumbbell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "wide stance goblet/hanging single dumbbell squat"
    ]
  },
  {
    "id": "quads_sumo_squat_kettlebell",
    "name": "Sumo Squat (Kettlebell)",
    "muscle": "Quads",
    "tier": "A Tier",
    "aliases": [
      "wide stance kettlebell sumo squat"
    ]
  },
  {
    "id": "quads_thruster_barbell",
    "name": "Thruster (Barbell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "front squat to overhead push press"
    ]
  },
  {
    "id": "quads_thruster_kettlebell",
    "name": "Thruster (Kettlebell)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "dual kettlebell front squat to press"
    ]
  },
  {
    "id": "quads_walking_lunge_sandbag",
    "name": "Walking Lunge (Sandbag)",
    "muscle": "Quads",
    "tier": "B Tier",
    "aliases": [
      "sandbag shouldered walking lunges"
    ]
  },
  {
    "id": "quads_wall_ball",
    "name": "Wall Ball",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "medicine ball squat to target toss"
    ]
  },
  {
    "id": "quads_wall_sit",
    "name": "Wall Sit",
    "muscle": "Quads",
    "tier": "C Tier",
    "aliases": [
      "isometric wall squat hold"
    ]
  },
  {
    "id": "hamstrings_romanian_deadlift_dumbbell",
    "name": "Romanian Deadlift (Dumbbell)",
    "muscle": "Hamstrings",
    "tier": "S Tier",
    "aliases": [
      "db rdl",
      "dumbbell stiff-legged romanian deadlift"
    ]
  },
  {
    "id": "hamstrings_romanian_deadlift_smith_machine",
    "name": "Romanian Deadlift (Smith Machine)",
    "muscle": "Hamstrings",
    "tier": "A+ Tier",
    "aliases": [
      "smith rdl",
      "fixed path romanian deadlift"
    ]
  },
  {
    "id": "hamstrings_single_leg_romanian_deadlift_barbell",
    "name": "Single Leg Romanian Deadlift (Barbell)",
    "muscle": "Hamstrings",
    "tier": "B Tier",
    "aliases": [
      "unilateral barbell rdl",
      "one leg balance rdl"
    ]
  },
  {
    "id": "hamstrings_sumo_deadlift",
    "name": "Sumo Deadlift",
    "muscle": "Hamstrings",
    "tier": "A+ Tier",
    "aliases": [
      "wide stance barbell sumo deadlift"
    ]
  },
  {
    "id": "glutes_abductors_outer_glutes_clamshell",
    "name": "Clamshell",
    "muscle": "Glutes/Abductors",
    "tier": "C Tier",
    "aliases": [
      "side lying banded clamshell",
      "glute medius opener"
    ]
  },
  {
    "id": "glutes_abductors_outer_glutes_fire_hydrants",
    "name": "Fire Hydrants",
    "muscle": "Glutes/Abductors",
    "tier": "C Tier",
    "aliases": [
      "quadruped hip abduction",
      "donkey side kick"
    ]
  },
  {
    "id": "glutes_glute_bridge_barbell",
    "name": "Glute Bridge (Barbell)",
    "muscle": "Glutes",
    "tier": "A Tier",
    "aliases": [
      "floor barbell glute bridge",
      "kas floor bridge"
    ]
  },
  {
    "id": "glutes_glute_kickback_machine",
    "name": "Glute Kickback (Machine)",
    "muscle": "Glutes",
    "tier": "A+ Tier",
    "aliases": [
      "standing/kneeling glute kickback machine"
    ]
  },
  {
    "id": "glutes_glute_kickback_on_floor",
    "name": "Glute Kickback on Floor",
    "muscle": "Glutes",
    "tier": "C Tier",
    "aliases": [
      "quadruped donkey kicks",
      "bodyweight glute kickback"
    ]
  },
  {
    "id": "glutes_abductors_outer_glutes_hip_abduction_cable",
    "name": "Hip Abduction (Cable)",
    "muscle": "Glutes/Abductors",
    "tier": "A+ Tier",
    "aliases": [
      "standing ankle cuff cable hip abduction"
    ]
  },
  {
    "id": "adductors_hip_adduction_cable",
    "name": "Hip Adduction (Cable)",
    "muscle": "Adductors",
    "tier": "A Tier",
    "aliases": [
      "standing ankle cuff cable inner thigh pull"
    ]
  },
  {
    "id": "glutes_hip_thrust",
    "name": "Hip Thrust",
    "muscle": "Glutes",
    "tier": "B Tier",
    "aliases": [
      "bodyweight bench hip thrust"
    ]
  },
  {
    "id": "glutes_hip_thrust_dumbbell",
    "name": "Hip Thrust (Dumbbell)",
    "muscle": "Glutes",
    "tier": "A Tier",
    "aliases": [
      "lap dumbbell bench hip thrust"
    ]
  },
  {
    "id": "glutes_hip_thrust_machine",
    "name": "Hip Thrust (Machine)",
    "muscle": "Glutes",
    "tier": "S Tier",
    "aliases": [
      "nautilus glute drive",
      "plate loaded hip thrust machine"
    ]
  },
  {
    "id": "glutes_hip_thrust_smith_machine",
    "name": "Hip Thrust (Smith Machine)",
    "muscle": "Glutes",
    "tier": "S Tier",
    "aliases": [
      "smith machine bench hip thrust"
    ]
  },
  {
    "id": "glutes_abductors_outer_glutes_lateral_band_walks",
    "name": "Lateral Band Walks",
    "muscle": "Glutes/Abductors",
    "tier": "B Tier",
    "aliases": [
      "monster walks",
      "crab band walks"
    ]
  },
  {
    "id": "glutes_abductors_outer_glutes_lateral_leg_raises",
    "name": "Lateral Leg Raises",
    "muscle": "Glutes/Abductors",
    "tier": "C Tier",
    "aliases": [
      "side lying leg lift",
      "bodyweight hip abduction"
    ]
  },
  {
    "id": "glutes_partial_glute_bridge_barbell",
    "name": "Partial Glute Bridge (Barbell)",
    "muscle": "Glutes",
    "tier": "A Tier",
    "aliases": [
      "kas glute bridge",
      "short-ROM top-end hip thrust"
    ]
  },
  {
    "id": "glutes_rear_kick_machine",
    "name": "Rear Kick (Machine)",
    "muscle": "Glutes",
    "tier": "A Tier",
    "aliases": [
      "prone/standing donkey kick machine"
    ]
  },
  {
    "id": "glutes_single_leg_glute_bridge",
    "name": "Single Leg Glute Bridge",
    "muscle": "Glutes",
    "tier": "B Tier",
    "aliases": [
      "unilateral floor glute bridge"
    ]
  },
  {
    "id": "gastrocnemius_upper_calf_calf_extension_machine",
    "name": "Calf Extension (Machine)",
    "muscle": "Gastrocnemius",
    "tier": "A+ Tier",
    "aliases": [
      "seated selectorized calf extension",
      "rotary calf machine"
    ]
  },
  {
    "id": "gastrocnemius_upper_calf_single_leg_standing_calf_raise_barbell",
    "name": "Single Leg Standing Calf Raise (Barbell)",
    "muscle": "Gastrocnemius",
    "tier": "B Tier",
    "aliases": [
      "unilateral barbell calf raise"
    ]
  },
  {
    "id": "gastrocnemius_upper_calf_single_leg_standing_calf_raise_machine",
    "name": "Single Leg Standing Calf Raise (Machine)",
    "muscle": "Gastrocnemius",
    "tier": "S Tier",
    "aliases": [
      "one leg standing machine calf raise"
    ]
  },
  {
    "id": "gastrocnemius_upper_calf_standing_calf_raise_smith",
    "name": "Standing Calf Raise (Smith)",
    "muscle": "Gastrocnemius",
    "tier": "S Tier",
    "aliases": [
      "smith machine block standing calf raise"
    ]
  },
  {
    "id": "lower_abs_ab_scissors",
    "name": "Ab Scissors",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "lying scissor kicks",
      "supine leg crossovers"
    ]
  },
  {
    "id": "obliques_bicycle_crunch_raised_legs",
    "name": "Bicycle Crunch Raised Legs",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "elevated leg alternating bicycle crunch"
    ]
  },
  {
    "id": "upper_abs_crunch_weighted",
    "name": "Crunch (Weighted)",
    "muscle": "Upper Abs",
    "tier": "A Tier",
    "aliases": [
      "plate weighted chest crunch",
      "dumbbell crunch"
    ]
  },
  {
    "id": "upper_abs_decline_crunch",
    "name": "Decline Crunch",
    "muscle": "Upper Abs",
    "tier": "B Tier",
    "aliases": [
      "decline bench sit up / crunch"
    ]
  },
  {
    "id": "upper_abs_decline_crunch_weighted",
    "name": "Decline Crunch (Weighted)",
    "muscle": "Upper Abs",
    "tier": "A Tier",
    "aliases": [
      "weighted decline bench abdominal crunch"
    ]
  },
  {
    "id": "lower_abs_dragonfly",
    "name": "Dragonfly",
    "muscle": "Lower Abs",
    "tier": "A Tier",
    "aliases": [
      "gymnastic dragon flag progression"
    ]
  },
  {
    "id": "obliques_elbow_to_knee",
    "name": "Elbow to Knee",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "cross-body supine crunch",
      "standing elbow-to-knee"
    ]
  },
  {
    "id": "lower_abs_flutter_kicks",
    "name": "Flutter Kicks",
    "muscle": "Lower Abs",
    "tier": "C Tier",
    "aliases": [
      "lying leg flutter kicks"
    ]
  },
  {
    "id": "lower_abs_hanging_leg_raise",
    "name": "Hanging Leg Raise",
    "muscle": "Lower Abs",
    "tier": "S Tier",
    "aliases": [
      "strict straight-leg hanging raise"
    ]
  },
  {
    "id": "obliques_heel_taps",
    "name": "Heel Taps",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "lying alternating penguin heel touches"
    ]
  },
  {
    "id": "lower_abs_jack_knife_suspension",
    "name": "Jack Knife (Suspension)",
    "muscle": "Lower Abs",
    "tier": "B Tier",
    "aliases": [
      "trx pike / knee tuck jackknife"
    ]
  },
  {
    "id": "upper_abs_jackknife_sit_up",
    "name": "Jackknife Sit Up",
    "muscle": "Upper Abs",
    "tier": "B Tier",
    "aliases": [
      "v-snap sit up",
      "folding floor jackknife"
    ]
  },
  {
    "id": "lower_abs_knee_raise_parallel_bars",
    "name": "Knee Raise Parallel Bars",
    "muscle": "Lower Abs",
    "tier": "A Tier",
    "aliases": [
      "captain's chair knee raise",
      "dip station knee raise"
    ]
  },
  {
    "id": "lower_abs_lying_knee_raise",
    "name": "Lying Knee Raise",
    "muscle": "Lower Abs",
    "tier": "B Tier",
    "aliases": [
      "supine floor knee tuck / reverse crunch"
    ]
  },
  {
    "id": "transverse_abs_deep_core_mountain_climber",
    "name": "Mountain Climber",
    "muscle": "Transverse Abs",
    "tier": "C Tier",
    "aliases": [
      "plank running mountain climbers"
    ]
  },
  {
    "id": "obliques_oblique_crunch",
    "name": "Oblique Crunch",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "side-lying oblique floor crunch"
    ]
  },
  {
    "id": "transverse_abs_deep_core_reverse_plank",
    "name": "Reverse Plank",
    "muscle": "Transverse Abs",
    "tier": "C Tier",
    "aliases": [
      "supine posterior chain plank hold"
    ]
  },
  {
    "id": "obliques_russian_twist_bodyweight",
    "name": "Russian Twist (Bodyweight)",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "seated unloaded torso twists"
    ]
  },
  {
    "id": "upper_abs_sit_up",
    "name": "Sit Up",
    "muscle": "Upper Abs",
    "tier": "C Tier",
    "aliases": [
      "standard floor abdominal sit up"
    ]
  },
  {
    "id": "upper_abs_sit_up_weighted",
    "name": "Sit Up (Weighted)",
    "muscle": "Upper Abs",
    "tier": "B Tier",
    "aliases": [
      "plate-held chest sit up"
    ]
  },
  {
    "id": "obliques_spiderman",
    "name": "Spiderman",
    "muscle": "Obliques",
    "tier": "C Tier",
    "aliases": [
      "spiderman plank crunch",
      "knee-to-elbow crawl"
    ]
  },
  {
    "id": "upper_abs_toe_touch",
    "name": "Toe Touch",
    "muscle": "Upper Abs",
    "tier": "C Tier",
    "aliases": [
      "vertical legs supine crunch to toes"
    ]
  },
  {
    "id": "lower_abs_toes_to_bar",
    "name": "Toes to Bar",
    "muscle": "Lower Abs",
    "tier": "S Tier",
    "aliases": [
      "hanging t2b",
      "strict toes to bar"
    ]
  },
  {
    "id": "obliques_torso_rotation",
    "name": "Torso Rotation",
    "muscle": "Obliques",
    "tier": "B Tier",
    "aliases": [
      "seated rotary torso machine"
    ]
  },
  {
    "id": "upper_abs_v_up",
    "name": "V Up",
    "muscle": "Upper Abs",
    "tier": "A Tier",
    "aliases": [
      "pike v-sit up"
    ]
  },
  {
    "id": "lower_back_back_extension_machine",
    "name": "Back Extension (Machine)",
    "muscle": "Lower Back",
    "tier": "A Tier",
    "aliases": [
      "seated selectorized back extension machine"
    ]
  },
  {
    "id": "lower_back_deadlift_band",
    "name": "Deadlift (Band)",
    "muscle": "Lower Back",
    "tier": "C Tier",
    "aliases": [
      "banded conventional deadlift"
    ]
  },
  {
    "id": "lower_back_deadlift_dumbbell",
    "name": "Deadlift (Dumbbell)",
    "muscle": "Lower Back",
    "tier": "B Tier",
    "aliases": [
      "dual dumbbell floor deadlift"
    ]
  },
  {
    "id": "lower_back_deadlift_smith_machine",
    "name": "Deadlift (Smith Machine)",
    "muscle": "Lower Back",
    "tier": "B Tier",
    "aliases": [
      "smith machine floor pull / deadlift"
    ]
  },
  {
    "id": "lower_back_rack_pull",
    "name": "Rack Pull",
    "muscle": "Lower Back",
    "tier": "A Tier",
    "aliases": [
      "elevated pin barbell partial deadlift"
    ]
  },
  {
    "id": "lower_back_reverse_hyperextension",
    "name": "Reverse Hyperextension",
    "muscle": "Lower Back",
    "tier": "A+ Tier",
    "aliases": [
      "westside reverse hyper machine",
      "prone leg hyperextension"
    ]
  },
  {
    "id": "lower_back_superman",
    "name": "Superman",
    "muscle": "Lower Back",
    "tier": "C Tier",
    "aliases": [
      "prone floor back extension hold"
    ]
  },
  {
    "id": "cardio_aerobics",
    "name": "Aerobics",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "step aerobics"
    ]
  },
  {
    "id": "cardio_hiit_air_bike",
    "name": "Air Bike",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "assault bike",
      "rogue echo bike"
    ]
  },
  {
    "id": "conditioning_ball_slams",
    "name": "Ball Slams",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "medicine ball floor slam"
    ]
  },
  {
    "id": "conditioning_battle_ropes",
    "name": "Battle Ropes",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "heavy rope waves / slams"
    ]
  },
  {
    "id": "conditioning_bear_crawl",
    "name": "Bear Crawl",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "quadruped turf crawl"
    ]
  },
  {
    "id": "cardio_combat_boxing",
    "name": "Boxing",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "heavy bag work",
      "shadow boxing"
    ]
  },
  {
    "id": "conditioning_burpee",
    "name": "Burpee",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "chest-to-floor burpees"
    ]
  },
  {
    "id": "conditioning_burpee_broad_jumps",
    "name": "Burpee Broad Jumps",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "burpee to horizontal broad jump"
    ]
  },
  {
    "id": "conditioning_burpee_over_the_bar",
    "name": "Burpee Over the Bar",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "crossfit bar-facing burpees"
    ]
  },
  {
    "id": "olympic_lift_clean",
    "name": "Clean",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "olympic squat clean"
    ]
  },
  {
    "id": "olympic_lift_clean_and_jerk",
    "name": "Clean and Jerk",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "olympic c&j"
    ]
  },
  {
    "id": "olympic_lift_clean_and_press",
    "name": "Clean and Press",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "barbell clean to strict overhead press"
    ]
  },
  {
    "id": "olympic_lift_clean_pull",
    "name": "Clean Pull",
    "muscle": "Olympic Lift",
    "tier": "B Tier",
    "aliases": [
      "olympic first/second pull extension"
    ]
  },
  {
    "id": "sport_forearms_lats_climbing",
    "name": "Climbing",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "rock climbing",
      "bouldering"
    ]
  },
  {
    "id": "cardio_cycling",
    "name": "Cycling",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "outdoor biking",
      "stationary road bike"
    ]
  },
  {
    "id": "mobility_stretching_downward_dog",
    "name": "Downward Dog",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "yoga downward facing dog"
    ]
  },
  {
    "id": "olympic_power_dumbbell_snatch",
    "name": "Dumbbell Snatch",
    "muscle": "Olympic Lift",
    "tier": "B Tier",
    "aliases": [
      "alternating single-arm db power snatch"
    ]
  },
  {
    "id": "cardio_elliptical_trainer",
    "name": "Elliptical Trainer",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "cross trainer machine"
    ]
  },
  {
    "id": "plyometrics_frog_jumps",
    "name": "Frog Jumps",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "deep squat plyo hops"
    ]
  },
  {
    "id": "olympic_lift_hang_clean",
    "name": "Hang Clean",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "above-the-knee barbell hang clean"
    ]
  },
  {
    "id": "olympic_lift_hang_snatch",
    "name": "Hang Snatch",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "above-the-knee barbell hang snatch"
    ]
  },
  {
    "id": "warmup_cardio_high_knee_skips",
    "name": "High Knee Skips",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "a-skips",
      "dynamic track skips"
    ]
  },
  {
    "id": "cardio_high_knees",
    "name": "High Knees",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "running in place high knees"
    ]
  },
  {
    "id": "cardio_conditioning_hiit",
    "name": "HIIT",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "high intensity interval training"
    ]
  },
  {
    "id": "cardio_hiking",
    "name": "Hiking",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "trail rucking / outdoor hiking"
    ]
  },
  {
    "id": "cardio_calves_jump_rope",
    "name": "Jump Rope",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "skipping rope",
      "double unders"
    ]
  },
  {
    "id": "warmup_cardio_jumping_jack",
    "name": "Jumping Jack",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "star jumps"
    ]
  },
  {
    "id": "core_conditioning_kettlebell_around_the_world",
    "name": "Kettlebell Around the World",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "standing kb hip orbit pass"
    ]
  },
  {
    "id": "olympic_power_kettlebell_clean",
    "name": "Kettlebell Clean",
    "muscle": "Olympic Lift",
    "tier": "B Tier",
    "aliases": [
      "single/double kb rack clean"
    ]
  },
  {
    "id": "olympic_power_kettlebell_snatch",
    "name": "Kettlebell Snatch",
    "muscle": "Olympic Lift",
    "tier": "B Tier",
    "aliases": [
      "single arm kb overhead snatch"
    ]
  },
  {
    "id": "full_body_core_kettlebell_turkish_get_up",
    "name": "Kettlebell Turkish Get Up",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "tgu",
      "turkish get-ups"
    ]
  },
  {
    "id": "mobility_core_pilates",
    "name": "Pilates",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "mat/reformer pilates"
    ]
  },
  {
    "id": "olympic_lift_power_clean",
    "name": "Power Clean",
    "muscle": "Olympic Lift",
    "tier": "A+ Tier",
    "aliases": [
      "barbell power clean from floor"
    ]
  },
  {
    "id": "olympic_lift_power_snatch",
    "name": "Power Snatch",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "barbell power snatch from floor"
    ]
  },
  {
    "id": "cardio_recumbent_bike",
    "name": "Recumbent Bike",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "seated back-support stationary bike"
    ]
  },
  {
    "id": "cardio_upper_back_rowing_machine",
    "name": "Rowing Machine",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "concept2 row erg",
      "indoor rower"
    ]
  },
  {
    "id": "cardio_running",
    "name": "Running",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "outdoor road/track running"
    ]
  },
  {
    "id": "cardio_sport_skating",
    "name": "Skating",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "inline/ice skating"
    ]
  },
  {
    "id": "cardio_lats_ski_erg",
    "name": "Ski Erg",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "concept2 ski ergometer"
    ]
  },
  {
    "id": "sport_skiing",
    "name": "Skiing",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "alpine/cross-country skiing"
    ]
  },
  {
    "id": "olympic_lift_snatch",
    "name": "Snatch",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "full olympic squat snatch"
    ]
  },
  {
    "id": "sport_snowboarding",
    "name": "Snowboarding",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "alpine snowboarding"
    ]
  },
  {
    "id": "cardio_spinning",
    "name": "Spinning",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "indoor spin cycle class"
    ]
  },
  {
    "id": "olympic_lift_split_jerk",
    "name": "Split Jerk",
    "muscle": "Olympic Lift",
    "tier": "A Tier",
    "aliases": [
      "rack barbell overhead split jerk"
    ]
  },
  {
    "id": "cardio_hamstrings_sprints",
    "name": "Sprints",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "track/hill max-effort sprinting"
    ]
  },
  {
    "id": "cardio_glutes_stair_machine_floors",
    "name": "Stair Machine (Floors)",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "stairmaster stepmill (floors climbed)"
    ]
  },
  {
    "id": "cardio_glutes_stair_machine_steps",
    "name": "Stair Machine (Steps)",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "stairmaster stepmill (total steps)"
    ]
  },
  {
    "id": "mobility_stretching",
    "name": "Stretching",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "static/dynamic cooldown stretching"
    ]
  },
  {
    "id": "cardio_swimming",
    "name": "Swimming",
    "muscle": "Cardio",
    "tier": "A Tier",
    "aliases": [
      "lap pool swimming"
    ]
  },
  {
    "id": "cardio_treadmill",
    "name": "Treadmill",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "incline treadmill walk / run"
    ]
  },
  {
    "id": "cardio_walking",
    "name": "Walking",
    "muscle": "Cardio",
    "tier": "B Tier",
    "aliases": [
      "outdoor brisk walking"
    ]
  },
  {
    "id": "mobility_warm_up",
    "name": "Warm Up",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "general dynamic warmup"
    ]
  },
  {
    "id": "mobility_yoga",
    "name": "Yoga",
    "muscle": "Cardio",
    "tier": "C Tier",
    "aliases": [
      "vinyasa / hatha yoga"
    ]
  },
  {
    "id": "front_delts_overhead_plate_raise",
    "name": "Overhead Plate Raise",
    "muscle": "Front Delts",
    "tier": "B Tier",
    "aliases": [
      "plate overhead raise",
      "weight plate raise"
    ]
  },
  {
    "id": "forearm_flexors_seated_wrist_curl_barbell",
    "name": "Seated Wrist Curl (Barbell)",
    "muscle": "Forearm Flexors",
    "tier": "A Tier",
    "aliases": [
      "barbell wrist curl",
      "seated barbell wrist curl",
      "barbell forearm curl",
      "palms up barbell wrist curl"
    ]
  },
  {
    "id": "forearm_extensors_reverse_wrist_curl_dumbbell",
    "name": "Reverse Wrist Curl (Dumbbell)",
    "muscle": "Forearm Extensors",
    "tier": "B Tier",
    "aliases": [
      "dumbbell reverse wrist curl",
      "db reverse wrist curl",
      "reverse forearm curl dumbbell",
      "palms down dumbbell wrist curl"
    ]
  }
];
