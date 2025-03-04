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
      console.warn("🚨 handleFileClick called with undefined fileId");
      return;
    }

    console.log(`✅ File selected: fileId=${fileId}`); // ✅ Log selected fileId
    setFileId(fileId);
  };

  const indentStyle = {
    paddingLeft: `${depth * 20}px`,
  };

  if ("directory" in item) {
    console.log(`📁 Directory opened: directoryId=${item.directoryId}`); // ✅ Log directory clicks

    return (
      <Directory style={indentStyle} onClick={(e) => handleFileClick(item.directoryId, e)}>
        <DirectoryHeader>
          <div>📂 {item.directory}</div>
          <CreateButtonSmall
            onClick={(e) => {
              e.stopPropagation();
              console.log(`➕ Creating item inside directoryId=${item.directoryId}`); // ✅ Log create action
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

const UploadInput = styled.input`
  width: 100%;
  margin-bottom: 10px;
  padding: 5px;
  border: 1px solid #ccc;
  border-radius: 5px;
  cursor: pointer;
`;
