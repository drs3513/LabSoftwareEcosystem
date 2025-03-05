import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {uploadFile} from "./storage";
import {Nullable} from "@aws-amplify/data-schema";
import { Timeout } from "aws-cdk-lib/aws-stepfunctions";
const client = generateClient<Schema>();


export async function listFiles(setFiles: (files: Array<Schema["File"]["type"]>) => void) {
  const subscription = client.models.File.observeQuery().subscribe({
    next: (data) => setFiles([...data.items]),
    error: (error) => {
      console.error("Error observing messages:", error);
    },
  }); 
  return () => {
    if (subscription) {
      subscription.unsubscribe();
    }
  };
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

export async function uploadFileAndCreateEntry(
  file: File,
  projectId: string,
  ownerId: string,
  parentId: string,
  isDirectory: boolean,
  uploadedFiles: Set<string>
) {
  try {
    if (!uploadedFiles) {
      throw new Error("[ERROR] Uploaded files Set is undefined");
    }

    const now = new Date().toISOString();
    let projectFiles = await listFilesForProject(projectId);
    let existingFilePaths = new Set(projectFiles.map(f => f.filepath));

    const relativePath = file.webkitRelativePath || file.name;
    const pathParts = relativePath.split("/");
    const fileName = pathParts.pop() || ""; // Extract actual file name
    const folderPath = pathParts.join("/"); // Extract folder path

    let parentFolderId = projectId; // Start at root project folder
    let currentPath = "";
    let createdFolders = new Set();

    // **Ensure all parent directories exist**
    for (const part of pathParts) {
      currentPath += (currentPath ? "/" : "") + part;
      const folderId = `${projectId}_${currentPath.replace(/\//g, "_")}`;

      // If directory already exists, continue to the next level
      if (existingFilePaths.has(currentPath) || createdFolders.has(currentPath)) {
        parentFolderId = folderId;
        continue;
      }

      console.log(`[DEBUG] Creating missing folder: ${currentPath}`);

      await createFile({
        projectId,
        fileId: folderId,
        filename: part,
        isDirectory: true,
        filepath: currentPath,
        parentId: parentFolderId,
        size: 0,
        versionId: "1",
        ownerId,
        isDeleted: false,
        createdAt: now,
        updatedAt: now,
      });

      // Track created directories to prevent redundant checks
      createdFolders.add(currentPath);
      existingFilePaths.add(currentPath);

      // **Ensure directory creation completes before proceeding**
      await new Promise(resolve => setTimeout(resolve, 50));

      parentFolderId = folderId; // Update for the next directory level
    }

    // **Ensure we are not re-uploading the same file (track by full path)**
    const fileKey = `${folderPath}/${fileName}`;
    if (uploadedFiles.has(fileKey)) {
      console.log(`[DEBUG] Skipping duplicate upload: ${fileKey}`);
      return;
    }

    uploadedFiles.add(fileKey); // Mark this file as uploaded

    if (isDirectory) {
      console.log(`[DEBUG] Directory created: ${folderPath}`);
      return;
    }

    console.log(`[DEBUG] Uploading file: ${fileName} to ${folderPath || "upload/"}`);
    const { key, versionId } = await uploadFile(file, projectId, parentFolderId);

    // Create file entry in database
    const newFile = await createFile({
      projectId,
      fileId: `${projectId}_F${projectFiles.length + 1}`,
      filename: fileName,
      isDirectory: false,
      filepath: fileKey,
      parentId: parentFolderId,
      size: file.size,
      versionId,
      ownerId,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    console.log("[DEBUG] File uploaded successfully.");
    return newFile;
  } catch (error) {
    console.error("[ERROR] Uploading and creating file failed:", error);
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

export async function updateFileLocation(id: string, path: string, parentId: Nullable<string>, projectId: string){
  try {
    await client.models.File.update({
      fileId: id,
      filepath: path,
      projectId,
      parentId: parentId
    })
    console.log(`Successfully updated file ${id} to have path ${path} and parentId ${parentId}`)
  } catch(error) {
    console.error("Error updating file:", error);
    alert("An error occurred while updating the file. Please try again.")
  }
}