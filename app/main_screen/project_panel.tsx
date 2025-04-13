"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { listProjectsForUser } from "@/lib/project";
import { getUserRole } from "@/lib/whitelist"

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const { setRole, setProjectId, userId } = useGlobalState();
  const { user } = useAuthenticator();
  const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.signInDetails?.loginId) return;

    const fetchProjects = async () => {
      try {
        setLoading(true);
        if (!userId) return;
        const userProjects = await listProjectsForUser(userId);
        setProjects(userProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user]);

  return (
    <PanelContainer>
      {loading ? (
        <LoadingText>Loading projects...</LoadingText>
      ) : projects.length > 0 ? (
        projects.map((project) => (
          <Project key={project.projectId} onClick={ async () => {
            setProjectId(project.projectId);
            if (!userId) { console.log("no userid found"); return; }
            const usrrole = await getUserRole(project.projectId, userId);
            setRole(usrrole);
            }}>
            📁 {project.projectName}
          </Project>
        ))
      ) : (
        <NoProjects>No projects available.</NoProjects>
      )}
    </PanelContainer>
  );
}

// Styled Components
const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: black;
  padding: 1rem;
  text-align: center;
  overflow-y: auto;
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

const LoadingText = styled.div`
  color: gray;
  text-align: center;
`;