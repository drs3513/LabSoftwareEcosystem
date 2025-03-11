import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function createMessage(fileId: string, userId: string, content: string, projectId: string) {
  try {
    const fileMessages = await getMessagesForFile(fileId);
    const messageCount = fileMessages.length || 0;
    const messageId = `${fileId}M${messageCount + 1}`;
    const now = new Date().toISOString();

    const newMessage = await client.models.Message.create({
      messageId, 
      projectId, 
      fileId,
      userId,
      content,
      createdAt: now,
      updatedAt: now, 
      isUpdated: false,
      isDeleted: false,
    });
    if (newMessage.errors) {
      console.error("Error creating message:", newMessage.errors);
      return { data: null, errors: newMessage.errors };
    }
    return newMessage;
  } catch (error) {
    console.error("Error creating message:", error);
    return { data: null, errors: [error] };
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
    const message = await client.models.Message.get({ messageId });
    if (!message) {
      throw new Error("Message not found");
    }
    if (message.data?.userId !== userId) {
      throw new Error("You do not have permission to update this message");
    } else {
      console.log("User has permission to update the message");
      // Proceed to update the message
      const updatedMessage = await client.models.Message.update({
        messageId,
        content,
        updatedAt: now,
        isUpdated: true,
      });
    return updatedMessage;
    }
  } catch (error) {
    console.error("Error updating message:", error);
  }
}



export async function deleteMessage(messageId: string, userId: string) {
  try {
    const message = await client.models.Message.get({ messageId });
      if (!message) {
        throw new Error("Message not found");
      }
      if (message.data?.userId !== userId) {
        throw new Error("You do not have permission to delete this message");
      } else {
        console.log("User has permission to delete the message");
        // Log the message data for debugging
        console.log("Message data before deletion:", message.data);
  
        // Update the message to mark it as deleted
        const updatedMessage = await client.models.Message.update({
          messageId,
          content: "", // Clear the content
          isDeleted: true, // Mark as deleted
          updatedAt: new Date().toISOString(),
        });
  
        // Log the updated message for debugging
        console.log("Updated message:", updatedMessage);
        return updatedMessage;
      }
  } catch (error) {
    console.error("Error deleting message:", error);
  }
}
