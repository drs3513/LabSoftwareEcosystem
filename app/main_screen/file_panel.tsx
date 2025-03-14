"use client";
import '@aws-amplify/ui-react/styles.css';
import React, {ChangeEvent, useEffect, useRef, useState} from "react";
import { useGlobalState } from "./GlobalStateContext";
import {listFilesForProject, processAndUploadFiles, updateFileLocation} from "@/lib/file";
import styled from "styled-components";
import {Nullable} from "@aws-amplify/data-schema";
import { generateClient } from "aws-amplify/api";
import type { Schema } from "@/amplify/data/resource";
import CreateFilePanel from "./popout_create_file_panel"


const client = generateClient<Schema>();


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
  }

  const { projectId, userId, contextMenu, setContextMenu, contextMenuType, setContextMenuType, setFileId } = useGlobalState();

  const [contextMenuPosition, setContextMenuPosition] = useState([0,0])

  const [mouseCoords, setMouseCoords] = useState([0,0])

  const [contextMenuFileId, setContextMenuFileId] = useState<string | undefined>(undefined);

  const [contextMenuFilePath, setContextMenuFilePath] = useState<string | undefined>(undefined);

  const [files, setFiles] = useState<Array<fileInfo>>([]);
  const filesRef = useRef(files)
  filesRef.current = files
  const [searchTerm, setSearchTerm] = useState("")

  const filesByParentId = useRef<{[key: string]: [number]}>({})

  const filesByFileId = useRef<{[key: string]: number}>({})

  const [sort, setSort] = useState("alphanumeric")

  const [search, setSearch] = useState(false)

  const [pickedUpFileId, setPickedUpFileId] = useState<string | undefined>(undefined)

  const timer = useRef(setTimeout(() => {}, 500));

  const isLongPress = useRef(false);

  const [createFilePanelUp, setCreateFilePanelUp] = useState(false);
  const createFilePanelInitX = useRef(0);
  const createFilePanelInitY = useRef(0);
  const createFileOrFolder = useRef("File");



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

    //ensures that root files are visible
    //if(filesByParentId.current["ROOT-" + projectId]){
    //  for (let file of filesByParentId.current["ROOT-" + projectId]){
    //    files[file].visible = true
    //  }
    //}



    return files



  }


    //TODO for the love of god fix this hell

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
          visible: file.fileId in filesByFileId.current ? file.parentId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.fileId]].visible && filesRef.current[filesByFileId.current[file.parentId]].open : file.parentId.includes("ROOT") : file.parentId.includes("ROOT"),
          open: file.fileId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.fileId]].open && (file.parentId in filesByFileId.current ? filesRef.current[filesByFileId.current[file.parentId]].open : true) : false,
          isDirectory: file.isDirectory
        }));
        //
        console.log(temp_files)
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



  const handleCreateFile = async (isDirectory: boolean, projectId: string, ownerId: string, parentId: string) => {
    setCreateFilePanelUp(false)
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = true;

    if (isDirectory) {
        input.webkitdirectory = true; // Enable directory selection
    }

    input.addEventListener("change", async (event) => {
        const files = (event.target as HTMLInputElement).files;
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
  function openCloseFolder(openFileId: string) {
    if(search){
      return
    }
    console.log("Here")
    console.log(openFileId in filesByParentId)
    if(openFileId in filesByParentId.current && filesByParentId.current[openFileId].length > 0){
      filesRef.current[filesByFileId.current[openFileId]].open = !filesRef.current[filesByFileId.current[openFileId]].open
      console.log("opening file")
      console.log(filesRef.current[filesByFileId.current[openFileId]])
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
      <PanelContainer
          onContextMenu={(e) => createContextMenu(e, undefined, undefined, 'filePanel')}
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
                      onContextMenu={(e) => createContextMenu(e, file.fileId, file.filepath, file.isDirectory ? 'fileFolder' : 'fileFile')}>
                  {file.isDirectory ? "📁" : "🗎"} {file.filename}
                  <br></br><FileContext fileId={file.fileId} filename={file.filename} filepath={file.filepath}
                                        size={file.size} versionId={file.versionId} ownerId={file.ownerId}
                                        projectId={file.projectId} parentId={file.parentId} createdAt={file.createdAt}
                                        updatedAt={file.updatedAt} visible={file.visible} open={file.open}
                                        isDirectory={file.isDirectory}></FileContext>
                </File>
            ))
        ) : (
            <NoFiles>No files available.</NoFiles>
        )}

        {createFilePanelUp ?
            <CreateFilePanel initialPosX={createFilePanelInitX.current} initialPosY={createFilePanelInitY.current}
                             parentFileId={contextMenuFileId} parentFilePath={contextMenuFilePath}
                             isDirectory={createFileOrFolder.current} createFile={handleCreateFile} close={closeCreateFilePanel}/>
            : <></>
        }

        {
          contextMenu && contextMenuType=="filePanel" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
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
          ) : contextMenu && contextMenuType=="fileFile" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem>
                  Rename
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
              </ContextMenu>
          ) : contextMenu && contextMenuType=="fileFolder" ? (
              <ContextMenu $x={contextMenuPosition[0]} $y={contextMenuPosition[1]}>
                <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="File"}}>
                  Create File
                </ContextMenuItem>
                <ContextMenuItem onClick={(e) => {setCreateFilePanelUp(true); createFilePanelInitX.current=e.pageX; createFilePanelInitY.current=e.pageY; createFileOrFolder.current="Folder"}}>
                  Create Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Delete Folder
                </ContextMenuItem>
                <ContextMenuItem>
                  Properties
                </ContextMenuItem>
                <ContextMenuItem onClick={() => setFileId(contextMenuFileId)}>
                  Open Chat
                </ContextMenuItem>
              </ContextMenu>
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