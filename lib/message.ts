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
  edited?: boolean;
  deleted?: boolean;
  email?: string;
}


export async function createMessage(fileId: string, userId: string, content: string, projectId: string) {
  try {
    const uuid = crypto.randomUUID();
    const messageId = `${uuid}`;
    const now = new Date().toISOString();

    return await client.models.Message.create({
      messageId,
      projectId,
      fileId,
      userId,
      content,
      createdAt: now,
      updatedAt: now,
    });
  } catch (error) {
    console.error("Error creating message:", error);
  }
}


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


// export async function getMessagesByFileIdAndPagination(fileId: string, nextToken: string) {
//   try {
//     const results = await client.queries.getMessagesByFileId({
//       fileId: fileId,
//       nextToken: nextToken,
//       limit: 10,
//     });
//     //console.log("Messages by fileId and pagination:", results);
//     return results as PaginatedMessages;

//   }catch (error) {
//     console.error("Error fetching messages by fileId and pagination:", error);
//     return null;
//   }
// }

export async function getMessagesByFileIdAndPagination(
  fileId: string,
  nextToken: string | null
): Promise<{ data: Message[]; nextToken: string | null }> {
  try {
    const results = await client.queries.getMessagesByFileId({
      fileId,
      nextToken,
      limit: 10,
    });
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
//searchMessages
export async function searchMessages(fileId: string, messageContents: string[], tagNames: string[]) {
  try{
    console.log("Searching messages with fileId:", fileId, "messageContents:", messageContents, "tagsName:", tagNames);
    const foundMessages = await client.queries.searchMessages({
      fileId: fileId,
      messageContents: messageContents,
      tagNames: tagNames,
    });
    console.log("Found messages:", foundMessages);
    return foundMessages.data;
  }catch (error) {
    console.error("Error searching messages:", error);
  }
}

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


export async function deleteMessage(messageId: string) {
  try {
    await client.models.Message.update({ messageId, isDeleted: true, });
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}


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
