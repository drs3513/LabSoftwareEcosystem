import styled from "styled-components";
import type { Schema } from "@/amplify/data/resource";
import {Nullable} from "@aws-amplify/data-schema";
import PopoutPanel from "./popout_panel"
type FileVersion = Pick<
  Schema["File"]["type"],
  "versionId" | "updatedAt" | "storageId"
>;

interface Props {
  fileId: string;
  fileName: string;
  logicalId: string;
  storageId: Nullable<string>|undefined;
  ownerId: string;
  projectId: string;
  versions: FileVersion[];
  currentVersionId: string;
  initialPosX: number;
  initialPosY: number;
  close: () => void;
  onDownloadVersion: (
    versionId: string,
    logicalId: string,
    filename: string,
    filepath: Nullable<string> | undefined,
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
  initialPosX,
  initialPosY,
  close,
  onDownloadVersion,
}: Props) {


  return (
    <PopoutPanel
      header={`Version History | ${fileName}`}
        initialPosX={initialPosX}
      initialPosY={initialPosY}
      close={close}

    >
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
                      {
                        onDownloadVersion(
                            version.versionId,
                            logicalId,
                            fileName,
                            version.storageId ?? storageId,
                            ownerId,
                            projectId
                        );
                      }

                      }
                  >
                    {versionNumber} – {dateStr}
                  </VersionItem>
              );
            })}
      </VersionList>
    </PopoutPanel>
  );
}

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
