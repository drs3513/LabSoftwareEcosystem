"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { listProjectsForUser, createProject } from "@/lib/project";
import styled from "styled-components";

export default function ProjectPanel() {
  const { userId, setProjectId } = useGlobalState();
  const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);


  const handleCreateProject = async () => {
    try {
      const projectName = prompt("Enter Project Name:");
      if (!projectName) return;
  
      const newProject = await createProject(userId as string, projectName);

      if (newProject) {
        setProjects((prevProjects) => [
          ...prevProjects,
          {
            projectId: newProject.data.projectId,
            projectName: newProject.data.projectName,
          },
        ]);
      } else {
        console.error("Project creation failed: No data returned");
        alert("Failed to create project. Please try again.");
      }
    } catch (error) {
      console.error("Error creating project:", error);
    }
  };



  const [numCalls, setNumCalls] = useState(0);

  useEffect(() => {
    async function fetchProjects() {
      try {
        const projectResponse = await listProjectsForUser(userId as string);
        console.log(projectResponse)
        // ✅ Use projectResponse directly since it's already an array
        if (projectResponse.length > 0) {
          console.log("Jere")
          setProjects(
            projectResponse.map((proj) => ({
              projectId: proj.projectId,
              projectName: proj.projectName,
            }))
          );
        }
        setNumCalls(numCalls + 1)
        console.log("projects")
        console.log(numCalls)

      } catch (error) {
        console.error("Error fetching projects:", error);
      }
    }
  
    fetchProjects();
  }, [userId]);


  return (
    <PanelContainer>
      <CreateButton onClick={handleCreateProject}>+ Create Project</CreateButton>
      {projects.length > 0 ? (
        projects.map((project) => (
          <Project key={project.projectId} onClick={() => setProjectId(project.projectId)}>
            {project.projectName}
          </Project>
        ))
      ) : (
        <NoProjects>No projects available.</NoProjects>
      )}
    </PanelContainer>
  );
}

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  padding: 1rem;
  text-align: center;
  overflow-y: auto;
`;

const CreateButton = styled.button`
  width: 100%;
  padding: 10px;
  margin-bottom: 10px;
  background-color: #007bff;
  color: white;
  border: none;
  cursor: pointer;
  &:hover {
    background-color: #0056b3;
  }
`;

const Project = styled.div`
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  &:hover {
    background-color: grey;
  }
`;

const NoProjects = styled.div`
  color: gray;
  text-align: center;
`;
