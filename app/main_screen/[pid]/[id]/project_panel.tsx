"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { listProjectsForUser } from "@/lib/project";
import { getUserRole, isUserWhitelistedForProject } from "@/lib/whitelist"
import {boolean} from "zod";
import {useRouter, useSearchParams} from 'next/navigation'

const client = generateClient<Schema>();

export default function ProjectPanel() {
  const { setRole, setProjectId, projectId, userId, setFileId } = useGlobalState();
  const router = useRouter()
  const routerSearchParams = useSearchParams();
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

    if(!proj_id) return;

    setProjectId(proj_id);

    if(!root_id){
      router.push(`/main_screen/?pid=${proj_id}&id=ROOT-${proj_id}`, undefined)
    }
  }, [routerSearchParams])

  useEffect(() => {
    const startObserving = async () => {
      const unsubscribe = await observeProjects();
      return unsubscribe;
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
      next: async (response) => {
        try {
          console.log("next")
          const userProjects = await listProjectsForUser(userId);
          console.log("User projects:", userProjects);
          if (Array.isArray(userProjects)) {
            console.log("hi")
            setProjects(userProjects);

            // Redirect user if they are removed from the current project
            
            const isWhitelisted = await isUserWhitelistedForProject(userId, projectId!);
            console.log("Is user whitelisted:", isWhitelisted);
            console.log("Project ID:", projectId);
            console.log("User ID:", userId);
            if (!isWhitelisted) {
              console.log("rerouting the user to the main page!");
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

  return (
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
              console.log(usrrole);
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