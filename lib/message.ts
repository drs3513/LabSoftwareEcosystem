import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { randomUUID } from "crypto";

const client = generateClient<Schema>();


export async function createMessage(fileId: string, userId: string, content: string, projectId: string) {
  try {
    const uuid = randomUUID();
    const messageId = `${uuid}`;
    const now = new Date().toISOString();

    const newMessage = await client.models.Message.create({
      messageId,
      projectId,
      fileId,
      userId,
      content,
      createdAt: now,
      updatedAt: now, 
    });
    return newMessage;
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



export async function updateMessage(messageId: string, content: string, userId: string) {
  try {
    const now = new Date().toISOString();

    const updatedMessage = await client.models.Message.update({
      messageId,
      content,
      updatedAt: now, 
      isUpdated: true,
    });
    return updatedMessage;
  } catch (error) {
    console.error("Error updating message:", error);
  }
}



export async function deleteMessage(messageId: string, userId: string) {
  try {
    await client.models.Message.update({ messageId, isDeleted: true, });
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}
