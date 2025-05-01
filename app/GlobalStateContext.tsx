"use client";
import React, {createContext, useContext, useState, useEffect, ReactNode, RefObject, useRef} from "react";
import { useAuthenticator } from "@aws-amplify/ui-react";

/**
 * Global accessible variables, prevents the need to cascade props needlessly
 */

interface GlobalStateContextType {
  role: string | null;
  setRole: (role: string | null) => void;
  projectId: string | null;
  setProjectId: (id: string | null) => void;
  fileId: string | undefined;
  setFileId: (id: string | undefined) => void;
  userId: string | null;
  heldKeys: string[];
  setHeldKeys: (val: string[]) => void;
  draggingFloatingWindow: RefObject<boolean>;
  messageThread: MessageThread | undefined;
  setMessageThread: (val: MessageThread) => void;
}

interface MessageThread {
  id: string;
  label: string;
  path: string | undefined;
  type: number; //0 is file, 1 is project

}

const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export function GlobalStateProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthenticator(); // Get authenticated user
  const [role, setRole] = useState<string | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [fileId, setFileId] = useState<string | undefined>(undefined);
  const [messageThread, setMessageThread] = useState<MessageThread | undefined>(undefined)
  const [userId, setUserId] = useState<string | null>(null);
  const [heldKeys, setHeldKeys] = useState<Array<string>>([]);
  const draggingFloatingWindow = useRef<boolean>(false)
  useEffect(() => {
    if (user?.userId) {
      setUserId(user.userId); // Automatically assign userId
    }
  }, [user]);

  return (
    <GlobalStateContext.Provider value={{ role, setRole, projectId, setProjectId, fileId, setFileId, userId,
      heldKeys, setHeldKeys, draggingFloatingWindow, messageThread, setMessageThread}}>
      {children}
    </GlobalStateContext.Provider>
  )
}

export function useGlobalState() {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error("useGlobalState must be used within a GlobalStateProvider");
  }
  return context;
}