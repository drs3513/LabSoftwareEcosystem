"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";

interface GlobalStateContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  fileId: string | null;
  setFileId: (id: string | null) => void;
  userId: string | null;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthenticator(); // Get authenticated user
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId); // Automatically assign userId
      console.log("user ID: ", user.userId)
    }
  }, [user]);

  return (
    <GlobalStateContext.Provider 
      value={{ projectId, setProjectId, fileId, setFileId, userId}}
    >
      {children}
    </GlobalStateContext.Provider>
  );
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}
