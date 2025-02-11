"use client";

import { useState, useEffect } from "react";
import FileDropdown from "@/components/filedropdown";
import { listFiles, createFile } from "@/lib/file";
import type { Schema } from "@/amplify/data/resource";

type FileExplorerProps = {
  onSelectFile: (fileId: string) => void; // ✅ Explicitly type onSelectFile
  userId: string;
};

export default function FileExplorer({ onSelectFile, userId }: FileExplorerProps) {
  const [files, setFiles] = useState<Array<Schema["File"]["type"]>>([]); // ✅ Typed files
  const [directoryTree, setDirectoryTree] = useState<Record<string, any>>({}); // ✅ Typed directoryTree

  useEffect(() => {
    async function fetchFiles() {
      const fetchedFiles = await listFiles();
      console.log("Fetched Files:", fetchedFiles); // Debugging
      setFiles(fetchedFiles);
      setDirectoryTree(buildDirectoryTree(fetchedFiles));
    }
    fetchFiles();
  }, []);
  

  function buildDirectoryTree(files: Array<Schema["File"]["type"]>) {
    const tree: Record<string, any> = {};
  
    files.forEach((file) => {
      if (!file || !file.filepath || !file.filename) return; // Skip invalid files
  
      const parts = file.filepath.split("/").filter(Boolean); // Split path into parts
      let current = tree;
  
      parts.forEach((part, index) => {
        if (!current[part]) {
          // If it's the last part, assign the file directly
          current[part] = index === parts.length - 1 ? file : {};
        }
        current = current[part];
      });
    });
  
    console.log("Built Directory Tree:", tree); // Debugging
    return tree;
  }
  
  
  function renderTree(tree: Record<string, any>, path = "") {
    return (
      <ul style={{ listStyleType: "none", paddingLeft: "10px" }}>
        {Object.keys(tree).map((key) => {
          const fullPath = path ? `${path}/${key}` : key;
          const node = tree[key];
  
          // If it's a directory (an object with nested keys)
          if (node && typeof node === "object" && !node.fileId) {
            return (
              <li key={fullPath} style={{ marginBottom: "5px" }}>
                <strong>{key}</strong> {/* Directory name */}
                <button onClick={() => handleCreateFile(fullPath)} style={{ marginLeft: "10px" }}>
                  + New File
                </button>
                {renderTree(node, fullPath)} {/* Recursively render children */}
              </li>
            );
          }
  
          // If it's a file, render its dropdown
          if (node?.fileId && node?.filename) {
            return (
              <li key={node.fileId} style={{ marginLeft: "10px" }}>
                <FileDropdown file={node} userId={userId} onSelectFile={onSelectFile} />
              </li>
            );
          }
  
          console.warn("Skipping Invalid Entry:", node); // Debug invalid entries
          return null;
        })}
      </ul>
    );
  }
  

  async function handleCreateFile(directoryPath: string) {
    try {
      const filename = window.prompt("Enter the new file name:");
      if (!filename) return;

      const isDirectory = window.confirm("Is this a directory?");
      const size = isDirectory ? 0 : parseInt(window.prompt("Enter file size (KB):") || "0", 10);
      const versionId = window.prompt("Enter version number:") || "1";

      await createFile(filename, isDirectory, `${directoryPath}/${filename}`, userId, size, versionId);

      const updatedFiles = await listFiles();
      setFiles(updatedFiles.filter((file) => file && file.filename && file.filepath));
      setDirectoryTree(buildDirectoryTree(updatedFiles));
    } catch (error) {
      console.error("Error creating file:", error);
      alert("Failed to create file.");
    }
  }

  return (
    <div
      style={{
        width: "50vw",
        height: "100vh",
        overflowY: "auto",
        padding: "10px",
        textAlign: "left",
      }}
    >
      <h2>Files</h2>
      <button onClick={() => handleCreateFile("")}>+ New Root File</button>
      {Object.keys(directoryTree).length > 0 ? renderTree(directoryTree) : <p>No files available.</p>}
    </div>
  );
}
