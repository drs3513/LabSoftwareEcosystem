import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";

const client = generateClient<Schema>();


export async function createProject(userId: string, projectName: string) {
  try {
    // Fetch the current number of projects
    const projects = await client.models.Project.list();
    const projectCount = projects.data.length || 0;
    const projectId = `P${projectCount + 1}`;
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
    const response = await client.models.Project.list();
    return response.data.filter((project) => project.userId === userId);
  } catch (error) {
    console.error("Error fetching user projects:", error);
    return [];
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
