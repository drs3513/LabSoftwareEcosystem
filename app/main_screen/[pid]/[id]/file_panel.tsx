
import '@aws-amplify/ui-react/styles.css';
import React, { useEffect, useMemo, useRef, useState} from "react";
import { useGlobalState } from "@/app/GlobalStateContext";
import { useNotificationState } from "@/app/NotificationStateContext";
import {
  listFilesForProjectAndParentIds,
  searchFiles,
  createTag,
  deleteTag,
  getTags,
  getFilePath,
  getFileIdPath,
  processAndUploadFiles, deleteFile,
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
import {useRouter, useSearchParams} from "next/navigation"
import {getProjectName} from "@/lib/project";
import Link from "next/link";
import ConflictModal from '../../conflictModal';
import VersionPanel from "@/app/main_screen/popout_version_panel";
import { isUserWhitelistedForProject } from '@/lib/whitelist';
import previewFile from "@/app/main_screen/file_preview"
//SVG imports
import Image from "next/image";
import icon_sort0 from "/assets/icons/sort-alphabetical-outlined-rounded.svg";
import icon_sort1 from "/assets/icons/sort-alphabetical-reverse-outlined-rounded.svg";
import icon_sort2 from "/assets/icons/sort-high-to-low-outlined-rounded.svg";
import icon_sort3 from "/assets/icons/sort-low-to-high-outlined-rounded.svg";
import icon_binsolid from "/assets/icons/trash-3-outlined-rounded.svg";
import icon_binline from "/assets/icons/trash-3-solid-rounded.svg";
import icon_folder from "/assets/icons/folder-1-outlined-rounded.svg";
import icon_folderopen from "/assets/icons/folder-1-outlined-rounded-open.svg";

import icon_filegeneric from "/assets/icons/file-outlined-rounded.svg";
import icon_filecpp from "/assets/icons/file-icon-24x24-cpp.svg";
import icon_filehtml from "/assets/icons/file-icon-24x24-html.svg";
import icon_filejpg from "/assets/icons/file-icon-24x24-jpg.svg";
import icon_filejs from "/assets/icons/file-icon-24x24-js.svg";
import icon_filejson from "/assets/icons/file-icon-24x24-json.svg";
import icon_filemp4 from "/assets/icons/file-icon-24x24-mp4.svg";
import icon_filepdf from "/assets/icons/file-icon-24x24-pdf.svg";
import icon_filepng from "/assets/icons/file-icon-24x24-png.svg";
import icon_filepy from "/assets/icons/file-icon-24x24-py.svg";
import icon_filesvg from "/assets/icons/file-icon-24x24-svg.svg";
import icon_filetdp from "/assets/icons/file-icon-24x24-tdp.svg";
import icon_filetds from "/assets/icons/file-icon-24x24-tds.svg";
import icon_filetsx from "/assets/icons/file-icon-24x24-tsx.svg";
import icon_filetxt from "/assets/icons/file-icon-24x24-txt.svg";
import icon_filewebp from "/assets/icons/file-icon-24x24-webp.svg";
import icon_filexml from "/assets/icons/file-icon-24x24-xml.svg";
import icon_filezip from "/assets/icons/file-icon-24x24-zip.svg";


import {isCancelError} from "aws-amplify/storage";
import RecycleBinPanel from "@/app/main_screen/popout_recycling_bin";


const client = generateClient<Schema>();

function compare_file_date_helper(file_1: any, file_2: any){
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

function compare_file_date(file_1: any, file_2: any){
  if(file_1.isDirectory && file_2.isDirectory) return compare_file_date_helper(file_1, file_2)*-1
  if(file_1.isDirectory) return -1
  if(file_2.isDirectory) return 1
  return compare_file_date_helper(file_1, file_2)*-1

}

function compare_file_date_reverse(file_1: fileInfo, file_2: fileInfo){
  if(file_1.isDirectory && file_2.isDirectory) return compare_file_date_helper(file_1, file_2)
  if(file_1.isDirectory) return -1
  if(file_2.isDirectory) return 1
  return compare_file_date_helper(file_1, file_2)
}

function compare_file_name(file_1: any, file_2: any){
  if(file_1.isDirectory && file_2.isDirectory) return file_1.filename.localeCompare(file_2.filename)
  if(file_1.isDirectory) return -1
  if(file_2.isDirectory) return 1
  return file_1.filename.localeCompare(file_2.filename)


}
function compare_file_name_reverse(file_1: any, file_2: any){
  if(file_1.isDirectory && file_2.isDirectory) return compare_file_name(file_1, file_2) * -1
  if(file_1.isDirectory) return -1
  if(file_2.isDirectory) return 1
  return compare_file_name(file_1, file_2) * -1
}

function compare_file_objects(file_1: any, file_2: fileInfo){
  return file_1.fileId === file_2.fileId && file_1.filepath === file_2.filepath && file_1.storageId === file_2.storageId && file_1.versionId === file_2.versionId && file_1.logicalId === file_2.logicalId && file_1.isDeleted === file_2.isDeleted && file_1.parentId === file_2.parentId
}

const sort_style_map: {[key: string]: any} = {"alphanumeric" : compare_file_name, "alphanumeric-reverse" : compare_file_name_reverse, "chronological" : compare_file_date, "chronological-reverse" : compare_file_date_reverse}
const number_to_sort: {[key: number]: any} = {0: "alphanumeric", 1: "alphanumeric-reverse", 2: "chronological", 3: "chronological-reverse"}
var sort_number = 0;

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
  isDeleted: number,
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

  const {uploadQueue, uploadTask, setUploadProgress,
    setDownloadProgressMap, setCompletedUploads,
  setShowProgressPanel} = useNotificationState();


  //const folderDownloadTask = useRef<{ isCanceled: boolean; cancel: () => void } | null>(null);

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

  const [currentParent, setCurrentParent] = useState<fileInfo | null>(null);

  const [filePathElement, setFilePathElement] = useState<{fileName: string | undefined, href: string, fileId: string, filepath: string}[]>([])

  const [activeParentIds, setActiveParentIds] = useState<activeParent[]>([])
  const [loadingParentIds, setLoadingParentIds] = useState<activeParent[]>([])


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


  const timer = useRef(setTimeout(() => {}, 500));

  const timerGetFiles = useRef(setTimeout(() => {}, 500))

  const isLongPress  = useRef(false);


  const [displayConflictModal, setDisplayConflictModel] = useState(false);

  const conflictModalData = useRef<{fileName: string, onResolve: (choice: "overwrite" | "version" | "cancel" | null, all: boolean) => void} | undefined>(undefined)


  const shiftKey = useRef(false)


  const [dragOverFileId, setDragOverFileId] = useState<string | undefined>(undefined);

  const [activeRecyclingBins, setActiveRecyclingBins] = useState<{projectId: string, projectName: string}[]>([])

  function return_file_icon(fileName: string){
    const extension = fileName.split('.').pop()
    switch(extension) {
      case 'cpp': {
        return icon_filecpp;
      }
      case 'html': {
        return icon_filehtml;
      }
      case 'jpg': {
        return icon_filejpg;
      }
      case 'js': {
        return icon_filejs;
      }
      case 'json': {
        return icon_filejson;
      }
      case 'mp4': {
        return icon_filemp4;
      }
      case 'pdf': {
        return icon_filepdf;
      }
      case 'png': {
        return icon_filepng;
      }
      case 'py': {
        return icon_filepy;
      }
      case 'svg': {
        return icon_filesvg;
      }
      case 'tdp': {
        return icon_filetdp;
      }
      case 'tds': {
        return icon_filetds;
      }
      case 'tsx': {
        return icon_filetsx;
      }
      case 'txt': {
        return icon_filetxt;
      }
      case 'webp': {
        return icon_filewebp;
      }
      case 'xml': {
        return icon_filexml;
      }
      case 'zip': {
        return icon_filezip;
      }
    }
    return icon_filegeneric;
  }


  //sorts files to be displayed by the user
  function sort_files_with_path(files: Array<fileInfo>, sortStyle: string = "alphanumeric"){
    if (activeParentIds.length === 0) {
      //console.log("Active Parent IDs are empty. Returning files without sorting.");
      return files;
    }
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
      ////console.log(curr_parent)

      for (let i = 0; i < files_by_parentId[curr_parent].length; i++) {
        ////console.log(files_by_parentId[curr_parent][i])
        file_list.push(files_by_parentId[curr_parent][i])
        if (files_by_parentId[curr_parent][i].fileId in files_by_parentId) {
          file_list = concatenateFiles(files_by_parentId[curr_parent][i].fileId, files_by_parentId, file_list)
        }
      }
      return file_list
    }

    //put each file into its own 'bucket', which designates which parentId it belongs to, allows for separate sorting
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
        }activeParentIds.length - 1
      }

      sorted_files[key] = values
    }
    if (activeParentIds.length > 0 && activeParentIds[0].id in sorted_files) {
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
    console.log("Here?")
    clearTimeout(timerGetFiles.current)
    timerGetFiles.current =  setTimeout(async () => {
      if (!projectId || !userId) {
        return
      }

      const projectFiles = await listFilesForProjectAndParentIds(projectId, activeParentIds.map(parent => parent.id)); // This will return all versions

      if (!projectFiles) return []
      const grouped: Record<string, typeof projectFiles> = {};
      for (const file of projectFiles) {
        if (!file || (file.isDeleted)) continue;

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
          isDeleted: latest.isDeleted,
          open: activeParentIds.some((parent) => parent.id == latest.fileId),
          isDirectory: latest.isDirectory,
          versions,
        });
      }
      setLoading(false);
      setFiles(sort_files_with_path(groupedFiles));
      console.log("setting Loading Parent Ids : ")
      console.log([...loadingParentIds.filter(parent => !groupedFiles.some(file => file.parentId == parent.id))])
      setLoadingParentIds([])
      console.log(sort_files_with_path(groupedFiles))
      return groupedFiles;
    }, 600)


  }
  
  useEffect(() => {
    if(search) return
    if(projectId){
      console.log(loadingParentIds.length)
      fetchFiles()

      const unsubscribe = observeFiles();
      return () => unsubscribe();
    }
  }, [activeParentIds, search]);

  useEffect(() => {
    setLoading(true);
    const proj_id = routerSearchParams.get("pid");
    const root_id = routerSearchParams.get("id");
    if (!proj_id || !userId) {
      setFiles([]);
      setActiveParentIds([]);
      setFilePathElement([]);
      setFiles([]);
      setLoading(false);
      setSelectedFileGroup([])
      setPickedUpFileGroup([])
      setLoadingParentIds([])
      return;
    }

    const initializeProject = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      const isWhitelisted = await isUserWhitelistedForProject(userId, proj_id);
      if (!isWhitelisted) {
        console.warn("User is not whitelisted for this project.");
        setProjectId(undefined);
        //setRootParentId(null);
        setActiveParentIds([]);
        setFilePathElement([]);
        setFiles([]);
        setLoading(false);
        return;
      }

      setProjectId(proj_id);

      if (!root_id) {
        setLoading(false);
        return;
      }

      setRootParentId(root_id);
      setActiveParentIds([{ id: root_id, depth: 0 }]);
      await fetchRootInfo(root_id, proj_id);
    };

    initializeProject();
  }, [routerSearchParams, userId]);

  async function fetchRootInfo(root_id: string, proj_id: string){
    const activeFilePath = await getFilePath(root_id, proj_id)
    //console.log(activeFilePath)
    projectName.current = await getProjectName(proj_id)

    const { data: file } = await client.models.File.get({ fileId: root_id, projectId: proj_id });

    if (file) {
      setCurrentParent({
        fileId: file.fileId,
        filename: file.filename,
        filepath: file.filepath,
        logicalId: file.logicalId,
        storageId: file.storageId,
        parentId: file.parentId,
        size: file.size,
        versionId: file.versionId,
        ownerId: file.ownerId,
        projectId: file.projectId,
        createdAt: file.createdAt,
        updatedAt: file.updatedAt,
        isDeleted: file.isDeleted,
        visible: true,
        open: false,
        isDirectory: file.isDirectory,
      });      
    }

    if(activeFilePath) {
      await createFileIdMapping(root_id, proj_id, activeFilePath, projectName.current)

    } else {
      setFilePathElement([{fileName: `${projectName.current}/`, href: `/main_screen?pid=${proj_id}&id=ROOT-${proj_id}`,fileId: `ROOT-${proj_id}`,filepath: ""}])
      setLoading(false)
    }
  }

  async function createFileIdMapping(root_id: string, proj_id: string, activeFilePath: string, projectName: string | undefined){
    let fileIdPath = await getFileIdPath(root_id, proj_id)
    if(!fileIdPath) {
      setFilePathElement([])
      return
    }
    const filePathEnd = await getFilePath(root_id, proj_id)
    if(!filePathEnd) return
    fileIdPath.push({id: root_id, filepath: filePathEnd})
    //console.log(fileIdPath)
    //console.log([projectName, ...activeFilePath.split("/").splice(1)])
    //console.log(activeFilePath)
    setFilePathElement([projectName, ...activeFilePath.split("/").splice(1)].map((fileName, i) => ({fileName: `${fileName}/`, href: `/main_screen?pid=${proj_id}&id=${fileIdPath[i].id}`, fileId: fileIdPath[i].id, filepath: fileIdPath[i].filepath})))
    setLoading(false)
    return

  }

  /**
   * function : observeFiles
   * Goal : observe changes to the files stored in the database, and transmit this to the user
   * Problem : When the database contains many files, this query does not return the entire language of the query at once
   * Solution : Check to see if the query observes even a single file which is different than what is saved
   * If the above is true, then create a timer which waits 400ms, and then fetches all open files
   * The timer is to prevent multiple observeQuery() invocations in quick successions from creating multiple fetches
   */
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

      next: async ({items}) => {
        //If a file is observed that is not already saved by the files object
        if(items.some(file_1 => !files.some(file_2 => compare_file_objects(file_1, file_2)))) {
          fetchFiles()
        }
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
    const projectFiles = await searchFiles(projectId, searchTerm, tagSearchTerm)

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
              isDeleted: file.isDeleted,
              visible: true,
              open: activeParentIds.some(parent => parent.id === file.fileId),
              isDirectory: file.isDirectory? file.isDirectory : null
            }]
        }
      }
      setFiles(temp_files)
      setLoading(false);
      return temp_files

    } else {
      setSearch(false)
      setLoading(false)
    }

  }
  useEffect(() => {
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
    //console.log("Here!")
    const tempTags = await getTags(fileId, projectId)

    setContextMenuTags(tempTags)
    //console.log(tempTags)
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
    const allChildren = await getFileChildren(projectId, contextMenuFilePath as string);
    const validFiles = allChildren?.filter(f => !f.isDirectory && f.storageId && f.filepath);
  
    const fileList = validFiles?.map(file => ({
      filepath: file.filepath,         // This is how it appears to the user
      storageId: file.storageId!,      // This is how we fetch it
    }));
  
    await downloadFolderAsZip(folderName, fileList as [], task);
  };

  const handleDownloadCurrentView = async () => {
    if (!projectId) return;
  
    const task: ZipTask = {
      isCanceled: false,
      cancel() {
        task.isCanceled = true;
      },
    };
  
    const rootFilePath = currentParent?.filepath ?? "/";
    let fileList: { filepath: string; storageId: string }[] = [];
  
    try {
      const allChildren = await getFileChildren(projectId, rootFilePath);
  
      fileList = (allChildren || [])
        .filter(f => !f.isDeleted && !f.isDirectory && f.storageId && f.filepath)
        .map(f => ({
          filepath: f.filepath.startsWith("/") ? f.filepath.slice(1) : f.filepath,
          storageId: f.storageId!,
        }));
  
      // Merge visible files from filesRef, avoiding deleted files
      for (const file of filesRef.current) {
        if (file.isDeleted || !file.storageId || file.isDirectory) continue;
  
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
  
  
  
  const handleDownloadSelected = async () => {
    if (!projectId || !selectedFileGroup) return;

    const task: ZipTask = {
      isCanceled: false,
      cancel() {
        task.isCanceled = true;
      },
    };

    const fileList: { path: string; filename: string }[] = [];

    for (const index of selectedFileGroup) {
      if (!files[index].storageId || files[index].isDirectory) continue;

      fileList.push({
        path: files[index].storageId,
        filename: files[index].filepath.startsWith("/") ? files[index].filepath.slice(1) : files[index].filepath, // Preserve structure
      });
    }

    if (fileList.length === 0) {
      console.warn("No downloadable files in current view.");
      return;
    }

    const rootName = projectName.current || "project-files";
    await downloadFolderAsZip(rootName, fileList as [], task);

  }

  const cancelDownload = (fileId: string) => {
    const task = activeDownloads.get(fileId);
    if (task) {
      task.cancel();
      activeDownloads.delete(fileId);
      //console.log(`[INFO] Download cancelled for fileId: ${fileId}`);
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
    console.log(dragOverFileId)
    event.preventDefault();
    setDragOverFileId(undefined);
    const supportsWebkitGetAsEntry = "webkitGetAsEntry" in DataTransferItem.prototype;

    if (!supportsWebkitGetAsEntry) {
      console.error("[ERROR] webkitGetAsEntry not supported in this browser.");
      return;
    }
    //console.log(event)
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

      //const entryType = entry
      //    ? entry.isDirectory
      //        ? "directory"
      //        : entry.isFile
      //            ? "file"
      //            : "unknown"
      //    : "null";

      //const name = file?.name || "(no fallback file)";
    });

    const files: File[] = [];
    const directories: string[] = [];

    const readEntry = async (entry: any, path = ""): Promise<void> => {
      //console.log(entry)
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

      //const entryType = entry.isDirectory ? "directory" : entry.isFile ? "file" : "unknown";

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

    await handleCreateFile(directories.length > 0, projectId, ownerId, parentId, files, rootFilePath);
  };

  
  /** Processes files and uploads them */
  const handleCreateFile = async (
    isDirectory: boolean,
    projectId: string,
    ownerId: string,
    parentId: string,
    files: File[],
    rootFilePath: string
  ) => {
    let globalDecision: 'overwrite' | 'version' | 'cancel' | null = null;
    let applyToAll = false;

    const showConflictModal = (filename: string) => {
      return new Promise<'overwrite' | 'version' | 'cancel'>(resolve => {
        const cleanup = () => {
          setDisplayConflictModel(false);
          conflictModalData.current = undefined;
        };
        const handleResolve = (choice: typeof globalDecision, all: boolean) => {
          if (all) {
            globalDecision = choice;
            applyToAll = true;
          }
          cleanup();
          resolve(choice ?? "cancel");
        };
        conflictModalData.current = { fileName: filename, onResolve: handleResolve };
        setDisplayConflictModel(true);
      });
    };
  
    if (!files || files.length === 0) {
      console.error("[ERROR] No files received.");
      return;
    }
  
    const actualRoot = rootFilePath === "/"? "": rootFilePath;
    const currentViewPath = actualRoot.replace(/\/+$/, "");
  
    const filePathMap = new Map<string, { fileId: string; logicalId: string }>();

    // Use the full filepath as-is, no need to start from currentViewPath
    filesRef.current?.forEach((f) => {
      if (f.isDeleted) return;
      const normalizedPath = f.filepath.replace(/\/+/g, "/");
      filePathMap.set(normalizedPath, {
        fileId: f.fileId,
        logicalId: f.logicalId,
      });
    });

  
    const folderDict: Record<string, any> = {};
    uploadTask.current = {
      isCanceled: false,
      uploadedFiles: [],
      cancel: () => {
        uploadTask.current!.isCanceled = true;
      },
    };
    setShowProgressPanel(true);
  
    for (const file of files) {
      if (uploadTask.current.isCanceled) {
        break;
      }
  
      const relativePath = file.webkitRelativePath || file.name;
      const parts = relativePath.split("/").filter(Boolean);
      const fileName = parts.pop()!;
      let currentDict = folderDict;
      let currentPath = actualRoot;
      let adjustedParts = [...parts];

  
      // Rename top-level folder if needed
      if (adjustedParts.length > 0) {
        let baseName = adjustedParts[0];
        let testPath = `${currentPath}/${baseName}`.replace(/\/+/g, "/");
  
        while (filePathMap.has(testPath)) {
          baseName += "-copy";
          testPath = `${currentPath}/${baseName}`.replace(/\/+/g, "/");
        }
  
        adjustedParts[0] = baseName;
      }
  
      // Traverse folders and build folderDict
      for (const folder of adjustedParts) {
        const testPath = `${currentPath}/${folder}`.replace(/\/+/g, "/");
        if (!filePathMap.has(testPath)) {
          if (!currentDict[folder]) currentDict[folder] = { files: {} };
          currentDict = currentDict[folder];
        } else {
          currentPath = testPath;
        }
      }
      
      const normalizedFullPath = currentPath
  ? `${currentPath}/${relativePath}`.replace(/\/+/g, "/")
  : `/${relativePath}`.replace(/\/+/g, "/");

// Log the path being checked
console.log(`[DEBUG] Checking for conflict at path: "${normalizedFullPath}"`);

// Log all existing paths in filePathMap
console.log("[DEBUG] Existing paths in filePathMap:");
for (const [key, val] of filePathMap.entries()) {
  console.log(`  → ${key}`);
}

const conflict = filePathMap.get(normalizedFullPath);

// Final result of conflict check
if (conflict) {
  console.log(`[CONFLICT FOUND] "${fileName}" at path "${normalizedFullPath}" matches existing key.`);
} else {
  console.log(`[NO CONFLICT] "${fileName}" at path "${normalizedFullPath}" not found in filePathMap.`);
}


      let decision: 'overwrite' | 'version' | 'cancel' = 'overwrite';
      if (conflict && !applyToAll) {
        decision = await showConflictModal(file.name);
        if (decision === "cancel") continue;
      }
  
      if (decision === "overwrite" && conflict) {
        const { key: storageKey } = await uploadFile(file, ownerId, projectId, normalizedFullPath);
        const versionId = await waitForVersionId(storageKey);
        if (versionId) {
          await updatefile(conflict.fileId, projectId, versionId);
        }
        continue;
      }
  
      if (decision === "version" && conflict) {
        await createNewVersion(file, conflict.logicalId, projectId, ownerId, parentId, normalizedFullPath);
        continue;
      }
  
      if (!currentDict.files) currentDict.files = {};
      currentDict.files[fileName] = file;
    }

    uploadQueue.current?.push({ folderDict, ownerId, projectId, parentId });
  
    await processAndUploadFiles(
      folderDict,
      projectId,
      ownerId,
      parentId,
      rootFilePath,
      uploadTask,
      (percent: number) => {
        setUploadProgress(percent);
      }
    );
    uploadQueue.current?.shift();
    setCompletedUploads((prev) => [...prev, 0]);

    // Delay removal of visual trace
    setTimeout(() => {
      setCompletedUploads((prev) => prev.slice(1));
    }, 3000); // Keeps the completed upload visible for 3 seconds
    setUploadProgress(null);
    setShowProgressPanel(false);
  };
  

  useEffect(() => {
    const updateCurrentParent = async () => {
      if (!projectId || activeParentIds.length === 0) {
        setCurrentParent(null);
        return;
      }
  
      const currentId = activeParentIds[activeParentIds.length - 1].id;
  
      try {
        const { data: file } = await client.models.File.get({ fileId: currentId, projectId });
        if (file) {
          setCurrentParent({
            fileId: file.fileId,
            filename: file.filename,
            filepath: file.filepath,
            logicalId: file.logicalId,
            storageId: file.storageId,
            parentId: file.parentId,
            size: file.size,
            versionId: file.versionId,
            ownerId: file.ownerId,
            isDeleted: file.isDeleted,
            projectId: file.projectId,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            visible: true,
            open: false,
            isDirectory: file.isDirectory ?? true,
          });
        } else {
          setCurrentParent(null);
        }
      } catch (err) {
        console.error("[ERROR] Failed to fetch current parent:", err);
        setCurrentParent(null);
      }
    };
  
    updateCurrentParent();
  }, [projectId, activeParentIds]);
  

  //const cancelUpload = () => {
  //  if (uploadTask.current) {
  //    uploadTask.current.cancel();
  //    console.warn("[CANCEL] Upload cancel requested.");
  //  }
  //};
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






  async function onFilePlace(e: React.MouseEvent<HTMLElement>, overFileId: Nullable<string>) {
    isLongPress.current = false;
    clearTimeout(timer.current)
    if(search){
      return
    }
    if(e.target != e.currentTarget){
      return
    }
    if(!projectId) return
    if(!overFileId) return
    observeMouseCoords.current = false

    //console.log(overFileId)

    clearTimeout(timer.current);
    ////console.log(pickedUpFileGroup)
    if(pickedUpFileGroup != undefined){

      observeMouseCoords.current = false

      let parentsToMove: string[] = []
      let initialParentsToMove = pickedUpFileGroup.map((index) => (files[index]))
      let initialParentsToMoveIds = pickedUpFileGroup.map((index) => (files[index].fileId))
      for(let file of initialParentsToMove) {
        if(!initialParentsToMoveIds.includes(file.parentId)){
          parentsToMove.push(file.fileId)
        }
      }

      for(let fileId of parentsToMove){
        const children = await getFileChildren(projectId, files[filesByFileId.current[fileId]].filepath)
        if(!children) return

        observeMouseCoords.current = false


        files[filesByFileId.current[fileId]].parentId = overFileId

        //console.log(children)
        //console.log(files[filesByFileId.current[pickedUpFileId]].filepath)
        //console.log(overFileId)
        //console.log(files[filesByFileId.current[overFileId]].filepath)
        let new_file_path = `/${files[filesByFileId.current[fileId]].filename}`
        if(overFileId in filesByFileId.current){
          new_file_path = `${files[filesByFileId.current[overFileId]].filepath}/${files[filesByFileId.current[fileId]].filename}`
        } else {
          if(overFileId == `ROOT-${projectId}`){
            new_file_path = `/${files[filesByFileId.current[fileId]].filename}`
          } else {
            const base_file_path = await getFilePath(overFileId, projectId)
            new_file_path = `${base_file_path}/${files[filesByFileId.current[fileId]].filename}`
          }

        }



        const fileIds = children.map((child) => child.fileId)
        const filepaths = children.map((child) => new_file_path + child.filepath.slice(files[filesByFileId.current[fileId]].filepath.length))
        const parentIds = children.map((child) => parentsToMove.includes(child.fileId) ? (overFileId ? overFileId : `ROOT-${projectId}`) : child.parentId)
        //console.log(filepaths)
        //`if(overFileId){
        //`  console.log(files[filesByFileId.current[overFileId]].filepath)
        //`} else {
//`
        //`}
        await batchUpdateFilePath(fileIds, projectId, parentIds, filepaths)
        await pokeFile(parentsToMove[0], projectId, filepaths[0])
      }

      await fetchFiles()
//      for(let fileIndex of pickedUpFileGroup) {
//        if(!projectId) return
//        console.log("Here!")
//        const children = await getFileChildren(projectId, files[fileIndex].filepath)
//        console.log(children)
//      }

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
      //console.log(filepaths)
      //`if(overFileId){
      //`  console.log(files[filesByFileId.current[overFileId]].filepath)
      //`} else {
//`
      //`}
      await batchUpdateFilePath(fileIds, projectId, parentIds, filepaths)
      fetchFiles()
      await pokeFile(fileIds[0], projectId, filepaths[0])
      setPickedUpFileId(undefined)

      //console.log(returnedValue)
    }
    observeMouseCoords.current = true
  }

  //If the user holds down left-click on a file / folder, all subdirectories are closed, and
  function onFilePickUp(e: React.MouseEvent<HTMLButtonElement>, currFileId : string) {
    if(search){
      return
    }
    //console.log(files[filesByFileId.current[currFileId]].filename)
    isLongPress.current = true
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        observeMouseCoords.current = true
        setMouseCoords([e.clientX, e.clientY])


        if(selectedFileGroup == undefined){
          const currSelectedFileGroup = selectFile(e, filesByFileId.current[currFileId])
          setSelectedFileGroup(currSelectedFileGroup)
          setPickedUpFileGroup(currSelectedFileGroup)

        } else {

          setPickedUpFileGroup(appendToFileGroup(selectFile(e, filesByFileId.current[currFileId])))
        }
        isLongPress.current = false
        clearTimeout(timer.current)

      }}, 400)

  }

  //Recursively generates new 'path' values for all subdirectories of that which was placed
  //function recursiveGeneratePaths(currFileId: Nullable<string>, pathAppend: string) {
  //  let newPathAppend: string = pathAppend
//
  //  if (currFileId && projectId) {
  //    files[filesByFileId.current[currFileId]].filepath = pathAppend + files[filesByFileId.current[currFileId]].filename
  //    updateFileLocation(currFileId, pathAppend + files[filesByFileId.current[currFileId]].filename, files[filesByFileId.current[currFileId]].parentId, projectId)
  //    newPathAppend = pathAppend + files[filesByFileId.current[currFileId]].filename + "/"
  //    if (currFileId in filesByParentId.current) {
  //      for (let i of filesByParentId.current[currFileId]) {
  //        recursiveGeneratePaths(files[i].fileId, newPathAppend)
  //      }
  //    }
  //  }
  //}

  function reorientView(index: number){
    setSelectedFileGroup([])
    if(files[index].isDirectory){
      router.push(`/main_screen/?pid=${projectId}&id=${files[index].fileId}`, undefined)
      //setFiles(reorient_files_on_new_root([...files], files[index].fileId))
    } else {
      if(files[index].parentId){
        router.push(`/main_screen/?pid=${projectId}&id=${files[index].parentId}`, undefined)
      }
    }
    setSearch(false)
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
    console.log(files[index])
    clearTimeout(timer.current)
    isLongPress.current = false
    if(e.detail == 2){
      reorientView(index)
    } else {
      let to_append = recursiveSelectFile(index)
      if(to_append.length == 1){
        setSelectedFileGroup(to_append)
      } else {
        setSelectedFileGroup(to_append)
      }

      return to_append
    }
  }

  function appendToFileGroup(selection: number[] | undefined){
    if(!selection) return
    if(!selectedFileGroup){
      setSelectedFileGroup(selection)
      return selection
    }
    setSelectedFileGroup([...selectedFileGroup, ...selection].sort((a,b)=>a>b?1:-1).filter((item,pos,array)=>  !pos || item != array[pos-1]))


    return [...selectedFileGroup, ...selection].sort((a,b)=>a>b?1:-1).filter((item,pos,array)=>  !pos || item != array[pos-1])
  }

  function range(start:number, end:number): number[]{

    if(start >= end) return []
    return [start, ...range(start+1, end)]
  }
  function selectFileGroup(e: React.MouseEvent<HTMLButtonElement>, index: number){
    clearTimeout(timer.current)
    isLongPress.current = false
    if(!selectedFileGroup){
      selectFile(e, index)
    } else {
      let selectedFileGroupToAppend = selectFile(e, index)
      if(selectedFileGroupToAppend && !selectedFileGroup.includes(selectedFileGroupToAppend[0])){
        if(selectedFileGroupToAppend[0] > selectedFileGroup[selectedFileGroup.length - 1]) {
          setSelectedFileGroup([...selectedFileGroup, ...range(selectedFileGroup[selectedFileGroup.length - 1]+1, selectedFileGroupToAppend[0]), ...selectedFileGroupToAppend].sort((a,b)=>a>b?1:-1).filter((item,pos,array)=>  !pos || item != array[pos-1]))
        } else {
          setSelectedFileGroup([...selectedFileGroupToAppend, ...range(selectedFileGroupToAppend[selectedFileGroupToAppend.length - 1], selectedFileGroup[0]), ...selectedFileGroup].sort((a,b)=>a>b?1:-1).filter((item,pos,array)=>  !pos || item != array[pos-1]))
        }
      }


      //setSelectedFileGroup([...selectedFileGroup.filter((val, i) => i < 1), index])
    }
  }
  function placeHeldFile(){
    return
  }
  //search query parser
  function handleSearch(e: React.KeyboardEvent<HTMLInputElement>){
    if((e.target as HTMLInputElement).value.length == 0){
      setSearch(false)
      return
    }
    if(e.key == "Enter"){``
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
      //console.log(temp_name_set)
      setSearch(true)
    }

    //searchFiles(e.target.value).then()
  }

  function handleSwitchSort(sortStyle: string){
    setSort(sortStyle)
    setFiles(sort_files_with_path(files, sortStyle))

  }

  function sortButtonClicked(){
    sort_number = (sort_number+1)%4;
    handleSwitchSort(number_to_sort[sort_number]);
  }



  async function handleTagInput(e: React.KeyboardEvent<HTMLInputElement>){
    if(e.key == "Enter"){
      if(contextMenuFileId && projectId && (e.target as HTMLInputElement).value.length > 0){
        const tag_name = (e.target as HTMLInputElement).value as string
        (e.target as HTMLInputElement).value = ""

        await createTag(contextMenuFileId, projectId, contextMenuTags, tag_name)
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
    isLongPress.current = false
    clearTimeout(timer.current)
    if(search) return
    if(!files[filesByFileId.current[openFileId]].isDirectory) return
    //if openFileId in activeParentIds
    if(activeParentIds.some(parent => parent.id === openFileId)){
      console.log("Closing")
      //create list of activeParentIds to remove (with children)
      let to_remove = [openFileId]
      to_remove = [...to_remove, ...recursiveCloseFolder(openFileId)]
      //remove
      setActiveParentIds([...activeParentIds.filter(parent => !(to_remove.includes(parent.id)))])

      setLoadingParentIds([...loadingParentIds.filter(parent => !(to_remove.includes(parent.id)))])
    }
    else {
      console.log("Opening")
      const found_active_parent = activeParentIds.find(parent => parent.id === files[filesByFileId.current[openFileId]].parentId)

      setActiveParentIds([...activeParentIds, {id: openFileId, depth: found_active_parent? found_active_parent.depth + 1 : 0}])

      if(!files.some(file => file.parentId == openFileId)){
        setLoadingParentIds([...loadingParentIds, {id: openFileId, depth: found_active_parent? found_active_parent.depth + 1 : 0}])
      }

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
    //console.log("Here!")
    if(e.target != e.currentTarget){
      return
    }

    //console.log("This was called")
    isLongPress.current = false;

    clearTimeout(timer.current);
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType(location);
    setContextMenuPosition([e.pageX, e.pageY]);
    setContextMenuFileId(fileId);
    setContextMenuFilePath(filepath);
    setContextMenuTagPopout(false);
    setContextMenuStoragePath(storagePath);
    setContextMenuFileName(filename);

  }


  function getDepth(file: fileInfo){
    ////console.log(file)
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
  
  function handleShowRecycleBin(e: React.MouseEvent<HTMLButtonElement>){
    setMouseCoords([e.clientX, e.clientY])
    if(activeRecyclingBins.some(bin => bin.projectId === projectId)){
      setActiveRecyclingBins(activeRecyclingBins.filter((bin) => bin.projectId !== projectId))
    } else {
      if(!projectId || !projectName.current) return
      setActiveRecyclingBins([...activeRecyclingBins, {projectId: projectId, projectName: projectName.current}])
    }

  }
  /**
   * Function: isParentPickedUp
   * Returns: boolean
   * Evaluates whether or not any of the file's parents have been picked up. Works recursively, in the case that only a
   * higher-order parent has been picked up.
  **/
  function isParentPickedUp(fileId : string): boolean {
    if(!pickedUpFileGroup) return false
    if(activeParentIds.some(parent => parent.id == files[filesByFileId.current[fileId]].parentId)){
      if(pickedUpFileGroup.some(pickedUpFileIndex => files[pickedUpFileIndex].fileId === fileId)) return true
      return !files[filesByFileId.current[fileId]].parentId.startsWith("ROOT") && isParentPickedUp(files[filesByFileId.current[fileId]].parentId)
    } else {
      return false
    }
  }
  /**
   * Function: isParentSelected
   * Returns: boolean
   * Evaluates whether or not any of the file's parents have been selected. Works recursively, in the case that only a
   * higher-order parent has been picked up.
   **/
  function isParentSelected(fileId : string): boolean {
    if(!selectedFileGroup) return false
    if(activeParentIds.some(parent => parent.id == files[filesByFileId.current[fileId]].parentId)){
      if(selectedFileGroup.some(selectedFileIndex => files[selectedFileIndex].fileId === fileId)) return true
      return !files[filesByFileId.current[fileId]].parentId.startsWith("ROOT") && isParentSelected(files[filesByFileId.current[fileId]].parentId)
    } else {
      return false
    }
  }

  return (
    
      <>
        <PanelContainer
            onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel', undefined, undefined, undefined)}
            onMouseUp={(e) => onFilePlace(e, rootParentId)}
            onMouseMove = {(e) => {pickedUpFileGroup && observeMouseCoords.current ? setMouseCoords([e.clientX, e.clientY]) : undefined}}
            onClick = {(e) => e.target == e.currentTarget ? setSelectedFileGroup(undefined) : undefined}
            onDrop={(e) => {
             if (!projectId || !userId || activeParentIds.length === 0) return;
            
              const currentParentId =
              activeParentIds.length > 0
                ? activeParentIds[0].id
                : `ROOT-${projectId}`;
            
                const currentPath = currentParent?.filepath ?? "/";
                
            
              handleFileDrag(e, projectId, userId, currentParentId, currentPath);
            }}            
            onDragOver = {(e) => {handleDragOver(e, "ROOT-"+projectId)}}
            onDragLeave = {(e) => {handleDragOver(e, undefined)}}
            $dragging={dragOverFileId == "ROOT-"+projectId}
        >
          {
            filePathElement.length > 0  ?
            ( <StickyTopBar key={'top_bar'}>
                  <FilePathContainer>
                    {filePathElement.map((pathElement, i) => (
                      <FilePathLink href={pathElement.href} style={{textDecoration: "none", color: "black"}} key={i}
                                    onMouseUp={(e) => onFilePlace(e, pathElement.fileId)}
                      >
                        {pathElement.fileName}
                      </FilePathLink>
                    ))}
                  </FilePathContainer>
                  <TopBarContainer>
                    <FloatingRecycleButton onClick={(e) => handleShowRecycleBin(e)} title="Recycle Bin">
                      <div style={{justifyContent:"center"}}>{activeRecyclingBins.some(bin => bin.projectId == projectId) ? <Image src={icon_binline} alt="" layout="fill" objectFit='scale-down' objectPosition='center'/> : <Image src={icon_binsolid} alt="" layout="fill" objectFit='scale-down' objectPosition='center'/>}</div>
                    </FloatingRecycleButton>
                    <Input onKeyDown={(e) => handleSearch(e)} onChange = {(e) => e.target.value.length == 0 ? setSearch(false) : undefined}>

                    </Input>
                    <SortContainer>
                      <SortSelector
                          onClick={() => sortButtonClicked()}>
                        <Image src={sort_number == 0 ? icon_sort0 : sort_number == 1 ? icon_sort1 : sort_number == 2 ? icon_sort2 : icon_sort3} alt="" layout="fill" objectFit='scale-down' objectPosition='center'/>
                      </SortSelector>
                    </SortContainer>
                  </TopBarContainer>
                </StickyTopBar>
            ) : <></>

          }

          {files.length > 0 && !loading ? (
              !search ? (
                  <>
                    {
                      files.map((file, index) => (
                              <>
                                {
                                    activeParentIds.some(parent => parent.id == file.parentId) && (
                                        <File key={file.fileId}
                                              $depth={getDepth(file)}
                                              $pickedUp={(pickedUpFileGroup != undefined && (pickedUpFileGroup.includes(index)) || isParentPickedUp(file.fileId))}
                                              $mouseX={mouseCoords[0]}
                                              $mouseY={mouseCoords[1]}
                                              $selected = {dragOverFileId == file.fileId || (selectedFileGroup != undefined && (selectedFileGroup.includes(index) || isParentSelected(file.fileId)))}
                                              $indexDiff = {0}
                                              onMouseDown={(e) => onFilePickUp(e, file.fileId)}
                                              onMouseUp={(e) => (pickedUpFileGroup != undefined && !pickedUpFileGroup.includes(index) ? onFilePlace(e, file.fileId) : undefined)}
                                              onClick={(e) => e.altKey ? openCloseFolder(file.fileId) : e.shiftKey ? selectFileGroup(e, filesByFileId.current[file.fileId]) : e.ctrlKey ? appendToFileGroup(selectFile(e, index)) : selectFile(e, index)}
                                              onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile', file.ownerId, file.storageId, file.filename)}
                                              onDragOver = {(e) => {handleDragOver(e, file.fileId)}}
                                              onDragLeave = {(e) => {handleDragOver(e, undefined)}}
                                              onDrop = {(e) => {handleDragOver(e, undefined); projectId && userId ?
                                                  file.isDirectory ?
                                                      handleFileDrag(e, projectId, userId, file.fileId, file.filepath) :
                                                      handleFileDrag(e, projectId, userId, file.parentId, file.filepath.slice(0,file.filepath.length-(file.filename.length+1)))
                                                  : undefined}}>

                                          <div style={{pointerEvents: "none", display: "inline-flex", alignItems: "center"}}>{file.isDirectory ? activeParentIds.some(activeParent => activeParent.id == file.fileId) || loadingParentIds.some(loadingParent => loadingParent.id == file.fileId) ? <Image src={icon_folderopen} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/>: <Image src={icon_folder} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/> : <Image src={return_file_icon(file.filename)} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/>} <div style={{marginLeft: '1em', pointerEvents:"none"}}>{file.filename}
                                            <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                                                  logicalId={file.logicalId} storageId={file.storageId}
                                                                  isDeleted={ file.isDeleted}
                                                                  size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                                                  projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                                                  updatedAt={file.updatedAt} visible={file.visible}
                                                                  open={file.open}
                                                                  isDirectory={file.isDirectory}></FileContext></div></div>
                                        </File>
                                    )
                                }
                                {
                                    loadingParentIds.some(loadingParent => loadingParent.id === file.fileId) && (
                                        <File key = {`${file.fileId}_loading`}
                                              $depth={getDepth(file)+1}
                                              $pickedUp={(pickedUpFileGroup != undefined && pickedUpFileGroup.includes(index))}
                                              $mouseX={mouseCoords[0]}
                                              $mouseY={mouseCoords[1]}
                                              $selected ={false}
                                              $indexDiff = {0}
                                        >
                                          Loading...
                                        </File>
                                    )
                                }
                              </>
                          )

                      )
                    }
                    <div style={{height: "40%", width:"100%", flexShrink:"0", pointerEvents: "none"}}></div>
                  </>


                  ) : (
                  files.sort(sort_style_map[sort]).map((file, index) => (
                      <File key={file.fileId}
                            $depth={0}
                            $pickedUp={(pickedUpFileGroup != undefined && (pickedUpFileGroup.length == 2 && (pickedUpFileGroup[0] <= pickedUpFileGroup[1] && pickedUpFileGroup[0] <= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] >= filesByFileId.current[file.fileId]) || (pickedUpFileGroup[0] > pickedUpFileGroup[1] && pickedUpFileGroup[0] >= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] <= filesByFileId.current[file.fileId])))}
                            $mouseX={mouseCoords[0]}
                            $mouseY={mouseCoords[1]}
                            $selected = {dragOverFileId == file.fileId || selectedFileGroup != undefined && selectedFileGroup.includes(index)}
                            $indexDiff = {selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] < selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[0] : selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] > selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[1] : 0}
                            onMouseDown={(e) => onFilePickUp(e, file.fileId)}
                            onMouseUp={(e) => onFilePlace(e, file.fileId)}
                            onClick={(e: React.MouseEvent<HTMLButtonElement>) => e.detail == 2 ? reorientView(index) : undefined}
                            onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile', file.ownerId, file.storageId, file.filename)}
                            onDragOver = {(e) => {handleDragOver(e, file.fileId)}}
                            onDragLeave = {(e) => {handleDragOver(e, undefined)}}>
                        <div style={{pointerEvents: "none", display: "inline-flex", alignItems: "center"}}>{file.isDirectory ? file.open ? <Image src={icon_folderopen} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/>: <Image src={icon_folder} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/> : <Image src={return_file_icon(file.filename)} alt="" objectFit='contain' width='36' style={{pointerEvents: "none"}}/>} <div style={{marginLeft: '1em', pointerEvents:"none"}}>{file.filename}
                        <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                              logicalId={file.logicalId} storageId={file.storageId}
                                              isDeleted={file.isDeleted}
                                              size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                              projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                              updatedAt={file.updatedAt} visible={file.visible} open={file.open}
                                              isDirectory={file.isDirectory}></FileContext></div></div>
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
                        onClick={() => {
                          handleCreateFolder();
                        }}
                    >
                      Create Folder
                    </ContextMenuItem>
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
                    <ContextMenuItem onClick={() => {handleDelete(contextMenuFileId!);}}>
                      Delete File
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                      Open Chat
                    </ContextMenuItem>
                    <ContextMenuItem onClick={() => handleDownload(contextMenuStoragePath!, contextMenuFileName!,contextMenuFileId!)}>
                      Download
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
                      onClick={() => {
                        const file = files[filesByFileId.current[contextMenuFileId]]
                        previewFile(file)

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

    {
      <>
        {activeRecyclingBins.map((bin) => (
            <RecycleBinPanel
                key={bin.projectId} // Use a unique value here
                initialPosX={mouseCoords[0]}
                initialPosY={mouseCoords[1]}
                projectId={bin.projectId}
                projectName={bin.projectName}
                close={() =>
                    setActiveRecyclingBins(
                        activeRecyclingBins.filter((obj) => obj.projectId !== bin.projectId)
                    )
                }
            />
        ))}
      </>

    }


    {displayConflictModal && conflictModalData.current && (
        <ConflictModal filename={conflictModalData.current.fileName} onResolve={conflictModalData.current.onResolve} />
    )}
    {showVersionPanel && versionPanelData && (
          <VersionPanel
            fileId={versionPanelData.fileId}
            fileName={versionPanelData.filename}
            logicalId={versionPanelData.logicalId}
            storageId={versionPanelData.storageId}
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

const FilePathLink = styled(Link)`
  padding-top: 10px;
  padding-bottom: 10px;
  border-radius: 10px;
  &:hover{
    filter: drop-shadow(0px 0px 5px #5C9ECC);
    height: 100%;
  }
    
`

const SortContainer = styled.div`
  display: flex;
  flex-direction: row;
  width: auto;
  height: 3rem;
`
const SortSelector = styled.button`
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
    
    background-color: #D7DADD !important;
    transition: 0.2s;
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
        updated: {updated.toDateString() == now.toDateString() ? updated.toLocaleTimeString("en-US") : updated.toLocaleDateString("en-US")} {file.isDirectory? "" : "Size: "+formatBytes(file.size)}
      </FileContextItem>
  );
}

export function formatBytes(bytes: number, decimals = 2) {
  if(!+bytes) return '0 B'

  const kilo = 1024
    const dec = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB']

    const i = Math.floor(Math.log(bytes) / Math.log(kilo))

    return `${parseFloat((bytes / Math.pow(kilo, i)).toFixed(dec))} ${sizes[i]}`
}

const PanelContainer = styled.div<{$dragging: boolean}>`
  
  width: 100%;
  height: 100%;
  background-color: ${props => props.$dragging ? "lightblue" : "white"};
  text-align: center;
  overflow-y: scroll;
  display: flex;
  justify-content: right;
  flex-direction: column;
  z-index: 0;
`;

const File = styled.button.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number, $selected: boolean, $indexDiff: number}>(props => ({
  style: {
    display: props.$depth == -1 ? "none" : "auto",
    position: props.$pickedUp ? "absolute" : undefined,
    top: props.$pickedUp ? props.$mouseY + 15 + "px" : "auto",
    left: props.$pickedUp ? props.$mouseX + 15 + "px" : "auto",
    marginLeft: props.$pickedUp ? props.$depth * 20 : "auto" ,
    marginRight: 0,
    width: props.$pickedUp ? "auto" : "calc(100% - " + props.$depth * 10 + "px)",
    pointerEvents: props.$pickedUp ? "none" : "auto",
    opacity : props.$pickedUp ? 0.75 : 1,
    backgroundColor: props.$pickedUp ? "lightskyblue" : props.$selected ? "lightblue" : "white",
    borderRadius: props.$pickedUp ? "10px" : "0",
    zIndex: props.$pickedUp ? "999" : "20"

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

    filter: drop-shadow(-5px 0px 5px #78a7c7);

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
  top: 0;
  background-color: white;
`;

const FilePathContainer = styled.div`
    display: flex;
    top: 0;
    width: 100%;
    border-bottom-style: solid;
    border-bottom-width: 2px;
    border-bottom-color: #D7DADD;
    padding-left: 15px;
    padding-right: 15px;
    padding-top: 5px;
    padding-bottom: 5px;
    overflow-x: auto;
    white-space: nowrap;
    background-color: white;
    flex-shrink: 0;
`;
const StickyTopBar = styled.div`
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 0;
    z-index: 21;
  border-bottom-style: solid;
  border-bottom-width: 2px;
  border-bottom-color: #D7DADD;
`
const Input = styled.input`
  flex: 1;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
`;


const FloatingRecycleButton = styled.button`

  width: 2rem;
  height: 2rem;
  margin: auto .5rem;
  border-radius: 1rem;
  border-style: solid;
  border-width: 2px;
  border-color: #ccc;
  background: white;
  cursor: pointer;
  filter: drop-shadow(1px 1px 1px #000000);
  &:hover{

    background-color: #D7DADD !important;
    transition: 0.2s;
  }

  &:hover {
    background-color: #D7DADD;
  }
`;
