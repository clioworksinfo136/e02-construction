import { defineStorage } from "@aws-amplify/backend";

/**
 * S3 storage for the Lift Station E-02 daily construction reports.
 *
 * - `reports/*`   the source daily report documents (the .doc files the
 *                 Construction records were extracted from)
 * - `photos/*`    site photos referenced by the daily reports
 *
 * Both are readable without signing in, because the search site itself is
 * public (API key auth). Uploading and deleting requires an authenticated user.
 */
export const storage = defineStorage({
  name: "constructionReports",
  access: (allow) => ({
    "reports/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
    "photos/*": [
      allow.guest.to(["read"]),
      allow.authenticated.to(["read", "write", "delete"]),
    ],
  }),
});
