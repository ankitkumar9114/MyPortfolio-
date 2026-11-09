// Address of the portfolio CMS. Kept off the obvious /admin so it isn't
// found by guessing. This only hides it: what actually protects the content
// is the email + password sign-in and the Firestore rules. The folder
// src/app/ak-studio-4q7m must have the same name; rename both to move it again.
export const ADMIN_BASE = "/ak-studio-4q7m";
