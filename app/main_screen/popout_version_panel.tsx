import React, { useRef, useState } from "react";
import styled from "styled-components";
import type { Schema } from "@/amplify/data/resource";
import {Nullable} from "@aws-amplify/data-schema";
import { useGlobalState } from "../GlobalStateContext";

type FileVersion = Pick<
  Schema["File"]["type"],
  "versionId" | "updatedAt" | "storageId"
>;

interface Props {
  fileId: string;
  fileName: string;
  logicalId: string;
  storageId: string;
  ownerId: string;
  projectId: string;
  versions: FileVersion[];
  currentVersionId: string;
  initialX: number;
  initialY: number;
  close: () => void;
  onDownloadVersion: (
    versionId: string,
    logicalId: string,
    filename: string,
    filepath: string,
    storageId: Nullable<string> | undefined,
    ownerId: string,
    projectId: string
  ) => void;
}

export default function VersionPanel({
  fileName,
  logicalId,
  storageId,
  ownerId,
  projectId,
  versions,
  currentVersionId,
  initialX,
  initialY,
  close,
  onDownloadVersion,
}: Props) {
  const [posX, setPosX] = useState(initialX);
  const [posY, setPosY] = useState(initialY);
  const dragStartX = useRef(0);
  const dragStartY = useRef(0);

  const {draggingFloatingWindow} = useGlobalState()

  function handleDragStart(e: React.DragEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    dragStartX.current = e.pageX - rect.left;
    dragStartY.current = e.pageY - rect.top;
    draggingFloatingWindow.current = true
  }

  function handleDragEnd(e: React.DragEvent<HTMLDivElement>) {
    setPosX(e.pageX - dragStartX.current);
    setPosY(e.pageY - dragStartY.current);
    draggingFloatingWindow.current = false
  }

  return (
    <PanelContainer $posX={posX} $posY={posY}>
      <Header draggable onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        Version History - {fileName}
        <CloseButton onClick={close}>×</CloseButton>
      </Header>
      <VersionList>
        {[...versions]
          .sort((a, b) => new Date(b.updatedAt!).getTime() - new Date(a.updatedAt!).getTime())
          .map((version, i, arr) => {
            const versionNumber = `v${arr.length - i}`;
            const isCurrent = version.versionId === currentVersionId;
            const dateStr = new Date(version.updatedAt!).toLocaleString();

            return (
              <VersionItem
                key={i}
                $current={isCurrent}
                onClick={() =>
                  onDownloadVersion(
                    version.versionId,
                    logicalId,
                    fileName,
                    "",
                    version.storageId ?? storageId,
                    ownerId,
                    projectId
                  )
                }
              >
                {versionNumber} – {dateStr}
              </VersionItem>
            );
          })}
      </VersionList>
    </PanelContainer>
  );
}

// Styled Components
const PanelContainer = styled.div.attrs<{ $posX: number; $posY: number }>((props) => ({
  style: { top: props.$posY, left: props.$posX },
}))`
  position: absolute;
  width: 360px;
  max-height: 70vh;
  overflow-y: auto;
  background: white;
  border: 2px solid gray;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  z-index: 100;
`;

const Header = styled.div`
  background: #e5e5e5;
  font-weight: bold;
  padding: 10px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  cursor: move;
  border-top-left-radius: 12px;
  border-top-right-radius: 12px;
`;

const CloseButton = styled.button`
  background: transparent;
  border: none;
  font-size: 1.4rem;
  cursor: pointer;
  line-height: 1;
`;

const VersionList = styled.div`
  padding: 12px 16px;
`;

const VersionItem = styled.div<{ $current: boolean }>`
  font-size: 0.9rem;
  margin-bottom: 8px;
  cursor: pointer;
  color: ${(props) => (props.$current ? "#111" : "#555")};
  font-weight: ${(props) => (props.$current ? "bold" : "normal")};

  &:hover {
    text-decoration: underline;
  }
`;
