import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();
const MESSAGES_PER_PAGE = 20;
// ✅ Create a Message
export async function createMessage(fileId: string, userId: string, content: string) {
  try {
    const messageId = `message-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    const newMessage = await client.models.Message.create({
      messageId,
      fileId,
      userId,
      content,
      createdAt: now,
    });

    console.log("Created message:", newMessage);
    return newMessage;
  } catch (error) {
    console.error("Error creating message:", error);
  }
}

// ✅ Get Messages for a File
export async function getMessagesForFile(fileId: string) {
  try {
    const response = await client.models.Message.list();
    const messages = response.data || []; // Ensure it's an array

    return messages.filter((msg) => msg.fileId === fileId);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return [];
  }
}

export async function getLatestMessages(fileId: string, limit: number) {
  try {
    const response = await client.models.Message.list();
    const messages = response.data ?? [];

    return messages
      .filter((msg) => msg.fileId === fileId)
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) // Sort by time
      .slice(-limit); // Get the latest 'limit' messages
  } catch (error) {
    console.error("Error fetching latest messages:", error);
    return [];
  }
}

// ✅ Delete a Message
export async function deleteMessage(messageId: string) {
  try {
    await client.models.Message.delete({ messageId });
    console.log(`Deleted message: ${messageId}`);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}

// ✅ Load More Messages When Scrolling Up
export async function getOlderMessages(fileId: string, lastMessageTimestamp: string) {
  try {
    const response = await client.models.Message.list();
    const messages = response.data; // Extract messages array

    return messages
      .filter((msg) => msg.fileId === fileId && msg.createdAt < lastMessageTimestamp) // ✅ Load older messages
      .map(({ messageId, content, userId, createdAt }) => ({ messageId, content, userId, createdAt }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) // ✅ Sort descending
      .slice(0, MESSAGES_PER_PAGE); // ✅ Load only 20 older messages
  } catch (error) {
    console.error("Error fetching older messages:", error);
    return [];
  }
}