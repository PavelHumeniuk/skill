// All UI copy in one place, so another language can be added later.
export const t = {
  appName: 'Skill',
  tagline: 'One square a day. Keep practicing, or it fades.',
  emptyTitle: 'No skills yet',
  emptyBody: 'Add something you want to get better at. Each day you practice, fill one square.',
  addSkill: 'Add skill',
  settings: 'Settings',
  back: 'Back',

  // Add dialog
  newSkill: 'New skill',
  name: 'Name',
  namePlaceholder: 'e.g. Guitar, Spanish, Drawing',
  description: 'Description',
  descriptionPlaceholder: 'What does getting better look like? (optional)',
  startLevel: 'Starting level',
  startLevelHint: (level: number, cells: number) =>
    level === 0 ? 'Start from scratch.' : `Counts as ${cells} squares already earned.`,
  create: 'Create',
  cancel: 'Cancel',

  // Skill state
  level: 'Level',
  levelShort: 'Lv',
  doneToday: 'Done today',
  practiceToday: 'Practice today',
  markToday: 'Fill today’s square',
  undoToday: 'Undo today',
  fadesIn: (days: number) => (days <= 1 ? 'Fades tomorrow' : `Fades in ${days} days`),
  fadeNote: (days: number) =>
    `Practice within ${days} ${days === 1 ? 'day' : 'days'} or you lose a square.`,
  statStreak: 'day streak',
  statFade: 'days until fade',
  statTotal: 'squares total',
  squares: (filled: number, size: number) => `${filled} / ${size}`,
  toNext: (left: number) => `${left} more to level up`,
  masterTitle: 'Mastered',
  masterBody: 'You’ve filled every square. Keep practicing to hold on to it.',
  levelUp: (level: number, name: string) => `Level ${level} — ${name}!`,
  levelsPassed: 'Levels completed',
  totalSquares: (n: number) => `${n} squares total`,
  addDescription: 'Add a description',
  edit: 'Edit',
  save: 'Save',

  // Menu
  more: 'More actions',
  removeCell: 'Remove a square',
  removeCellConfirm: 'Remove one square from this skill? Use this to fix a mistake.',
  deleteSkill: 'Delete skill',
  deleteSkillConfirm: (name: string) => `Delete “${name}” and all its progress? This can’t be undone.`,
  notFound: 'This skill doesn’t exist.',

  // Storage problems
  storageUnavailable:
    'This browser blocks local storage, so progress won’t be saved. Check private mode or cookie settings.',
  dataUnreadable: (key: string) =>
    `Saved data couldn’t be read, so the app started empty. The original was kept in local storage under “${key}”.`,
  dataUnreadableNoBackup:
    'Saved data couldn’t be read or backed up. Saving is paused for this session so nothing gets overwritten.',
  saveFailed: 'Couldn’t save your progress (storage may be full). Export a backup from Settings.',
  dismiss: 'Dismiss',

  // Settings
  backup: 'Backup',
  backupBody: 'Your skills live only in this browser. Export a file to keep a copy or move to another device.',
  exportData: 'Export JSON',
  importData: 'Import JSON',
  importConfirm: (n: number) => `Replace your current skills with ${n} from this file?`,
  importDone: (n: number) => `Imported ${n} skills.`,
  importFailed: (msg: string) => `Import failed: ${msg}`,
  rules: 'How it works',
  rulesBody: [
    'You can fill one square per skill per day.',
    'Levels need 1, 2, 3, 5, 8, 13 and 21 squares. Fill all 53 to reach Master.',
    'Each 30 days without practice, a skill loses one square, and can drop a level.',
    'Filled a square by mistake? Undo it the same day, or remove a square from the menu.',
  ],
} as const;
