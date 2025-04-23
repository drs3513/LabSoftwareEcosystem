import '@aws-amplify/ui-react/styles.css';
import React, {ChangeEvent, Component, ElementType, useEffect, useMemo, useRef, useState} from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { useNotificationState } from "@/app/NotificationStateContext";
import {
  listFilesForProject,
  listFilesForProjectAndParentIds,
  searchFiles,
  updateFileLocation,
  createTag,
  deleteTag,
  getTags,
  getFilePath,
  getFileIdPath,
  processAndUploadFiles, deleteFile, Restorefile, hardDeleteFile,
  getFileChildren, batchUpdateFilePath, pokeFile,
  updatefile,
  createNewVersion,
  waitForVersionId,
  createFolder,
  fetchCachedUrl,
} from "@/lib/file";
import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";
import { generateClient } from "aws-amplify/api";
import { startDownloadTask, downloadFolderAsZip, uploadFile, ZipTask } from "@/lib/storage";
import type { Schema } from "@/amplify/data/resource";
import CreateFilePanel from "../../popout_create_file_panel"
import {useRouter, useSearchParams} from "next/navigation"
import {getProjectName} from "@/lib/project";
import Link from "next/link";
import {JSX} from "react/jsx-runtime";
import ConflictModal from '../../conflictModal';
import VersionPanel from "@/app/main_screen/popout_version_panel";

import IntrinsicElements = JSX.IntrinsicElements;
import {isCancelError} from "aws-amplify/storage";
import RecycleBinPanel from "@/app/main_screen/popout_recycling_bin";


const client = generateClient<Schema>();

// TODO add routing support for currently viewed message window
// TODO remove 'list' requests wherever possible. I think with relational querying, I can make file display use a 'Get' request instead of a 'List' request
// TODO Make sure file drag-and-drop works as expected
// TODO This means that I need the following features : group-select drag&drop, drag&drop to file path elements at the top of window

// TODO Make sure updates works as expected (dependent on TODO above)
//I don't quite remember what this one means ^^
function compare_two_numbers(num_1: number, num_2: number) {
  if(num_1 < num_2){
    return -1
  } else if(num_1 > num_2){
    return 1
  } else {
    return 0
  }
}

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

type FileVersion = Pick<
  Schema["File"]["type"],
  "fileId" | "logicalId" | "filename" | "filepath" | "parentId" |
  "size" | "versionId" | "ownerId" | "projectId" | "createdAt" | "updatedAt"
>;

interface fileInfo{
  fileId: string,
  filename: string,
  filepath: string,
  logicalId: string,
  storageId: Nullable<string> |undefined,
  size: number,
  versionId: string,
  ownerId: string,
  projectId: string,
  parentId: string,
  createdAt: string,
  updatedAt: string,
  visible: boolean,
  open: boolean,
  isDirectory: boolean | null
  versions?: FileVersion[];
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

  const [contextMenuStoragePath, setContextMenuStoragePath] = useState<Nullable<string> | undefined>(undefined);

  const [contextMenuFileName, setContextMenuFileName] = useState<string | undefined>(undefined);

  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [contextMenuTagPopout, setContextMenuTagPopout] = useState(false);

  const [contextMenuTags, setContextMenuTags] = useState< Nullable<string>[] | null | undefined>(undefined)

  const [contextMenuUser, setContextMenuUser] = useState<string | undefined>(undefined);

  const [contextMenuVersionPopout, setContextMenuVersionPopout] = useState(false);
  const [showVersionPanel, setShowVersionPanel] = useState(false);
  const [versionPanelData, setVersionPanelData] = useState<fileInfo | null>(null);
  
  

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

  //const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  //const [downloadProgressMap, setDownloadProgressMap] = useState<Record<string, number>>({});
  //const [completedUploads, setCompletedUploads] = useState<number[]>([]);
  //const [showProgressPanel, setShowProgressPanel] = useState(true);


  const [showRecycleBin, setShowRecycleBin] = useState(false);

  const [dragOverFileId, setDragOverFileId] = useState<string | undefined>(undefined);


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


