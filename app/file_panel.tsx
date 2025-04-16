"use client";
import '@aws-amplify/ui-react/styles.css';
import React, {ChangeEvent, useEffect, useRef, useState, DragEvent} from "react";
import { useGlobalState } from "../GlobalStateContext";
import { useNotificationState } from "@/app/NotificationStateContext";
import {
  listFilesForProject,
  listFilesForProjectAndParentIds,
  searchFiles,
  updateFileLocation,
  createNewVersion,
  updatefile,
  createTag,
  deleteTag,
  getTags,
  getFilePath,
  getFileIdPath,
  processAndUploadFiles, deleteFile, Restorefile, hardDeleteFile,
  getFileChildren, batchUpdateFilePath, pokeFile
} from "@/lib/file";import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";
import { generateClient } from "aws-amplify/api";
import type { Schema } from "@/amplify/data/resource";
import CreateFilePanel from "./popout_create_file_panel"
import { startDownloadTask, downloadFolderAsZip, uploadFile, getFileVersions } from "@/lib/storage";
import {useRouter, useSearchParams} from "next/navigation"
import {getProjectName} from "@/lib/project";
import { isCancelError } from "aws-amplify/storage";
import ConflictModal from './conflictModal';
import Link from "next/link";
import {JSX} from "react/jsx-runtime";
import IntrinsicElements = JSX.IntrinsicElements;
import RecycleBinPanel from "@/app/main_screen/popout_recycling_bin";
import ReactDOM from 'react-dom';

const client = generateClient<Schema>();

/*-------------------------------------------------
                    TO DO
add routing support for currently viewed message window
remove 'list' requests wherever possible. I think with relational querying, I can make file display use a 'Get' request instead of a 'List' request
Make sure file drag-and-drop works as expected
This means that I need the following features : group-select drag&drop, drag&drop to file path elements at the top of window
Make sure updates works as expected (dependent on TODO above)
I don't quite remember what this one means ^^
-------------------------------------------------*/



function compare_file_date(file_1: any, file_2: any){
  let date_1 = new Date(file_1.updatedAt)
  let date_2 = new Date(file_2.updatedAt)
  if(date_1 == date_2){
    return 0
  } else if(date_1 > date_2){
    return 1
  } else {
    return -1
  }
}

function compare_file_date_reverse(file_1: fileInfo, file_2: fileInfo){
  return compare_file_date(file_1, file_2) * -1
}

function compare_file_name(file_1: any, file_2: any){
  return file_1.filename.localeCompare(file_2.filename)
}
function compare_file_name_reverse(file_1: any, file_2: any){
  return compare_file_name(file_1, file_2) * -1
}

const sort_style_map: {[key: string]: any} = {"alphanumeric" : compare_file_name, "alphanumeric-reverse" : compare_file_name_reverse, "chronological" : compare_file_date, "chronological-reverse" : compare_file_date_reverse}


interface fileInfo{
  fileId: string,
  filename: string,
  filepath: string,
  logicalId: string,
  size: number,
  versionId: string,
  ownerId: string,
  projectId: string,
  parentId: Nullable<string>,
  createdAt: string,
  updatedAt: string,
  visible: boolean,
  open: boolean,
  isDirectory: Nullable<boolean>|undefined,
  versions?: Schema["File"]["type"][]; // ← add this
}

interface activeParent{
  id: string,
  depth: number
}


