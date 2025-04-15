import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {deleteFileFromStorage, getFileVersions, uploadFile, uploadFileTrigger} from "./storage";
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

/*--------------------------------------------------------
            TRIGGER FUNCTIONS
--------------------------------------------------------*/

export async function createFileUploadTrigger(
  file: File,
  projectId: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const logicalId = crypto.randomUUID(); // New file = new logical group
  const fileId = crypto.randomUUID(); // Will be used by trigger
  const now = new Date().toISOString();

  await uploadFileTrigger(file, ownerId, projectId, filepath, {
    filename: file.name,
    filepath,
    logicalid: logicalId,
    fileid: fileId,
    parentid: parentId || `ROOT-${projectId}`,
    ownerid: ownerId,
    projectid: projectId,
    createdat: now,
    updatedat: now,
    mode: "create",
  });
}

export async function createNewVersionTrigger(
  file: File,
  existingLogicalId: string,
  projectId: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const fileId = crypto.randomUUID(); // New version = new File ID
  const now = new Date().toISOString();

  await uploadFileTrigger(file, ownerId, projectId, filepath, {
    filename: file.name,
    filepath,
    logicalid: existingLogicalId,
    fileid: fileId,
    parentid: parentId || `ROOT-${projectId}`,
    ownerid: ownerId,
    projectid: projectId,
    createdat: now,
    updatedat: now,
    mode: "version",
  });
}

export async function overwriteFileTrigger(
  file: File,
  fileId: string,
  logicalId: string,
  projectId: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const now = new Date().toISOString();

  await uploadFileTrigger(file, ownerId, projectId, filepath, {
    filename: file.name,
    filepath,
    fileid: fileId,
    logicalid: logicalId,
    parentid: parentId || `ROOT-${projectId}`,
    ownerid: ownerId,
    projectid: projectId,
    updatedat: now,
    mode: "overwrite",
  });
}




/*--------------------------------------------------------
--------------------------------------------------------*/



export async function createNewVersion(
  file: File,
  fileId: string,
  projectId: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const now = new Date().toISOString();

  // Upload the file to S3
  const { key: storageKey } = await uploadFile(file, ownerId, projectId, filepath);

  // Retrieve the version ID from S3 (or fallback to '1')
  const versionId = await getFileVersions(storageKey) || '1';
  const newfileid = crypto.randomUUID();
  console.log("Creating the versioned file");
  if(!parentId){
    parentId = `ROOT-${projectId}`;
  }
  // Create a new file version record in the database
  await createFile({
    projectId,
    fileId:newfileid,
    logicalId: fileId,
    filename: file.name,
    isDirectory: false,
    filepath,
    parentId,
    storageId: storageKey,
    size: file.size,
    versionId,
    ownerId,
    isDeleted: false,
    createdAt: now,
    updatedAt: now,
  });
}



