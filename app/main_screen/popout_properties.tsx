import React from "react";
import styled from "styled-components";
import Image from "next/image";
import PopoutPanel from "./popout_panel";
import { return_file_icon } from "./[pid]/[id]/file_panel"; 

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
  posY,
}) => {
  return (
    <PopoutPanel
      header={`Properties | ${filename}`}
      initialPosX={posX}
      initialPosY={posY}
      close={close}
    >
      <ContentWrapper>
        <HeaderRow>
          <Image src={return_file_icon(filename)} alt="" width={36} height={36} />
          <span style={{ marginLeft: "1em", fontWeight: "bold" }}>{filename}</span>
        </HeaderRow>
        <InfoRow><strong>Size:</strong> {(size / 1024).toFixed(2)} KB</InfoRow>
        <InfoRow><strong>Owner:</strong> {ownerId}</InfoRow>
        <InfoRow><strong>File Path:</strong> {filepath}</InfoRow>
        <InfoRow><strong>Created:</strong> {new Date(createdAt).toLocaleString()}</InfoRow>
        <InfoRow><strong>Last Updated:</strong> {new Date(updatedAt).toLocaleString()}</InfoRow>
      </ContentWrapper>
    </PopoutPanel>
  );
};

export default FilePropertiesPanel;

// Styled Components
const ContentWrapper = styled.div`
  padding: 12px 16px;
`;

const HeaderRow = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 1em;
`;

const InfoRow = styled.div`
  margin-bottom: 8px;
  font-size: 0.9rem;
`;
