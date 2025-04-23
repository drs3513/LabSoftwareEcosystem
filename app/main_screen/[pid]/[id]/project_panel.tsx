"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {boolean} from "zod";
import {useRouter, useSearchParams} from 'next/navigation'

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const router = useRouter()
  const routerSearchParams = useSearchParams();
  const { projectId, setProjectId } = useGlobalState();
  const [localProjectId, setLocalProjectId] = useState<string | undefined>(undefined)
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
          if(data.items.length > 0){
            setProjectId(data.items[0].projectId)
          }
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

  useEffect(() => {
    const proj_id = routerSearchParams.get("pid")

    const root_id = routerSearchParams.get("id")

    if(!proj_id) return

    setLocalProjectId(proj_id)

    if(!root_id){
      router.push(`/main_screen/?pid=${proj_id}&id=ROOT-${proj_id}`, undefined)
    }

    //setActiveParentIds([routerSearchParams.id])
  }, [routerSearchParams])


  function setProject(projectId: string){
    setProjectId(projectId)

    router.push(`/main_screen/?pid=${projectId}&id=ROOT-${projectId}`, undefined)
  }
  return (
    <PanelContainer>
      {loading ? (
        <LoadingText>Loading projects...</LoadingText>
      ) : projects.length > 0 ? (
        projects.map((project) => (
          <Project key={project.projectId} onClick={() => setProject(project.projectId)} $selected={localProjectId == project.projectId}>
            {project.projectName}
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
  background-color: #FFFFFF;
  padding: 1rem;
  text-align: center;
  overflow-y: auto;
  
`;

const Project = styled.div.attrs<{$selected: boolean}>(props => ({
  style: {
    filter: props.$selected ? "drop-shadow(0px 0px 5px #5C9ECC)" : "none"
  }
}))`
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #D7DADD;
  overflow: hidden;
  cursor: pointer;
  &:hover {
    background-color: #365679;
    color: white;
    transition: 0.2s;
  }
  &:last-child{
    border-bottom-style: none;
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
