"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { listAllProjects } from "@/lib/project";
import styled from "styled-components";
import { useAuthenticator } from "@aws-amplify/ui-react";

export default function ProjectPanel() {
    const { userId, setProjectId, refreshProjects } = useGlobalState();
    const { user } = useAuthenticator(); // Ensure user is reloaded on refresh
    const [projects, setProjects] = useState<Array<{ projectId: string; projectName: string }>>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        async function fetchProjects() {
            if (!user?.signInDetails?.loginId) return; // Ensure user is available

            try {
                const currentUserId = user?.signInDetails?.loginId || userId; // Use global or auth userId
                const projectResponse = await listAllProjects();

                if (projectResponse && Array.isArray(projectResponse)) {
                    setProjects(projectResponse.map((proj) => ({
                        projectId: proj.projectId,
                        projectName: proj.projectName
                    })));
                }
            } catch (error) {
                console.error("Error fetching projects:", error);
            } finally {
                setLoading(false);
            }
        }

        fetchProjects();
    }, [user, userId, refreshProjects]);

    return (
        <PanelContainer>
            {loading ? (
                <LoadingText>Loading projects...</LoadingText>
            ) : projects.length > 0 ? (
                projects.map((project) => (
                    <Project key={project.projectId} onClick={() => setProjectId(project.projectId)}>
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
