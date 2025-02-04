import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();

// ✅ Add a User to a File Whitelist
export async function addToWhitelist(userId: string, fileId: string) {
  try {
    const whitelistId = `whitelist-${Math.floor(Math.random() * 100000)}`;
    const now = new Date().toISOString();

    const newWhitelistEntry = await client.models.Whitelist.create({
      whitelistId,
      userId,
      fileId,
      createdAt: now,
    });

    console.log("Added to whitelist:", newWhitelistEntry);
    return newWhitelistEntry;
  } catch (error) {
    console.error("Error adding to whitelist:", error);
  }
}

// ✅ Get Whitelisted Users for a File
export async function getWhitelistedUsers(fileId: string) {
  return (await client.models.Whitelist.list()).filter((entry) => entry.fileId === fileId);
}

// ✅ Remove a User from Whitelist
export async function removeFromWhitelist(whitelistId: string) {
  try {
    await client.models.Whitelist.delete({ whitelistId });
    console.log(`Removed from whitelist: ${whitelistId}`);
  } catch (error) {
    console.error("Error removing from whitelist:", error);
  }
}
