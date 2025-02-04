"use client";

import { useState, useEffect } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@/amplify/data/resource";
import outputs from "@/amplify_outputs.json";

import {
  listFiles,
  createFile,
  deleteFile,
  displayFiles,
  checkAndDeleteExpiredFiles,
} from "@/lib/file"; // ✅ Import file functions

import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function App() {
  const { user, signOut } = useAuthenticator();
  const [files, setFiles] = useState<Array<any>>([]);
  const [showDeleted, setShowDeleted] = useState(false);

  useEffect(() => {
    listFiles(setFiles);
    checkAndDeleteExpiredFiles(files, 0.016, "hours"); // Automatically delete files older than ~1 min
  }, []);

  return (
    <main>
      <h1>{user?.signInDetails?.loginId}'s Files</h1>
      <button onClick={createFile}>+ new</button>
      <button onClick={() => setShowDeleted(!showDeleted)}>
        {showDeleted ? "Hide Deleted Files" : "Show Deleted Files"}
      </button>

      <ul>
        {displayFiles(files, showDeleted).map((file) => (
          <li
            key={file.fileId}
            onClick={() => deleteFile(file.fileId)}
            style={{
              cursor: "pointer",
              color: file.isDeleted ? "gray" : "blue",
              textDecoration: file.isDeleted ? "line-through" : "underline",
            }}
          >
            {file.filename} {file.isDeleted && "(Deleted)"}
          </li>
        ))}
      </ul>

      <div>
        🥳 App successfully hosted. Try creating a new file.
        <br />
        <a href="https://docs.amplify.aws/nextjs/start/quickstart/nextjs-app-router-client-components/">
          Review next steps of this tutorial.
        </a>
      </div>

      <button onClick={signOut}>Sign out</button>
    </main>
  );
}
