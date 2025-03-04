"use client";

import { useEffect, useState } from "react";
import { useGlobalState } from "./GlobalStateContext";
import { directory_builder, uploadFileAndCreateEntry } from "@/lib/file";
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
        setFiles(structure);
      } catch (error) {
        console.error("Error fetching file structure:", error);
      }
    }
    fetchFiles();
  }, [projectId]);

  const handleFileOrFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!projectId) {
      alert("No project selected. Please select a project first.");
      return;
    }
  
    if (!event.target.files || event.target.files.length === 0) return;
  
    try {
      const files = Array.from(event.target.files);
  
      await Promise.all(
        files.map(async (file) => {
          const relativePath = file.webkitRelativePath || file.name; // Use relativePath if folder, else just filename
          await uploadFileAndCreateEntry(file, projectId, userId as string, relativePath);
        })
      );
  
      // Refresh file structure after upload
      const structure = await directory_builder(null, projectId);
      setFiles(structure);
  
      alert("Upload completed successfully.");
    } catch (error) {
      console.error("Error uploading files or folder:", error);
      alert("Failed to upload. Please try again.");
    }
  };
  
  return (
    <PanelContainer>
      {projectId ? (
        <>
          <UploadInput type="file" onChange={handleFileOrFolderUpload} />
          {fileStructure.length > 0 ? (
            fileStructure.map((item) => (
              <FileOrDirectory
                key={item.fileId || item.directoryId}
                item={item}
                setFileId={setFileId}
                handleCreateFile={handleFileOrFolderUpload}
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
    setFileId(fileId);
  };

  const indentStyle = {
    paddingLeft: `${depth * 20}px`,
  };

  if ("directory" in item) {

    return (
      <Directory style={indentStyle} onClick={(e) => handleFileClick(item.directoryId, e)}>
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
        handleFileClick(item.fileId, e);
      }}
    >
      📄 {item.filename}
    </File>
  );
};



const ContextMenuItem = styled.div`
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenu = styled.div<{$x: number, $y: number}>`
    position: absolute;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-radius: 5px;
    border-width: 2px;
`;

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  text-align: center;
  overflow-y: auto;
`;

const File = styled.button.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number, $search: boolean}>(props => ({
  style: {
    position: props.$pickedUp ? "absolute" : undefined,
    top: props.$pickedUp ? props.$mouseY + "px" : "auto",
    left: props.$pickedUp ? props.$mouseX + "px" : "auto",
    marginLeft: props.$search ? props.$pickedUp ? "auto" : props.$depth * 20 : "auto",
    width: props.$search ? props.$pickedUp ? "auto" : "calc(100% - " + props.$depth * 20 + "px)" : "100%",
    pointerEvents: props.$pickedUp ? "none" : "auto",
    opacity : props.$pickedUp ? 0.75 : 1,
    backgroundColor: props.$pickedUp ? "lightskyblue" : "white",
    borderRadius: props.$pickedUp ? "10px" : "0"
  }
}))`
  color: inherit;
  border: none;
  font: inherit;
  outline: inherit;
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  text-align: left;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-radius: 0;
  &:hover {
    
    border: solid lightblue;
    
    padding-top: calc(1rem - 2px);
    padding-bottom: calc(1rem - 2px);
  }
  
  &:active {
    background-color: lightblue !important;
    
    }
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;

const TopBarContainer = styled.div`
  display: flex;
  padding: 0.5rem;


`;

const Input = styled.input`
  flex: 1;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
`;

// Styled Components

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

const NoProjectSelected = styled.div`
  color: red;
  font-size: 1.2rem;
  font-weight: bold;
  text-align: center;
  padding: 20px;
`;

const UploadInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 5px;
  cursor: pointer;
`;
