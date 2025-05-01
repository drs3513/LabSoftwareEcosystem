import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {Nullable} from "@aws-amplify/data-schema";

const client = generateClient<Schema>();


interface Message {
  messageId: string;
  fileId: string;
  userId: string;
  content: string;
  createdAt: string;
  isUpdated?: boolean;
  isDeleted?: boolean;
  email?: string;
}

/**
 * Creates a new message associated with either a file or a project.
 *
 * @param {string} id - The fileId or projectId depending on the type.
 * @param {string} userId - ID of the user creating the message.
 * @param {string} content - Message content.
 * @param {number} type - 0 = file message, 1 = project message.
 * @returns {Promise<any>} A Promise resolving to the created message.
 */

export async function createMessage(id: string, userId: string, content: string, type: number) {
  try {
    const uuid = crypto.randomUUID();
    const messageId = `${uuid}`;
    const now = new Date().toISOString();
    if(type == 0){
      return await client.models.Message.create({
        messageId,
        fileId: id,
        userId,
        content,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      return await client.models.Message.create({
        messageId,
        projectId: id,
        userId,
        content,
        createdAt: now,
        updatedAt: now,
      });
    }

  } catch (error) {
    console.error("Error creating message:", error);
  }
}

/**
 * Fetches all messages linked to a specific fileId.
 * (No pagination – use only for non-chat scenarios.)
 *
 * @param {string} fileId
 * @returns {Promise<Message[]>} A list of matching messages.
 */

export async function getMessagesForFile(fileId: string) {
  try {
    const response = await client.models.Message.list();
    const messages = response.data;

    return messages.filter((msg) => msg.fileId === fileId);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}
interface PaginatedMessages {
  items: Message[]; // or Message[] if you have that type defined
  nextToken: string | null;
}

/**
 * Retrieves paginated messages for a file or project using custom AppSync query.
 *
 * @param {string | undefined} fileId - The target file ID.
 * @param {string | undefined} projectId - The target project ID.
 * @param {string | null} nextToken - The pagination token.
 * @returns {Promise<{ data: Message[]; nextToken: string | null }>} Paginated result.
 */

export async function getMessagesByFileIdAndPagination(
  fileId: string | undefined,
  projectId: string | undefined,
  nextToken: string | null
): Promise<{ data: Message[]; nextToken: string | null }> {
  try {
    if(!fileId && !projectId) return { data: [], nextToken: null };
    let results
    if(fileId){
      results = await client.queries.getMessagesByFileId({
        fileId,
        nextToken,
        limit: 10,
      });
    } else if(projectId) {
      results = await client.queries.getMessagesByProjectId({
        projectId,
        nextToken,
        limit: 10,
      });
    }

    //console.log("Full Results from getMessagesByFileId:", results);
    
    
    if (!results || !results.data || typeof results.data !== "string") {
      console.error("Error: results.data is null or undefined.");
      return { data: [], nextToken: null };
    }
    // Parse the JSON string in results.data
    // Check if results.data is valid
    let parsedResults: PaginatedMessages;
    try {
      parsedResults = JSON.parse(results.data as string) as PaginatedMessages;
    } catch (error) {
      console.error("Error parsing results.data:", error);
      //throw new Error("Failed to parse results.data");
      return { data: [], nextToken: null };
    }

    //console.log("Parsed results:", parsedResults);

    // Ensure parsedResults.items exists and is an array
    if (!parsedResults.items || !Array.isArray(parsedResults.items)) {
      console.error("Error: parsedResults.items is not a valid array.");
      return { data: [], nextToken: null };
    }
    //console.log("Parsed results items:", parsedResults.items);
    const messages: Message[] = parsedResults.items;
    //console.log("Messages by fileId and pagination:", messages);

    const newToken: string | null = parsedResults.nextToken;
    //console.log("Next token:", newToken);
    return {
      data: messages,
      nextToken: newToken,
    };
  } catch (error) {
    console.error("Error fetching messages by fileId and pagination:", error);
    return { data: [], nextToken: null };
  }
}

/**
 * Performs a search query for messages by content and tags.
 *
 * @param {string | undefined} fileId - Optional file ID.
 * @param {string | undefined} projectId - Optional project ID.
 * @param {string[]} messageContents - List of keywords to match.
 * @param {string[]} tagNames - List of tags to filter by.
 * @returns {Promise<Message[] | undefined>} Matching messages.
 */

export async function searchMessages(fileId: string | undefined, projectId: string | undefined, messageContents: string[], tagNames: string[]) {
  if(!fileId && !projectId) return
  try{
    console.log("Searching messages with fileId:", fileId, "messageContents:", messageContents, "tagsName:", tagNames);
    if(fileId){
      const foundMessages = await client.queries.searchMessages({
        fileId: fileId,
        messageContents: messageContents,
        tagNames: tagNames,
      });
      return foundMessages.data
    }
    else {
      const foundMessages = await client.queries.searchMessagesByProjectId({
        projectId: projectId,
        messageContents: messageContents,
        tagNames: tagNames
      })
      return foundMessages.data
    }
  }catch (error) {
    console.error("Error searching messages:", error);
  }
}

/**
 * Updates the content of an existing message.
 *
 * @param {string} messageId - The message to update.
 * @param {string} content - New content.
 * @returns {Promise<any>}
 */
export async function updateMessage(messageId: string, content: string) {
  try {
    const now = new Date().toISOString();

    return await client.models.Message.update({
      messageId,
      content,
      updatedAt: now,
      isUpdated: true,
    });
  } catch (error) {
    console.error("Error updating message:", error);
  }
}

/**
 * Updates the tags for a message.
 *
 * @param {string} messageId - The message to update.
 * @param {Nullable<string>[]} tags - New tag list.
 * @returns {Promise<any>}
 */

export async function updateMessageTags(messageId: string, tags: Nullable<string>[]){
  try {
    return await client.models.Message.update({
      messageId,
      tags: tags
    })

  } catch (error) {
    console.error("Error updating message:", error)
  }

}

/**
 * Fetches tags for a given message.
 *
 * @param {string} messageId
 * @returns {Promise<Nullable<string>[]>}
 */

export async function getTagsForMessage (messageId: string) {
  try {
    const response = await client.models.Message.get({
      messageId
    }, {
      selectionSet: ["tags"]
    })
    if(!response.data || !response.data.tags) return []
    return response.data.tags;
  } catch (error) {
    console.error("Error fetching tags:", error);
    return [];
  }
}

/**
 * Soft-deletes a message by setting `isDeleted = true`.
 *
 * @param {string} messageId
 * @returns {Promise<void>}
 */

export async function deleteMessage(messageId: string) {
  try {
    await client.models.Message.update({ messageId, isDeleted: true, });
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}

/**
 * Permanently deletes all messages linked to a specific file.
 * Intended to run during file hard deletion.
 *
 * @param {string} fileId
 * @returns {Promise<boolean>} True if successful, false otherwise.
 */

export async function hardDeleteMessageforFiles(fileId: string) {
  try {
    let nextToken: string | undefined = undefined;

      const { data } = await client.models.Message.list({
        filter: {
          fileId: { eq: fileId },
        },
      });

      for (const message of data) {
        if (message?.messageId) {
          await client.models.Message.delete({ messageId: message.messageId });
        }
      }
    return true;
    
  } catch (error) {
    console.error("Error removing messages for fileId:", fileId, error);
    return false
  };
}
