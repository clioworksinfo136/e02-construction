## Lift Station E-02 Rehabilitation Project — Daily Report Search

A React+Vite front end over an AWS Amplify (AppSync + DynamoDB) backend that
stores the inspector's daily construction reports and lets you search them by
keyword.

### Data model

`amplify/data/resource.ts` defines the `Construction` model. Each record is one
row of `construction-report.xlsx`; attribute names are derived from the
spreadsheet column headings (e.g. `Daily Progress Description` →
`dailyProgressDescription`). `date` is stored as an ISO date so records sort
chronologically.

### Ingesting the spreadsheet

`scripts/data/construction.json` holds the 97 report rows exported from the
workbook. To load them into the deployed table:

```bash
npx ampx sandbox --once       # deploy the backend, writes amplify_outputs.json
node scripts/ingest.mjs       # create one record per row (--wipe to replace)
node scripts/link-storage.mjs # set storageKey from the actual bucket contents
```

Both scripts are idempotent: `ingest.mjs` skips rows whose `sourceFile` is
already present, and `link-storage.mjs` only writes keys that changed.

`link-storage.mjs` matches records to S3 objects by file name (`sourceFile`),
deliberately **not** by the spreadsheet's `filePath`. `filePath` places the five
October 2014 reports under an `October 2014` folder, but the documents actually
live under `November 2014`; matching by name resolves them correctly. The
resolved key is stored on each record as `storageKey`.

### Storage

`amplify/storage/resource.ts` defines an S3 bucket (`constructionReports`) for
the report artifacts:

| Prefix                | Contents                               | Guest               | Authenticated       |
| --------------------- | -------------------------------------- | ------------------- | ------------------- |
| `reports/`            | source daily report documents (`.doc`)  | read                | read, write, delete |
| `photos/<recordId>/`  | photos a user attaches to a report      | read, write, delete | read, write, delete |

Reads are open because the search site itself is public (API key auth).

> **Guests can write and delete under `photos/`.** That is what makes the photo
> upload and delete buttons work without a login, but it also means anyone who
> can reach the site can add or remove photos. To lock this down, put the app
> behind Cognito (`@aws-amplify/ui-react`'s `Authenticator`) and drop the
> `write`/`delete` grants from `allow.guest` in `amplify/storage/resource.ts`.

Photos are keyed by record id, so no schema change is needed to associate them:
the app does one `list({ path: "photos/" })` on load and groups by the id
segment.

### Search behaviour

The app loads every report and filters in the browser: each whitespace-separated
keyword must appear somewhere in the record's attributes. Results are listed
newest first, one element per row, showing all attributes.

Each result header links to that report's source document in S3. Links are
pre-signed with `getUrl` for one hour and refreshed on a timer, so a tab left
open keeps working.

### Photos

A **Photo Upload** button sits beside each result's title and accepts multiple
images at once. Uploaded photos appear as thumbnails at the end of that result;
clicking one opens a full-size carousel with Backward / Forward / Delete /
Cancel, plus arrow-key and Escape support. Delete asks for confirmation, then
removes the object from S3. Deleting the last photo closes the carousel.

## Features

- **Authentication**: Setup with Amazon Cognito for secure user authentication.
- **API**: Ready-to-use GraphQL endpoint with AWS AppSync.
- **Database**: Real-time database powered by Amazon DynamoDB.

## Deploying to AWS

For detailed instructions on deploying your application, refer to the [deployment section](https://docs.amplify.aws/react/start/quickstart/#deploy-a-fullstack-app-to-aws) of our documentation.

## Security

See [CONTRIBUTING](CONTRIBUTING.md#security-issue-notifications) for more information.

## License

This library is licensed under the MIT-0 License. See the LICENSE file.