export default function FilePanel() {

  const routerSearchParams = useSearchParams()
  const router = useRouter()

  const {userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId, heldKeys, setHeldKeys, draggingFloatingWindow} = useGlobalState();

  const {uploadQueue, uploadTask, uploadProgress, setUploadProgress,
    downloadProgressMap, setDownloadProgressMap, completedUploads, setCompletedUploads,
  showProgressPanel, setShowProgressPanel} = useNotificationState();


  const folderDownloadTask = useRef<{ isCanceled: boolean; cancel: () => void } | null>(null);
  
  const [contextMenuVersionPopout, setContextMenuVersionPopout] = useState(false);

  //const uploadQueue = useRef<Array<{
  //  folderDict: Record<string, any>,
  //  ownerId: string,
  //  projectId: string,
  //  parentId: string
        //}>>([]);
//
  //const uploadTask = useRef<{  isCanceled: boolean;
  //  uploadedFiles: { storageKey?: string, fileId?: string }[];  cancel: () => void; }>({ isCanceled: false, uploadedFiles: [], cancel: () => {} });
  const [projectId, setProjectId] = useState<string | undefined>(undefined)

  const projectName = useRef<string | undefined>(undefined)

  const [filePathElement, setFilePathElement] = useState<{fileName: string | undefined, href: string}[]>([])

  const [activeParentIds, setActiveParentIds] = useState<activeParent[]>([])

  const [rootParentId, setRootParentId] = useState<string | null>(null)

  const [contextMenuPosition, setContextMenuPosition] = useState([0,0])

  const [mouseCoords, setMouseCoords] = useState([0,0])

  const observeMouseCoords = useRef<boolean>(true);

  const [contextMenuFileId, setContextMenuFileId] = useState<string | undefined>(undefined);

  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [contextMenuTagPopout, setContextMenuTagPopout] = useState(false);

  const [contextMenuTags, setContextMenuTags] = useState< Nullable<string>[] | null | undefined>(undefined)

  const [contextMenuUser, setContextMenuUser] = useState<string | undefined>(undefined);

  const [files, setFiles] = useState<Array<fileInfo>>([]);
  const filesRef = useRef(files)
  filesRef.current = files

  const [searchTerm, setSearchTerm] = useState<Array<string>>([])

  const [tagSearchTerm, setTagSearchTerm] = useState<Array<string>>([])

  const [authorSearchTerm, setAuthorSearchTerm] = useState<Array<string>>([])

  const filesByParentId = useRef<{[key: string]: [number]}>({})

  const filesByFileId = useRef<{[key: string]: number}>({})

  const [sort, setSort] = useState("alphanumeric")

  const [search, setSearch] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pickedUpFileId, setPickedUpFileId] = useState<string | undefined>(undefined)
  const [pickedUpFileGroup, setPickedUpFileGroup] = useState<number[] | undefined>(undefined)

  const [selectedFileGroup, setSelectedFileGroup] = useState<number[] | undefined>(undefined)

  const [cutFileId, setCutFileId] = useState<fileInfo | undefined>(undefined)

  const timer = useRef(setTimeout(() => {}, 500));

  const isLongPress = useRef(false);

  const [createFilePanelUp, setCreateFilePanelUp] = useState(false);

  const [displayConflictModal, setDisplayConflictModel] = useState(false);

  const conflictModalData = useRef<{fileName: string, onResolve: (choice: "overwrite" | "version" | "cancel" | null, all: boolean) => void} | undefined>(undefined)

  const createFilePanelInitX = useRef(0);
  const createFilePanelInitY = useRef(0);
  const createFileOrFolder = useRef("File");

  const shiftKey = useRef(false)

  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const [expandedVersions, setExpandedVersions] = useState<Set<string>>(new Set());

  const activeDownloads = new Map<string, ReturnType<typeof startDownloadTask>>();

  const handleDownload = async (filePath: string, fileId: string,fileuser: string) => {
    filePath = `uploads/${fileuser}/${projectId}${filePath}`;
    const task = startDownloadTask(filePath, (percent) => {
      setDownloadProgressMap(prev => ({ ...prev, [fileId]: percent }));
    });    
  
    activeDownloads.set(fileId, task);
  
    try {
      const { body } = await task.result;
      const blob = await body.blob();
  
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filePath.split('/').pop() || "download";
      a.click();
      URL.revokeObjectURL(url);
  
    } catch (error) {
      if (isCancelError(error)) {
        console.warn(`[CANCELLED] Download cancelled: ${filePath}`);
      } else {
        console.error(`[ERROR] Download failed: ${filePath}`, error);
      }
    } finally {
      activeDownloads.delete(fileId);
    }
  };

  function toggleVersionList(fileId: string) {
    setExpandedVersions(prev => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }
  
  
  const cancelDownload = (fileId: string) => {
    const task = activeDownloads.get(fileId);
    if (task) {
      task.cancel();
      activeDownloads.delete(fileId);
      console.log(`[INFO] Download cancelled for fileId: ${fileId}`);
    }
  };
  
  //sorts files to be displayed by the user
  //TODO allow toggle of sort mode through setting 'sort' state
  function sort_files_with_path(files: Array<fileInfo>, sortStyle: string = "alphanumeric"){
    //console.log(files)
    let index = 0
    function assignFileByParentId(file: fileInfo) {
      if (filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"] == null) {
        filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"] = [index]
      } else {
        filesByParentId.current[file.parentId != null ? file.parentId : "no_parent"].push(index)
      }
    }

    //concatenates files together in the same order as the parent
    function concatenateFiles(curr_parent: string, files_by_parentId: any, file_list: any) {
      //console.log(curr_parent)

      for (let i = 0; i < files_by_parentId[curr_parent].length; i++) {

        //console.log(files_by_parentId[curr_parent][i])
        file_list.push(files_by_parentId[curr_parent][i])
        if (files_by_parentId[curr_parent][i].fileId in files_by_parentId) {
          file_list = concatenateFiles(files_by_parentId[curr_parent][i].fileId, files_by_parentId, file_list)
        }
      }
      return file_list
    }

    //put each file into its own 'bucket', which designates which parentId it belongs to, allows for seperate sorting
    //within subdirectories
    filesByParentId.current = {}

    for (let file of files) {
      assignFileByParentId(file)
      index += 1
    }
    let sorted_files: { [key: string]: fileInfo[] } = {}

    for (let key in filesByParentId.current) {
      let values = []
      for (let fileRef of filesByParentId.current[key]) {
        values.push(files[fileRef])
      }
      switch (sortStyle) {
        case "alphanumeric": {
          values = values.sort(compare_file_name)
          break
        }
        case "alphanumeric-reverse": {
          values = values.sort(compare_file_name_reverse)
          break
        }
        case "chronological": {
          values = values.sort(compare_file_date)
          break
        }
        case "chronological-reverse": {
          values = values.sort(compare_file_date_reverse)
          break
        }
        default: {
          values = values.sort(compare_file_name)
          break
        }
      }

      sorted_files[key] = values
    }

    if (activeParentIds[0].id in sorted_files) {
      files = concatenateFiles(activeParentIds[0].id, sorted_files, []);
    }
    filesByParentId.current = {}
    filesByFileId.current = {}
    index = 0
    for (let file of files) {
      assignFileByParentId(file)
      filesByFileId.current[file.fileId] = index
      index += 1
    }

    return files

  }
      

    //TODO for the love of god fix this hell

    async function fetchFiles() {
      if (!projectId) return;
    
      const projectFiles = await listFilesForProject(projectId);
      if (!projectFiles) return [];
    
      const grouped: Record<string, typeof projectFiles> = {};
      for (const file of projectFiles) {
        if (!file || (file.isDeleted && !showRecycleBin)) continue;
    
        if (!grouped[file.logicalId]) {
          grouped[file.logicalId] = [];
        }
        grouped[file.logicalId].push(file);
      }
    
      const groupedFiles: fileInfo[] = [];
    
      for (const logicalId in grouped) {
        const versions = grouped[logicalId].sort((a, b) =>
          new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
        );
        const latest = versions[0];
    
        groupedFiles.push({
          fileId: latest.fileId,
          logicalId: latest.logicalId,
          filename: latest.filename,
          filepath: latest.filepath,
          parentId: latest.parentId,
          size: latest.size,
          versionId: latest.versionId,
          ownerId: latest.ownerId,
          projectId: latest.projectId,
          createdAt: latest.createdAt,
          updatedAt: latest.updatedAt,
          visible: latest.parentId?.includes("ROOT") ?? false,
          open: false,
          isDirectory: latest.isDirectory,
          versions
        });
      }
    
      setFiles(sort_files_with_path(groupedFiles));
      return groupedFiles;
    }
    

    const observeFiles = () => {
      const subscription = client.models.File.observeQuery({
        filter: { projectId: { eq: projectId ? projectId : undefined } },
      }).subscribe({
        next: async ({ items }) => {
          // Group by logicalId, not fileId
          const grouped: Record<string, Schema["File"]["type"][]> = {};
          for (const file of items) {
            if (!file) continue;
          
            if (showRecycleBin && !file.isDeleted) continue;
            if (!showRecycleBin && file.isDeleted) continue;
          
            if (!grouped[file.logicalId]) {
              grouped[file.logicalId] = [];
            }
            grouped[file.logicalId].push(file);
          }
          
    
          // Reduce to latest version and collect all versions
          const groupedFiles: fileInfo[] = [];
          for (const logicalId in grouped) {
            const versions = grouped[logicalId].sort((a, b) =>
              new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
            );
            const latest = versions[0];
    
            groupedFiles.push({
              fileId: latest.fileId,
              logicalId: latest.logicalId,
              filename: latest.filename,
              filepath: latest.filepath,
              parentId: latest.parentId,
              size: latest.size,
              versionId: latest.versionId,
              ownerId: latest.ownerId,
              projectId: latest.projectId,
              createdAt: latest.createdAt,
              updatedAt: latest.updatedAt,
              visible: latest.parentId?.includes("ROOT") ?? false,
              open: false,
              isDirectory: latest.isDirectory,
              versions,
            });
          }
    
          setFiles(sort_files_with_path(groupedFiles));
          return groupedFiles;
        },
        error: (error) => {
          console.error("[ERROR] Error observing files:", error);
        },
      });
    
      return () => subscription.unsubscribe();
    };
    

  useEffect(() => {
    if(projectId){
      fetchFiles();

      const unsubscribe = observeFiles();
      return () => unsubscribe();
    }
  }, [projectId, showRecycleBin]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu) {
        setContextMenu(false);
      }
    };

    document.addEventListener("click", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [contextMenu]);
  
  /** Handles file selection via file browser */
