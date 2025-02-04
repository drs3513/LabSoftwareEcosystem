import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function addToWhitelist(userId: string, fileId: string) {
  try {
    const whitelistId = `whitelist-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    const newWhitelistEntry = await client.models.Whitelist.create({
      whitelistId,
      userIds: userId,
      fileId,
      createdAt: now,
    });

    console.log("Added to whitelist:", newWhitelistEntry);
    return newWhitelistEntry;
  } catch (error) {
    console.error("Error adding to whitelist:", error);
  }
}


export async function getWhitelistedUsers(fileId: string) {
    try {
      const response = await client.models.Whitelist.list();
      return response.data.filter((entry) => entry.fileId === fileId); // ✅ FIX: Extract `data` before filtering
    } catch (error) {
      console.error("Error fetching whitelisted users:", error);
      return [];
    }
  }

  export async function getWhitelistedFilesForUser(userId: string) {
    try {
      // 🔹 Fetch all whitelist entries for the given userId
      const response = await client.models.Whitelist.list();
      const whitelistEntries = response.data.filter((entry) => entry.userIds === userId);
  
      // 🔹 Get the file IDs from the whitelist
      const fileIds = whitelistEntries.map((entry) => entry.fileId);
  
      // 🔹 Fetch the actual file details
      const files = await client.models.File.list();
      const userFiles = files.data.filter((file) => fileIds.includes(file.fileId));
  
      return userFiles;
    } catch (error) {
      console.error("Error fetching files for user:", error);
      return [];
    }
  }


export async function removeFromWhitelist(whitelistId: string) {
  try {
    await client.models.Whitelist.delete({ whitelistId });
    console.log(`Removed from whitelist: ${whitelistId}`);
  } catch (error) {
    console.error("Error removing from whitelist:", error);
  }
}
