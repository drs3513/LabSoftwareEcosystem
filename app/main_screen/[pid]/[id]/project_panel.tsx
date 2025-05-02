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

import {ContextMenu, ContextMenuWrapper, ContextMenuItem} from '@/app/main_screen/context_menu_style'

const client = generateClient<Schema>();
/**
 * Compares the names of two projects
 * @param project_1 first project to compare
 * @param project_2 second project to compare
 * @returns project_1 > project_2
 */
function compare_project_name(project_1: project, project_2: project){
  return project_1.projectName.localeCompare(project_2.projectName)
}

interface project {
  projectId: string;
  projectName: string
}
export default function ProjectPanel() {
  const { setRole, setProjectId, projectId, userId, setFileId, setMessageThread } = useGlobalState();
  const router = useRouter()
  const routerSearchParams = useSearchParams();
  const { user } = useAuthenticator();
  const [projects, setProjects] = useState<project[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    projectId: string | null;
    projectName: string | null
  } | undefined>(undefined);

  const [displayedWhitelistPanels, setDisplayedWhitelistPanels] = useState<{projectId: string, projectName: string}[]>([])


  /**
   * Deletes project with given projectId.
   * Ensures that the user must ensure that they would like to delete the project twice prior to the deletion going through
   * @param projectId
   */
  async function handleDeleteProject(projectId: string) {
    try {
      if(!confirm("Are you sure you would like to delete this project?") || !confirm("Are you especially sure you would like to delete this project?")) return
      await hardDeleteProject(projectId);
      setProjects((prev) => prev.filter((p) => p.projectId !== projectId));
      if (projectId === contextMenu?.projectId) {
        setProjectId(null);
        router.push("/");
      }      
    } catch (err) {
      console.error("Failed to delete project:", err);
    } finally {
      setContextMenu({ x: 0, y: 0, projectId: null, projectName: null });
    }
  }
  


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

  /**
   * Observes changes to the Whitelist table on the userId of the current user
   * Whenever a whitelist record is affected which contains the current user, updates the project view
   * If the project which the user is currently viewing is not allowed by this whitelist query, kicks user out of page
   */

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

  /**
   * Creates a context menu containing the information of the selected project
   * @param e
   * @param projectId
   * @param projectName
   */
  function createContextMenu(e: React.MouseEvent<HTMLDivElement>, projectId: string, projectName: string) {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      projectId,
      projectName
    })


  }
  /***
   useEffect() observing 'contextMenu'

   Action : If the 'contextMenu' state is ever initiated on a project, then listen for any other mouse clicks, in the
   case of one, close the contextMenu

   ***/
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(undefined);
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenu]);

  return (
      <>
      <PanelContainer>
        {loading ? (
          <LoadingText>Loading projects...</LoadingText>
        ) : projects.length > 0 ? (
          projects.sort(compare_project_name).map((project) => (
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

        {displayedWhitelistPanels.map((whitelistPanel) => (
        <WhitelistPanel key={whitelistPanel.projectId}
                        projectId={whitelistPanel.projectId}
                        projectName={whitelistPanel.projectName}
                        displayed={true}
                        close={() => setDisplayedWhitelistPanels(displayedWhitelistPanels.filter(panel => panel.projectId != whitelistPanel.projectId))}
                        initialPosX = {50} initialPosY={50}/>
        ))}
        {contextMenu ?
            <ContextMenuWrapper $x={contextMenu.x} $y={contextMenu.y}>
              <ContextMenu>
                <ContextMenuItem onClick={() => setDisplayedWhitelistPanels([...displayedWhitelistPanels, {projectId: contextMenu.projectId!!, projectName: contextMenu.projectName!!}])}>
                  View Users
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