export async function processAndUploadFiles(
  dict: Record<string, any>,
  projectId: string,
  ownerId: string,
  parentId: string,
  currentPath: string = "",
  uploadTaskRef?: React.MutableRefObject<{
    isCanceled: boolean;
    uploadedFiles: { storageKey?: string, fileId?: string }[];
  }>,
  setProgress?: (percent: number) => void
) {
  const now = new Date().toISOString();
  const rootParentId = `ROOT-${projectId}`;
  const uploadedFiles: { storageKey?: string, fileId?: string }[] = [];
  let fileCount = 0;
  let processed = 0;

  // First, count all files
  function countFiles(obj: Record<string, any>): number {
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (key === "files") {
        count += Object.keys(value).length;
      } else {
        count += countFiles(value);
      }
    }
    return count;
  }

  fileCount = countFiles(dict);

  async function recursivePrint(
    obj: Record<string, any>,
    depth: number = 0,
    currentParentId: string = parentId || rootParentId,
    currentFilePath: string = currentPath
  ) {
    try {
      if (uploadTaskRef?.current?.isCanceled) {
        console.warn("[CANCEL] Upload task was canceled mid-process.");
        await abortUpload(uploadTaskRef.current.uploadedFiles, projectId);
        throw new Error("Upload canceled by user.");
      }

      for (const [key, value] of Object.entries(obj)) {
        const uuid = crypto.randomUUID();

        if (key !== "files") {
          // Create directory
          const newFile = await createFile({
            projectId,
            fileId: uuid,
            logicalId: uuid,
            filename: key,
            isDirectory: true,
            filepath: `${currentFilePath}/${key}`,
            parentId: currentParentId,
            size: 0,
            storageId: null,
            versionId: "1",
            ownerId,
            isDeleted: false,
            createdAt: now,
            updatedAt: now,
          });

          const nextParentId = newFile?.data?.fileId;
          if (!nextParentId) {
            await abortUpload(uploadedFiles, projectId);
            throw new Error("Failed to create directory");
          }

          uploadedFiles.push({ fileId: nextParentId });
          uploadTaskRef?.current?.uploadedFiles.push({ fileId: nextParentId });

          await recursivePrint(value, depth + 1, nextParentId, `${currentFilePath}/${key}`);
        } else {
          for (const [fileKey, fileValue] of Object.entries(value)) {
            const fileUuid = crypto.randomUUID();
            if (!(fileValue instanceof File)) continue;

            const folderPath = currentFilePath ? `${currentFilePath}/${fileKey}` : `/${fileKey}`;

            try {
              const { key: storageKey } = await uploadFile(fileValue, ownerId, projectId, folderPath);
              const versionId = await getFileVersions(storageKey) || '1';

              const newFile = await createFile({
                projectId,
                fileId: fileUuid,
                logicalId: fileUuid,
                filename: fileKey,
                isDirectory: false,
                filepath: `${currentFilePath}/${fileKey}`,
                parentId: currentParentId,
                storageId: storageKey,
                size: fileValue.size ?? 0,
                versionId,
                ownerId,
                isDeleted: false,
                createdAt: now,
                updatedAt: now,
              });

              if (!newFile?.data?.fileId) {
                await abortUpload(uploadedFiles, projectId);
                throw new Error("DB record creation failed");
              }

              uploadedFiles.push({ storageKey, fileId: newFile.data.fileId });
              uploadTaskRef?.current?.uploadedFiles.push({ storageKey, fileId: newFile.data.fileId });

              processed++;
              if (setProgress && fileCount > 0) {
                const percent = (processed / fileCount) * 100;
                setProgress(percent);
              }

            } catch (error) {
              await abortUpload(uploadedFiles, projectId);
              throw error;
            }
          }
        }
      }
    } catch (error) {
      await abortUpload(uploadedFiles, projectId);
      throw error;
    }
  }

  try {
    await recursivePrint(dict);
  } catch (e) {
    console.warn("[FINAL] Upload process was aborted.");
  }
}

export async function Restorefile(fileId: string, versionId: string, projectId: string) {
  await client.models.File.update({
    fileId,
    versionId,
    projectId,
    isDeleted: false,
    deletedAt: null
  });
}


export async function hardDeleteFile(fileId: string, projectId: string) {
  try {
    // Step 1: Get the file by ID
    const file = await client.models.File.get({ fileId, projectId });

    if (!file) {
      alert("File not found.");
      return;
    }

    // Step 2: Delete from S3
    if (file?.data?.storageId) {
      await deleteFileFromStorage(file?.data?.storageId);
      console.log(`[HARD DELETE] Deleted from storage: ${file?.data?.storageId}`);
    }

    // Step 3: Delete from database
    if(file.data?.fileId && file.data.projectId){
        await client.models.File.delete({
          fileId: file?.data?.fileId,
          projectId: file?.data?.projectId,
        });
    }

    console.log(`[HARD DELETE] Deleted DB record: ${file?.data?.fileId}`);
    alert("File permanently deleted.");
  } catch (error) {
    console.error("[HARD DELETE ERROR]", error);
    alert("An error occurred while hard deleting the file.");
  }
}







export async function abortUpload(
  uploadedFiles: { storageKey?: string, fileId?: string }[],
  projectId: string
) {
  console.warn("[ABORT] Cleaning up uploaded files...");

  // Reverse the list to delete children before parents
  for (let i = uploadedFiles.length - 1; i >= 0; i--) {
    const { storageKey, fileId } = uploadedFiles[i];

    try {
      if (storageKey) {
        await deleteFileFromStorage(storageKey);
        console.log(`[ABORT] Deleted storage: ${storageKey}`);
      }

      if (fileId) {
        await deleteFileFromDB(fileId, projectId);
        console.log(`[ABORT] Deleted DB record: ${fileId}`);
      }
    } catch (err) {
      console.error(`[ABORT] Failed to delete ${storageKey ?? fileId}`, err);
    }
  }

  console.warn("[ABORT] Upload aborted. Cleaned up uploaded files in reverse order.");
}



export async function deleteFileFromDB(fileId: string, projectId: string): Promise<void> {
  await client.models.File.delete({fileId, projectId});
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
  logicalId,
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
  logicalId: string;
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
    logicalId,
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

    const now = new Date().toISOString();

    await client.models.File.update({
      fileId: id,
      versionId: version,
      projectId,
      isDeleted: true,
      deletedAt: now,
    });

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