"use client";
import '@aws-amplify/ui-react/styles.css';
import React, {ChangeEvent, useEffect, useRef, useState} from "react";
import { useGlobalState } from "./GlobalStateContext";
import { useNotificationState } from "@/app/NotificationStateContext";
import {listFilesForProject, processAndUploadFiles, updateFileLocation} from "@/lib/file";
import {deleteTag, listTagsForProject} from "@/lib/tag";
import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";
import { generateClient } from "aws-amplify/api";
import type { Schema } from "@/amplify/data/resource";
import CreateFilePanel from "./popout_create_file_panel"


const client = generateClient<Schema>();

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

interface fileInfo{
  fileId: string,
  filename: string,
  filepath: string,
  size: number,
  versionId: string,
  ownerId: string,
  projectId: string,
  parentId: Nullable<string>,
  createdAt: string,
  updatedAt: string,
  visible: boolean,
  open: boolean,
  isDirectory: boolean | null
}

interface tagInfo{
  tagId: string,
  fileId: string | null,
  tagName: string
}

export default function FilePanel() {

  function createContextMenu(e: React.MouseEvent<HTMLDivElement> | React.MouseEvent<HTMLButtonElement>, fileId: string | undefined, filepath: string | undefined, location: string){
    if(e.target != e.currentTarget){
      return
    }
    isLongPress.current = false;
    clearTimeout(timer.current);
    e.preventDefault();
    setContextMenu(true);
    setContextMenuType(location);
    setContextMenuPosition([e.pageX, e.pageY]);
    setContextMenuFileId(fileId);
    setContextMenuFilePath(filepath);
    setContextMenuTagPopout(false);
  }

  const { projectId, userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId, heldKeys, setHeldKeys} = useGlobalState();
  const { createTag } = useNotificationState();

  const [contextMenuPosition, setContextMenuPosition] = useState([0,0])

  const [mouseCoords, setMouseCoords] = useState([0,0])

  const [contextMenuFileId, setContextMenuFileId] = useState<string | undefined>(undefined);

  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [contextMenuTagPopout, setContextMenuTagPopout] = useState(false);

  const [files, setFiles] = useState<Array<fileInfo>>([]);
  const filesRef = useRef(files)
  filesRef.current = files

  const [searchTerm, setSearchTerm] = useState<Array<string>>([])

  const [tagSearchTerm, setTagSearchTerm] = useState<Array<string>>([])

  const [authorSearchTerm, setAuthorSearchTerm] = useState<Array<string>>([])

  const filesByParentId = useRef<{[key: string]: [number]}>({})

  const filesByFileId = useRef<{[key: string]: number}>({})

  const filesByTagId = useRef<{[key: string]: number}>({})

  const [tags, setTags] = useState<Array<tagInfo>>([]);

  const [sort, setSort] = useState("alphanumeric")

  const [search, setSearch] = useState(false)

  const [pickedUpFileId, setPickedUpFileId] = useState<string | undefined>(undefined)
  const [pickedUpFileGroup, setPickedUpFileGroup] = useState<number[] | undefined>(undefined)

  const [selectedFileGroup, setSelectedFileGroup] = useState<number[] | undefined>(undefined)



  const [cutFileId, setCutFileId] = useState<fileInfo | undefined>(undefined)

  const timer = useRef(setTimeout(() => {}, 500));

  const isLongPress = useRef(false);

  const [createFilePanelUp, setCreateFilePanelUp] = useState(false);
  const createFilePanelInitX = useRef(0);
  const createFilePanelInitY = useRef(0);
  const createFileOrFolder = useRef("File");

  const shiftKey = useRef(false)

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

    if ("ROOT-" + projectId in sorted_files) {
      //console.log("Made it")
      files = concatenateFiles("ROOT-"+projectId, sorted_files, []);
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

  async function fetchTags() {
    if(!projectId){
      return
    }
    const projectTags = await listTagsForProject(projectId);
    if(!projectTags){
      setTags([])
      return []
    }
    let temp_tags: Array<tagInfo> = []
    for(let tag of projectTags){
      temp_tags = [...temp_tags,
        {
          tagId: tag.tagId,
          fileId: tag.fileId,
          tagName: tag.tagName}]
    }
    setTags(temp_tags)
    console.log(tags)
    return temp_tags
  }
  const observeTags = () => {
    const subscription = client.models.Tag.observeQuery({
      filter: {projectId: {eq: projectId? projectId: undefined}},

    }).subscribe({
      next: async({items}) => {
        console.log("Called!")
        if(items.length == 0){
          setTags([])
          return []
        }

        setTags(items.map((tag) => ({
          tagId: tag.tagId,
          fileId: tag.fileId,
          tagName: tag.tagName
        })));
        //console.log(tagsByFileId.current)
      }
    })
    return () => {
      subscription.unsubscribe();
    };

  }


  useEffect(() => {
    if(projectId){
      fetchTags()

      const unsubscribe = observeTags()
      return () => unsubscribe();

    }

  }, [projectId]);

  async function fetchFiles() {

    if (!projectId) return;
    const projectFiles = await listFilesForProject(projectId);
    //builds array of files with extra information for display
    //Extra information :
    //'visible' : designates if a file is current visible,
    // 'open' : designates if a file is currently open (it's unclear that this is required)
    if(projectFiles){
      let temp_files: Array<fileInfo> = []
      for(let file of projectFiles) {
        temp_files = [...temp_files,
          {
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
            visible: file.parentId == "ROOT-"+projectId,
            open: false,
            isDirectory: file.isDirectory
          }]
      }
      setFiles(sort_files_with_path(temp_files))
      return temp_files

    }
  }
  const observeFiles = () => {
    const subscription = client.models.File.observeQuery({
      filter: { projectId: { eq: projectId? projectId : undefined } },
    }).subscribe({
      next: async ({ items }) => {
        if(items.length == 0){
          return []
        }
        let temp_files = items.map(file => ({
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
          visible: file.fileId in filesByFileId.current && file.parentId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.fileId]].visible && filesRef.current[filesByFileId.current[file.parentId]].open : file.parentId.includes("ROOT"),
          open: file.fileId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.fileId]].open && (file.parentId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.parentId]].open : true) : false,
          isDirectory: file.isDirectory
        }));
        //
        //console.log(temp_files)
        setFiles(sort_files_with_path(temp_files));
        return temp_files;
      },
      error: (error) => {
        console.error("[ERROR] Error observing files:", error);
      },
    });

    return () => {
      subscription.unsubscribe();
    };
  };

  useEffect(() => {
    if(projectId){
      fetchFiles();

      const unsubscribe = observeFiles();
      return () => unsubscribe();
    }
  }, [projectId]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if(!(e.target && ((e.target as HTMLInputElement).id == "tag_input") || (e.target as HTMLDivElement).id == "tag_button") && contextMenu){
        setContextMenu(false);
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

  const handleCreateFile = async (isDirectory: boolean, projectId: string, ownerId: string, parentId: string, tags: string[]) => {
    setCreateFilePanelUp(false)
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    if (isDirectory) {
        input.webkitdirectory = true; // Enable directory selection
    }

    input.addEventListener("change", async (event) => {
        const files = (event.target as HTMLInputElement).files;
        console.log("This" + files)
        if (!files) {
            console.error("[ERROR] No files selected.");
            return;
        }

        let folderDict: Record<string, any> = {}; // Dictionary to store folder structure

        function addToNestedDict(
            dict: Record<string, any>,
            pathParts: string[],
            fileName: string,
            fileObj: File
        ) {
            let currentLevel = dict;

            for (let i = 0; i < pathParts.length; i++) {
                let part = pathParts[i];

                // If this folder does not exist in the dictionary, create it
                if (!currentLevel[part]) {
                    currentLevel[part] = { files: {} };
                }

                // Move deeper into the nested dictionary
                currentLevel = currentLevel[part];
            }

            // Ensure files is an object where filenames are keys
            currentLevel.files[fileName] = fileObj; // Store the actual file object
        }

        // Populate the folder structure
        if (isDirectory) {
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                const relativePath = file.webkitRelativePath || file.name; // Get relative path
                const pathParts = relativePath.split("/"); // Split into directory structure
                const fileName = pathParts.pop() || ""; // Extract actual file name

                addToNestedDict(folderDict, pathParts, fileName, file);
            }
        } else {
            // If it's a single file, place it inside a `files` object
            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                folderDict = { files: { [file.name]: file } };
            }
        }

        console.log("[DEBUG] Final Folder Dictionary:", folderDict);

        // Process dictionary and upload files


        await processAndUploadFiles(folderDict, projectId, ownerId, parentId);
    });

    input.click();
};






  // opens / closes a folder that is clicked
  function openCloseFolder(e, openFileId: string) {
    setSelectedFileGroup(undefined)
    if(search){
      return
    }
    //console.log("Here")
    //console.log(openFileId in filesByParentId)
    if(openFileId in filesByParentId.current && filesByParentId.current[openFileId].length > 0){
      filesRef.current[filesByFileId.current[openFileId]].open = !filesRef.current[filesByFileId.current[openFileId]].open
      //console.log("opening file")
      //console.log(filesRef.current[filesByFileId.current[openFileId]])
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
    if(pickedUpFileGroup != undefined) {
      const pickedUpFileGroupCopy = pickedUpFileGroup.sort(compare_two_numbers)
      for(let currIndex = pickedUpFileGroupCopy[0]; currIndex <= pickedUpFileGroupCopy[1]; currIndex++){

        if(files[currIndex].visible){
          files[currIndex].parentId = overFileId
          recursiveGeneratePaths(files[currIndex].fileId, overFilePath != null ? overFilePath + "/" : "/")

          if(overFileId){
            if(overFileId in filesByParentId.current && filesByParentId.current[overFileId].length > 0 && !files[filesByParentId.current[overFileId][0]].visible){
              files[currIndex].visible = false
              recursiveCloseFolder(files[currIndex].fileId)
            }
          }
        }
        files[currIndex].parentId = overFileId;
        files[currIndex].filepath = overFilePath + "/" + files[currIndex].fileId;
        if(overFileId && overFileId in filesByParentId.current && filesByParentId.current[overFileId].length > 0 && !files[filesByParentId.current[overFileId][0]].visible) {
          files[currIndex].visible = false
        }
      }
      setPickedUpFileGroup(undefined)
      setFiles(sort_files_with_path(files))
    } else {
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


  }

  //If the user holds down left-click on a file / folder, all subdirectories are closed, and
  function onFilePickUp(currFileId : string) {
    if(search){
      return
    }
    isLongPress.current = true
    timer.current = setTimeout(() => {
      if(isLongPress.current){
        console.log("Here!")
        console.log(filesByFileId.current[currFileId])
        console.log(selectedFileGroup)
        if(selectedFileGroup != undefined && (selectedFileGroup.length == 2 && (filesByFileId.current[currFileId] >= selectedFileGroup[0] && filesByFileId.current[currFileId] <= selectedFileGroup[1]) || (filesByFileId.current[currFileId] >= selectedFileGroup[1] && filesByFileId.current[currFileId] <= selectedFileGroup[0]))){
          setPickedUpFileGroup(selectedFileGroup)
          console.log("did it")
        }
        else {
          recursiveCloseFolder(currFileId);
          setPickedUpFileId(currFileId);
        }

      }}, 500)



  }



  //Recursively generates new 'path' values for all subdirectories of that which was placed
  function recursiveGeneratePaths(currFileId: Nullable<string>, pathAppend: string) {
    let newPathAppend: string = pathAppend

    if (currFileId !== null) {

      files[filesByFileId.current[currFileId]].filepath = pathAppend + files[filesByFileId.current[currFileId]].filename
      updateFileLocation(currFileId, pathAppend + files[filesByFileId.current[currFileId]].filename, files[filesByFileId.current[currFileId]].parentId, projectId).then()
      newPathAppend = pathAppend + files[filesByFileId.current[currFileId]].filename + "/"
      if (currFileId in filesByParentId.current) {
        for (let i of filesByParentId.current[currFileId]) {
          recursiveGeneratePaths(files[i].fileId, newPathAppend)
        }
      }
    }


  }

  function selectFile(index: number){
    console.log("Here")
    setSelectedFileGroup([index])
    console.log(selectedFileGroup)
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
  function handleSearch(e: ChangeEvent<HTMLInputElement>){


    setPickedUpFileId(undefined)
    if(e.target.value.length > 0){
      let search_set = e.target.value.split("/")
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

  async function handleTagInput(e: React.KeyboardEvent<HTMLInputElement>){
    if(e.key == "Enter"){
      if(contextMenuFileId && projectId && (e.target as HTMLInputElement).value.length > 0){
        const tag_name = (e.target as HTMLInputElement).value as string
        (e.target as HTMLInputElement).value = ""

        createTag("file", contextMenuFileId, projectId, tag_name)
      }
    }
  }

  return (
      <PanelContainer
          onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel')}
          onMouseUp={(e) => onFilePlace(e, "ROOT-"+projectId, null)}
          onMouseMove = {(e) => setMouseCoords([e.clientX, e.clientY])}
          onClick = {(e) => e.target == e.currentTarget ? setSelectedFileGroup(undefined) : undefined}>
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
            !search ? (
                files.filter(
                    file =>
                        (file.visible)).map((file, index) => (
                    <File key={file.fileId}
                          $depth={(file.filepath.match(/\//g) || []).length}
                          $pickedUp={pickedUpFileId == file.fileId || (pickedUpFileGroup != undefined &&  (pickedUpFileGroup.length == 2 && (pickedUpFileGroup[0] <= pickedUpFileGroup[1] && pickedUpFileGroup[0] <= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] >= filesByFileId.current[file.fileId]) || (pickedUpFileGroup[0] > pickedUpFileGroup[1] && pickedUpFileGroup[0] >= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] <= filesByFileId.current[file.fileId])))}
                          $mouseX={mouseCoords[0]}
                          $mouseY={mouseCoords[1]}
                          $selected = {selectedFileGroup != undefined && ((selectedFileGroup.length == 1 && selectedFileGroup[0] == filesByFileId.current[file.fileId]) || (selectedFileGroup.length == 2 && (selectedFileGroup[0] <= selectedFileGroup[1] && selectedFileGroup[0] <= filesByFileId.current[file.fileId] && selectedFileGroup[1] >= filesByFileId.current[file.fileId]) || (selectedFileGroup[0] > selectedFileGroup[1] && selectedFileGroup[0] >= filesByFileId.current[file.fileId] && selectedFileGroup[1] <= filesByFileId.current[file.fileId])))}
                          $indexDiff = {selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] < selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[0] : selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] > selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[1] : 0}
                          onMouseDown={() => file.fileId != pickedUpFileId ? onFilePickUp(file.fileId) : undefined}
                          onMouseUp={(e) => file.fileId != pickedUpFileId ? onFilePlace(e, file.fileId, file.filepath) : undefined}
                          onClick={(e) => e.altKey ? openCloseFolder(e, file.fileId) : e.shiftKey ? selectFileGroup(filesByFileId.current[file.fileId]) : selectFile(filesByFileId.current[file.fileId])}
                          onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile')}>
                      {file.isDirectory ? "📁" : "🗎"} {file.filename}
                      <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                            size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                            projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                            updatedAt={file.updatedAt} visible={file.visible}
                                            open={file.open}
                                            isDirectory={file.isDirectory}></FileContext>
                    </File>
                )

            )) : (
                files.filter(
                    file =>
                        (
                            (searchTerm.length == 0 || searchTerm.some((term) => (file.filename.toLowerCase().includes(term.toLowerCase())))) &&
                            (tagSearchTerm.length == 0 || tagSearchTerm.every((term) => tags.some((tag) => tag.fileId == file.fileId && tag.tagName.toLowerCase().includes(term.toLowerCase()))))
                        )).sort(sort_style_map[sort]).map((file, index) => (
                    <File key={file.fileId}
                          $depth={0}
                          $pickedUp={pickedUpFileId == file.fileId || (pickedUpFileGroup != undefined && (pickedUpFileGroup.length == 2 && (pickedUpFileGroup[0] <= pickedUpFileGroup[1] && pickedUpFileGroup[0] <= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] >= filesByFileId.current[file.fileId]) || (pickedUpFileGroup[0] > pickedUpFileGroup[1] && pickedUpFileGroup[0] >= filesByFileId.current[file.fileId] && pickedUpFileGroup[1] <= filesByFileId.current[file.fileId])))}
                          $mouseX={mouseCoords[0]}
                          $mouseY={mouseCoords[1]}
                          $selected = {selectedFileGroup != undefined && ((selectedFileGroup.length == 1 && selectedFileGroup[0] == filesByFileId.current[file.fileId]) || (selectedFileGroup.length == 2 && selectedFileGroup[0] <= filesByFileId.current[file.fileId] && selectedFileGroup[1] >= filesByFileId.current[file.fileId]))}
                          $indexDiff = {selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] < selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[0] : selectedFileGroup != undefined && selectedFileGroup.length > 1 && selectedFileGroup[0] > selectedFileGroup[1] ? filesByFileId.current[file.fileId] - selectedFileGroup[1] : 0}
                          onMouseDown={() => file.fileId != pickedUpFileId ? onFilePickUp(file.fileId) : undefined}
                          onMouseUp={(e) => file.fileId != pickedUpFileId ? onFilePlace(e, file.fileId, file.filepath) : undefined}
                          onClick={(e) => e.altKey ? openCloseFolder(e, file.fileId) : e.shiftKey ? selectFileGroup(filesByFileId.current[file.fileId]) : selectFile(filesByFileId.current[file.fileId])}
                          onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile')}>
                      {file.isDirectory ? "📁" : "🗎"} {file.filename}
                      <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                            size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                            projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                            updatedAt={file.updatedAt} visible={file.visible} open={file.open}
                                            isDirectory={file.isDirectory}></FileContext>
                    </File>
                )
            )
        )) : (
            <NoFiles>No files available.</NoFiles>
        )}

        {createFilePanelUp ?
            <CreateFilePanel initialPosX={createFilePanelInitX.current} initialPosY={createFilePanelInitY.current}
                             parentFileId={contextMenuFileId}
                             isDirectory={createFileOrFolder.current} createFile={handleCreateFile} close={closeCreateFilePanel}/>
            : <></>
        }

        {
          contextMenu && contextMenuType=="filePanel" ? (
              <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenu>
                  <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="File"}}>
                    Create File
                  </ContextMenuItem>
                  <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="Folder"}}>
                    Create Folder
                  </ContextMenuItem>
                  <ContextMenuItem>
                    Open Chat
                  </ContextMenuItem>
                </ContextMenu>
              </ContextMenuWrapper>
          ) : contextMenuFileId && contextMenu && contextMenuType=="fileFile" ? (

              <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenu>
                  <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)}>
                    Rename
                  </ContextMenuItem>
                  <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(true)}>
                    Tags
                  </ContextMenuItem>
                  <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)}>
                    Properties
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setFileId(contextMenuFileId)} onMouseOver={() => setContextMenuTagPopout(false)}>
                    Open Chat
                  </ContextMenuItem>
                </ContextMenu>
                {contextMenuTagPopout ?
                <ContextMenuPopout $index={1}>
                  <ContextMenuTagInput placeholder="Insert Tag Name" id={"tag_input"} onKeyDown = {(e) => handleTagInput(e)}/>
                  {
                    tags.filter((tag) => tag.fileId == contextMenuFileId).map(
                        (tag) => (
                            <ContextMenuItem key={tag.tagId}>
                              {tag.tagName == "" ? " " : tag.tagName}
                              <ContextMenuExitButton id = {"tag_button"} onClick = {() => deleteTag(tag.tagId)}>
                                X
                              </ContextMenuExitButton>
                            </ContextMenuItem>
                        ))}
                </ContextMenuPopout>
                    : <></>
                }
              </ContextMenuWrapper>
          ) : contextMenu && contextMenuType=="fileFolder" ? (
              <ContextMenuWrapper $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenu>
                  <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="File"}} onMouseOver={() => setContextMenuTagPopout(false)}>
                    Create File
                  </ContextMenuItem>
                  <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="Folder"}} onMouseOver={() => setContextMenuTagPopout(false)}>
                    Create Folder
                  </ContextMenuItem>
                  <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(true)}>
                    Tags
                  </ContextMenuItem>
                  <ContextMenuItem onMouseOver={() => setContextMenuTagPopout(false)}>
                    Properties
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => setFileId(contextMenuFileId)} onMouseOver={() => setContextMenuTagPopout(false)}>
                    Open Chat
                  </ContextMenuItem>
                </ContextMenu>
                {contextMenuTagPopout ?
                    <ContextMenuPopout $index={2}>
                      <ContextMenuTagInput placeholder="Insert Tag Name" id={"tag_input"} onKeyDown = {(e) => handleTagInput(e)}/>
                      {
                        tags.filter((tag) => tag.fileId == contextMenuFileId).map(
                            (tag) => (
                                <ContextMenuItem key={tag.tagId}>
                                  {tag.tagName == "" ? " " : tag.tagName}
                                  <ContextMenuExitButton id = {"tag_button"} onClick = {() => deleteTag(tag.tagId)}>
                                    X
                                  </ContextMenuExitButton>
                                </ContextMenuItem>
                            ))}
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
    z-index: 2;
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

const PanelContainer = styled.div`
  width: 100%;
  height: 100%;
  background-color: white;
  text-align: center;
  overflow-y: scroll;
`;

const File = styled.button.attrs<{$depth: number, $pickedUp: boolean, $mouseX: number, $mouseY: number, $selected: boolean, $indexDiff: number}>(props => ({
  style: {
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
const Input = styled.input`
  flex: 1;
  height: 3rem;
  padding: 0.5rem;
  border: 2px solid #ccc;
  border-radius: 5px;
`;