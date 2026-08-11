import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

/**
 * Data model for the "Lift Station E-02 Rehabilitation Project" daily
 * construction reports. Each Construction record is one row of the inspector's
 * daily report spreadsheet; attribute names come from the spreadsheet headings.
 */
const schema = a.schema({
  Construction: a
    .model({
      sourceFile: a.string(), // Source File
      projectNumber: a.string(), // Project Number
      filePath: a.string(), // File Path
      day: a.string(), // Day
      date: a.date(), // Date
      projectName: a.string(), // Project Name
      reportNumber: a.string(), // Report Number
      engineer: a.string(), // Engineer
      location: a.string(), // Location
      contractor: a.string(), // Contractor
      weatherTemperature: a.string(), // Weather/Temperature
      projectManager: a.string(), // Project Manager
      visitors: a.string(), // Visitors
      dailyProgressDescription: a.string(), // Daily Progress Description
      rainfallReport: a.string(), // Rainfall Report
      contractorPersonnel: a.string(), // Contractor Personnel
      equipment: a.string(), // Equipment
      distributionName: a.string(), // Distribution Name
      distributionSigned: a.string(), // Distribution Signed
      distributionDate: a.string(), // Distribution Date
      distributionTitle: a.string(), // Distribution Title
      distributionFile: a.string(), // Distribution File

      // S3 key of the source document in the constructionReports bucket.
      // Resolved from the actual bucket listing rather than from `filePath`,
      // which is wrong for a handful of the October/November 2014 reports.
      storageKey: a.string(),
    })
    .authorization((allow) => [allow.publicApiKey()]),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey",
    apiKeyAuthorizationMode: {
      expiresInDays: 30,
    },
  },
});
