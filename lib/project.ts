import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();
//console.log(client)

export async function createProject(userId: string, projectName: string) {
  try {
    // Fetch the current number of projects
    const uuid = crypto.randomUUID();
    const projectId = `${uuid}`;
    const now = new Date().toISOString();

    const newProject = await client.models.Project.create({
      projectId,
      userId,
      projectName,
      isDeleted: false,
      createdAt: now,
    });
    return newProject;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
}


export async function listAllProjects() {
  try {
    const response = await client.models.Project.list();
    return response.data ?? [];
  } catch (error) {
    console.error("Error fetching projects:", error);
    return [];
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



export async function listFilesForProject(projectId: string) {
  try {
    const response = await client.models.File.list();
    return response.data.filter((file) => file.projectId === projectId);
  } catch (error) {
    console.error("Error fetching files for project:", error);
    return [];
  }
}

export async function getProjectName(projectId: string){
  try {
    const project = await client.models.Project.get({
      projectId
    })
    if(!project || !project.data || !project.data || !project.data.projectName) return undefined
    return project.data.projectName
  } catch (error) {
    console.error(`Error retrieving name for projectId ${projectId} :`, error)
  }
}

export async function updateProject(projectId: string, updates: Partial<Schema["Project"]["type"]>) {
  try {
    const updatedProject = await client.models.Project.update({
      projectId,
      ...updates,
      updatedAt: new Date().toISOString(),
    });
    return updatedProject;
  } catch (error) {
    console.error("Error updating project:", error);
    throw error;
  }
}


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
