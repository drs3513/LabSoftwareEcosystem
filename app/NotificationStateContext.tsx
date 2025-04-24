import React, {createContext, useContext, useState, ReactNode, useRef, RefObject} from "react";

//USAGE GUIDE : For many calls to backend functions, functionality may be as simple as creating a reference to whichever API call you are interested in, and redefining the instance of 'functionName' in your component to be in NotificationStateContext, as opposed to whichever library it came from
//HOWEVER : If you would like to add notifications directly to a front-end component (without pushing through to the notification manager), try to use only "pushNotification", as this is the only necessary feature for updating notifications

interface NotificationStateContextType {
  activeNotifications: notificationType[];
  pushNotification: (val: notificationType) => void;
  removeNotification: (index: number) => void;
  uploadQueue: RefObject<uploadQueueType[]>;
  uploadTask: RefObject<uploadTaskType>;
  uploadProgress: number | null;
  setUploadProgress: (val: number | null) => void;
  downloadProgressMap: Record<string, number>;
  setDownloadProgressMap: (val: React.SetStateAction<Record<string, number>>) => void;
  completedUploads: number[];
  setCompletedUploads: (val: React.SetStateAction<number[]>) => void;
  showProgressPanel: boolean;
  setShowProgressPanel: (val: boolean) => void;
}
interface notificationType {
  taskType: string;
  message: string;
}

interface uploadQueueType {
  folderDict: Record<string, any>,
  ownerId: string,
  projectId: string,
  parentId: string
}

interface uploadTaskType {
  isCanceled: boolean,
  uploadedFiles: {storageKey?: string, fileId?: string}[],
  cancel: () => void,
}

const NotificationStateContext = createContext<NotificationStateContextType | undefined>(undefined);


export function NotificationStateProvider({ children }: {children: ReactNode}) {
  const [activeNotifications, setActiveNotifications] = useState<Array<notificationType>>([]);
  const activeNotificationsRef = useRef(activeNotifications)

  const uploadQueue = useRef<Array<uploadQueueType>>([])
  const uploadTask = useRef<uploadTaskType>({ isCanceled: false, uploadedFiles: [], cancel: () => {} })
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, number>>({});
  const [completedUploads, setCompletedUploads] = useState<number[]>([]);
  const [showProgressPanel, setShowProgressPanel] = useState<boolean>(false);

  //pushes a notification to the top of the notification stack, when there are > 4 notifications, removes the oldest one
  function pushNotification(val: notificationType){
    setActiveNotifications([val, ...activeNotificationsRef.current.filter((item, index) => index < 4)])
    activeNotificationsRef.current = [val, ...activeNotificationsRef.current.filter((item, index) => index < 4)]
  }
  //removes notification at specific index
  function removeNotification(index: number){
    setActiveNotifications([...activeNotificationsRef.current.filter((item, i) => i != index)])
    activeNotificationsRef.current = [...activeNotificationsRef.current.filter((item, i) => i != index)]
  }



  return (
      <NotificationStateContext.Provider value = {{activeNotifications, pushNotification, removeNotification, uploadQueue, uploadTask, uploadProgress, setUploadProgress, downloadProgressMap, setDownloadProgressMap, completedUploads, setCompletedUploads, showProgressPanel, setShowProgressPanel}}>
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