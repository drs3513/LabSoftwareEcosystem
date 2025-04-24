import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {deleteFileFromStorage, getFileVersions, uploadFile} from "./storage";
import {Nullable} from "@aws-amplify/data-schema";
import React from "react";
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

export async function waitForVersionId(key: string): Promise<string | null> {
  const maxRetries = 1;
  const baseDelay = 300; // ms
  let attempt = 0;

  while (attempt < maxRetries) {
    if (attempt > 0) {
      const delay = baseDelay * Math.pow(2, attempt); // exponential backoff
      //console.log(`[INFO] Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    } else {
      await new Promise((resolve) => setTimeout(resolve, baseDelay));
    }

    //console.log(`[INFO] Attempt ${attempt + 1}/${maxRetries} to get versionId for ${key}`);

    try {
      const versionId = await getFileVersions(key); // ✅ this was missing
      if (versionId) return versionId; // ✅ success!
    } catch (err) {
      console.warn(`[WARN] Attempt ${attempt + 1} failed:`, err);
    }

    attempt++;
  }

  console.error(`[FATAL] Unable to fetch versionId for key: ${key}`);
  return null;
}




export async function createNewVersion(
  file: File,
  logicalId: string,
  projectId: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const now = new Date().toISOString();

  // Upload the file to S3
  const { key: storageKey } = await uploadFile(file, ownerId, projectId, filepath);

  
  const versionId = waitForVersionId(storageKey) as unknown as string;
  const newfileid = crypto.randomUUID();
  //console.log("Creating the versioned file");
  if(!parentId){
    parentId = `ROOT-${projectId}`;
  }
  // Create a new file version record in the database
  await createFile({
    projectId,
    fileId:newfileid,
    logicalId: logicalId,
    filename: file.name,
    isDirectory: false,
    filepath,
    parentId,
    storageId: storageKey,
    size: file.size,
    versionId,
    ownerId,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  });
}

export async function fetchCachedUrl(path: string, versionId: string): Promise<string> {
  const res = await fetch(`/api/files?key=${encodeURIComponent(path)}&versionId=${encodeURIComponent(versionId)}`);
  if (!res.ok) throw new Error("Failed to fetch file preview");
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}




