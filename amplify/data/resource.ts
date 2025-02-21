import { type ClientSchema, a, defineData } from "@aws-amplify/backend";

const schema = a
  .schema({
    // User model
    User: a
      .model({
        userId: a.id().required(),
        username: a.string().required(),
        email: a.string().required(),
        createdAt: a.datetime().required(),
        files: a.hasMany("File", "ownerId"), // Define reciprocal relationship with File
        messages: a.hasMany("Message", "userId"),
        whitelist: a.hasMany("Whitelist","userIds"),
        projects: a.hasMany("Project","userId"),
      })
      .identifier(["userId"]),

    // Project model
    Project: a
      .model({
        projectId: a.id().required(),
        userId: a.id().required(),
        projectName: a.string().required(),
        isDeleted: a.boolean().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime(),
        deletedAt: a.datetime(),
        projectowner: a.belongsTo("User","userId"),
        files: a.hasMany("File","projectId"),
      }).identifier(["projectId"]),

    // File model
    File: a
      .model({
        fileId: a.id().required(),
        filename: a.string().required(),
        isDirectory: a.boolean().default(false),
        filepath: a.string().required(),
        parentId: a.id(),
        size: a.integer().required(),
        versionId: a.string().required(),
        ownerId: a.id().required(), // Foreign key linking to User
        projectId: a.id().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime().required(),
        messages: a.hasMany("Message", "fileId"), // Relationship with Message
        whitelist: a.hasMany("Whitelist", "fileId"),
        tag: a.hasMany("Tag","fileId"),
        isDeleted: a.boolean().required(),
        deletedAt: a.datetime(),

        parent: a.belongsTo("File","parentId"),
        children: a.hasMany("File","parentId"),

        ownerDetails: a.belongsTo("User", "ownerId"), 
        project: a.belongsTo("Project","projectId"),
      })
      .identifier(["fileId"]),

    // Message model
    Message: a
      .model({
        messageId: a.id().required(),
        fileId: a.id().required(), // Foreign key linking to File
        userId: a.id().required(), // Foreign key linking to User
        content: a.string().required(),
        createdAt: a.datetime().required(),
        tag: a.hasMany("Tag","messageId"),
        file: a.belongsTo("File", "fileId"), // Define belongsTo relationship with File
        sender: a.belongsTo("User", "userId"), // Define belongsTo relationship with User
        edited: a.boolean().default(false), // Track if the message has been edited
        deleted: a.boolean().default(false), // Track if the message has been deleted
      })
      .identifier(["messageId"]),

    // Tag model
    Tag: a
      .model({
        tagId: a.id().required(),
        tagType: a.enum(["file", "message"]), // Enum for Tag type
        fileId: a.id(), // Foreign key linking to File or Message
        messageId: a.id(),
        tagName: a.string().required(),
        createdAt: a.datetime().required(),

        // Relationships
        file: a.belongsTo("File", "fileId"),
        message: a.belongsTo("Message", "messageId"),})
    .identifier(["tagId"]),

    // Whitelist model
    Whitelist: a
      .model({
        whitelistId: a.id().required(),
        userIds: a.id().required(), // Associates users to file to whitelist. sort key?
        fileId: a.id().required(), // Foreign key linking to File
        createdAt: a.datetime().required(),
        user: a.belongsTo("User","userIds"),
        file: a.belongsTo("File","fileId"),
      })
      .identifier(["whitelistId"]),
  })
  .authorization((allow) => [
    allow.publicApiKey(),
    allow.owner("userPools"), // Correctly use "userPools" as the provider
    allow.groups(["whitelistedUserIds"]), // Use an array for groups
  ]);

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "apiKey", // Use API key for testing
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // API key validity period
    },
  },
});
