import { defineStorage } from "@aws-amplify/backend";

/**
 * S3 storage for the Lift Station E-02 daily construction reports.
 *
 * - `reports/*`      the source daily report documents (the .doc files the
 *                    Construction records were extracted from)
 * - `photos/{id}/*`  site photos a user attaches to that Construction record
 *
 * The search site is public (API key auth, no sign-in), so guests can read
 * both prefixes. `reports/` stays read-only for guests: those documents are
 * the system of record.
 *
 * WARNING: guests can write and delete under `photos/`. That is what lets the
 * photo upload and delete buttons work without a login, but it also means
 * anyone who can reach the site can add or remove photos. Put the app behind
 * Cognito and drop the guest write/delete grants if that is not acceptable.
 */
export const storage = defineStorage({
  name: "constructionReports",
  access: (allow) => ({
    "reports/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "photos/*": [
      allow.guest.to(["read", "write", "delete"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});
