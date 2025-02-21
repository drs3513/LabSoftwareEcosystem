"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { directory_builder, createFile } from "@/lib/file";
import styled from "styled-components";

export default function FilePanel() {
  const { projectId, userId, setFileId } = useGlobalState();
  const [fileStructure, setFiles] = useState<any[]>([]);

  useEffect(() => {
    async function fetchFiles() {
      if (!projectId) {
        setFiles([]);
        return;
      }
      try {
        const structure = await directory_builder(null, projectId);
        console.log("directory: ",structure);
        setFiles(structure);
      } catch (error) {
        console.error("Error fetching file structure:", error);
      }
    }
    fetchFiles();
  }, [projectId]);

  const handleCreateFile = async () => {
    if (!projectId) {
      alert("No project selected. Please select a project first.");
      return;
    }

    const filename = prompt("Enter File Name:");
    if (!filename) return;
    const isDirectory = confirm("Is Directory?");
    const parentId = prompt("Enter parentId");
    try {

      const newFile = await createFile(projectId, filename, isDirectory, `/${filename}`, userId as string, 5, "1", parentId as string);

      if (newFile && newFile.data?.fileId) {
        setFiles((prevFiles) => [...prevFiles, newFile.data]);
      } else {
        console.error("File creation failed, invalid response:", newFile);
      }
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file. Please check the inputs.");
    }
  };

  return (
    <PanelContainer>
      {projectId ? (
        <>
          <CreateButton onClick={() => handleCreateFile()}>+ Create File</CreateButton>
          {fileStructure.length > 0 ? (
            fileStructure.map((item) => (
              <FileOrDirectory
                key={item.fileId || item.directoryId}
                item={item}
                setFileId={setFileId}
                handleCreateFile={handleCreateFile}
                depth={0}
              />
            ))
          ) : (
            <NoFiles>No files available.</NoFiles>
          )}
        </>
      ) : (
        <NoProjectSelected>No project selected.</NoProjectSelected>
      )}
    </PanelContainer>
  );
}

const FileOrDirectory = ({ item, setFileId, handleCreateFile, depth }: any) => {
  const handleFileClick = (fileId: string | undefined, event: React.MouseEvent) => {
    event.stopPropagation(); // Prevent parent click interference
    if (!fileId) {
      console.warn("handleFileClick called with undefined fileId");
      return;
    }
    console.log("Selected file or directory with ID:", fileId);
    setFileId(fileId);
  };

  const indentStyle = {
    paddingLeft: `${depth * 20}px`,
  };

  if ("directory" in item) {
    console.log("Directoryid:", item.directoryId);
    return (
      <Directory style={indentStyle} onClick={(e) => handleFileClick(item.directoryId,e)}>
      <DirectoryHeader>
        <div>📂 {item.directory}</div>
        <CreateButtonSmall
          onClick={(e) => {
            e.stopPropagation();
            handleCreateFile(item.directoryId);
          }}
        >
          + Add Item
        </CreateButtonSmall>
      </DirectoryHeader>
      {item.files.map((subItem: any) => (
        <FileOrDirectory
          key={subItem.fileId || subItem.directoryId}
          item={subItem}
          setFileId={setFileId}
          handleCreateFile={handleCreateFile}
          depth={depth + 1}
        />
      ))}
    </Directory>    
    );
  }

  return (
    <File
      style={indentStyle}
      onClick={(e) => {
        console.log("File clicked with ID:", item.fileId);
        handleFileClick(item.fileId, e);
      }}
    >
      📄 {item.filename}
    </File>
  );
};



// ✅ Styled Components
const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: black;
  padding: 1rem;
  text-align: left;
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

const CreateButtonSmall = styled.button`
  margin-left: 10px;
  padding: 5px;
  font-size: 0.8rem;
  background-color: #28a745;
  color: white;
  border: none;
  cursor: pointer;
  &:hover {
    background-color: #218838;
  }
`;

const File = styled.div`
  background-color: white;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  &:hover {
    background-color: grey;
  }
`;

const Directory = styled.div`
  background-color: lightgray;
  padding: 0.5rem 1rem;
  margin-top: 5px;
  border-radius: 5px;
  cursor: pointer;
  border: 1px solid black;  
  &:hover {
    background-color: grey;
  }
`;


const DirectoryHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;

const NoProjectSelected = styled.div`
  color: red;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  padding: 20px;
`;
