/* Institute policies. Downstream modules read these values at the moment an
   operation happens (attendance thresholds, negative marking defaults, late
   joining, recording visibility, password policy). */

export const DEFAULT_POLICIES = {
  attendance: {
    defaultThresholdPercent: 75,
    graceMinutes: 5,
    minimumEligibleMinutes: 10,
    countPartialAbovePercent: 40,
    allowFacultyCorrection: true,
    correctionRequiresApproval: true,
    lateJoinAllowanceMinutes: 15,
  },
  examination: {
    negativeMarkingEnabled: true,
    defaultNegativeMarkValue: 1,
    defaultQuestionMarks: 4,
    accessWindowMinutes: 15,
    allowLateJoin: false,
    autoSubmitOnExpiry: true,
    requireInstructionsAcknowledged: true,
    requireAdminApprovalToPublish: false,
    shuffleQuestionsByDefault: false,
    resultVisibility: 'immediate',
  },
  recording: {
    visibility: 'batch-only',
    requireApprovalToPublish: true,
    allowDownloadForStudents: true,
    retentionDays: 180,
  },
  account: {
    passwordMinLength: 8,
    requireUppercase: true,
    requireNumber: true,
    requireSymbol: true,
    forceChangeOnFirstLogin: true,
    sessionTimeoutMinutes: 480,
    allowSelfServicePasswordReset: false,
    maxFailedAttempts: 5,
  },
  notifications: {
    examReminderHoursBefore: 24,
    classReminderMinutesBefore: 15,
    emailDigest: 'daily',
    attendanceWarningEnabled: true,
  },
  display: {
    weekStart: 'Monday',
    timeFormat: '24h',
    dateFormat: 'DD MMM YYYY',
    density: 'comfortable',
  },
}

export const POLICY_AUDIT_SEED_NOTE =
  'Policy changes are recorded in the audit log with previous and new values.'