/** Handles file selection via file browser */
const handleFileInput = async (isDirectory: boolean, projectId: string, ownerId: string, parentId: string) => {
  return new Promise<File[]>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = true;

      if (isDirectory) {
          input.webkitdirectory = true; // Enable folder selection
      }

      input.addEventListener("change", (event) => {
          const files = (event.target as HTMLInputElement).files;
          if (!files || files.length === 0) {
              console.error("[ERROR] No files selected.");
              reject("No files selected.");
              return;
          }

          const fileArray = Array.from(files);

          // Now that files are selected, call handleCreateFile
          handleCreateFile(isDirectory, projectId, ownerId, parentId, fileArray);

          resolve(fileArray);
      });

      input.click();
  });
};



/** Handles drag-and-drop file selection */
const handleFileDrag = async (
  event: DragEvent,
  projectId: string,
  ownerId: string,
  parentId: string
) => {
  event.preventDefault();

  const supportsWebkitGetAsEntry = "webkitGetAsEntry" in DataTransferItem.prototype;

  if (!supportsWebkitGetAsEntry) {
    console.error("[ERROR] webkitGetAsEntry not supported in this browser.");
    return;
  }

  const items: {
    index: number;
    item: DataTransferItem;
    entry: any;
    file: File | null;
  }[] = [];
  
  Array.from(event.dataTransfer.items).forEach((item, index) => {
    if (item.kind !== "file") return;
  
    const entry = (item as any).webkitGetAsEntry?.();
    const file = item.getAsFile?.() ?? null;
  
    items.push({ index, item, entry, file });
  
    const entryType = entry
      ? entry.isDirectory
        ? "directory"
        : entry.isFile
        ? "file"
        : "unknown"
      : "null";
  
    const name = file?.name || "(no fallback file)";
  });

  const files: File[] = [];
  const directories: string[] = [];

  const readEntry = async (entry: any, path = ""): Promise<void> => {

    if (entry.isFile) {
      await new Promise<void>((resolve, reject) => {
        entry.file((file: File) => {
          const fullPath = path ? `${path}/${file.name}` : file.name;
          const fileWithPath = new window.File([file], fullPath, { type: file.type });

          Object.defineProperty(fileWithPath, "webkitRelativePath", {
            value: fullPath,
          });

          files.push(fileWithPath);
          resolve();
        }, reject);
      });
    } else if (entry.isDirectory) {
      directories.push(path || entry.name);
      const reader = entry.createReader();

      const readAll = async () => {
        let batch: any[] = [];
        do {
          batch = await new Promise<any[]>((resolve, reject) =>
            reader.readEntries(resolve, reject)
          );
           for (const subEntry of batch) {
            await readEntry(subEntry, path ? `${path}/${entry.name}` : entry.name);
          }
        } while (batch.length > 0);
      };

      await readAll();
    }
  };

  for (const { index, entry, file } of items) {
    
  
    if (!entry && file) {
      Object.defineProperty(file, "webkitRelativePath", { value: file.name });
      files.push(file);
      continue;
    }
  
    if (!entry) {
      console.warn(`[WARNING] Item ${index} appears to be empty or unsupported — skipped.`);
      continue;
    }
  
    const entryType = entry.isDirectory ? "directory" : entry.isFile ? "file" : "unknown";
    
    try {
      await readEntry(entry);
      } catch (err) {
      console.error(`[ERROR] Failed to process entry ${index}: ${entry.name}`, err);
    }
  }
  
  
  
  

  
  if (files.length === 0 && directories.length === 0) {
    console.error("[ERROR] No valid files or directories found.");
    return;
  }

   handleCreateFile(directories.length > 0, projectId, ownerId, parentId, files);
};



