import {type ClientSchema, a, defineData} from "@aws-amplify/backend";
import { deleteUser } from "./deleteUser/resource"
import { createUserInCognito } from "./createUser/resource"
import {postConfirmation} from "../auth/postConfirmation/resource"
import {postAuthentication} from "../auth/postAuthentication/resource"

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
        administrator: a.boolean().default(false),
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
        logicalId: a.id().required(),
        filename: a.string().required(),
        isDirectory: a.boolean().default(false),
        filepath: a.string().required(),
        parentId: a.id().required(),
        filetype: a.string(),
        size: a.integer().required(),
        storageId: a.id(),
        versionId: a.string().required(), // Sort key in secondary index
        ownerId: a.id().required(),
        projectId: a.id().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime().required(),
        messages: a.hasMany("Message", ["fileId","projectId"]),
        tags: a.string().array(), // <-CHANGE
        isDeleted: a.integer().required(), //0 : not deleted, 1 : deleted
        deletedAt: a.datetime(),
        parent: a.belongsTo("File", ["parentId","projectId"]),
        children: a.hasMany("File", ["parentId","projectId"]),
        ownerDetails: a.belongsTo("User", "ownerId"),
        project: a.belongsTo("Project", "projectId"),
      })
      .identifier(["fileId","projectId"]) // Use only `fileId` as primary key, projectId as sort key
      .secondaryIndexes((index) => [
        index("logicalId").sortKeys(["versionId"]).name("Version"), //Secondary index
        index("projectId").name("byProject"),
        index("projectId").sortKeys(["isDeleted"]),
        index("projectId").sortKeys(["parentId"]).name("byProjectIdAndParentId").queryField("listByProjectIdAndParentId"),
        index("projectId").sortKeys(["filepath"])
      ]),

      batchUpdateFile: a
      .mutation()
      .arguments({
          fileIds: a.string().array(),
          projectId: a.string(),
          parentIds: a.string().array(),
          filepaths: a.string().array()
      })
      .returns(a.json())
      .handler(
          a.handler.custom({
              dataSource: a.ref("File"),
              entry: "./batchUpdateFile.js"
          })
      ),
    batchGetFile: a
        .query()
        .arguments({
            projectId: a.string(),
            rootIds: a.string().array()
        })
        .returns(a.ref("File").array())
        .handler(
            a.handler.custom({
                dataSource: a.ref("File"),
                entry: "./getFilesByRootId.js"
            })
        ),
  searchFiles: a
      .query()
      .arguments({
          projectId: a.string(),
          fileNames: a.string().array(),
          tagNames: a.string().array()
      })
      .returns(a.ref("File").array())
      .handler(
          a.handler.custom({
              dataSource: a.ref("File"),
              entry: "./searchFiles.js"

          })
        ),


    // Message model
    Message: a
      .model({
        messageId: a.id().required(),
        fileId: a.id(), // Foreign key linking to File
        userId: a.id().required(), // Foreign key linking to User
        projectId: a.id(),
        content: a.string().required(),
        createdAt: a.datetime().required(),
        updatedAt: a.datetime(),
        isUpdated: a.boolean().default(false),
        isDeleted: a.boolean().default(false),
        tags: a.string().array(),
        file: a.belongsTo("File", ["fileId","projectId"]), // Define belongsTo relationship with File
        sender: a.belongsTo("User", "userId"), // Define belongsTo relationship with User
      })
      .identifier(["messageId"])
      .secondaryIndexes((index) => [
        index("fileId").sortKeys(["createdAt"]).name("messagesByFileIdAndPagination"), // Secondary index for querying messages by fileId
          index("projectId").sortKeys(["createdAt"]).name("messagesByProjectIdAndPagination")
      ]),


    
    searchMessages: a
        .query()
        .arguments({
            fileId: a.string(),
            messageContents: a.string().array(),
            tagNames: a.string().array()
        })
        .returns(a.ref("Message").array())
        .handler(
            a.handler.custom({
                dataSource: a.ref("Message"),
                entry: "./searchMessages.js"
            })
        ),
      searchMessagesByProjectId: a
          .query()
          .arguments({
              projectId: a.string(),
              messageContents: a.string().array(),
              tagNames: a.string().array()
          })
          .returns(a.ref("Message").array())
          .handler(
              a.handler.custom({
                  dataSource: a.ref("Message"),
                  entry: "./searchMessagesByProjectId.js"
              })
          ),
  
  getMessagesByFileId: a
  .query()
  .arguments({
    fileId: a.string(),
    nextToken: a.string(),
    limit: a.integer(),
  })
  .returns(a.json())
  .handler(
    a.handler.custom({
      dataSource: a.ref("Message"),
      entry: "./getMessagesByFileId.js",
    })
  ),

      getMessagesByProjectId: a
          .query()
          .arguments({
              projectId: a.string(),
              nextToken: a.string(),
              limit: a.integer(),
          })
          .returns(a.json())
          .handler(
              a.handler.custom({
                  dataSource: a.ref("Message"),
                  entry: "./getMessagesByProjectId.js"

              })
          ),

  // Whitelist model
  Whitelist: a
  .model({
    whitelistId: a.id().required(),
    userIds: a.id().required(), // User ID being whitelisted
    createdAt: a.datetime().required(),
    createdBy: a.id().required(), // ID of the user who created the whitelist entry
    projectId: a.id().required(),
    role: a.enum(["NONE", "USER", "ADMIN", "HEAD"]), // Role-specific permission

    // Relationships
    user: a.belongsTo("User", "userIds"),
    project: a.belongsTo("Project", "projectId"),
  })
  .identifier(["whitelistId"]),
  createUserInCognito: a
      .mutation()
      .arguments({
          email: a.string().required()
      })
      .authorization((allow) => [allow.group("ADMINISTRATOR")])
      .handler(a.handler.function(createUserInCognito))
      .returns(a.json()),


  deleteUserFromCognito: a
      .mutation()
      .arguments({
          userId: a.string().required(),
          username: a.string().required(),
      })
      .authorization((allow) => [allow.group("ADMINISTRATOR")])
      .handler(a.handler.function(deleteUser))
      .returns(a.json())
}).authorization((allow) => [
  allow.groups(["USER", "ADMINISTRATOR"]), allow.resource(postConfirmation), allow.resource(postAuthentication), allow.resource(deleteUser)
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
