import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function createMessage(fileId: string, userId: string, content: string) {
  try {
    // Fetch all messages for the given file
    const fileMessages = await getMessagesForFile(fileId);
    const messageCount = fileMessages.length || 0;
    const messageId = `${fileId}M${messageCount + 1}`;
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


export async function getMessagesForFile(fileId: string) {
    try {
      
      const response = await client.models.Message.list();
      const messages = response.data; // Extract messages array
  

      return messages.filter((msg) => msg.fileId === fileId);
    } catch (error) {
      console.error("Error fetching messages:", error);
      return [];
    }
  }
  


export async function deleteMessage(messageId: string) {
  try {
    await client.models.Message.delete({ messageId });
    console.log(`Deleted message: ${messageId}`);
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}
