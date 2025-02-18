"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { listFilesForProject, createFile } from "@/lib/file";
import styled from "styled-components";

export default function FilePanel() {
  const { projectId, userId, setFileId } = useGlobalState();
  const [files, setFiles] = useState<Array<{ fileId: string; filename: string }>>([]);

  useEffect(() => {
    async function fetchFiles() {
      if (!projectId) return;
      const projectFiles = await listFilesForProject(projectId);
      setFiles(projectFiles);
    }
    fetchFiles();
  }, [projectId]);

  const handleCreateFile = async () => {
    const filename = prompt("Enter File Name:");
    const isDirectory = confirm("Is Directory?");
    if (!filename || !projectId || !userId) return;
  
    try {
      const newFile = await createFile(projectId, filename, isDirectory, `/${filename}`, userId, 5, "1");
  
      if (newFile) {
        setFiles((prevFiles) => [
          ...prevFiles,
          {
            fileId: newFile.data.fileId,
            filename: newFile.data.filename,
          }
        ]);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file. Please check the inputs.");
    }
  };
  
  return (
    <PanelContainer>
      <CreateButton onClick={handleCreateFile}>+ Create File</CreateButton>
      {files.length > 0 ? (
        files.map((file) => (
          <File key={file.fileId} onClick={() => setFileId(file.fileId)}>
            {file.filename}
          </File>
        ))
      ) : (
        <NoFiles>No files available.</NoFiles>
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

const File = styled.div`
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  &:hover {
    background-color: grey;
  }
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;
