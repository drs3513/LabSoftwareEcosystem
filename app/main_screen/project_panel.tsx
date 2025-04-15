"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";

//SVG imports
import Image from "next/image";
import icon_folder from "/assets/icons/folder-1-outlined-rounded.svg";

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const { setProjectId } = useGlobalState();
  const { user } = useAuthenticator();
  const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    if (!user?.signInDetails?.loginId) return;

    const subscription = client.models.Project.observeQuery().subscribe({
      next: (data) => {
        if (data.items && Array.isArray(data.items)) {
          setProjects(
            data.items.map((proj) => ({
              projectId: proj.projectId,
              projectName: proj.projectName,
            }))
          );
        }
        setLoading(false);
      },
      error: (error) => {
        console.error("Error observing projects:", error);
        setLoading(false);
      },
    });

    return () => subscription.unsubscribe(); // Unsubscribe on unmount
  }, [user]);

  return (
    <PanelContainer>
      {loading ? (
        <LoadingText>Loading projects...</LoadingText>
      ) : projects.length > 0 ? (
        projects.map((project) => (
          <Project key={project.projectId} onClick={() => setProjectId(project.projectId)}>
            <div style={{display: "flex", justifyContent: "center", overflow: "hidden"}}><Image src={icon_folder} alt="" objectFit='contain' vertical-align='baseline'/>{project.projectName}</div>
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