/** Processes files and uploads them */
const handleCreateFile = async (isDirectory: boolean, projectId: string, ownerId: string, parentId: string, files: File[]) => {
  let globalDecision: 'overwrite' | 'version' | 'cancel' | null = null;
  let applyToAll = false;

  const showConflictModal = (filename: string) => {
    return new Promise<'overwrite' | 'version' | 'cancel'>(resolve => {
      const modalRoot = document.createElement("div");
      document.body.appendChild(modalRoot);

      const cleanup = () => {
        ReactDOM.unmountComponentAtNode(modalRoot);
        document.body.removeChild(modalRoot);
      };

      const handleResolve = (choice: typeof globalDecision, all: boolean) => {
        if (all) {
          globalDecision = choice;
          applyToAll = true;
        }
        cleanup();
        if(choice){
         resolve(choice);
        }
      };

      ReactDOM.render(<ConflictModal filename={filename} onResolve={handleResolve} />, modalRoot);
    });
  };

  if (!files || files.length === 0) {
    console.error("[ERROR] No files received.");
    return;
  }

  uploadTask.current = {
    isCanceled: false,
    uploadedFiles: [],
    cancel: () => {
      uploadTask.current!.isCanceled = true;
    }
  };

  const folderDict: Record<string, any> = {};

  for (const file of files) {
    if (uploadTask.current.isCanceled) break;

    const fullPath = file.webkitRelativePath || file.name;
    const pathParts = fullPath.split("/");
    const fileName = pathParts.pop()!;
    const filePath = "/" + fullPath;

    const conflict = filesRef.current.find(
      f => f.filepath === filePath && f.projectId === projectId
    );

    let decision: 'overwrite' | 'version' | 'cancel' = 'overwrite';

    if (conflict && !applyToAll) {
      decision = await showConflictModal(file.name);
      if (decision === 'cancel') continue;
    }

    if (decision === 'overwrite' && conflict) {
      console.log("[DECISION] Overwriting file:", file.name);
      const { key: storageKey } = await uploadFile(file, ownerId, projectId, filePath);
      const versionId = await getFileVersions(storageKey);
      await updatefile(conflict.fileId, projectId, versionId as string);
      // Let it fall through and overwrite S3 contents but prevent a new DB record
      continue;
    }
    

    if (decision === 'version' && conflict) {
      console.log("[DECISION] Creating new version for:", file.name);
      try {
        await createNewVersion(file, conflict.fileId, projectId, ownerId, parentId, filePath);
        console.log("[VERSION] New version created.");
      } catch (error) {
        console.error("[VERSION ERROR] Failed to create version for:", file.name, error);
      }
      continue;
    }
    await fetchFiles();
    

    // Place the file into the shared folderDict
    let current = folderDict;
    for (const part of pathParts) {
      if (!current[part]) current[part] = { files: {} };
      current = current[part];
    }

    if (!current.files) current.files = {};
    current.files[fileName] = file;
  }
  uploadQueue.current.push({
    folderDict,
    ownerId,
    projectId,
    parentId,
  });  
  await processAndUploadFiles(folderDict, projectId, ownerId, parentId, "", uploadTask,
    (percent: number) => setUploadProgress(percent));
    
    // After upload finishes, remove from queue and reset progress
    uploadQueue.current.shift();
    setCompletedUploads((prev) => [...prev, 0]);
    
    // Delay removal of visual trace
    setTimeout(() => {
      setCompletedUploads((prev) => prev.slice(1));
    }, 3000); // Keeps the completed upload visible for 3 seconds
    
    setUploadProgress(null);
    
};



