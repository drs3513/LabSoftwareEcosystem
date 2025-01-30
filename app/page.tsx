"use client";

import { useState, useEffect } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import { useAuthenticator } from "@aws-amplify/ui-react";

import "./../app/app.css";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";
import "@aws-amplify/ui-react/styles.css";


Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
      
  const { user, signOut } = useAuthenticator();
  const [files, setFiles] = useState<Array<Schema["File"]["type"]>>([]);

  function listFiles() {
    client.models.File.observeQuery().subscribe({
      next: (data) => setFiles([...data.items]),
    });
  }

  useEffect(() => {
    listFiles();
  }, []);

  async function createFile() {
    try {
      // Prompt user for necessary fields
      const filename = window.prompt("Enter the file name:");
      if (!filename) {
        alert("Filename is required.");
        return;
      }
  
      var isDirectory = null;
      while(isDirectory == null){
        isDirectory = window.prompt("Is this a directory? (yes/no):")
      }
      const ownerId = window.prompt("Enter the owner ID:");
  
      // Validate isDirectory input
      const isDirectoryValue =
        isDirectory.toLowerCase() === "yes" ? true : false;
  
      if (!ownerId) {
        alert("Owner ID is required.");
        return;
      }
  
      // Get the current timestamp
      const now = new Date().toISOString();
  
      // Create the file record
      const newFile = await client.models.File.create({
        fileId: `file-${Math.floor(Math.random() * 100000)}`, // Generate a random ID for simplicity
        filename,
        isDirectory: isDirectoryValue,
        ownerId,
        createdAt: now,
        updatedAt: now,
      });
  
      alert("File created successfully!");
      console.log("Created file:", newFile);
    } catch (error) {
      console.error("Error creating file:", error);
      alert("An error occurred while creating the file. Please try again.");
    }
  }
  
    
  async function deleteFile(id: string) {
    try {
      // Confirm the deletion with the user
      const confirmDelete = window.confirm(
        `Are you sure you want to delete the file with ID: ${id}?`
      );
  
      if (!confirmDelete) {
        alert("File deletion canceled.");
        return;
      }
  
      // Attempt to delete the file
      await client.models.File.delete({ id });
  
      alert("File deleted successfully.");
      console.log(`File with ID ${id} has been deleted.`);
    } catch (error) {
      console.error("Error deleting file:", error);
      alert("An error occurred while deleting the file. Please try again.");
    }
  }
  

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Files</h1>
      <button onClick={createFile}>+ new</button>
      <ul>
      <ul>
      {files.map((file) => (
      <li 
      key={file.fileId} 
      onClick={() => deleteFile(file.fileId)} 
      style={{ cursor: "pointer", color: "blue", textDecoration: "underline" }}
      >
        {file.filename}
      </li>
  ))}
</ul>

      </ul>
      <div>
        🥳 App successfully hosted. Try creating a new todo.
        <br />
        <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">
          Review next steps of this tutorial.
        </a>
      </div>
    </main>
  );
}
