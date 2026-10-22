export function getScheduledAttendanceLogDocId(uid: string, subjectId: string, date: string, type: string, index: number = 0) {
  return `${uid}_${subjectId}_${date}_${type}_${index}`;
}
