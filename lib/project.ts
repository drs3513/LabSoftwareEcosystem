import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { hardDeleteFile } from "./file";

const client = generateClient<Schema>();


/**
 * Creates a new project with the given name and associates it with the specified user.
 *
 * @param {string} userId - The user who owns the project.
 * @param {string} projectName - The name of the project.
 * @returns {Promise<Schema["Project"]["create"]>} The created project record.
 *
 * @throws Will log and rethrow an error if creation fails.
 */

export async function createProject(userId: string, projectName: string) {
  try {
    // Fetch the current number of projects
    const uuid = crypto.randomUUID();
    const projectId = `${uuid}`;
    const now = new Date().toISOString();

    return await client.models.Project.create({
      projectId,
      userId,
      projectName,
      isDeleted: false,
      createdAt: now,
    });
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}




/**
 * Lists all projects that the user is whitelisted for.
 *
 * @param {string} userId - The ID of the user whose projects are being fetched.
 * @returns {Promise<Schema["Project"]["type"][]>} An array of projects the user can access.
 *
 * @throws Will log and rethrow an error if the query fails.
 */

export async function listProjectsForUser(userId: string) {
  try {
    const whitelistResponse = await client.models.Whitelist.list({
      filter: { userIds: { eq: userId } },
    });

    const allowedProjectIds = whitelistResponse.data.map(entry => entry.projectId);
    if (allowedProjectIds.length === 0) {
      return [];
    }

    const projectResponse = await client.models.Project.list({
      filter: {
        or: allowedProjectIds.map(projectId => ({ projectId: { eq: projectId } })),
      },
    });

    return projectResponse.data;
  } catch (error) {
    console.error("Error fetching user projects:", error);
    throw error;
  }
}



/**
 * Fetches the name of a project given its project ID.
 *
 * @param {string} projectId - The ID of the project.
 * @returns {Promise<string | undefined>} The project name, or `undefined` if not found.
 */

export async function getProjectName(projectId: string){
  try {
    const project = await client.models.Project.get({
      projectId
    }, {
      selectionSet: ["projectName"]
    })
    if(!project || !project.data || !project.data || !project.data.projectName) return undefined
    return project.data.projectName
  } catch (error) {
    console.error(`Error retrieving name for projectId ${projectId} :`, error)
  }
}

/**
 * Soft-deletes a project by setting `isDeleted` to true and recording the deletion timestamp.
 * This prompts the user for confirmation via `window.confirm`.
 *
 * @param {string} projectId - The ID of the project to delete.
 * @returns {Promise<void>}
 *
 * @throws Will log and rethrow any error encountered during update.
 */

export async function deleteProject(projectId: string) {
  try {
    const confirmDelete = window.confirm(`Are you sure you want to delete Project ID: ${projectId}?`);
    if (!confirmDelete) return;

    await client.models.Project.update({
      projectId,
      isDeleted: true,
      deletedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error deleting project:", error);
    throw error;
  }
}

/**
 * Permanently deletes a project and all files associated with it.
 * This function:
 * 1. Lists all files in the project.
 * 2. Calls `hardDeleteFile` for each file.
 * 3. Deletes the project record itself.
 *
 * @param {string} projectId - The ID of the project to permanently remove.
 * @returns {Promise<void>}
 */

export async function hardDeleteProject(projectId:string){
  const files = await client.models.File.listFileByProjectId({projectId});
  for (const file of files.data){
      await hardDeleteFile(file.fileId, projectId);
  }
  await client.models.Project.delete({projectId});
}
