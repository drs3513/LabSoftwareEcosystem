import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

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

// ✅ Read Messages for a File
export async function getMessagesForFile(fileId: string) {
  return (await client.models.Message.list()).filter((msg) => msg.fileId === fileId);
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
