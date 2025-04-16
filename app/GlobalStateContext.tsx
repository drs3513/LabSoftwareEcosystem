"use client";
import React, {createContext, useContext, useState, useEffect, ReactNode, RefObject, useRef} from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";


interface GlobalStateContextType {
  projectId: string | undefined;
  setProjectId: (id: string | undefined) => void;
  fileId: string | undefined;
  setFileId: (id: string | undefined) => void;
  userId: string | null;
  contextMenu: boolean;
  setContextMenu: (val: boolean) => void;
  contextMenuType: string;
  setContextMenuType: (val: string) => void;
  heldKeys: string[];
  setHeldKeys: (val: string[]) => void;
  draggingFloatingWindow: RefObject<boolean>;
}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthenticator(); // Get authenticated user
  const [projectId, setProjectId] = useState<string | undefined>(undefined);
  const [fileId, setFileId] = useState<string | undefined>(undefined);
  const [userId, setUserId] = useState<string | null>(null);
  const [contextMenu, setContextMenu] = useState<boolean>(false);
  const [contextMenuType, setContextMenuType] = useState<string>("file");
  const [heldKeys, setHeldKeys] = useState<Array<string>>([]);
  const draggingFloatingWindow = useRef<boolean>(false)
  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId); // Automatically assign userId
    }
  }, [user]);

  return (
    <GlobalStateContext.Provider value={{ projectId, setProjectId, fileId, setFileId, userId, contextMenu, setContextMenu,
      contextMenuType, setContextMenuType, heldKeys, setHeldKeys, draggingFloatingWindow}}>
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