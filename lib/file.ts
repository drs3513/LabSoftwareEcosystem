import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import {getVersionId, uploadFile} from "./storage";
import {Nullable} from "@aws-amplify/data-schema";
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


  const projectFiles = await listFilesForProject(projectId);
  let fileCounter = projectFiles.length + 1;

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
      console.log(`${depth}${"  ".repeat(depth)}Key: ${key}`);

      if (key !== "files") {
        console.log(`Creating Directory: ${key}`);

        // Create directory entry
        const newFile = await createFile({
          projectId,
          fileId: `${projectId}F${fileCounter++}`,
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
        if(newFile.data !== null){
          console.log(`Directory Created: ${newFile.data?.fileId}`, newFile);
          // Recursively process children with updated `parentId`
          await recursivePrint(value, depth + 1, newFile.data?.fileId, `${currentFilePath}/${key}`);
        } else {
          console.log('Directory Failed to upload')
        }



      } else {
        console.log(`Creating files inside: ${currentFilePath}`);

        for (const [fileKey, fileValue] of Object.entries(value)) {
          if (!(fileValue instanceof File)) {
            console.error(`Skipping ${fileKey}: Invalid file object`, fileValue);
            continue;
          }

          console.log(`  Creating file: ${fileKey}`);
          // Ensure correct file path
          const folderPath = currentFilePath ? `${currentFilePath}/${fileKey}` : `/${fileKey}`;

          try {
            const { key: storageKey } = await uploadFile(fileValue, ownerId, projectId, folderPath);
            const versionId = await getVersionId(storageKey);

            // Create file entry
            console.log(currentFilePath)
            const newFile = await createFile({
              projectId,
              fileId: `${projectId}F${fileCounter++}`,
              filename: fileKey,
              isDirectory: false, // Ensure explicitly set for files
              filepath: currentFilePath + "/" + fileKey,
              parentId: currentParentId, // Ensure valid parentId
              storageId: storageKey,
              size: fileValue.size ?? 0,
              versionId,
              ownerId,
              isDeleted: false,
              createdAt: now,
              updatedAt: now,
            });

            console.log(`File Created: ${newFile.data?.fileId}`, newFile);
          } catch (error) {
            console.error(`Error processing file ${fileKey}:`, error);
          }
        }
      }
    }
  }
  console.log("Listing dictionary objects recursively:");
  await recursivePrint(dict);
  console.log("Processing complete.");
  return true
}


interface searchAttributes {
  names: string[],
  tags: string[],
  authors: string[]
}
export async function listFilesForProjectIdAndAttributes(projectId: string, attributes: searchAttributes) {
  try {
    console.log("Oh my God")
    const response = await client.models.File.list({
      filter: {
        and: [
          {projectId: { eq: projectId }},
          // Query all files with the same projectId,

          {
            or: attributes.names.map(name => ({
              filename: {contains: name}
            }))
          }
        ]

      },
    }); // Fetch all files
    const files = response.data; // Extract file array
    if (!files) return [];
    console.log(files)
    return files;

  } catch (error) {
    console.error("Error fetching files for project:", error);
    return [];
  }
}

//PD : I updated this function to use 'filter' attribute
export async function listFilesForProject(projectId: string) {
  try {
    const response = await client.models.File.list({
      filter: {
        projectId: { eq: projectId }, // Query all files with the same projectId
      },
    }); // Fetch all files
    const files = response.data; // Extract file array

    if (!files) return [];

    return files;

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
    console.log("Here!")
    if (!projectId) return

    if(!currTags) return

    await client.models.File.update({
      fileId: id,
      projectId,
      tags: [...currTags.filter(tag => tag != name)]
    })
    console.log(name)
    console.log([...currTags.filter(tag => tag != name)])
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

    console.log("Successfully updated file with id " + id + " to have tag " + name)

  } catch (error) {
    console.error("Error updating tag for file:", error)

  }

}



export async function searchFiles(projectId: string, fileNames: string[], tagNames: string[], authorNames: string[]){
  try {
    console.log(fileNames)
    console.log(tagNames)
    const foundFiles = await client.queries.searchFiles({projectId: projectId, fileNames: fileNames, tagNames: tagNames})
    console.log(foundFiles)
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
      selectionSet: ["fileId", "parentId", "filename"]
    })

    if(!file || !file.data || !file.data.parentId) return [`ROOT-${projectId}`]
    console.log(file.data.filename)
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
      //console.log(tags.data)
      return tags.data.tags
    }
  } catch (error) {
    console.error("Error retrieving tags for file:", error)
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
    console.log(`Successfully updated file ${id} to have path ${path} and parentId ${parentId}`)
  } catch(error) {
    console.error("Error updating file:", error);
    alert("An error occurred while updating the file. Please try again.")
  }
}