const cancelUpload = () => {
  if (uploadTask.current) {
    uploadTask.current.cancel();
    console.warn("[CANCEL] Upload cancel requested.");
  }
};


  // opens / closes a folder that is clicked
  function openCloseFolder(openFileId: string) {
    if(search){
      return
    }
    if(openFileId in filesByParentId.current && filesByParentId.current[openFileId].length > 0){
      filesRef.current[filesByFileId.current[openFileId]].open = !filesRef.current[filesByFileId.current[openFileId]].open
    }
    if (openFileId in filesByParentId.current) {
      if(filesByParentId.current[openFileId].length > 0){
        for (let i of filesByParentId.current[openFileId]) {
          files[i].visible = !files[i].visible


          recursiveCloseFolder(files[i].fileId)
        }
      } else {
        files[filesByFileId.current[openFileId]].open = false
      }

    }
    setFiles(sort_files_with_path([...files]));
  }

  // recursively closes folders
  function recursiveCloseFolder(openFileId: string){
    if(openFileId in filesByParentId.current){
      for(let i of filesByParentId.current[openFileId]){

        if(files[i].visible){
          files[i].visible = !files[i].visible
          recursiveCloseFolder(files[i].fileId)
        }
      }
    }

  }

  async function onFilePlace(e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>, overFileId: Nullable<string>, overFilePath: Nullable<string>) {
    if(search){
      return
    }
    if(e.target != e.currentTarget){
      return
    }

    isLongPress.current = false;
    clearTimeout(timer.current);

    if(pickedUpFileId !== undefined){

      files[filesByFileId.current[pickedUpFileId]].parentId = overFileId
      const pickedUpFileIdCopy = pickedUpFileId
      setPickedUpFileId(undefined)

      recursiveGeneratePaths(pickedUpFileIdCopy, overFilePath !== null ? overFilePath + "/" : "/")

      if(overFileId){
        if(overFileId in filesByParentId.current && filesByParentId.current[overFileId].length > 0 && !files[filesByParentId.current[overFileId][0]].visible){
          files[filesByFileId.current[pickedUpFileId]].visible = false
          recursiveCloseFolder(pickedUpFileId)
        }
      }
      setFiles(sort_files_with_path(files))

    }

  }

  //If the user holds down left-click on a file / folder, all subdirectories are closed, and
  function onFilePickUp(currFileId : string) {
    if(search){
      return
    }
    isLongPress.current = true
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        recursiveCloseFolder(currFileId);
        setPickedUpFileId(currFileId);

      }
    }, 500)

  }

  async function recursiveDeleteFolder(fileId: string) {
    if (!fileId || !projectId) return;
  
    const fileIndex = filesByFileId.current[fileId];
    const file = files[fileIndex];
  
    if (file.isDirectory && filesByParentId.current[fileId]) {
      for (const childIndex of filesByParentId.current[fileId]) {
        const child = files[childIndex];
        await recursiveDeleteFolder(child.fileId); // Recursive delete
      }
    }
  
    // delete the folder/file itself
    await deleteFile(file.fileId, file.versionId, projectId);
  }

  const handleDownloadVersion = async (
    versionId: string,
    logicalId: string,
    filename: string,
    ownerId: string,
    projectId: string
  ) => {
    const path = `uploads/${ownerId}/${projectId}/${filename}`;
  
    if (!path || !versionId || !filename) {
      console.error("❌ Missing path, versionId, or filename");
      return;
    }
  
    // Generate the URL to your redirecting API route
    const downloadUrl = `/api/files?key=${encodeURIComponent(path)}&versionId=${encodeURIComponent(versionId)}`;
  
    // Open in a new tab or force download via anchor
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = filename;
    a.click();
  };
  
  
  


  async function handleDelete(fileId: string) {
    const file = files.find(f => f.fileId === fileId);
    if (!file || !projectId) return;
  
    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${file.isDirectory ? 'folder' : 'file'}: "${file.filename}"?`
    );
  
    if (!confirmDelete) {
      console.log("Deletion canceled by user.");
      return;
    }
  
    if (file.isDirectory) {
      await recursiveDeleteFolder(fileId);
    } else {
      await deleteFile(fileId, file.versionId, projectId);
    }
  }

  async function handleRestore(fileId: string, versionId: string) {
     await Restorefile(fileId, versionId, projectId as string);
  }
  
  
  async function handleHardDelete(fileId: string) {
    console.log(`${fileId}`);
    const confirmed = window.confirm("This will permanently delete this file and all versions. Continue?");
    if (!confirmed || !projectId) return;
  
    try {
      await hardDeleteFile(fileId, projectId);
    } catch (err) {
      console.error("Hard delete failed:", err);
    }
  }
  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(false);
      setContextMenuVersionPopout(false);
      setContextMenuTagPopout(false);
    };
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);
  
  

  //Recursively generates new 'path' values for all subdirectories of that which was placed
  function recursiveGeneratePaths(currFileId: Nullable<string>, pathAppend: string) {
    let newPathAppend: string = pathAppend

    if (currFileId !== null) {

      files[filesByFileId.current[currFileId]].filepath = pathAppend + files[filesByFileId.current[currFileId]].filename
      updateFileLocation(currFileId, pathAppend + files[filesByFileId.current[currFileId]].filename, files[filesByFileId.current[currFileId]].parentId, projectId as string).then()
      newPathAppend = pathAppend + files[filesByFileId.current[currFileId]].filename + "/"
      if (currFileId in filesByParentId.current) {
        for (let i of filesByParentId.current[currFileId]) {
          recursiveGeneratePaths(files[i].fileId, newPathAppend)
        }
      }
    }


  }

  function handleSearch(e: ChangeEvent<HTMLInputElement>){


    setPickedUpFileId(undefined)
    if(e.target.value.length > 0){
      setSearchTerm(e.target.value)
      setSearch(true)
    } else {
      setSearch(false)
    }

    //searchFiles(e.target.value).then()
  }

  function handleSwitchSort(sortStyle: string){
    setSort(sortStyle)
    setFiles(sort_files_with_path(files, sortStyle))










  }

  function closeCreateFilePanel(){
    setCreateFilePanelUp(false)
  }

  return (
    <>
      <PanelContainer
          onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel',undefined)}
          onMouseUp={(e) => onFilePlace(e, "ROOT-"+projectId, null)}
          onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}>
        <TopBarContainer>
        
          <Input onChange={(e) => handleSearch(e)}>

          </Input>
          <SortContainer>
            <SortSelector
                $selected = {sort ==='alphanumeric'}
                onClick={() => handleSwitchSort("alphanumeric")}>
              A
            </SortSelector>
            <SortSelector
                $selected = {sort ==='alphanumeric-reverse'}
                onClick = {() => handleSwitchSort("alphanumeric-reverse")}>
              B
            </SortSelector>

          </SortContainer>
        </TopBarContainer>
        

        {files.length > 0 ? (
            files.filter(file => (!search && file.visible) || (search && file.filename.toLowerCase().includes(searchTerm.toLowerCase()))).map((file) => (
                <File key={file.fileId}
                      $depth={(file.filepath.match(/\//g) || []).length}
                      $pickedUp={pickedUpFileId == file.fileId}
                      $mouseX={mouseCoords[0]}
                      $mouseY={mouseCoords[1]}
                      $search={search}
                      onMouseDown={() => file.fileId != pickedUpFileId ? onFilePickUp(file.fileId) : undefined}
                      onMouseUp={(e) => file.fileId != pickedUpFileId ? onFilePlace(e, file.fileId, file.filepath) : undefined}
                      onClick={() => openCloseFolder(file.fileId)}
                      onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile', file.ownerId)}>
                  {file.isDirectory ? "📁" : "🗎"} {file.filename}
                  <br></br><FileContext fileId={file.fileId} filename={file.filename} logicalId={file.logicalId} filepath={file.filepath}
                                        size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                        projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                        updatedAt={file.updatedAt} visible={file.visible} open={file.open}
                                        isDirectory={file.isDirectory}>
                                        </FileContext>
                </File>
            ))
        ) : (
            <NoFiles>No files available.</NoFiles>
        )}

    {createFilePanelUp ? (
        <CreateFilePanel
            initialPosX={createFilePanelInitX.current}
            initialPosY={createFilePanelInitY.current}
            parentFileId={contextMenuFileId}
            parentFilePath={contextMenuFilePath}
            isDirectory={createFileOrFolder.current}
            inputFile={handleFileInput}
            dragFile={handleFileDrag}
            close={closeCreateFilePanel}
        />
    ) : (
        <></>
    )}

    {
    contextMenu && contextMenuType == "filePanel" ? (
        <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
            <ContextMenuItem
                onClick={(e) => {
                    setCreateFilePanelUp(true);
                    createFilePanelInitX.current = e.pageX;
                    createFilePanelInitY.current = e.pageY;
                    createFileOrFolder.current = "File";
                }}
            >
                Upload File/Folder
            </ContextMenuItem>
            <ContextMenuItem>Open Chat</ContextMenuItem>
        </ContextMenu>
    ) : contextMenu && contextMenuType=="fileFile" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem>
                  Rename
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDelete(contextMenuFileId!)}>
                  Delete File
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDownload(contextMenuFilePath!, contextMenuFileId!,contexteMenuUser!)}>
                  Download
                </ContextMenuItem>
                <ContextMenuItem onClick={() => cancelDownload(contextMenuFileId!)}>
                  Cancel Download
                </ContextMenuItem>
                                <ContextMenuItem
                  onClick={() => setContextMenuVersionPopout(!contextMenuVersionPopout)}
                >
                  {contextMenuVersionPopout ? "▼ Versions" : "▶ Versions"}
                </ContextMenuItem>

                {contextMenuVersionPopout && contextMenuFileId && (() => {
                  const contextFile = files.find(f => f.fileId === contextMenuFileId);
                  if (!contextFile || !contextFile.versions) return null;

                  const sortedVersions = [...contextFile.versions].sort((a, b) =>
                    new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
                  );

                  return (
                    <>
                      {sortedVersions.map((version, idx) => {
                        const versionNumber = `v${idx + 1}`;
                        const isCurrent = version.versionId === contextFile.versionId;
                        const dateStr = new Date(version.updatedAt!).toLocaleString();

                        return (
                          <ContextMenuItem
                            key={`${version.versionId}-${idx}`}
                            style={{
                              fontSize: "12px",
                              paddingLeft: "1.5rem",
                              color: isCurrent ? "#000" : "#555",
                              fontWeight: isCurrent ? "bold" : "normal",
                              display: "flex",
                              justifyContent: "space-between"
                            }}
                          >
                            <span>{versionNumber} - {dateStr}</span>
                            <button
                              style={{
                                fontSize: "10px",
                                padding: "0 0.25rem",
                                background: "none",
                                border: "1px solid #888",
                                cursor: "pointer",
                                marginLeft: "0.5rem"
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadVersion(
                                  version.versionId!,
                                  contextFile.logicalId,
                                  contextFile.filename,
                                  contextFile.ownerId,
                                  contextFile.projectId
                                );
                              }}
                            >
                              ⬇
                            </button>
                          </ContextMenuItem>
                        );
                      })}
                    </>
                  );
                })()}


              </ContextMenu>
          ) : contextMenu && contextMenuType=="fileFolder" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="File"}}>
                  Create File
                </ContextMenuItem>
                <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="Folder"}}>
                  Create Folder
                </ContextMenuItem>
                <ContextMenuItem onClick={() => handleDelete(contextMenuFileId!)}>
                  Delete Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
                <ContextMenuItem onClick={async () => {
                  if (!contextMenuFilePath || !contextMenuFileId || !contexteMenuUser) return;

                  const filesInFolder = files.filter(f =>
                    f.filepath.startsWith(contextMenuFilePath!) && !f.isDirectory
                  ).map(f => ({
                    path: `uploads/${f.ownerId}/${projectId}${f.filepath}`,
                    filename: f.filepath.replace(contextMenuFilePath!, "").slice(1) // relative name
                  }));

                  folderDownloadTask.current = {
                    isCanceled: false,
                    cancel: () => {
                      if (folderDownloadTask.current) folderDownloadTask.current.isCanceled = true;
                    },
                  };

                  await downloadFolderAsZip(contextMenuFilePath!.split("/").pop() || "folder", filesInFolder, folderDownloadTask.current);
                  folderDownloadTask.current = null;
                }}>
                  Download Folder
                </ContextMenuItem>

                <ContextMenuItem onClick={() => {
                  if (folderDownloadTask.current) {
                    folderDownloadTask.current.cancel();
                    folderDownloadTask.current = null;
                  }
                }}>
                  Cancel Folder Download
                </ContextMenuItem>
              </ContextMenu>
          ) : (
              <>
              </>
          )
        }      
      </PanelContainer>
  
      {/* Progress Panel, uploads/downloads UI */}
      {showProgressPanel && (
        <ProgressPanel>
          <ProgressHeader>
            Transfers
            <DismissButton onClick={() => setShowProgressPanel(false)} title="Close Panel">
              ✖
            </DismissButton>
          </ProgressHeader>
  
          {uploadQueue.current.map((_, index) => {
            const isActive = index === 0 && uploadProgress !== null;
            const isCompleted = completedUploads.includes(index);
            return (
              <div key={`upload-${index}`} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center", opacity: isCompleted ? 0.5 : 1 }}>
                <ProgressBarContainer style={{ flex: 1 }}>
                  <ProgressBarFill percent={isActive ? uploadProgress ?? 0 : isCompleted ? 100 : 0} />
                </ProgressBarContainer>
                <ProgressLabel style={{ marginLeft: "8px" }}>
                  {isCompleted
                    ? `✅ Completed batch ${index + 1}`
                    : isActive
                      ? `Uploading batch ${index + 1} (${uploadProgress?.toFixed(0)}%)`
                      : `Queued batch ${index + 1}`}
                </ProgressLabel>
                {isActive && (
                  <CancelButton onClick={cancelUpload} title="Cancel Upload">
                    ✖
                  </CancelButton>
                )}
              </div>
            );
          })}
  
          {Object.entries(downloadProgressMap).map(([fileId, percent]) => (
            <div key={`download-${fileId}`} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>
              <ProgressBarContainer style={{ flex: 1 }}>
                <ProgressBarFill percent={percent} />
              </ProgressBarContainer>
              <ProgressLabel style={{ marginLeft: "8px" }}>
                {percent >= 100
                  ? `✅ Downloaded ${fileId}`
                  : `Downloading ${fileId} (${percent.toFixed(0)}%)`}
              </ProgressLabel>
              {percent < 100 && (
                <CancelButton onClick={() => cancelDownload(fileId)} title="Cancel Download">
                  ✖
                </CancelButton>
              )}
            </div>
          ))}
        </ProgressPanel>
      )}
  
      {/* Recycle Bin Button */}
      {!showRecycleBin && (
        <FloatingRecycleButton onClick={() => setShowRecycleBin(true)} title="Recycle Bin">
          🗑️
        </FloatingRecycleButton>
      )}

      {showRecycleBin && (
        <FloatingRecycleButton onClick={() => setShowRecycleBin(false)} title="Back to Files">
          📁
        </FloatingRecycleButton>
      )}

      {showRecycleBin && (
          <RecycleBinPanel>
            <RecycleBinHeader>🗑️ Recycle Bin</RecycleBinHeader>
            {files.length === 0 ? (
              <NoFiles>No deleted files.</NoFiles>
            ) : (
              files.map(file => (
                <File key={file.fileId} $depth={0} $pickedUp={false} $mouseX={0} $mouseY={0} $search={false}>
                  🗎 {file.filename}
                  <RecycleFileActions>
                    <button onClick={() => handleRestore(file.fileId, file.versionId)}>Restore</button>
                    <button onClick={() => handleHardDelete(file.fileId)}>Delete Permanently</button>
                  </RecycleFileActions>
                </File>
              ))
            )}
          </RecycleBinPanel>
        )}

    </>
  );
  

}

const SortContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: auto;
  height: 3rem;
`
const SortSelector = styled.button.attrs<{$selected: boolean}>(props => ({
  style : {
    backgroundColor: props.$selected ? 'lightgray' : 'white'
  }
}))`
  width: 2rem;
  height: 2rem;
  margin: auto .5rem;
  border-radius: 1rem;
  border-style: solid;
  border-width: 2px;
  border-color: #ccc;
  cursor: pointer;
  filter: drop-shadow(1px 1px 1px #000000);
  &:hover{
    
    background-color: lightgray !important;
  }
`

const ContextMenuItem = styled.div`
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenu = styled.div<{$x: number, $y: number}>`
    position: absolute;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-radius: 5px;
    border-width: 2px;
`;

const FileContextItem = styled.div`

  height: 100%;
  font-size: 12px;
  background-color: inherit;
  color: gray;
  text-align: left;
  overflow-y: auto;
  pointer-events: none;
`;

export function FileContext(file: fileInfo ) {
  const now = new Date()
  const updated = new Date(file.updatedAt)

  return (
      <FileContextItem>
        Last
        updated: {updated.toDateString() == now.toDateString() ? updated.toLocaleTimeString("en-US") : updated.toLocaleDateString("en-US")} {file.isDirectory? "" : "Size:"+file.size+"b"}
      </FileContextItem>
  );
}

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  text-align: center;
  overflow-y: auto;
`;

const File = styled.button.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number, $search: boolean}>(props => ({
  style: {
    position: props.$pickedUp ? "absolute" : undefined,
    top: props.$pickedUp ? props.$mouseY + "px" : "auto",
    left: props.$pickedUp ? props.$mouseX + "px" : "auto",
    marginLeft: props.$search ? 0  : props.$pickedUp ? props.$depth * 20 : "auto" ,
    width: props.$search ?  "100%" :(props.$pickedUp ? "auto" : "calc(100% - " + props.$depth * 20 + "px)"),
    pointerEvents: props.$pickedUp ? "none" : "auto",
    opacity : props.$pickedUp ? 0.75 : 1,
    backgroundColor: props.$pickedUp ? "lightskyblue" : "white",
    borderRadius: props.$pickedUp ? "10px" : "0"
  }
}))`
  color: inherit;
  border: none;
  font: inherit;
  outline: inherit;
  background-color: white;
  padding: 1rem;
  border-bottom: 1px solid #ddd;
  cursor: pointer;
  text-align: left;
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  user-select: none;
  border-radius: 0;
  &:hover {

    border: solid lightblue;

    padding-top: calc(1rem - 2px);
    padding-bottom: calc(1rem - 2px);
  }

  &:active {
    background-color: lightblue !important;

  }
`;