  async function fetchFiles() {
    if (!projectId) return;
  
    const projectFiles = await listFilesForProject(projectId); // This will return all versions
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
        storageId: latest.storageId,
        size: latest.size,
        versionId: latest.versionId,
        ownerId: latest.ownerId,
        projectId: latest.projectId,
        createdAt: latest.createdAt,
        updatedAt: latest.updatedAt,
        visible: true,
        open: false,
        isDirectory: latest.isDirectory,
        versions,
      });
    }
    setLoading(false);
    setFiles(sort_files_with_path(groupedFiles));
    return groupedFiles;
  }
  
  useEffect(() => {
    if(search) return
    if(projectId){
      fetchFiles();
      const unsubscribe = observeFiles();

      return () => unsubscribe();
    }
  }, [activeParentIds, search]);

  useEffect(() => {
    setLoading(true)
    const proj_id = routerSearchParams.get("pid")
    const root_id = routerSearchParams.get("id")
    if(!proj_id) {
      setLoading(false)
      return
    }
    setProjectId(proj_id)

    if(!root_id) {
      setLoading(false)
      return
    }
    setRootParentId(root_id)
    setActiveParentIds([{id: root_id, depth: 0}])
    fetchRootInfo(root_id, proj_id)

    //setActiveParentIds([routerSearchParams.id])
  }, [routerSearchParams])
  async function fetchRootInfo(root_id: string, proj_id: string){
    const activeFilePath = await getFilePath(root_id, proj_id)

    projectName.current = await getProjectName(proj_id)
    if(activeFilePath) {
      await createFileIdMapping(root_id, proj_id, activeFilePath, projectName.current)

    } else {
      setFilePathElement([{fileName: `${projectName.current}/`, href: `/main_screen?pid=${proj_id}&id=ROOT-${proj_id}`}])
      setLoading(false)
    }
  }

  async function createFileIdMapping(root_id: string, proj_id: string, activeFilePath: string, projectName: string | undefined){
    //console.log(filepath.split("/").splice(1))
    let fileIdPath = await getFileIdPath(root_id, proj_id)
    console.log(fileIdPath)
    if(!fileIdPath) {
      setFilePathElement([])
      return
    }
    fileIdPath.push(root_id)
    setFilePathElement([projectName, ...activeFilePath.split("/").splice(1)].map((fileName, i) => ({fileName: `${fileName}/`, href: `/main_screen?pid=${proj_id}&id=${fileIdPath[i]}`})))
    setLoading(false)
    return

  }

  const observeFiles = () => {
    const subscription = client.models.File.observeQuery({
      filter: {
        or: activeParentIds.map(parent => ({
          parentId: { eq: parent.id },
        })),
      },
      selectionSet: [
        "fileId", "filename", "filepath", "logicalId", "parentId", "size",
        "versionId", "ownerId", "projectId", "createdAt", "updatedAt", "isDirectory", "isDeleted", "storageId"
      ],
    }).subscribe({
      next: async ({ items }) => {
        if (items.length === 0) {
          setFiles([]);
          return;
        }
  
        // Apply client-side filter
        const visibleItems = items.filter(file =>
          showRecycleBin ? file.isDeleted === 1 : file.isDeleted === 0
        );
  
        // Group by logicalId and pick latest version
        const grouped: Record<string, typeof visibleItems> = {};
        for (const file of visibleItems) {
          if (!grouped[file.logicalId]) {
            grouped[file.logicalId] = [];
          }
          grouped[file.logicalId].push(file);
        }
  
        const temp_files = Object.values(grouped).map(versions => {
          const sorted = versions.sort(
            (a, b) =>
              new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime()
          );
          const latest = sorted[0];
  
          return {
            fileId: latest.fileId,
            filename: latest.filename,
            filepath: latest.filepath,
            logicalId: latest.logicalId,
            storageId: latest.storageId,
            parentId: latest.parentId,
            size: latest.size,
            versionId: latest.versionId,
            ownerId: latest.ownerId,
            projectId: latest.projectId,
            createdAt: latest.createdAt,
            updatedAt: latest.updatedAt,
            visible: true,
            open: activeParentIds.some(parent => parent.id === latest.fileId),
            isDirectory: latest.isDirectory,
            versions: sorted,
          };
        });
  
        setFiles(sort_files_with_path(temp_files));
      },
      error: (error) => {
        console.error("[ERROR] Error observing files:", error);
      },
    });
  
    return () => subscription.unsubscribe();
  };
  
  


  async function fetchFilesWithSearch(){
    setLoading(true);
    if (!projectId) return;
    console.log("Here")
    const projectFiles = await searchFiles(projectId, searchTerm, tagSearchTerm, authorSearchTerm)
    //builds array of files with extra information for display
    //Extra information :
    //'visible' : designates if a file is current visible,
    // 'open' : designates if a file is currently open (it's unclear that this is required)
    if(projectFiles){
      let temp_files: Array<fileInfo> = []
      for(let file of projectFiles) {
        if(file) {
          temp_files = [...temp_files,
            {
              fileId: file.fileId,
              filename: file.filename,
              logicalId: file.logicalId,
              filepath: file.filepath,
              storageId: file.storageId,
              parentId: file.parentId,
              size: file.size,
              versionId: file.versionId,
              ownerId: file.ownerId,
              projectId: file.projectId,
              createdAt: file.createdAt,
              updatedAt: file.updatedAt,
              visible: true,
              open: activeParentIds.some(parent => parent.id === file.fileId),
              isDirectory: file.isDirectory? file.isDirectory : null
            }]
        }
      }
      setFiles(temp_files)
      setLoading(false);
      return temp_files

    }

  }
  useEffect(() => {
    if(!search && activeParentIds.length > 0) setLoading(true)
    if(search){

      fetchFilesWithSearch();
      //const unsubscribe = observeFilesWithSearch();
      //return () => unsubscribe();
    }
  }, [searchTerm, tagSearchTerm, authorSearchTerm, search])


  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if(!(e.target && ((e.target as HTMLInputElement).id == "tag_input") || (e.target as HTMLDivElement).id == "tag_button") && contextMenu){
        setContextMenu(false);
        setContextMenuFileId(undefined);
      }
    };
    document.addEventListener("click", handleClickOutside);
    document.addEventListener("contextmenu", handleClickOutside);
    return () => {
      document.removeEventListener("click", handleClickOutside);
      document.removeEventListener("contextmenu", handleClickOutside);
    };
  }, [contextMenu]);

  useEffect(() => {
      const recordKeyPress = (e: KeyboardEvent) => {
        shiftKey.current = e.shiftKey
        if(e.ctrlKey){
          if(e.key == "x"){
            placeHeldFile()
          }
        }
      };
      const forgetKeyPress = (e: KeyboardEvent) => {
        setHeldKeys([...heldKeys].filter((keyVal) => keyVal != e.key))
      }
      document.addEventListener("keydown", recordKeyPress)
      document.addEventListener("keyup", forgetKeyPress)

      return () => {
        document.removeEventListener("keydown", recordKeyPress)
        document.removeEventListener("keyup", forgetKeyPress)
      }

      }
  )

  async function fetchTags(fileId: string){
    if (!projectId) return
    console.log("Here!")
    const tempTags = await getTags(fileId, projectId)

    setContextMenuTags(tempTags)
    console.log(tempTags)
  }


  useEffect(() => {
    if(contextMenuFileId){
      fetchTags(contextMenuFileId)
      const unsubscribe = observeTags();
      return () => unsubscribe();
    }

  }, [contextMenuFileId])


  const observeTags = () => {

    const subscription = client.models.File.observeQuery({
      filter: {
        fileId: {eq: contextMenuFileId}
      },
    }).subscribe({
      next: async ({ items }) => {

        if(items.length == 0){
          return []
        }

        let tempTags = items[0].tags
        setContextMenuTags(tempTags)
        //console.log(temp_files)

      },
      error: (error) => {
        console.error("[ERROR] Error observing tags:", error);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  const activeDownloads = new Map<string, ReturnType<typeof startDownloadTask>>();

  const handleDownload = async (storagePath: string, filename: string, fileId: string) => {
    const task = startDownloadTask(storagePath, (percent) => {
      setDownloadProgressMap(prev => ({ ...prev, [filename]: percent }));
    });

    activeDownloads.set(fileId, task);

    try {
      const { body } = await task.result;
      const blob = await body.blob();

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = storagePath.split('/').pop() || "download";
      a.click();
      URL.revokeObjectURL(url);

    } catch (error) {
      if (isCancelError(error)) {
        console.warn(`[CANCELLED] Download cancelled: ${fileId}`);
      } else {
        console.error(`[ERROR] Download failed: ${fileId}`, error);
      }
    } finally {
      activeDownloads.delete(fileId);
    }
  };

  const handleFolderDownload = async (folderName: string, folderLogicalId: string) => {
    if (!projectId) return;
  
    const task: ZipTask = {
      isCanceled: false,
      cancel() {
        task.isCanceled = true;
      },
    };
  
    const allChildren = await getFileChildren(projectId, folderLogicalId);
    const validFiles = allChildren?.filter(f => !f.isDirectory && f.storageId && f.filepath);
  
    const fileList = validFiles?.map(file => ({
      filepath: file.filepath,         // This is how it appears to the user
      storageId: file.storageId!,      // This is how we fetch it
    }));
  
    await downloadFolderAsZip(folderName, fileList as [], task);
  };

  const handleDownloadCurrentView = async () => {
    if (!projectId) return;
  
    console.log("[DEBUG] Files in current view:", filesRef.current);
  
    const task: ZipTask = {
      isCanceled: false,
      cancel() {
        task.isCanceled = true;
      },
    };
  
    const rootLogicalId = rootParentId?.replace("ROOT-", "") || "";
  
    let fileList: { filepath: string; storageId: string }[] = [];
  
    try {
      const allChildren = await getFileChildren(projectId, rootLogicalId);
      fileList = (allChildren || [])
        .filter(f => !f.isDirectory && f.storageId && f.filepath)
        .map(f => ({
          filepath: f.filepath.startsWith("/") ? f.filepath.slice(1) : f.filepath,
          storageId: f.storageId!,
        }));
  
      // Merge in case anything else is in filesRef (optional)
      for (const file of filesRef.current) {
        if (!file.storageId || file.isDirectory) continue;
  
        fileList.push({
          filepath: file.filepath.startsWith("/") ? file.filepath.slice(1) : file.filepath,
          storageId: file.storageId,
        });
      }
  
      if (fileList.length === 0) {
        console.warn("No downloadable files in current view.");
        return;
      }
      const rootName = filePathElement.length > 0
      ? filePathElement[filePathElement.length - 1].fileName?.replace("/", "") || "project-files"
      : projectName.current || "project-files";
      await downloadFolderAsZip(rootName, fileList, task);
    } catch (err) {
      console.error("Download error:", err);
    }
  
  };
  
  
  

  const cancelDownload = (fileId: string) => {
    const task = activeDownloads.get(fileId);
    if (task) {
      task.cancel();
      activeDownloads.delete(fileId);
      console.log(`[INFO] Download cancelled for fileId: ${fileId}`);
    }
  };

  /** Handles drag-and-drop file selection */
  const handleFileDrag = async (
      event: React.DragEvent<HTMLDivElement> | React.DragEvent<HTMLButtonElement>,
      projectId: string,
      ownerId: string,
      parentId: string,
      rootFilePath: string
      ) => {
    if(event.target != event.currentTarget) return
    if(draggingFloatingWindow.current) return
    event.preventDefault();
    setDragOverFileId(undefined);
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
    if(!event.dataTransfer) return;

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

    handleCreateFile(directories.length > 0, projectId, ownerId, parentId, files, rootFilePath);
  };



  /** Processes files and uploads them */
  const handleCreateFile = async (isDirectory: boolean, projectId: string, ownerId: string, parentId: string, files: File[], rootFilePath: string) => {
    let globalDecision: 'overwrite' | 'version' | 'cancel' | null = null;
    let applyToAll = false;

    const showConflictModal = (filename: string) => {
      return new Promise<'overwrite' | 'version' | 'cancel'>(resolve => {

        const cleanup = () => {
          setDisplayConflictModel(false)
          conflictModalData.current = undefined
        };

        const handleResolve = (choice: typeof globalDecision, all: boolean) => {
          if (all) {
            globalDecision = choice;
            applyToAll = true;
          }
          cleanup();
          if(!choice){
            resolve("cancel")
            return
          }
          resolve(choice);
        };

        conflictModalData.current = {
          fileName: filename,
          onResolve: handleResolve
        }

        setDisplayConflictModel(true)
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
    setShowProgressPanel(true)
    for (const file of files) {
      if (uploadTask.current.isCanceled) break;

      const fullPath = file.webkitRelativePath || file.name;
      const pathParts = fullPath.split("/");
      const fileName = pathParts.pop()!;
      const filePath = `${rootFilePath.replace(/\/$/, "")}/${fullPath}`.replace(/\/+/g, "/");
      ;

      const conflict = filesRef.current.find(
          f => f.filepath === filePath && f.projectId === projectId
      );

      let decision: 'overwrite' | 'version' | 'cancel' = 'overwrite';

      if (conflict && !applyToAll) {
        decision = await showConflictModal(file.name);
        if (decision === 'cancel') continue;
      }

      if (decision ==='overwrite' && conflict) {
        const { key: storageKey } = await uploadFile(file, ownerId, projectId, filePath);
        waitForVersionId(storageKey).then((versionId) => {
          return updatefile(conflict.fileId, projectId, versionId as string);
        });;
        
      }

      let actualName = fileName;
      if (decision === 'version') {
        try {
                await createNewVersion(file, conflict?.logicalId as string, projectId, ownerId, parentId, filePath);
              } catch (error) {
                console.error("[VERSION ERROR] Failed to create version for:", file.name, error);
              }
              continue;
      }

      // Place the file into the shared folderDict
      let current = folderDict;
      for (const part of pathParts) {
        if (!current[part]) current[part] = { files: {} };
        current = current[part];
      }

      if (!current.files) current.files = {};
      current.files[actualName] = file;
    }
    uploadQueue.current?.push({
      folderDict,
      ownerId,
      projectId,
      parentId,
    });
    await processAndUploadFiles(folderDict, projectId, ownerId, parentId, rootFilePath, uploadTask,
        (percent: number) => setUploadProgress(percent));

    // After upload finishes, remove from queue and reset progress
    uploadQueue.current?.shift();
    setCompletedUploads((prev) => [...prev, 0]);

    // Delay removal of visual trace
    setTimeout(() => {
      setCompletedUploads((prev) => prev.slice(1));
    }, 3000); // Keeps the completed upload visible for 3 seconds

    setUploadProgress(null);
    setShowProgressPanel(false)
  };



  const cancelUpload = () => {
    if (uploadTask.current) {
      uploadTask.current.cancel();
      console.warn("[CANCEL] Upload cancel requested.");
    }
  };
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

  async function handleDelete(fileId: string) {
    const file = files.find(f => f.fileId === fileId);
    if (!file || !projectId) return;

    /*const confirmDelete = window.confirm(
        `Are you sure you want to delete ${file.isDirectory ? 'folder' : 'file'}: "${file.filename}"?`
    );

    if (!confirmDelete) {
      console.log("Deletion canceled by user.");
      return;
    }*/

    if (file.isDirectory) {
      await recursiveDeleteFolder(fileId);
    } else {
      await deleteFile(fileId, file.versionId, projectId);
    }
  }






  //TODO Make this do something!
  async function onFilePlace(e: React.MouseEvent<HTMLButtonElement> | React.MouseEvent<HTMLDivElement>, overFileId: Nullable<string>, overFilePath: Nullable<string>) {
    if(search){
      return
    }
    if(e.target != e.currentTarget){
      return
    }
    if(!projectId) return
    if(!overFileId) return
    observeMouseCoords.current = false


    isLongPress.current = false;
    clearTimeout(timer.current);
    //console.log(pickedUpFileGroup)
    if(pickedUpFileGroup != undefined){

      for(let fileIndex of pickedUpFileGroup) {
        if(!projectId) return
        console.log("Here!")
        const children = await getFileChildren(projectId, files[fileIndex].filepath)
        console.log(children)
      }
      setPickedUpFileGroup(undefined)

    } else if(pickedUpFileId){


      const children = await getFileChildren(projectId, files[filesByFileId.current[pickedUpFileId]].filepath)
      if(!children) return

      observeMouseCoords.current = false


      files[filesByFileId.current[pickedUpFileId]].parentId = overFileId

      //console.log(children)
      //console.log(files[filesByFileId.current[pickedUpFileId]].filepath)
      //console.log(overFileId)
      //console.log(files[filesByFileId.current[overFileId]].filepath)
      let new_file_path = `/${files[filesByFileId.current[pickedUpFileId]].filename}`
      if(overFileId in filesByFileId.current){
        new_file_path = `${files[filesByFileId.current[overFileId]].filepath}/${files[filesByFileId.current[pickedUpFileId]].filename}`
      } else {
        if(overFileId == `ROOT-${projectId}`){
          new_file_path = `/${files[filesByFileId.current[pickedUpFileId]].filename}`
        } else {
          const base_file_path = await getFilePath(overFileId, projectId)
          new_file_path = `${base_file_path}/${files[filesByFileId.current[pickedUpFileId]].filename}`
        }

      }



      const fileIds = children.map((child) => child.fileId)
      const filepaths = children.map((child) => new_file_path + child.filepath.slice(files[filesByFileId.current[pickedUpFileId]].filepath.length))
      const parentIds = children.map((child) => child.fileId == pickedUpFileId ? (overFileId ? overFileId : `ROOT-${projectId}`) : child.parentId)
      console.log(filepaths)
      //`if(overFileId){
      //`  console.log(files[filesByFileId.current[overFileId]].filepath)
      //`} else {
//`
      //`}
      const returnedValue = await batchUpdateFilePath(fileIds, projectId, parentIds, filepaths)
      fetchFiles()
      const poke = await pokeFile(fileIds[0], projectId, filepaths[0])
      setPickedUpFileId(undefined)

      console.log(returnedValue)
    }
    observeMouseCoords.current = true
  }

  //If the user holds down left-click on a file / folder, all subdirectories are closed, and
  function onFilePickUp(e: React.MouseEvent<HTMLButtonElement>, currFileId : string) {
    if(search){
      return
    }
    isLongPress.current = true
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        setMouseCoords([e.clientX, e.clientY])
        if(selectedFileGroup != undefined && (selectedFileGroup.length == 2 && (filesByFileId.current[currFileId] >= selectedFileGroup[0] && filesByFileId.current[currFileId] <= selectedFileGroup[1]) || (filesByFileId.current[currFileId] >= selectedFileGroup[1] && filesByFileId.current[currFileId] <= selectedFileGroup[0]))){
          setPickedUpFileGroup(selectedFileGroup)
        }
        else {
          //recursiveCloseFolder(currFileId);
          setPickedUpFileId(currFileId)
        }
      }}, 500)
  }

  //Recursively generates new 'path' values for all subdirectories of that which was placed
  function recursiveGeneratePaths(currFileId: Nullable<string>, pathAppend: string) {
    let newPathAppend: string = pathAppend

    if (currFileId && projectId) {
      files[filesByFileId.current[currFileId]].filepath = pathAppend + files[filesByFileId.current[currFileId]].filename
      updateFileLocation(currFileId, pathAppend + files[filesByFileId.current[currFileId]].filename, files[filesByFileId.current[currFileId]].parentId, projectId)
      newPathAppend = pathAppend + files[filesByFileId.current[currFileId]].filename + "/"
      if (currFileId in filesByParentId.current) {
        for (let i of filesByParentId.current[currFileId]) {
          recursiveGeneratePaths(files[i].fileId, newPathAppend)
        }
      }
    }
  }

  function reorient_files_on_new_root(temp_files: Array<fileInfo>, root_id: string){
    return temp_files.map(file => ({
          fileId: file.fileId,
          filename: file.filename,
          filepath: file.filepath,
          parentId: file.parentId,
          size: file.size,
          versionId: file.versionId,
          ownerId: file.ownerId,
          projectId: file.projectId,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          visible: file.parentId === root_id,
          open: false,
          isDirectory: file.isDirectory
    }))
  }

  function reorientView(index: number){
    if(files[index].isDirectory){
      router.push(`/main_screen/?pid=${projectId}&id=${files[index].fileId}`, undefined)
      //setFiles(reorient_files_on_new_root([...files], files[index].fileId))
    } else {
      if(files[index].parentId){
        router.push(`/main_screen/?pid=${projectId}&id=${files[index].parentId}`, undefined)
      }
    }
  }

  function recursiveSelectFile(index: number){
    let to_append = [index]
    if(files[index].fileId in filesByParentId.current){
      for(let file of filesByParentId.current[files[index].fileId]){
        to_append = [...to_append, ...recursiveSelectFile(file)]
      }
    }
    return to_append
  }

  function selectFile(e: React.MouseEvent<HTMLButtonElement>, index: number){
    if(e.detail == 2){
      reorientView(index)
    } else {
      let to_append = recursiveSelectFile(index)
      if(to_append.length == 1){
        setSelectedFileGroup(to_append)
      } else {
        setSelectedFileGroup([to_append[0], to_append[to_append.length-1]])
      }


      console.log(files[index])
    }
  }
  function selectFileGroup(index: number){
    if(!selectedFileGroup){
      setSelectedFileGroup([index])
    } else {
      setSelectedFileGroup([...selectedFileGroup.filter((val, i) => i < 1), index])
    }
  }
  function placeHeldFile(){
    return
  }
  //search query parser
  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>){
    setPickedUpFileId(undefined)
    if((e.target as HTMLInputElement).value.length > 0 && e.key == "Enter"){``
      let search_set = (e.target as HTMLInputElement).value.split("/")
      let temp_tag_set = []
      let temp_author_set = []
      let temp_name_set = []
      setTagSearchTerm([])
      setSearchTerm([]);
      setAuthorSearchTerm([]);
      for(let search of search_set){
        if(search.length > 0){
          switch(search.charAt(0)){
            case "#":
              temp_tag_set.push(search.substring(1).trimEnd().trimStart())
              break;
            case "&":
              temp_author_set.push(search.substring(1).trimEnd().trimStart())
              break;
            default:
              temp_name_set.push(search.trimEnd().trimStart())
              break;
          }
        }
      }
      setTagSearchTerm(temp_tag_set)
      setAuthorSearchTerm(temp_author_set)
      setSearchTerm(temp_name_set)
      console.log(temp_name_set)
      setSearch(true)
    }

    //searchFiles(e.target.value).then()
  }

  function handleSwitchSort(sortStyle: string){
    setSort(sortStyle)
    setFiles(sort_files_with_path(files, sortStyle))

  }



  async function handleTagInput(e: React.KeyboardEvent<HTMLInputElement>){
    if(e.key == "Enter"){
      if(contextMenuFileId && projectId && (e.target as HTMLInputElement).value.length > 0){
        const tag_name = (e.target as HTMLInputElement).value as string
        (e.target as HTMLInputElement).value = ""

        createTag(contextMenuFileId, projectId, contextMenuTags, tag_name)
      }
    }
  }

  // generates list of parentId's to remove from ActiveParentIds
  function recursiveCloseFolder(openFileId: string){
    let to_remove: string[] = []
    if(!(openFileId in filesByParentId.current)) return []
    for (let folder of filesByParentId.current[openFileId]){
      if(files[folder].isDirectory && activeParentIds.some(parent => parent.id === files[folder].fileId)){
        setActiveParentIds([...activeParentIds.filter(parent => parent.id != files[folder].fileId)])
        to_remove = [...to_remove, files[folder].fileId, ...recursiveCloseFolder(files[folder].fileId)]
      }
    }
    return to_remove
  }

  // opens / closes a folder that is clicked
  async function openCloseFolder(openFileId: string) {
    setSelectedFileGroup(undefined)
    if(search){
      return
    }
    //if openFileId in activeParentIds
    if(activeParentIds.some(parent => parent.id === openFileId)){
      //create list of activeParentIds to remove (with children)
      let to_remove = [openFileId]
      to_remove = [...to_remove, ...recursiveCloseFolder(openFileId)]
      //remove
      setActiveParentIds([...activeParentIds.filter(parent => !(to_remove.includes(parent.id)))])
    }
    else {
      const found_active_parent = activeParentIds.find(parent => parent.id === files[filesByFileId.current[openFileId]].parentId)

      setActiveParentIds([...activeParentIds, {id: openFileId, depth: found_active_parent? found_active_parent.depth + 1 : 0}])
    }
  }

  const handleDownloadVersion = async (
    versionId: string,
    logicalId: string,
    filename: string,
    filepath: string,
    ownerId: string,
    projectId: string
  ) => {
    const path = `uploads/${ownerId}/${projectId}${filepath}`;
  
    if (!path || !versionId || !filepath) {
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

  function handleCreateFolder() {
    if (!projectId || !userId) return;
  
    const name = window.prompt("Name of folder", "New Folder");
    if (!name) return;
  
    const parentId = contextMenuFileId ?? `ROOT-${projectId}`;
    const parentPath = contextMenuFilePath ?? "";
    const fullPath = `${parentPath}/${name}`.replace(/\/+/g, "/");
  
    createFolder(projectId, name, userId, parentId, fullPath);
  }  


  function createContextMenu(e: React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>, fileId: string | undefined, filepath: string | undefined, location: string, userId: string | undefined, storagePath: Nullable<string> |undefined, filename: string |undefined){
    if(e.target != e.currentTarget){
      return
    }
    console.log("This was called")
    isLongPress.current = false;
    clearTimeout(timer.current);
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType(location);
    setContextMenuPosition([e.pageX, e.pageY]);
    setContextMenuFileId(fileId);
    setContextMenuFilePath(filepath);
    setContextMenuTagPopout(false);
    setContextMenuUser(userId);
    setContextMenuStoragePath(storagePath);
    setContextMenuFileName(filename);

  }


  function getDepth(file: fileInfo){
    //console.log(file)
    const found_parent_id = activeParentIds.find(parent => parent.id === file.parentId)
    return found_parent_id? found_parent_id.depth : -1
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement> | React.DragEvent<HTMLButtonElement>, fileId: string | undefined){
    e.preventDefault();
    if(draggingFloatingWindow.current) return
    if(e.target != e.currentTarget) return

    setDragOverFileId(fileId)
  }

  const contextFile = useMemo(() => {
    return files.find(f => f.fileId === contextMenuFileId);
  }, [files, contextMenuFileId]);

  useEffect(() => {
    if (contextMenuVersionPopout && contextFile) {
      setShowVersionPanel(true);
      setVersionPanelData(contextFile);
    }
  }, [contextMenuVersionPopout, contextFile]);
  
  return (
    
      <>
        <PanelContainer
            onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel', undefined, undefined, undefined)}
            onMouseUp={(e) => onFilePlace(e, rootParentId, null)}
            onMouseMove = {(e) => {observeMouseCoords.current && (pickedUpFileGroup || pickedUpFileId) ? setMouseCoords([e.clientX, e.clientY]) : undefined}}
            onClick = {(e) => e.target == e.currentTarget ? setSelectedFileGroup(undefined) : undefined}
            onDrop = {(e) => {projectId && userId ? handleFileDrag(e, projectId, userId, "ROOT-"+projectId, "") : undefined}}
            onDragOver = {(e) => {handleDragOver(e, "ROOT-"+projectId)}}
            onDragLeave = {(e) => {handleDragOver(e, undefined)}}
            $dragging={dragOverFileId == "ROOT-"+projectId}
        >
          {
            filePathElement.length > 0 ?
            ( <>
                  <FilePathContainer>
                    {filePathElement.map((pathElement, i) => (
                      <Link href={pathElement.href} style={{textDecoration: "none", color: "black"}} key={i}>
                        {pathElement.fileName}
                      </Link>
                    ))}
                  </FilePathContainer>
                <TopBarContainer>
                  <FloatingRecycleButton onClick={() => setShowRecycleBin(!showRecycleBin)} title="Recycle Bin">
                    {showRecycleBin ? "📁" : "🗑️"}
                  </FloatingRecycleButton>
                  <Input onKeyDown={(e) => handleSearch(e)} onChange = {(e) => e.target.value.length == 0 ? setSearch(false) : undefined}>

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
                </>
            ) : <></>

          }

          {files.length > 0 && !loading ? (
              !search ? (
                  files.map((file, index) => (
                      <File key={file.fileId}
                            $depth={getDepth(file)}
                            $pickedUp={pickedUpFileId == file.fileId || (pickedUpFileGroup != undefined &&  (pickedUpFileGroup.length == 2 && (pickedUpFileGroup[0] <= pickedUpFileGroup[1] && pickedUpFileGroup[0] <= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] >= filesByFileId.current[file.fileId]) || (pickedUpFileGroup[0] > pickedUpFileGroup[1] && pickedUpFileGroup[0] >= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] <= filesByFileId.current[file.fileId])))}
                            $mouseX={mouseCoords[0]}
                            $mouseY={mouseCoords[1]}
                            $selected = {dragOverFileId == file.fileId || selectedFileGroup != undefined && ((selectedFileGroup.length == 1 && selectedFileGroup[0] == filesByFileId.current[file.fileId]) || (selectedFileGroup.length == 2 && (selectedFileGroup[0] <= selectedFileGroup[1] && selectedFileGroup[0] <= filesByFileId.current[file.fileId] && selectedFileGroup[1] >= filesByFileId.current[file.fileId]) || (selectedFileGroup[0] > selectedFileGroup[1] && selectedFileGroup[0] >= filesByFileId.current[file.fileId] && selectedFileGroup[1] <= filesByFileId.current[file.fileId])))}
                            $indexDiff = {selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] < selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[0] : selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] > selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[1] : 0}
                            onMouseDown={(e) => file.fileId != pickedUpFileId ? onFilePickUp(e, file.fileId) : undefined}
                            onMouseUp={(e) => file.fileId != pickedUpFileId ? onFilePlace(e, file.fileId, file.filepath) : undefined}
                            onClick={(e) => e.altKey ? openCloseFolder(file.fileId) : e.shiftKey ? selectFileGroup(filesByFileId.current[file.fileId]) : selectFile(e, filesByFileId.current[file.fileId])}
                            onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile', file.ownerId, file.storageId, file.filename)}
                            onDragOver = {(e) => {handleDragOver(e, file.fileId)}}
                            onDragLeave = {(e) => {handleDragOver(e, undefined)}}
                            onDrop = {(e) => {handleDragOver(e, undefined); projectId && userId ? handleFileDrag(e, projectId, userId, file.fileId, file.filepath) : undefined}}>

                        {file.isDirectory ? "📁" : "🗎"} {file.filename}
                        <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                              logicalId={file.logicalId} storageId={file.storageId}
                                              size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                              projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                              updatedAt={file.updatedAt} visible={file.visible}
                                              open={file.open}
                                              isDirectory={file.isDirectory}></FileContext>
                      </File>


              ))) : (
                  files.sort(sort_style_map[sort]).map((file, index) => (
                      <File key={file.fileId}
                            $depth={0}
                            $pickedUp={pickedUpFileId == file.fileId || (pickedUpFileGroup != undefined && (pickedUpFileGroup.length == 2 && (pickedUpFileGroup[0] <= pickedUpFileGroup[1] && pickedUpFileGroup[0] <= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] >= filesByFileId.current[file.fileId]) || (pickedUpFileGroup[0] > pickedUpFileGroup[1] && pickedUpFileGroup[0] >= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] <= filesByFileId.current[file.fileId])))}
                            $mouseX={mouseCoords[0]}
                            $mouseY={mouseCoords[1]}
                            $selected = {dragOverFileId == file.fileId || selectedFileGroup != undefined && ((selectedFileGroup.length == 1 && selectedFileGroup[0] == filesByFileId.current[file.fileId]) || (selectedFileGroup.length == 2 && selectedFileGroup[0] <= filesByFileId.current[file.fileId] && selectedFileGroup[1] >= filesByFileId.current[file.fileId]))}
                            $indexDiff = {selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] < selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[0] : selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] > selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[1] : 0}
                            onMouseDown={(e) => file.fileId != pickedUpFileId ? onFilePickUp(e, file.fileId) : undefined}
                            onMouseUp={(e) => file.fileId != pickedUpFileId ? onFilePlace(e, file.fileId, file.filepath) : undefined}
                            onClick={(e) => e.altKey ? openCloseFolder(file.fileId) : e.shiftKey ? selectFileGroup(filesByFileId.current[file.fileId]) : selectFile(e, filesByFileId.current[file.fileId])}
                            onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile', file.ownerId, file.storageId, file.filename)}
                            onDragOver = {(e) => {handleDragOver(e, file.fileId)}}
                            onDragLeave = {(e) => {handleDragOver(e, undefined)}}>
                        {file.isDirectory ? "📁" : "🗎"} {file.filename}
                        <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                              logicalId={file.logicalId} storageId={file.storageId}
                                              size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                              projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                              updatedAt={file.updatedAt} visible={file.visible} open={file.open}
                                              isDirectory={file.isDirectory}></FileContext>
                      </File>
                  )
              )
          )) : loading ? (
              <NoFiles>Loading...</NoFiles>
              ) :
              (
              <NoFiles>No files available.</NoFiles>
          )}

          {//createFilePanelUp ? (
           //   <CreateFilePanel
           // initialPosX={createFilePanelInitX.current}
           // initialPosY={createFilePanelInitY.current}
           // parentFileId={contextMenuFileId}
           // parentFilePath={contextMenuFilePath}
           // isDirectory={createFileOrFolder.current}
           // inputFile={handleFileInput}
           // dragFile={handleFileDrag}
           // close={closeCreateFilePanel}
           // />
           // ) : <></>
          }

          {
            contextMenu && contextMenuType=="filePanel" ? (
                <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                  <ContextMenu>
                    <ContextMenuItem
                        onClick={(e) => {
                          handleCreateFolder();
                        }}
                    >
                      Create Folder
                    </ContextMenuItem>
                    <ContextMenuItem>Open Chat</ContextMenuItem>
                    <ContextMenuItem
                      onClick={() => handleDownloadCurrentView()}
                    >
                      Download All in View
                    </ContextMenuItem>

                  </ContextMenu>
                </ContextMenuWrapper>
            ) : contextMenuFileId && contextMenu && contextMenuType=="fileFile" ? (

                <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                  <ContextMenu>
                    <ContextMenuItem onMouseOver={() => {setContextMenuTagPopout(false);}}>
                      Rename
                    </ContextMenuItem>
                    <ContextMenuItem onMouseOver={() => {setContextMenuTagPopout(true);}}>
                      Tags
                    </ContextMenuItem>
                    <ContextMenuItem onMouseOver={() => {setContextMenuTagPopout(false);}}>
                      Properties
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDelete(contextMenuFileId!)}>
                      Delete File
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                      Open Chat
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDownload(contextMenuStoragePath!, contextMenuFileName!,contextMenuFileId!)}>
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => cancelDownload(contextMenuFileId!)}>
                      Cancel Download
                    </ContextMenuItem>
                    <ContextMenuItem
                      style={{ fontWeight: "bold", cursor: "default" }}
                      onClick={() => {
                        setContextMenuVersionPopout(true);
                        setContextMenuTagPopout(false); // optionally close tags
                      }}
                    >
                      Versions
                    </ContextMenuItem>
                    <ContextMenuItem
                      onClick={async () => {
                        const file = files.find(f => f.fileId === contextMenuFileId);
                        if (!file || !projectId) return;

                        const ext = file.filename.split(".").pop()?.toLowerCase();
                        const isText = ["txt", "md", "log", "csv", "py"].includes(ext!);
                        const isOfficeDoc = ["doc", "docx", "rtf", "dox", "word"].includes(ext!);
                        const isPDF = ext === "pdf";
                        const isImage = ["png", "jpg", "jpeg"].includes(ext!);

                        if (!isText && !isOfficeDoc && !isPDF && !isImage) return;

                        const path = file.storageId as string;
                        const versionId = file.versionId;

                        try {
                          const cachedUrl = await fetchCachedUrl(path, versionId);
                          const popup = window.open("", "_blank", "width=800,height=600");

                          if (!popup) {
                            alert("Popup blocked. Please allow popups for this site.");
                            return;
                          }

                          const previewContent = isPDF
                            ? `<iframe src="${cachedUrl}" width="100%" height="100%"></iframe>`
                            : isImage
                            ? `<img src="${cachedUrl}" alt="${file.filename}" />`
                            : isText
                            ? `<pre><code id="code-block">Loading...</code></pre>
                              <script>
                                fetch("${cachedUrl}")
                                  .then(res => res.text())
                                  .then(code => {
                                    document.getElementById("code-block").textContent = code;
                                  });
                              </script>`
                            : `<p>Unsupported file type.</p>`;

                          const html = `
                            <!DOCTYPE html>
                            <html lang="en">
                            <head>
                              <title>Preview - ${file.filename}</title>
                              <style>
                                body {
                                  margin: 0;
                                  font-family: sans-serif;
                                  background: #f0f0f0;
                                  display: flex;
                                  flex-direction: column;
                                  height: 100vh;
                                  overflow: hidden;
                                }
                                .toolbar {
                                  width: 100%;
                                  background: #333;
                                  color: white;
                                  padding: 10px;
                                  display: flex;
                                  justify-content: space-between;
                                  align-items: center;
                                  box-sizing: border-box;
                                }
                                .toolbar a {
                                  color: white;
                                  text-decoration: none;
                                  padding: 8px 12px;
                                  background-color: #007bff;
                                  border-radius: 5px;
                                }
                                .preview {
                                  flex: 1;
                                  overflow: auto;
                                  display: flex;
                                  justify-content: center;
                                  align-items: center;
                                  padding: 1rem;
                                }
                                iframe, img {
                                  max-width: 90%;
                                  max-height: 90%;
                                  border: none;
                                }
                                pre {
                                  background: white;
                                  padding: 1rem;
                                  overflow: auto;
                                  white-space: pre-wrap;
                                  word-wrap: break-word;
                                  max-width: 100%;
                                }
                              </style>
                            </head>
                            <body>
                              <div class="toolbar">
                                <div>Previewing: ${file.filename}</div>
                                <a href="${cachedUrl}" download="${file.filename}">Download</a>
                              </div>
                              <div class="preview">
                                ${previewContent}
                              </div>
                            </body>
                            </html>
                          `;

                          popup.document.write(html);
                          popup.document.close();
                        } catch (err) {
                          console.error("Preview failed:", err);
                        }
                      }}
                    >
                      Preview
                    </ContextMenuItem>

                    </ContextMenu>
                  {contextMenuTagPopout ?
                      <ContextMenuPopout $index={1}>
                        {contextMenuTags || contextMenuTags === null ?
                            <>
                              <ContextMenuTagInput placeholder="Insert Tag Name" id={"tag_input"} onKeyDown = {(e) => handleTagInput(e)}/>
                              { contextMenuTags ?
                                  contextMenuTags.filter(tag => tag !== null).map(
                                      (tag, i) => (
                                          <ContextMenuItem key={i}>
                                            {tag == "" ? " " : tag}
                                            <ContextMenuExitButton id = {"tag_button"} onClick = {() => deleteTag(contextMenuFileId as string, projectId, tag, contextMenuTags)}>
                                              X
                                            </ContextMenuExitButton>
                                          </ContextMenuItem>
                    
                                      )) : <></>}

                            </>
                            : <ContextMenuItem>Loading...</ContextMenuItem>
                        }

                      </ContextMenuPopout>
                      
                      : <></>
                  }
                </ContextMenuWrapper>
            ) : contextMenu && contextMenuType=="fileFolder" ? (
                <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                  <ContextMenu>
                    <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(true)}>
                      Tags
                    </ContextMenuItem>
                    <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)}>
                      Properties
                    </ContextMenuItem>
                    <ContextMenuItem
                      onMouseOver={() => setContextMenuTagPopout(false)}
                      onClick={() => handleFolderDownload(contextMenuFileName as string, contextMenuFileId as string)}
                    >
                      Download
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setFileId(contextMenuFileId)} onMouseOver={() => setContextMenuTagPopout(false)}>
                      Open Chat
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDelete(contextMenuFileId!)}>
                      Delete Folder
                    </ContextMenuItem>
                  </ContextMenu>
                  {contextMenuTagPopout ?
                      <ContextMenuPopout $index={0}>
                        {contextMenuTags || contextMenuTags === null ?
                            <>
                              <ContextMenuTagInput placeholder="Insert Tag Name" id={"tag_input"} onKeyDown = {(e) => handleTagInput(e)}/>
                              { contextMenuTags ?
                                contextMenuTags.filter(tag => tag !== null).map(
                                    (tag, i) => (
                                        <ContextMenuItem key={i}>
                                          {tag == "" ? " " : tag}
                                          <ContextMenuExitButton id = {"tag_button"} onClick = {() => deleteTag(contextMenuFileId as string, projectId, tag, contextMenuTags)}>
                                            X
                                          </ContextMenuExitButton>
                                        </ContextMenuItem>
                                    )) : <></>}
                            </>
                            : <ContextMenuItem>Loading...</ContextMenuItem>
                        }
                      </ContextMenuPopout>
                      : <></>
                  }
                </ContextMenuWrapper>
            ) : (
                <>
                </>
            )
          }


        </PanelContainer>
    {/* Progress Panel, uploads/downloads UI */}
    {//showProgressPanel && (
     //   <ProgressPanel>
//
//
     //     {Object.entries(downloadProgressMap).map(([fileId, percent]) => (
     //         <div key={`download-${fileId}`} style={{ marginBottom: "0.5rem", display: "flex", alignItems: "center" }}>
     //           <ProgressBarContainer style={{ flex: 1 }}>
     //             <ProgressBarFill percent={percent} />
     //           </ProgressBarContainer>
     //           <ProgressLabel style={{ marginLeft: "8px" }}>
     //             {percent >= 100
     //                 ? `✅ Downloaded ${fileId}`
     //                 : `Downloading ${fileId} (${percent.toFixed(0)}%)`}
     //           </ProgressLabel>
     //           {percent < 100 && (
     //               <CancelButton onClick={() => cancelDownload(fileId)} title="Cancel Download">
     //                 ✖
     //               </CancelButton>
     //           )}
     //         </div>
     //     ))}
     //   </ProgressPanel>)
    }
    {/* Recycle Bin Button */}
        {showRecycleBin && (
            <RecycleBinPanel
            initialPosX={createFilePanelInitX.current}
            initialPosY={createFilePanelInitY.current}
            projectId={projectId}
            projectName={projectName.current}
            close={() => setShowRecycleBin(false)}
            />
          )}



    {displayConflictModal && conflictModalData.current && (
        <ConflictModal filename={conflictModalData.current.fileName} onResolve={conflictModalData.current.onResolve} />
    )}
    {showVersionPanel && versionPanelData && (
          <VersionPanel
            fileId={versionPanelData.fileId}
            fileName={versionPanelData.filename}
            logicalId={versionPanelData.logicalId}
            filepath={versionPanelData.filepath}
            ownerId={versionPanelData.ownerId}
            projectId={versionPanelData.projectId}
            versions={versionPanelData.versions ?? []}
            currentVersionId={versionPanelData.versionId}
            initialX={contextMenuPosition[0]}
            initialY={contextMenuPosition[1]}
            close={() => {
              setShowVersionPanel(false);
              setVersionPanelData(null);
              setContextMenuVersionPopout(false);
            }}
            onDownloadVersion={handleDownloadVersion}
          />
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
const ContextMenuExitButton = styled.button`
  border: none;
  font: inherit;
  outline: inherit;
  height: inherit;
  position: absolute;
  text-align: center;
  
  padding: .2rem .3rem;
  top: 0;
  right: 0;
  visibility: hidden;
  background-color: lightgray;

  &:hover {
    cursor: pointer;
    background-color: gray !important;
  }

`;
const ContextMenuItem = styled.div`
  position: relative;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;

  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
    
  }
  &:hover > ${ContextMenuExitButton}{
    visibility: visible;
    background-color: darkgray;
    transition: background-color 250ms linear;
  }

  &:last-child {
    border-bottom-style: none;
  }

  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenuTagInput = styled.input`
  background-color: lightgray;
  border-width: 0;

  margin: 0;
  text-align: left;
  border-bottom-style: solid;
  border-bottom-width: 1px;
  border-bottom-color: gray;
  font-size: 14px;
  width: 100%;
  
  &:hover {
    transition: background-color 250ms linear;
    background-color: darkgray;
  }

  &:last-child {
    border-bottom-style: none;
  }
  &:focus {
    outline: none;
    background-color: darkgray;
    
  }
  padding: 0.2rem 0.5rem 0.2rem 0.2rem;
`

const ContextMenu = styled.div`
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    display: flex;
    flex-direction: column;
    height: max-content;
    max-height: 300px; /* Add this */
    overflow-y: auto;   /* Add this */
`;
const ContextMenuPopout = styled.div<{$index: number}>`
    margin-top: ${(props) => "calc(" + props.$index + "* calc(21px + 0.4rem) + 1px)"};
    
    background-color: lightgray;
    border-color: dimgray;
    border-style: solid;
    border-width: 1px;
    height: max-content;
    width: min-content;
    min-width: 150px;
    
`;

const ContextMenuWrapper = styled.div<{$x: number, $y: number}>`
    position: fixed;
    z-index: 9999;
    left: ${(props) => props.$x}px;
    top: ${(props) => props.$y}px;
    display: flex;
    flex-direction: row;
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

const PanelContainer = styled.div<{$dragging: boolean}>`
  
  width: 100%;
  height: 100%;
  background-color: ${props => props.$dragging ? "lightblue" : "white"};
  text-align: center;
  overflow-y: scroll;
`;

const File = styled.button.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number, $selected: boolean, $indexDiff: number}>(props => ({
  style: {
    display: props.$depth == -1 ? "none" : "auto",
    position: props.$pickedUp ? "absolute" : undefined,
    top: props.$pickedUp ? props.$mouseY + props.$indexDiff*2 + "px" : "auto",
    left: props.$pickedUp ? props.$mouseX + props.$indexDiff*2 + "px" : "auto",
    marginLeft: props.$pickedUp ? props.$depth * 20 : "auto" ,
    width: props.$pickedUp ? "auto" : "calc(100% - " + props.$depth * 20 + "px)",
    pointerEvents: props.$pickedUp ? "none" : "auto",
    opacity : props.$pickedUp ? 0.75 : 1,
    backgroundColor: props.$pickedUp ? "lightskyblue" : props.$selected ? "lightblue" : "white",
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
  position: sticky;
  top: 0;
  background-color: white;

`;

const FilePathContainer = styled.div`
    display: flex;
    position: sticky;
    top: 0;
    width: 100%;
    border-bottom-style: solid;
    border-bottom-width: 3px;
    border-bottom-color: black;
    padding: 15px;
      overflow-x: scroll;
    white-space: nowrap;
`;
const Input = styled.input`
  flex: 1;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
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

  &:hover {
    background-color: #ddd;
  }
`;
/*
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
*/