"use client";
import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";

interface GlobalStateContextType {
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  fileId: string | null;
  setFileId: (id: string | null) => void;
  userId: string | null;
  refreshProjects: boolean;
  setRefreshProjects: (refresh: boolean) => void;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthenticator(); // Get authenticated user
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [refreshProjects, setRefreshProjects] = useState<boolean>(false); // Added refresh state

  useEffect(() => {
    if (user?.signInDetails?.loginId) {
      setUserId(user.signInDetails.loginId); // Automatically assign userId
    }
  }, [user]);

  return (
    <GlobalStateContext.Provider 
      value={{ projectId, setProjectId, fileId, setFileId, userId, refreshProjects, setRefreshProjects }}
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
