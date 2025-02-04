import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export function listFiles(setFiles: (files: Array<Schema["File"]["type"]>) => void) {
  client.models.File.observeQuery().subscribe({
    next: (data) => setFiles([...data.items]),
  });
}


export async function createFile(filename:string, isDirectory: boolean, filepath: string, ownerId: string, size: number, versionId: string) {
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

    alert("File created successfully!");
    console.log("Created file:", newFile);
  } catch (error) {
    console.error("Error creating file:", error);
    alert("An error occurred while creating the file. Please try again.");
  }
}

export async function updatefile(id: string) {
  try{  
    
    const now = new Date().toISOString();
    await client.models.File.update({
        fileId: id,
        updatedAt: now,
      });
      alert("File updated successfully.");
      console.log(`File with ID ${id} has been updated.`);
    } catch (error) {
      console.error("Error updating file:", error);
      alert("An error occurred while updating the file. Please try again.");
    }
}


export async function deleteFile(id: string) {
  try {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the file with ID: ${id}?`
    );

    if (!confirmDelete) {
      alert("File deletion canceled.");
      return;
    }

    const now = new Date().toISOString();

    await client.models.File.update({
      fileId: id,
      isDeleted: true,
      deletedAt: now,
    });

    alert("File deleted successfully.");
    console.log(`File with ID ${id} has been deleted.`);
  } catch (error) {
    console.error("Error deleting file:", error);
    alert("An error occurred while deleting the file. Please try again.");
  }
}

export function displayFiles(files: Array<Schema["File"]["type"]>, showDeleted: boolean) {
    return files.filter((file) => file && (showDeleted || !file.isDeleted));
  }
  

export async function checkAndDeleteExpiredFiles(
  files: Array<Schema["File"]["type"]>,
  timeSpan: number,
  unit: "days" | "hours"
) {
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
