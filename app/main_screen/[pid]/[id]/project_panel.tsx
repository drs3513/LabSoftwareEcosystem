"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { listProjectsForUser } from "@/lib/project";
import { getUserRole } from "@/lib/whitelist"
import {boolean} from "zod";
import {useRouter, useSearchParams} from 'next/navigation'

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const { setRole, setProjectId, userId } = useGlobalState();
  const router = useRouter()
  const routerSearchParams = useSearchParams();
  const [localProjectId, setLocalProjectId] = useState<string | undefined>(undefined)
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
        if (!Array.isArray(userProjects)) {
          setProjects([]);
          return;
        }
        setProjects(userProjects);
      } catch (error) {
        console.error("Error fetching projects:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [user, userId]);

  useEffect(() => {
    const proj_id = routerSearchParams.get("pid")

    const root_id = routerSearchParams.get("id")

    if(!proj_id) return

    setLocalProjectId(proj_id)
    setProjectId(proj_id);

    if(!root_id){
      router.push(`/main_screen/?pid=${proj_id}&id=ROOT-${proj_id}`, undefined)
    }

    //setActiveParentIds([routerSearchParams.id])
  }, [routerSearchParams])


  function setProject(projectId: string) {
    setProjectId(projectId);
    setLocalProjectId(projectId);
    router.push(`/main_screen/?pid=${projectId}&id=ROOT-${projectId}`, undefined);
  }

  return (
    <PanelContainer>
      {loading ? (
        <LoadingText>Loading projects...</LoadingText>
      ) : projects.length > 0 ? (
        projects.map((project) => (
          <Project
            key={project.projectId}
            $selected={project.projectId === localProjectId}
            onClick={async () => {
              setProject(project.projectId);
              if (!userId) return;
              const usrrole = await getUserRole(project.projectId, userId);
              setRole(usrrole);
            }}
          >
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

const Project = styled.div.attrs<{$selected: boolean}>(props => ({
  style: {
    filter: props.$selected ? "drop-shadow(0px 0px 5px cornflowerblue)" : "none"
  }
}))`
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  &:hover {
    background-color: lightblue;
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