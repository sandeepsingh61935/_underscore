/**
 * Product copy for danger / caution single-step confirms.
 * Names the object, states what is lost; Cancel is always the safe action.
 * @see ui_kits/extension/v3/screens-dialogs.jsx
 * @see docs/superpowers/specs/2026-08-04-v3-extension-ui-prd.md § Dialogs
 */

export type ConfirmSeverity = 'danger' | 'caution';

export interface ConfirmDialogCopy {
  severity: ConfirmSeverity;
  title: string;
  /** Primary warning line (object + impact). */
  message: string;
  /** Secondary note (cannot undo / softer access note). */
  note: string;
  cancelLabel: string;
  confirmLabel: string;
  /** Substrings of `message` rendered with strong emphasis. */
  strongNames: string[];
}

const DANGER_NOTE = 'This action cannot be undone.';

function highlightWord(count: number): string {
  return count === 1 ? 'highlight' : 'highlights';
}

export function deleteDomainCopy(domain: string, count: number): ConfirmDialogCopy {
  return {
    severity: 'danger',
    title: 'Delete this domain?',
    message: `This permanently removes ${count} ${highlightWord(count)} from ${domain} and all of its sections.`,
    note: DANGER_NOTE,
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete permanently',
    strongNames: [domain],
  };
}

export function deleteSectionCopy(
  domain: string,
  sectionPath: string,
  count: number,
): ConfirmDialogCopy {
  const pathLabel = sectionPath === '/' ? domain : sectionPath;
  const names =
    sectionPath === '/'
      ? [domain]
      : [sectionPath, domain];
  return {
    severity: 'danger',
    title: 'Delete this section?',
    message:
      sectionPath === '/'
        ? `This permanently removes ${count} ${highlightWord(count)} in ${domain}.`
        : `This permanently removes ${count} ${highlightWord(count)} in ${pathLabel} on ${domain}.`,
    note: DANGER_NOTE,
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete permanently',
    strongNames: names,
  };
}

export function deleteHighlightCopy(): ConfirmDialogCopy {
  return {
    severity: 'danger',
    title: 'Delete this highlight?',
    message:
      'The quote, note, and tags will be removed. Nothing else in the section is affected.',
    note: DANGER_NOTE,
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete',
    strongNames: [],
  };
}

export function deleteLibraryCopy(isSignedIn: boolean): ConfirmDialogCopy {
  if (isSignedIn) {
    return {
      severity: 'danger',
      title: 'Delete entire library?',
      message:
        'This permanently removes all highlights from this device and marks them deleted in the cloud.',
      note: DANGER_NOTE,
      cancelLabel: 'Cancel',
      confirmLabel: 'Delete permanently',
      strongNames: [],
    };
  }
  return {
    severity: 'danger',
    title: 'Delete entire library?',
    message:
      'This permanently removes all highlights stored on this device as a guest.',
    note: DANGER_NOTE,
    cancelLabel: 'Cancel',
    confirmLabel: 'Delete permanently',
    strongNames: [],
  };
}

export function signOutCopy(): ConfirmDialogCopy {
  return {
    severity: 'caution',
    title: 'Sign out?',
    message:
      "You'll keep Guest access on this device. Cloud sync and export pause until you sign in again.",
    note: 'Highlights on this device stay.',
    cancelLabel: 'Stay signed in',
    confirmLabel: 'Sign out',
    strongNames: [],
  };
}

export function removeApiKeyCopy(providerLabel: string): ConfirmDialogCopy {
  return {
    severity: 'caution',
    title: 'Remove API key?',
    message: `${providerLabel} will stop working for Ask and summarize until you add a key again. The key is deleted only from this browser.`,
    note: 'You can paste a new key anytime.',
    cancelLabel: 'Keep key',
    confirmLabel: 'Remove key',
    strongNames: [providerLabel],
  };
}

export function discardEditsCopy(): ConfirmDialogCopy {
  return {
    severity: 'caution',
    title: 'Discard edits?',
    message: 'Unsaved changes to this highlight will be lost.',
    note: 'The saved version stays as-is.',
    cancelLabel: 'Keep editing',
    confirmLabel: 'Discard',
    strongNames: [],
  };
}
