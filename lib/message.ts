import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {Nullable} from "@aws-amplify/data-schema";

const client = generateClient<Schema>();


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