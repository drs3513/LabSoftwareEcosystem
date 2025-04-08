import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {getFileVersions, uploadFile} from "./storage";
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


export async function processAndUploadFiles(
  dict: Record<string, any>,
  projectId: string,
  ownerId: string,
  parentId: string, // Parent ID is required
  currentPath: string = ""
) {

  const now = new Date().toISOString();
  // Define a root parent ID for the project
  const rootParentId = `ROOT-${projectId}`;

  async function recursivePrint(
    obj: Record<string, any>,
    depth: number = 0,
    currentParentId: string = parentId || rootParentId, // Use rootParentId for top-level
    currentFilePath: string = currentPath
  ) {
    for (const [key, value] of Object.entries(obj)) {

      const uuid = crypto.randomUUID();
      if (key !== "files") {
        // Create directory entry
        const newFile = await createFile({
          projectId,
          fileId: `${uuid}`,
          filename: key,
          isDirectory: true,
          filepath: currentFilePath + "/" + key,
          parentId: currentParentId, // Ensure valid parentId
          size: 0,
          storageId: null,
          versionId: "1",
          ownerId,
          isDeleted: false,
          createdAt: now,
          updatedAt: now,
        });

        // Recursively process children with updated `parentId`
        await recursivePrint(value, depth + 1, newFile.data?.fileId, `${currentFilePath}/${key}`);
      } else {
        
        for (const [fileKey, fileValue] of Object.entries(value)) {
          const uuid = crypto.randomUUID();
          if (!(fileValue instanceof File)) {
            console.error(`Skipping ${fileKey}: Invalid file object`, fileValue);
            continue;
          }
          // Ensure correct file path
          const folderPath = currentFilePath ? `${currentFilePath}/${fileKey}` : `/${fileKey}`;
          
          try {
            const { key: storageKey } = await uploadFile(fileValue, ownerId, projectId, folderPath);
            const versionId = await getFileVersions(storageKey) as string;
            // Create file entry
            const newFile = await createFile({
              projectId,
              fileId: `${uuid}`,
              filename: fileKey,
              isDirectory: false, // Ensure explicitly set for files
              filepath: currentFilePath + "/" + fileKey,
              parentId: currentParentId, // Ensure valid parentId
              storageId: storageKey,
              size: fileValue.size ?? 0,
              versionId: versionId ? versionId : '1',
              ownerId,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            });
            if (!newFile?.data?.fileId) {
              console.error(`[FAILURE] Failed to create DB record for: ${uuid} : ${key}`, newFile);
            }
          } catch (error) {
            console.error(`Error processing file ${fileKey}:`, error);
          }
        }
      }
    }
  }
  await recursivePrint(dict);
}


export async function listFilesForProject(projectId: string) {
  try {
    const response = await client.models.File.list(); // Fetch all files
    const files = response.data; // Extract file array

    if (!files) return [];

    return files.filter((file) => file ? file.projectId === projectId: null); // Filter files by projectId

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
  storageId,
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
  storageId: string | null;
  parentId: string;
  size: number;
  versionId: string;
  ownerId: string;
  isDeleted?: boolean;
  createdAt: string;
  updatedAt: string;
}) {
  console.log(`Creating file ${filename} with parent ${parentId}`);
  return client.models.File.create({
    fileId,
    projectId,
    filename,
    isDirectory,
    filepath,
    parentId,
    storageId,
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
    if(parentId == null){
      parentId = "ROOT-" + projectId
    }
    if(projectId){
      await client.models.File.update({
        fileId: id,
        filepath: path,
        projectId,
        parentId: parentId
      })
    }
  } catch(error) {
    console.error("Error updating file:", error);
    alert("An error occurred while updating the file. Please try again.")
  }
}