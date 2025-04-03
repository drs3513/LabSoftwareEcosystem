import React, {createContext, useContext, useState, ReactNode, useRef} from "react";
import {createTag as backendCreateTag} from "@/lib/tag";
import {processAndUploadFiles as backendProcessAndUploadFiles} from "@/lib/file";

//USAGE GUIDE : For many calls to backend functions, functionality may be as simple as creating a reference to whichever API call you are interested in, and redefining the instance of 'functionName' in your component to be in NotificationStateContext, as opposed to whichever library it came from
//HOWEVER : If you would like to add notifications directly to a front-end component (without pushing through to the notification manager), try to use only "pushNotification", as this is the only necessary feature for updating notifications

interface NotificationStateContextType {
  activeNotifications: notification[];
  pushNotification: (val: notification) => void;
  removeNotification: (index: number) => void;
  createTag: (tagType: "file" | "message", fileId: string, projectId: string, tagName: string) => void;
  processAndUploadFiles: (dict: Record<string, any>,  projectId: string, ownerId: string, parentId: string) => void;
}
interface notification {
  taskType: string;
  message: string;
}
const NotificationStateContext = createContext<NotificationStateContextType | undefined>(undefined);


export function NotificationStateProvider({ children }: {children: ReactNode}) {
  const [activeNotifications, setActiveNotifications] = useState<Array<notification>>([]);
  const activeNotificationsRef = useRef(activeNotifications)
  //pushes a notification to the top of the notification stack, when there are > 4 notifications, removes the oldest one
  function pushNotification(val: notification){
    setActiveNotifications([val, ...activeNotificationsRef.current.filter((item, index) => index < 4)])
    activeNotificationsRef.current = [val, ...activeNotificationsRef.current.filter((item, index) => index < 4)]
  }
  //removes notification at specific index
  function removeNotification(index: number){
    setActiveNotifications([...activeNotificationsRef.current.filter((item, i) => i != index)])
    activeNotificationsRef.current = [...activeNotificationsRef.current.filter((item, i) => i != index)]

  }

  //Example implementation of "createTag" function, implemented using notification state context
  async function createTag(tagType: "file" | "message", fileId: string, projectId: string, tagName: string){
      pushNotification({taskType: "upload", message: `Uploading Tag : \"${tagName}\"`})
      if(await backendCreateTag(tagType, fileId, projectId, tagName)){
        pushNotification({taskType: "upload", message: `Successfully Uploaded Tag : \"${tagName}\"`})
      } else {
        pushNotification({taskType: "error", message: 'Something went wrong!'})
      }

  }

  async function processAndUploadFiles(dict: Record<string, any>,
                                       projectId: string,
                                       ownerId: string,
                                       parentId: string) {
    pushNotification({taskType: "upload", message: `Uploading \"${dict}\" please do not close application!`})

    if(await backendProcessAndUploadFiles(dict, projectId, ownerId, parentId)){
      pushNotification({taskType: "upload", message: 'Upload Complete!'})
    } else {
      pushNotification({taskType: "error", message: 'Something went wrong!'})
    }

  }


  return (
      <NotificationStateContext.Provider value = {{activeNotifications, pushNotification, removeNotification, createTag, processAndUploadFiles}}>
        {children}
      </NotificationStateContext.Provider>
  )


}

export function useNotificationState() {
  const context = useContext(NotificationStateContext);
  if(!context) {
    throw new Error("useBackendState must be used within a BackendStateProvider")
  }
  return context
}