import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function listFiles(setFiles: (files: Array<Schema["File"]["type"]>) => void) {
  client.models.File.observeQuery().subscribe({
    next: (data) => setFiles([...data.items]),
  });
}

export async function listFilesForProject(projectId: string) {
  try {
    const response = await client.models.File.list(); // Fetch all files
    const files = response.data; // Extract file array

    if (!files) return [];
    let projfiles = files.filter((file) => file.projectId === projectId);
    return projfiles; // Filter files by projectId
  } catch (error) {
    console.error("Error fetching files for project:", error);
    return [];
  }
}

export async function createFile(projectId: string, filename:string, isDirectory: boolean, filepath: string, ownerId: string, size: number, versionId: string, parentId: (string|undefined)) {
  try {
    // Fetch all files for the project
    const projectFiles = await listFilesForProject(projectId);
    const fileCount = projectFiles.length || 0;
    const fileId = `${projectId}F${fileCount + 1}`;
    const now = new Date().toISOString();

    const newFile = await client.models.File.create({
      fileId,
      filename,
      filepath,
      versionId,
      parentId,
      projectId,
      size: size,
      isDeleted: false,
      isDirectory: isDirectory,
      ownerId,
      createdAt: now,
      updatedAt: now,
    });

    alert("File created successfully!");
    return newFile;
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

  } catch (error) {
    console.error("Error deleting file:", error);
    alert("An error occurred while deleting the file. Please try again.");
  }
}

export async function displayFiles(files: Array<Schema["File"]["type"]>, showDeleted: boolean) {
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
    }

    if (expiredFiles.length > 0) {
      alert(`Deleted ${expiredFiles.length} expired files.`);
    }
  } catch (error) {
    console.error("Error checking and deleting expired files:", error);
  }
}

export async function directory_builder(
  parentId: string | null,
  projectId: string,
  sortBy: "name" | "date" | "size" = "name"
): Promise<Array<{ directory: string; directoryId: string; files: any[] } | { fileId: string; filename: string }>> {
  try {
    // Fetch all files within the project
    const files = await listFilesForProject(projectId);
    if (!files || files.length === 0) return [];

    // Filter files by parentId (null, empty)
    const filteredFiles = files.filter((file) => {
      return parentId === null ? !file.parentId || !files.some(f => f.fileId === file.parentId) : file.parentId === parentId;
    });
    

    // Sorting function based on user input with safeguard checks
    const sortFiles = (files: any[]) => {
      return files.sort((a, b) => {
        switch (sortBy) {
          case "date":
            return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          case "size":
            return (a.size || 0) - (b.size || 0);
          case "name":
          default:
            return (a.filename || "").localeCompare(b.filename || "");
        }
      });
    };

    // Separate directories and files
    const directories = filteredFiles.filter((file) => file.isDirectory);
    const filesOnly = filteredFiles.filter((file) => !file.isDirectory);
    // Recursively build directories
    const structuredDirectories = await Promise.all(
      directories.map(async (directory) => ({
        directory: directory.filename || "Unnamed Directory",
        directoryId: directory.fileId,
        files: await directory_builder(directory.fileId, projectId, sortBy),
      }))
    );

    // Combine directories and files
    const structuredFiles = sortFiles([
      ...structuredDirectories,
      ...filesOnly.map((file) => ({
        fileId: file.fileId,
        filename: file.filename || "Unnamed File",
        size: file.size || 0,
        createdAt: file.createdAt || new Date().toISOString(),
      })),
    ]);
    return structuredFiles;
  } catch (error) {
    console.error("Error building directory structure:", error);
    return [];
  }
}