export async function processAndUploadFiles(
  dict: Record<string, any>,
  projectId: string,
  ownerId: string,
  parentId: string,
  currentPath: string,
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

  // 🔧 Join paths without double slashes
  function joinPaths(...parts: string[]) {
    return parts.join("/").replace(/\/+/g, "/").replace(/^\/?/, "/").replace(/\/$/, "");
  }

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
    currentFilePath: string = ""
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
          const dirPath = joinPaths(currentFilePath, key);
          const newFile = await createFile({
            projectId,
            fileId: uuid,
            logicalId: uuid,
            filename: key,
            isDirectory: true,
            filepath: dirPath,
            parentId: currentParentId,
            size: 0,
            storageId: null,
            versionId: "1",
            ownerId,
            isDeleted: 0,
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

          await recursivePrint(value, depth + 1, nextParentId, dirPath);
        } else {
          for (const [fileKey, fileValue] of Object.entries(value)) {
            const fileUuid = crypto.randomUUID();
            if (!(fileValue instanceof File)) continue;

            const filePath = joinPaths(currentFilePath, fileKey);

            try {
              const { key: storageKey } = await uploadFile(fileValue, ownerId, projectId, filePath);
              let versionId: string | null = null;
              let retries = 0;
              while (!versionId && retries < 5) {
                versionId = await getFileVersions(storageKey);
                if (!versionId) {
                  const delay = Math.pow(2, retries + 1) * 100;
                  console.warn(`[RETRY] Waiting ${delay}ms for version info...`);
                  await new Promise(res => setTimeout(res, delay));
                }
                retries++;
              }
              if (!versionId) {
                await abortUpload(uploadedFiles, projectId);
                throw new Error("Could not retrieve version ID after retry");
              }

              const newFile = await createFile({
                projectId,
                fileId: fileUuid,
                logicalId: fileUuid,
                filename: fileKey,
                isDirectory: false,
                filepath: filePath,
                parentId: currentParentId,
                storageId: storageKey,
                size: fileValue.size ?? 0,
                versionId,
                ownerId,
                isDeleted: 0,
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
    await recursivePrint(dict, 0, parentId || rootParentId, currentPath);
  } catch (e) {
    console.warn("[FINAL] Upload process was aborted.");
  }
}


export async function Restorefile(fileId: string, versionId: string, projectId: string) {
  await client.models.File.update({
    fileId,
    versionId,
    projectId,
    isDeleted: 0,
    deletedAt: null
  });
}


export async function hardDeleteFile(fileId: string, projectId: string) {
  try {
    /*await client.mutations.deleteMessagesByFileId({
      fileId
    });  */  
    // Step 1: Get the file by ID
    const file = await client.models.File.get({ fileId, projectId });

    if (!file) {
      alert("File not found.");
      return;
    }

    // Step 2: Delete from S3
    if (file?.data?.storageId) {
      await deleteFileFromStorage(file?.data?.storageId);
      //console.log(`[HARD DELETE] Deleted from storage: ${file?.data?.storageId}`);
    }

    // Step 3: Delete from database
    if(file.data?.fileId && file.data.projectId){
        await client.models.File.delete({
          fileId: file?.data?.fileId,
          projectId: file?.data?.projectId,
        });
    }

    //console.log(`[HARD DELETE] Deleted DB record: ${file?.data?.fileId}`);
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
        //console.log(`[ABORT] Deleted storage: ${storageKey}`);
      }

      if (fileId) {
        await deleteFileFromDB(fileId, projectId);
        //console.log(`[ABORT] Deleted DB record: ${fileId}`);
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


//PD : I updated this function to use 'filter' attribute
export async function listFilesForProject(projectId: string) {
  try {
    const response = await client.models.File.listFileByProjectId(
      {projectId}
    ); // Fetch all files
    const files = response.data; // Extract file array
    return files.filter((file) => file ? file.projectId === projectId: null); // Filter files by projectId

  } catch (error) {
    console.error("Error fetching files for project:", error);
    return [];
  }
}

export async function listFilesForProjectAndParentIds(projectId: string, parentIds: string[]){

  try {
    const response = await client.models.File.list({
      filter: {
        and: [
          { projectId: { eq: projectId } },
          {isDeleted: {eq: 0}},
          {
            or: parentIds.map(parentId => ({
              parentId: { eq: parentId }
            }))
          }
        ]
      },

    });
    const files = response.data
    if(!files) return [];

    return files;

  } catch (error) {
    console.error("Error fetching files for project:", error);
    return [];
  }
}

export async function deleteTag(id: string, projectId: string | undefined, name: string, currTags: Nullable<string>[] | null | undefined) {
  try {
    //console.log("Here!")
    if (!projectId) return

    if(!currTags) return

    await client.models.File.update({
      fileId: id,
      projectId,
      tags: [...currTags.filter(tag => tag != name)]
    })
    //console.log(name)
    //console.log([...currTags.filter(tag => tag != name)])
  } catch (error) {
    console.error("Error removing tag for file:", error)
  }
}

export async function createTag(id: string, projectId: string | undefined, currTags: Nullable<string>[] | null | undefined, name: string){
  try {

    if(!projectId) return


    if(!currTags) {
      await client.models.File.update({
        fileId: id,
        projectId,
        tags: [name]
      })
    } else {
      await client.models.File.update({
        fileId: id,
        projectId,
        tags: [...currTags, name]
      })
    }

    //console.log("Successfully updated file with id " + id + " to have tag " + name)

  } catch (error) {
    console.error("Error updating tag for file:", error)

  }

}



export async function searchFiles(projectId: string, fileNames: string[], tagNames: string[], authorNames: string[]){
  try {
    //console.log(fileNames)
    //console.log(tagNames)
    const foundFiles = await client.queries.searchFiles({projectId: projectId, fileNames: fileNames, tagNames: tagNames})
    //console.log(foundFiles)
    return foundFiles.data
  } catch (error){
    console.error("Error searching for files:", error)
  }
}
//recursively calls itself to receive a path of parent fileIds from a given fileId, going all the way to root
//TODO Dangerous?
//TODO SLOW
export async function getFileIdPath(fileId: string, projectId: string): Promise<Nullable<string>[] | undefined>{
  try{
    const file = await client.models.File.get({
      fileId,
      projectId
    },
    {
      selectionSet: ["fileId", "parentId", "filename", "filepath"]
    })

    if(!file || !file.data || !file.data.parentId) return [`ROOT-${projectId}`]
    //console.log(file.data.filename)
    if(file.data.parentId == `ROOT-${projectId}`){
      return [file.data.parentId]
    } else {
      let path_remaining = await getFileIdPath(file.data.parentId, projectId)
      if(!path_remaining) path_remaining = [`ROOT-${projectId}`]
      return[...path_remaining, file.data.parentId]
    }
  } catch (error){
    console.error(`Error getting parentId for fileId ${fileId} and projectId ${projectId} :`, error)
  }
}

export async function getFilePath(fileId: string, projectId: string){
  try {
    const filePath = await client.models.File.get({
      fileId,
      projectId
    },
    {
      selectionSet: ["filepath"]
    })

    if(!filePath || !filePath.data || !filePath.data.filepath) return undefined

    return filePath.data.filepath

  } catch (error) {
    console.error(`Error getting filepath for fileId ${fileId} and projectId ${projectId} :`, error)
  }

}

export async function getFileChildren(projectId: string, filepath: string){
  try {
    const files = await client.models.File.listFileByProjectIdAndFilepath({
      projectId,
      filepath: {beginsWith: filepath}
    })
    return files.data
  } catch (error) {
    console.error(`Error retrieving files with filepath prefix : ${filepath} :`, error)
  }

}
export async function pokeFile(fileId: string, projectId: string, filepath: string){
  try {

    const pokeUpdate = await client.models.File.update({
      fileId: fileId,
      projectId: projectId,
      filepath: filepath
    })

    return pokeUpdate

  } catch (error) {
    console.error("Failed to poke", error)
  }

}
export async function batchUpdateFilePath(fileIds: string[], projectId: string, parentIds: string[], filepaths: string[]) {
  try {
    const filesBack = await client.mutations.batchUpdateFile({fileIds: fileIds, parentIds: parentIds, projectId: projectId, filepaths: filepaths})

    //dummy update which 'pokes' the File table, so that AWS knows to refresh subscriptions


    return filesBack.data

  } catch (error) {
    console.error(`Error performing batch update : `, error)
  }
}

export async function getFilesByProjectIdAndIsDeleted(projectId: string){
  try {
    const files = await client.models.File.listFileByProjectIdAndIsDeleted({
      projectId,
      isDeleted: {eq: 1}
    },
        {
          selectionSet: ["fileId", "filename", "filepath", "size", "ownerId", "projectId", "createdAt", "updatedAt", "isDirectory", "versionId"]
        })

    return files.data

  } catch (error) {
    console.error(`Error getting deleted files for projectId ${projectId} :`, error)
  }

}

export async function getTags(id: string, projectId: string){
  try {

    if(projectId) {
      const tags = await client.models.File.get({
        fileId: id,
        projectId
      },
      {
        selectionSet: ["tags"]
      }
      )

      if(!tags.data) return tags.data
      ////console.log(tags.data)
      return tags.data.tags
    }
  } catch (error) {
    console.error("Error retrieving tags for file:", error)
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
  isDeleted = 0,
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
  isDeleted?: number;
  createdAt: string;
  updatedAt: string;
}) {
  //console.log(`Creating file ${filename} with parent ${parentId}`);
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

export async function createFolder(
  projectId: string,
  name: string,
  ownerId: string,
  parentId: string,
  filepath: string
) {
  const fileId = crypto.randomUUID();
  const now = new Date().toISOString();

  const newFile = await createFile({
    projectId,
    fileId,
    logicalId: fileId,
    filename: name,
    isDirectory: true,
    filepath, // Full path like /ParentFolder/NewFolder
    parentId, // Parent directory's fileId
    size: 0,
    storageId: null,
    versionId: "1",
    ownerId,
    isDeleted: 0,
    createdAt: now,
    updatedAt: now,
  });

  return newFile;
}

// Retrieve the latest version of a file using the composite primary key
export async function getLatestFileVersion(fileId: string) {
  try {
    const response = await client.models.File.listFileByLogicalIdAndVersionId(
        {logicalId: fileId // Query all versions with the same fileId
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



export async function updatefile(id: string, projectId: string, versionId: string) {
  try{  
    
    const now = new Date().toISOString();
    
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
   /* const confirmDelete = window.confirm(
      `Are you sure you want to delete the version: ${version}  of file with ID: ${id}?`
    );

    if (!confirmDelete) {
      alert("File deletion canceled.");
      return;
    }*/

    const now = new Date().toISOString();

    await client.models.File.update({
      fileId: id,
      versionId: version,
      projectId,
      isDeleted: 1,
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
    //console.log(`Successfully updated file ${id} to have path ${path} and parentId ${parentId}`)
  } catch(error) {
    console.error("Error updating file:", error);
    alert("An error occurred while updating the file. Please try again.")
  }
}