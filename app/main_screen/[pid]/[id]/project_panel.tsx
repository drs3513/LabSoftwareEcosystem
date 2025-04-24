"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";
import {boolean} from "zod";
import {useRouter, useSearchParams} from 'next/navigation'
import { hardDeleteProject } from "@/lib/project";

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const router = useRouter()
  const routerSearchParams = useSearchParams();
  const { projectId, setProjectId } = useGlobalState();
  const [localProjectId, setLocalProjectId] = useState<string | undefined>(undefined)
  const { user } = useAuthenticator();
  const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    projectId: string | null;
  }>({
    visible: false,
    x: 0,
    y: 0,
    projectId: null,
  });
  
  function handleRightClick(event: React.MouseEvent, projectId: string) {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      projectId,
    });
  }

  useEffect(() => {
    const hideMenu = () => setContextMenu({ visible: false, x: 0, y: 0, projectId: null });
    window.addEventListener("click", hideMenu);
    return () => window.removeEventListener("click", hideMenu);
  }, []);

  async function handleDeleteProject(projectId: string) {
    try {
      await hardDeleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      if (projectId === localProjectId) {
        setProjectId(undefined);
        router.push("/");
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setContextMenu({ visible: false, x: 0, y: 0, projectId: null });
    }
  }
  

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
          <Project
            key={project.projectId}
            onClick={() => setProject(project.projectId)}
            onContextMenu={(e) => handleRightClick(e, project.projectId)}
            $selected={localProjectId == project.projectId}
          >
            📁 {project.projectName}
          </Project>
        ))
      ) : (
        <NoProjects>No projects available.</NoProjects>
      )}
      {contextMenu.visible && contextMenu.projectId && (
        <ContextMenu style={{ top: contextMenu.y, left: contextMenu.x }}>
          <ContextMenuItem onClick={() => handleDeleteProject(contextMenu.projectId!)}>
            🗑️ Delete Project
          </ContextMenuItem>
        </ContextMenu>
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
const ContextMenu = styled.div`
  position: fixed;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  z-index: 1000;
  box-shadow: 0 2px 10px rgba(0,0,0,0.15);
`;

const ContextMenuItem = styled.div`
  padding: 8px 12px;
  cursor: pointer;
  &:hover {
    background: lightcoral;
    color: white;
  }
`;