const NoFiles = styled.div`
  color: gray;
  text-align: center;
`;

const TopBarContainer = styled.div`
  display: flex;
  padding: 0.5rem;


`;

const Input = styled.input`
  flex: 1;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
  `;
  const DropZone = styled.div<{ $dragging: boolean }>`
  width: 100%;
  height: 100%;
  background-color: ${(props) => (props.$dragging ? "#e0f7fa" : "white")};
  border: ${(props) => (props.$dragging ? "2px dashed #007bff" : "2px dashed #ccc")};
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 20px;
  transition: background-color 0.3s;
`;

const DropText = styled.p`
  font-size: 16px;
  color: #555;
`;

/*--------------------------------------------------------------------
Comps for Progress display
--------------------------------------------------------------------*/
const ProgressBarContainer = styled.div`
  width: 100%;
  background-color: #f0f0f0;
  border-radius: 4px;
  height: 10px;
  margin: 10px 0;
  position: relative;
`;

const ProgressBarFill = styled.div<{ percent: number }>`
  height: 100%;
  width: ${(props) => props.percent}%;
  background-color: #007bff;
  border-radius: 4px;
  transition: width 0.3s ease;
`;

const ProgressLabel = styled.span`
  font-size: 12px;
  margin-left: 8px;
  color: #555;
`;

