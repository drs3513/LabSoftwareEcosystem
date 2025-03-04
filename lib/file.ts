import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {uploadFile} from "./storage";
const client = generateClient<Schema>();


export async function listFiles(setFiles: (files: Array<Schema["File"]["type"]>) => void) {
  client.models.File.observeQuery().subscribe({
    next: (data) => setFiles([...data.items]),
  });
}

// Retrieve all versions of a file using manual sorting
export async function getVersionHistory(fileId: string): Promise<any[]> {
  try {
    const response = await client.models.File.list({
      filter: {
        fileId: { eq: fileId }, // Query all versions with the same fileId
      },
    });

    if (!response.data || response.data.length === 0) {
      return [];
    }

    // Manually sort by versionId in descending order
    return response.data.sort((a, b) => parseInt(b.versionId) - parseInt(a.versionId));
  } catch (error) {
    console.error("Error listing file versions:", error);
    throw error;
  }
}


export async function uploadFileAndCreateEntry(file: File, projectId: string, ownerId: string, parentId: string) {
  try {
    const projectFiles = await listFilesForProject(projectId);
    const fileCount = projectFiles.length || 0;
    const fileId = `${projectId}F${fileCount + 1}`;
    const now = new Date().toISOString();

    // Upload file to S3
    const { key, versionId } = await uploadFile(file, projectId, fileId);

    // Create file entry in DynamoDB
    const newfile = await createFile({
      projectId,
      fileId,
      filename: file.name,
      isDirectory: false,
      filepath: key,
      parentId,
      size: file.size,
      versionId,
      ownerId,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("File uploaded and entry created successfully.");
    return newfile;
  } catch (error) {
    console.error("Error uploading and creating file:", error);
    throw error;
  }
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


export async function createFile({
  projectId,
  fileId,
  filename,
  isDirectory,
  filepath,
  parentId,
  size,
  versionId,
  ownerId,
  isDeleted = false,
  createdAt,
  updatedAt,
}: {
  projectId: string;
  fileId: string;
  filename: string;
  isDirectory: boolean;
  filepath: string;
  parentId: string;
  size: number;
  versionId: string;
  ownerId: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  return client.models.File.create({
    fileId,
    projectId,
    filename,
    isDirectory,
    filepath,
    parentId,
    size,
    versionId,
    ownerId,
    isDeleted,
    createdAt,
    updatedAt,
  });
}

// Retrieve the latest version of a file using the composite primary key
export async function getLatestFileVersion(fileId: string) {
  try {
    const response = await client.models.File.list({
      filter: {
        fileId: { eq: fileId }, // Query all versions with the same fileId
      },
    });

    if (response.data.length === 0) {
      throw new Error("No versions found for this file.");
    }

    //Sort by versionId in descending order
    const sortedVersions = response.data.sort((a, b) => 
      parseInt(b.versionId) - parseInt(a.versionId)
    );

    return sortedVersions[0].versionId; // Return the latest version
  } catch (error) {
    console.error("Error retrieving the latest file version:", error);
    throw error;
  }
}



export async function updatefile(id: string, projectId: string) {
  try{  
    
    const now = new Date().toISOString();
    const latestver = (await getVersionHistory(id)).length + 1;
    const versionId = latestver.toString();
    await client.models.File.update({
        fileId: id,
        projectId,
        versionId: versionId,
        updatedAt: now,
      });
      alert("File updated successfully.");
    } catch (error) {
      console.error("Error updating file:", error);
      alert("An error occurred while updating the file. Please try again.");
    }
}


export async function deleteFile(id: string, version: string, projectId: string) {
  try {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the version: ${version}  of file with ID: ${id}?`
    );

    if (!confirmDelete) {
      alert("File deletion canceled.");
      return;
    }

    const now = new Date().toISOString();

    await client.models.File.update({
      fileId: id,
      versionId: version,
      projectId,
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
      await client.models.File.delete({ fileId: file.fileId, projectId: file.projectId});
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



