import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { hardDeleteFile } from "./file";

const client = generateClient<Schema>();
//console.log(client)

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

//export async function updateProject(projectId: string, updates: Partial<Schema["Project"]["type"]>) {
//  try {
//    return await client.models.Project.update({
//      projectId,
//      ...updates,
//      updatedAt: new Date().toISOString(),
//    });
//  } catch (error) {
//    console.error("Error updating project:", error);
//    throw error;
//  }
//}


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

export async function hardDeleteProject(projectId:string){
  const files = await client.models.File.listFileByProjectId({projectId});
  for (const file of files.data){
      await hardDeleteFile(file.fileId, projectId);
  }
  await client.models.Project.delete({projectId});
}
