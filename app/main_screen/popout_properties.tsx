import React from "react";
import styled from "styled-components";
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


function return_file_icon(fileName: string) {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const iconMap: { [key: string]: any } = {
      cpp: icon_filecpp,
      html: icon_filehtml,
      jpg: icon_filejpg,
      jpeg: icon_filejpg,
      js: icon_filejs,
      json: icon_filejson,
      mp4: icon_filemp4,
      pdf: icon_filepdf,
      png: icon_filepng,
      py: icon_filepy,
      svg: icon_filesvg,
      tdp: icon_filetdp,
      tds: icon_filetds,
      tsx: icon_filetsx,
      txt: icon_filetxt,
      webp: icon_filewebp,
      xml: icon_filexml,
      zip: icon_filezip
    };
  
    return iconMap[ext || ""] || icon_filegeneric;
  }
  

const PanelContainer = styled.div<{ $x: number; $y: number }>`
  position: absolute;
  left: ${(props) => props.$x}px;
  top: ${(props) => props.$y}px;
  z-index: 1000;
  background: white;
  border: 1px solid #ccc;
  padding: 1em;
  border-radius: 8px;
  box-shadow: 0 0 8px rgba(0,0,0,0.2);
  width: 300px;
`;

type FileProps = {
  fileId: string;
  filename: string;
  size: number;
  ownerId: string;
  filepath: string;
  createdAt: string;
  updatedAt: string;
  close: () => void;
  posX: number;
  posY: number;
};

const FilePropertiesPanel: React.FC<FileProps> = ({
  filename,
  size,
  ownerId,
  filepath,
  createdAt,
  updatedAt,
  close,
  posX,
  posY
}) => {
  return (
    <PanelContainer $x={posX} $y={posY}>
      <div style={{ display: "flex", alignItems: "center", marginBottom: "1em" }}>
        <Image src={return_file_icon(filename)} alt="" width={36} height={36} />
        <span style={{ marginLeft: "1em", fontWeight: "bold" }}>{filename}</span>
      </div>
      <div><strong>Size:</strong> {(size / 1024).toFixed(2)} KB</div>
      <div><strong>Owner:</strong> {ownerId}</div>
      <div><strong>File Path:</strong>{filepath}</div>
      <div><strong>Created:</strong> {new Date(createdAt).toLocaleString()}</div>
      <div><strong>Last Updated:</strong> {new Date(updatedAt).toLocaleString()}</div>
      <button onClick={close} style={{ marginTop: "1em" }}>Close</button>
    </PanelContainer>
  );
};

export default FilePropertiesPanel;
