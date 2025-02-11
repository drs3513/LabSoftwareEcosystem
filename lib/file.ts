import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

export const client = generateClient<Schema>();

// ✅ List files and return a Promise
export async function listFiles(): Promise<Array<Schema["File"]["type"]>> {
  try {
    const response = await client.models.File.list();
    const files = response.data ?? [];
    // Filter out invalid files
    return files.filter((file) => file && file.fileId && file.filename && file.filepath);
  } catch (error) {
    console.error("Error fetching files:", error);
    return [];
  }
}


// ✅ Create a File
export async function createFile(filename: string, isDirectory: boolean, filepath: string, ownerId: string, size: number, versionId: string) {
  try {
    const now = new Date().toISOString();

    const newFile = await client.models.File.create({
      fileId: `file-${Math.floor(Math.random() * 100000)}`,
      filename,
      filepath,
      versionId,
      size: size,
      isDeleted: false,
      isDirectory: isDirectory,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });

    console.log("Created file:", newFile);
    return newFile;
  } catch (error) {
    console.error("Error creating file:", error);
  }
}

// ✅ Update File
export async function updateFile(id: string) {
  try {
    const now = new Date().toISOString();
    await client.models.File.update({
      fileId: id,
      updatedAt: now,
    });
    console.log(`File with ID ${id} has been updated.`);
  } catch (error) {
    console.error("Error updating file:", error);
  }
}

// ✅ Soft Delete a File
export async function deleteFile(id: string) {
  try {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the file with ID: ${id}?`
    );

    if (!confirmDelete) return;

    const now = new Date().toISOString();

    await client.models.File.update({
      fileId: id,
      isDeleted: true,
      deletedAt: now,
    });

    console.log(`File with ID ${id} has been marked as deleted.`);
  } catch (error) {
    console.error("Error deleting file:", error);
  }
}

// ✅ Display Files Based on Deletion Status
export function displayFiles(files: Array<Schema["File"]["type"]>, showDeleted: boolean) {
  return files.filter((file) => file && file.fileId && file.filename && (showDeleted || !file.isDeleted));
}


// ✅ Check & Permanently Delete Files after Expiry
export async function checkAndDeleteExpiredFiles(files: Array<Schema["File"]["type"]>, timeSpan: number, unit: "days" | "hours") {
  try {
    const now = new Date();

    const expiredFiles = files.filter((file) => {
      if (!file.isDeleted || !file.deletedAt) return false;

      const deletedAt = new Date(file.deletedAt);
      const diffMs = now.getTime() - deletedAt.getTime();

      const thresholdMs =
        unit === "days" ? timeSpan * 24 * 60 * 60 * 1000 : timeSpan * 60 * 60 * 1000;

      return diffMs >= thresholdMs;
    });

    for (const file of expiredFiles) {
      await client.models.File.delete({ fileId: file.fileId });
      console.log(`Permanently deleted file: ${file.filename}`);
    }

    if (expiredFiles.length > 0) {
      alert(`Deleted ${expiredFiles.length} expired files.`);
    }
  } catch (error) {
    console.error("Error checking and deleting expired files:", error);
  }
}
