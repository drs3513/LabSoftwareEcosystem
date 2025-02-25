import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function createMessage(fileId: string, userId: string | undefined, content: string, edited: boolean, deleted: boolean) {
  try {
    // Fetch all messages for the given file
    const fileMessages = await getMessagesForFile(fileId);
    const messageCount = fileMessages.length || 0;
    const messageId = `${fileId}M${messageCount + 1}`;
    const now = new Date().toISOString();

    // Provide a default value for userId if it is undefined
    const validUserId = userId ?? 'defaultUserId';

    const newMessage = await client.models.Message.create({
      messageId,
      fileId,
      userId: validUserId,
      content,
      createdAt: now,
      edited, 
      deleted
    });

    console.log("Created message:", newMessage);
    return newMessage;
  } catch (error) {
    console.error("Error creating message:", error);
  }
}

export async function updateMessage(messageId: string, content: string, currentUserId: string | undefined) {
  try {
    // Check if the message belongs to the current user
    const message = await client.models.Message.get({ messageId });
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.data?.userId !== currentUserId) {
      throw new Error("You do not have permission to update this message");
    } else {
      console.log("User has permission to update the message");
      // Proceed to update the message
      const now = new Date().toISOString();
      const updatedMessage = await client.models.Message.update({
        messageId,
        content,
        updatedAt: now, // Update the timestamp
        edited: true, // Add the edited field
      });
      console.log("Updated message:", updatedMessage);
      return updatedMessage;
    }
  } catch (error) {
    console.error("Error updating message:", error);
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
  
  export async function deleteMessage(messageId: string, currentUserId: string | undefined) {
    try {
      // Check if the message belongs to the current user
      const message = await client.models.Message.get({ messageId });
      if (!message) {
        throw new Error("Message not found");
      }
      if (message.data?.userId !== currentUserId) {
        throw new Error("You do not have permission to delete this message");
      } else {
        console.log("User has permission to delete the message");
        // Update the message to mark it as deleted
        const updatedMessage = await client.models.Message.update({
          messageId,
          content: "",
          deleted: true, // Add the deleted field
        });
        console.log(`Message marked as deleted: ${messageId}`);
        return updatedMessage;
      }
    } catch (error) {
      console.error("Error deleting message:", error);
    }
  }
