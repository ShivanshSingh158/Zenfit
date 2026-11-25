import { StyleSheet } from 'react-native';
import { COLORS, DARK_TOKENS, FONT_FAMILY, RADIUS, SPACE, TOUCH } from '../../../theme/tokens';

export const makeHistoryStyles = (tokens: typeof DARK_TOKENS) => StyleSheet.create({
root: {
    flex: 1,
    backgroundColor: tokens.bg.canvas,
  },
  scrollContent: {
    paddingHorizontal: 6,
    paddingTop: 2,
    paddingBottom: 110,
    gap: 10,
  },

  // Header
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.md,
    paddingTop: SPACE.xs,
    paddingBottom: SPACE.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: -0.3,
    color: tokens.text.primary,
  },
  headerSubtitle: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  coachReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: tokens.bg.surface,
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: RADIUS.inner,
  },
  coachReportBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },

  // Segmented Control (Minimal, Subtle, No Pills)
  segmentedTrack: {
    flexDirection: 'row',
    marginHorizontal: 6,
    marginBottom: SPACE.sm,
    padding: 3,
    borderRadius: RADIUS.md,
    backgroundColor: tokens.bg.surface,
    gap: 2,
  },
  segmentBtn: {
    flex: 1,
    minHeight: TOUCH.minTarget,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.inner,
  },
  segmentText: {
    fontSize: 13,
  },
  segmentTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  segmentTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },

  // Inset Cards (Layer 2 Tonal Surface)
  insetCard: {
    backgroundColor: tokens.isDark ? '#0F1015' : tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: tokens.border.subtle,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACE.sm,
  },
  cardSectionLabel: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  cardSubLabel: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.muted,
    marginTop: 2,
  },

  // ── Executive Weekly Hero Card ──
  heroCard: {
    borderRadius: RADIUS.card,
    padding: SPACE.lg,
    gap: SPACE.md,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  heroLabel: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.6,
  },
  heroValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACE.xs,
    marginTop: SPACE.xs,
  },
  heroVolNum: {
    fontSize: 32,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.5,
  },
  heroVolUnit: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
  },
  heroVolSub: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
    includeFontPadding: false,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokens.accent.primaryDim,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.inner,
  },
  heroBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },
  heroDivider: {
    height: 1,
    backgroundColor: tokens.border.subtle,
  },
  heroStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  heroStatVal: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  heroStatLbl: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.5,
    marginTop: 3,
  },
  heroStatDivider: {
    width: 1,
    height: 24,
    backgroundColor: tokens.border.subtle,
  },

  // KPI Grid (Consistency & Exercises Sub-Tabs)
  kpiGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    paddingTop: 6,
  },
  kpiCol: {
    alignItems: 'center',
    flex: 1,
  },
  kpiValue: {
    fontSize: 20,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.3,
  },
  kpiLabel: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.5,
    marginTop: 3,
  },

  // 8-Week Workload Bar Chart
  weekInspectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACE.sm,
    borderRadius: RADIUS.inner,
    paddingHorizontal: SPACE.md,
    paddingVertical: SPACE.sm,
    marginTop: 6,
  },
  weekInspectTitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  weekInspectDetails: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  chartFootnoteRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: SPACE.sm,
    paddingHorizontal: SPACE.xs,
  },
  chartFootnote: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.muted,
  },

  // Muscle Sets Rows
  muscleSetRow: {
    gap: SPACE.xs,
  },
  muscleSetInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  muscleSetName: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
  },
  muscleSetCount: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  muscleBarTrack: {
    height: 4,
    backgroundColor: tokens.bg.elevated,
    borderRadius: 2,
    overflow: 'hidden',
  },
  muscleBarFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Search & Chips
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 40,
    borderRadius: RADIUS.inner,
    paddingHorizontal: 10,
    backgroundColor: tokens.bg.surface,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
    paddingVertical: 0,
  },
  horizontalChipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  exChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  exChipBtnActive: {
    backgroundColor: tokens.accent.primary,
  },
  exChipBtnInactive: {
    backgroundColor: tokens.bg.surface,
  },
  exChipText: {
    fontSize: 12,
  },
  exChipTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  exChipTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
  },
  exChipCount: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
  },
  exChipCountActive: {
    color: tokens.accent.onPrimary,
    opacity: 0.7,
  },
  exChipCountInactive: {
    color: tokens.text.secondary,
  },

  // Exercise Hero
  exHeroTitle: {
    fontSize: 18,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  exHeroSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },

  // Progression Status
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusMessage: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.primary,
    flex: 1,
  },

  // Trajectory Metric Toggle
  metricToggleTrack: {
    flexDirection: 'row',
    borderRadius: RADIUS.sm,
    padding: 2,
  },
  metricToggleBtn: {
    minHeight: 36,
    paddingHorizontal: 10,
    justifyContent: 'center',
    borderRadius: 6,
  },
  metricToggleText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
  },
  dataPointTooltip: {
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: SPACE.xs,
    alignSelf: 'flex-start',
  },
  tooltipText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  emptyNote: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    marginTop: SPACE.sm,
  },

  // Past Exercise Sessions
  pastExSessRow: {
    borderRadius: RADIUS.inner,
    padding: 10,
    gap: SPACE.xs,
  },
  pastExSessHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pastExSessDate: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  pastExSessVol: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  pastExSetsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  pastExSetText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },

  // Split Filter Chips in Logs
  splitFilterBtn: {
    minHeight: 28,
    paddingHorizontal: 12,
    justifyContent: 'center',
    borderRadius: RADIUS.sm,
  },
  splitFilterBtnActive: {
    backgroundColor: tokens.accent.primary,
  },
  splitFilterBtnInactive: {
    backgroundColor: tokens.bg.surface,
  },
  splitFilterText: {
    fontSize: 12,
  },
  splitFilterTextActive: {
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  splitFilterTextInactive: {
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  logsCountHeader: {
    paddingHorizontal: SPACE.xs,
    marginTop: SPACE.xs,
  },

  // Session Cards (Workout Diary)
  sessionCard: {
    backgroundColor: tokens.bg.surface,
    borderRadius: RADIUS.card,
    padding: 14,
    gap: SPACE.sm,
  },
  sessionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  sessionSplitTag: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: 0.6,
  },
  sessionDateText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    marginTop: 2,
  },
  sessionSummaryMetrics: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  sessionSubMetrics: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 2,
  },
  sessExRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sessExDot: {
    fontSize: 12,
    color: tokens.text.secondary,
  },
  sessExName: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    flex: 1,
  },
  sessExSetsText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
  },
  sessMoreExText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
    paddingLeft: SPACE.md,
  },
  sessCardioWrap: {
    paddingVertical: 2,
  },
  sessCardioText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  sessNotesText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    fontStyle: 'italic',
  },
  sessionFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  repeatBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tokens.accent.primary,
    minHeight: 28,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  repeatBtnText: {
    fontSize: 11.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  detailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    minHeight: 30,
    paddingVertical: 4,
  },
  detailsBtnText: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 38,
    paddingVertical: SPACE.sm,
    borderRadius: RADIUS.lg,
    marginTop: SPACE.xs,
  },
  loadMoreBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },

  // Modal
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACE.lg,
    paddingVertical: SPACE.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  modalTitle: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  modalSubtitle: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Consistency & Status Badges ──
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    backgroundColor: 'rgba(255, 159, 10, 0.15)',
  },
  streakBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.status.warning,
  },
  workloadBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: 6,
    alignSelf: 'center',
  },
  workloadBadgeText: {
    fontSize: 10,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.3,
  },
  statusBadge: {
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBadgeText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    letterSpacing: 0.5,
  },

  // ── Progressive Overload Scorecard ──
  overloadRateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: SPACE.sm,
    paddingVertical: SPACE.xs,
    borderRadius: RADIUS.sm,
  },
  overloadRateBadgeText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.status.success,
  },
  scorecardGrid: {
    flexDirection: 'row',
    gap: SPACE.sm,
    marginTop: 10,
  },
  scorecardItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.xs,
  },
  scorecardItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACE.xs,
  },
  scorecardDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  scorecardVal: {
    fontSize: 17,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
    letterSpacing: -0.2,
  },
  scorecardLabel: {
    fontSize: 8.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.secondary,
    letterSpacing: 0.4,
    textAlign: 'center',
  },

  // ── Anchor Lifts Big-3 Cards (Stacked Full-Width Rows) ──
  anchorTotalBadge: {
    backgroundColor: tokens.bg.elevated,
    paddingHorizontal: SPACE.sm,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
  },
  anchorTotalBadgeText: {
    fontSize: 10.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  anchorList: {
    gap: SPACE.sm,
    marginTop: SPACE.sm,
  },
  anchorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
  },
  anchorCatPill: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(124, 92, 252, 0.15)',
    minWidth: 42,
    alignItems: 'center',
  },
  anchorCatText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.secondary,
    letterSpacing: 0.5,
  },
  anchorExName: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  anchorSetSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  anchorE1rmCol: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  anchorE1rmVal: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  anchorE1rmUnit: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.text.secondary,
  },

  // ── Week Navigator Styles (Borderless Hairline Bar) ──
  weekNavigatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACE.xs,
    paddingBottom: SPACE.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: tokens.border.subtle,
  },
  weekNavArrowBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.isDark ? 'rgba(255,255,255,0.06)' : tokens.bg.elevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekNavCenterBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: SPACE.sm,
    minHeight: 36,
  },
  weekNavTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekNavTitleText: {
    fontSize: 14,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  currentWeekTag: {
    marginLeft: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: tokens.accent.primaryDim,
  },
  currentWeekTagText: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
    letterSpacing: 0.5,
  },
  weekNavJumpTodayText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.accent.primary,
    marginTop: 2,
  },

  // ── Weekly Analytics Empty-State Styles ──
  emptyWeekCard: {
    padding: 28,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACE.md,
  },
  emptyIconCircle: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.md,
    backgroundColor: tokens.accent.primaryDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACE.xs,
  },
  emptyWeekTitle: {
    fontSize: 16,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  emptyWeekSub: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    maxWidth: 290,
    marginBottom: SPACE.xs,
  },
  startTodayWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 38,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: tokens.accent.primary,
  },
  startTodayWorkoutBtnText: {
    fontSize: 13,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  startGeneralWorkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 38,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.md,
    backgroundColor: tokens.accent.primary,
  },
  startGeneralWorkoutBtnText: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.onPrimary,
  },
  emptyPastWeekCard: {
    padding: 28,
    borderRadius: RADIUS.card,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyPastWeekTitle: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  emptyPastWeekSub: {
    fontSize: 12,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    textAlign: 'center',
    maxWidth: 260,
  },
  returnCurrentWeekBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 32,
    paddingHorizontal: 14,
    borderRadius: RADIUS.inner,
    backgroundColor: tokens.accent.primaryDim,
    marginTop: 6,
  },
  returnCurrentWeekBtnText: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },

  // ── Weekly Sessions List Styles ──
  weekSessionsCard: {
    padding: 14,
    borderRadius: RADIUS.card,
    gap: SPACE.sm,
  },
  weekSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: TOUCH.minTarget,
    paddingVertical: SPACE.md,
    paddingHorizontal: SPACE.md,
    borderRadius: RADIUS.lg,
    marginBottom: 6,
  },
  weekSessionDateBadge: {
    width: 44,
    paddingVertical: 6,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    backgroundColor: tokens.bg.elevated,
  },
  weekSessionDateDay: {
    fontSize: 9.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.accent.primary,
  },
  weekSessionDateNum: {
    fontSize: 15,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  weekSessionMain: {
    flex: 1,
    paddingRight: SPACE.sm,
  },
  weekSessionTitle: {
    fontSize: 13.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  weekSessionSub: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.regular,
    color: tokens.text.secondary,
    marginTop: 2,
  },
  weekSessionRight: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  weekSessionVol: {
    fontSize: 12.5,
    fontFamily: FONT_FAMILY.bold,
    color: tokens.text.primary,
  },
  weekSessionDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    gap: 2,
  },
  weekSessionDetailsText: {
    fontSize: 11,
    fontFamily: FONT_FAMILY.medium,
    color: tokens.accent.primary,
  },
});
