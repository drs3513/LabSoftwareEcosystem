import {type ClientSchema, a, defineData, defineFunction} from "@aws-amplify/backend";
import { echoHandler } from '../functions/echo/resource'
import {listFilesByProjectIdAndParentIdsHandler} from "../functions/listFilesByProjectIdAndParentIds/resource";
import { ApiKey } from "aws-cdk-lib/aws-apigateway";


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
        whitelist: a.hasMany("Whitelist", "projectId"),
      }).identifier(["projectId"]),

      
      File: a
      .model({
        fileId: a.id().required(), // Primary key
        filename: a.string().required(),
        isDirectory: a.boolean().default(false),
        filepath: a.string().required(),
        parentId: a.id().required(),
        size: a.integer().required(),
        storageId: a.id(),
        versionId: a.string().required(), // Sort key in secondary index
        ownerId: a.id().required(),
        projectId: a.id().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime().required(),
        messages: a.hasMany("Message", ["fileId","projectId"]),
        tag: a.hasMany("Tag", ["fileId","projectId"]),
        isDeleted: a.boolean().required(),
        deletedAt: a.datetime(),
        parent: a.belongsTo("File", ["parentId","projectId"]),
        children: a.hasMany("File", ["parentId","projectId"]),
    
        ownerDetails: a.belongsTo("User", "ownerId"),
        project: a.belongsTo("Project", "projectId"),
      })
      .identifier(["fileId","projectId"]) // Use only `fileId` as primary key
      .secondaryIndexes((index) => [
        index("fileId").sortKeys(["versionId"]), //Secondary index
      ]),



      listFilesByProjectIdAndParentIds: a
          .query()
          .arguments({
              projectId: a.string(),
              parentIds: a.string().array()
          })
          .returns(a.ref('File').array())
          .handler(a.handler.custom({
              dataSource: a.ref('File'),
              entry: '../functions/listFilesByProjectIdAndParentIds/handler.js'
          })),
      //BatchUpdateFile: a
      //    .mutation()
      //    .arguments({
//
      //})
      //    .returns(
      //        a.ref('Post').array()
      //    )
      //    .handler(
      //    a.handler.function().async()
      //),
    


    // Message model
    Message: a
      .model({
        messageId: a.id().required(),
        fileId: a.id().required(), // Foreign key linking to File
        userId: a.id().required(), // Foreign key linking to User
        projectId: a.id().required(),
        content: a.string().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime(),
        isUpdated: a.boolean().default(false),
        tag: a.hasMany("Tag","messageId"),
        file: a.belongsTo("File", ["fileId","projectId"]), // Define belongsTo relationship with File
        
        sender: a.belongsTo("User", "userId"), // Define belongsTo relationship with User
      })
      .identifier(["messageId"]),

    // Tag model
    Tag: a
      .model({
        tagId: a.id().required(),
        tagType: a.enum(["file", "message"]), // Enum for Tag type
        fileId: a.id(), // Foreign key linking to File or Message
        projectId: a.id(),
        messageId: a.id(),
        tagName: a.string().required(),
        createdAt: a.datetime().required(),

        // Relationships
        file: a.belongsTo("File", ["fileId","projectId"]),
        message: a.belongsTo("Message", "messageId"),})
    .identifier(["tagId"]),

    // Whitelist model
  Whitelist: a
  .model({
    whitelistId: a.id().required(),
    userIds: a.id().required(), // User ID being whitelisted
    createdAt: a.datetime().required(),
    projectId: a.id().required(),
    isAdmin: a.boolean().default(false), // Indicates if user is admin for this file/project
    role: a.enum(["USER", "ADMIN", "HEAD"]), // Role-specific permission

    // Relationships
    user: a.belongsTo("User", "userIds"),
    project: a.belongsTo("Project", "projectId"),
  })
  .identifier(["whitelistId"]),

}).authorization((allow) => [
  allow.authenticated(),
]);
export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: "userPool", // Use API key for testing
    apiKeyAuthorizationMode: {
      expiresInDays: 30, // API key validity period
    },
  },
});