const CancelButton = styled.button`
  margin-left: 8px;
  border: none;
  background: transparent;
  color: red;
  font-size: 16px;
  cursor: pointer;

  &:hover {
    color: darkred;
  }
`;
const ProgressPanel = styled.div`
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  width: 300px;
  max-height: 50vh;
  overflow-y: auto;
  background: white;
  border: 1px solid #ccc;
  box-shadow: 0px 2px 10px rgba(0, 0, 0, 0.1);
  padding: 1rem;
  border-radius: 8px;
  z-index: 999;
`;

const ProgressHeader = styled.h4`
  margin: 0 0 0.5rem 0;
  font-size: 1rem;
  text-align: left;
  color: #333;
`;

const DismissButton = styled.button`
  background: none;
  border: none;
  color: #888;
  float: right;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  margin-left: auto;

  &:hover {
    color: #333;
  }
`;

const FloatingRecycleButton = styled.button`
  position: fixed;
  bottom: 1.5rem;
  left: 1.5rem;
  width: 48px;
  height: 48px;
  font-size: 24px;
  background-color: #f0f0f0;
  border: 2px solid #ccc;
  border-radius: 50%;
  cursor: pointer;
  z-index: 1000;
  box-shadow: 0px 2px 6px rgba(0, 0, 0, 0.2);

  &:hover {
    background-color: #ddd;
  }
`;
const RecycleBinPanel = styled.div`
  position: absolute;
  top: 3.5rem;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #fff5f5;
  overflow-y: auto;
  z-index: 500;
  padding: 1rem;
  border-top: 2px solid #ddd;
`;

const RecycleBinHeader = styled.h3`
  margin-top: 0;
  color: #c00;
`;

const RecycleFileActions = styled.div`
  margin-top: 0.5rem;
  display: flex;
  gap: 0.5rem;
  justify-content: flex-start;

  button {
    padding: 0.25rem 0.5rem;
    font-size: 0.8rem;
    border: 1px solid #ccc;
    background-color: #eee;
    cursor: pointer;

    &:hover {
      background-color: #ddd;
    }
  }
`;

const ContextMenuPopout = styled.div<{$index: number}>`
  position: absolute;
  top: ${(props) => 36 + props.$index * 28}px;
  left: 160px;
  min-width: 220px;
  background-color: lightgray;
  border: 2px solid dimgray;
  border-radius: 5px;
  z-index: 1001;
  padding: 0.25rem;
`;
