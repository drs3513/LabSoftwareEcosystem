"use client";

import { useState } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";
import { Amplify } from "aws-amplify";
import outputs from "@/amplify_outputs.json";

import FileExplorer from "@/components/FileExplorer";
import ChatPanel from "@/components/chatpanel";
import "@aws-amplify/ui-react/styles.css";

Amplify.configure(outputs);

export default function App() {
  const { user, signOut } = useAuthenticator();
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);


  const userId = user?.signInDetails?.loginId || "guest";

  return (
    <div style={{ display: "flex", height: "100vh" }}>

      <FileExplorer onSelectFile={setSelectedFileId} userId={userId} />

      {selectedFileId ? (
        <div style={{ width: "50vw", overflowY: "auto", padding: "10px" }}>
          <ChatPanel fileId={selectedFileId} userId={userId} />
        </div>
      ) : (
        <div style={{ width: "50vw", textAlign: "center", padding: "20px" }}>
          Select a file to chat
        </div>
      )}

      <button onClick={signOut} style={{ position: "absolute", top: "10px", right: "10px" }}>
        Sign Out
      </button>
    </div>
  );
}
