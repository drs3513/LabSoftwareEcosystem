"use client";

import React, {useEffect, useState} from "react";
import {useGlobalState} from "@/app/GlobalStateContext";
import {generateClient} from "aws-amplify/data";
import type {Schema} from "@/amplify/data/resource";
import styled from "styled-components";
import {useAuthenticator} from "@aws-amplify/ui-react";
import {listProjectsForUser} from "@/lib/project";
import {getUserRole, isUserWhitelistedForProject} from "@/lib/whitelist"
import {useRouter, useSearchParams} from 'next/navigation'
import { hardDeleteProject } from "@/lib/project";
import WhitelistPanel from '@/app/main_screen/popout_whitelist_user_panel'

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const { setRole, setProjectId, projectId, userId, setFileId, setMessageThread } = useGlobalState();
  const router = useRouter()
  const routerSearchParams = useSearchParams();
  const { user } = useAuthenticator();
  const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [contextMenu, setContextMenu] = useState<{
    visible: boolean;
    x: number;
    y: number;
    projectId: string | null;
    projectName: string | null
  }>({
    visible: false,
    x: 0,
    y: 0,
    projectId: null,
    projectName: null
  });
  
  function handleRightClick(event: React.MouseEvent, projectId: string, projectName: string) {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      projectId,
      projectName
    });
  }

  useEffect(() => {
    const hideMenu = () => setContextMenu({ visible: false, x: 0, y: 0, projectId: null, projectName: null });
    window.addEventListener("click", hideMenu);
    return () => window.removeEventListener("click", hideMenu);
  }, []);

  async function handleDeleteProject(projectId: string) {
    try {
      console.log("deleting project:", projectId);
      await hardDeleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      if (projectId === contextMenu?.projectId) {
        setProjectId(null);
        router.push("/");
      }      
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setContextMenu({ visible: false, x: 0, y: 0, projectId: null, projectName: null });
    }
  }
  
  const [contextMenuProjectId, setContextMenuProjectId] = useState<string | undefined>(undefined);
  const [contextMenuProjectName, setContextMenuProjectName] = useState<string | undefined>(undefined);

  const [displayedWhitelistPanels, setDisplayedWhitelistPanels] = useState<string[]>([])

  const [contextMenuPosition, setContextMenuPosition] = useState<number[]>([0,0])

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

    if(!proj_id) return;

    setProjectId(proj_id);

    if(!root_id){
      router.push(`/main_screen/?pid=${proj_id}&id=ROOT-${proj_id}`, undefined)
    }
  }, [routerSearchParams])

  useEffect(() => {
    const startObserving = async () => {
      return await observeProjects();
    };

    const unsubscribePromise = startObserving();

    return () => {
      unsubscribePromise.then((unsubscribe) => {
        if (unsubscribe) unsubscribe();
      });
    };
  }, [userId]);

  function setProject(projectId: string) {
    router.push(`/main_screen/?pid=${projectId}&id=ROOT-${projectId}`, undefined);
  }

  const observeProjects = async () => {
    if (!userId) return;

    const subscription = client.models.Whitelist.observeQuery({
      filter: { userIds: { eq: userId } },
    }).subscribe({
      next: async () => {
        try {
          //console.log("next")
          const userProjects = await listProjectsForUser(userId);
          //console.log("User projects:", userProjects);
          if (Array.isArray(userProjects)) {
            //console.log("hi")
            setProjects(userProjects);

            // Redirect user if they are removed from the current project
            
            const isWhitelisted = await isUserWhitelistedForProject(userId, projectId!);
            //console.log("Is user whitelisted:", isWhitelisted);
            //console.log("Project ID:", projectId);
            //console.log("User ID:", userId);
            if (!isWhitelisted) {
              //console.log("rerouting the user to the main page!");
              setProjectId("");
              setFileId("");
              setRole("NONE");
              router.push("/main_screen", undefined);
            }
          } else {
            setProjects([]);
          }
        } catch (error) {
          console.error("Error updating projects on whitelist change:", error);
        }
      },
      error: (error) => {
        console.error("Error observing whitelist changes:", error);
      },
    });

    return () => subscription.unsubscribe();
  };

  function createContextMenu(e: React.MouseEvent<HTMLDivElement>, projectId: string, projectName: string) {
    e.preventDefault()
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      projectId,
      projectName
    })

    //setContextMenuProjectId(projectId)
    //setContextMenuPosition([e.pageX, e.pageY])

  }

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenuProjectId(undefined);
      setContextMenuPosition([0,0])
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenuProjectId]);

  return (
      <>
      <PanelContainer>
        {loading ? (
          <LoadingText>Loading projects...</LoadingText>
        ) : projects.length > 0 ? (
          projects.map((project) => (
                <Project
                  key={project.projectId}
                  $selected={project.projectId === projectId}
                  onClick={async () => {
                    setProject(project.projectId);
                    if (!userId) return;
                    const usrrole = await getUserRole(project.projectId, userId);
                    //console.log(usrrole);
                    setRole(usrrole);
                  }}
                  onContextMenu = {(e) => createContextMenu(e, project.projectId, project.projectName)}
                >
                  {project.projectName}

                </Project>
              ))
            ) : (
              <NoProjects>No projects available.</NoProjects>
            )}
          </PanelContainer>

        {displayedWhitelistPanels.map((projectId) => (
        <WhitelistPanel key={projectId}
                        projectId={projectId}
                        displayed={true}
                        close={() => setDisplayedWhitelistPanels(displayedWhitelistPanels.filter(id => id != projectId))}
                        initialPosX = {50} initialPosY={50}/>
        ))}
        {contextMenu.visible ?
            <ContextMenuWrapper $x={contextMenu.x} $y={contextMenu.y}>
              <ContextMenu>
                <ContextMenuItem onClick={() => setDisplayedWhitelistPanels([...displayedWhitelistPanels, contextMenu.projectId!!])}>
                  Whitelist Users
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setMessageThread({id: contextMenu.projectId!!, label: contextMenu.projectName!!, path: undefined, type: 1})}>
                  Open Chat
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDeleteProject(contextMenu.projectId!!)}>
                  Delete Project
                </ContextMenuItem>
              </ContextMenu>
            </ContextMenuWrapper>
            :
            undefined
        }

  </>
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
const ContextMenuExitButton = styled.button`
  border: none;
  font: inherit;
  outline: inherit;
  height: inherit;
  position: absolute;
  text-align: center;
  
  padding: .2rem .3rem;
  top: 0;
  right: 0;
  visibility: hidden;
  background-color: lightgray;

  &:hover {
    cursor: pointer;
    background-color: gray !important;
  }

`;
const ContextMenuItem = styled.div`
  position: relative;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
    
  }
  &:hover > ${ContextMenuExitButton}{
    visibility: visible;
    background-color: darkgray;
    transition: background-color 250ms linear;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`


const ContextMenu = styled.div`
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    display: flex;
    flex-direction: column;
    height: max-content;
    max-height: 300px; /* Add this */
    overflow-y: auto;   /* Add this */
`;


const ContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 20;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row;
`;
