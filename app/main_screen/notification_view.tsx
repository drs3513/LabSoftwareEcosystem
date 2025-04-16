import styled from "styled-components"
import {useNotificationState} from "@/app/NotificationStateContext";
import React from "react";
export default function NotificationView() {
    const { activeNotifications, removeNotification,
    uploadQueue, uploadTask, uploadProgress, setUploadProgress, downloadProgressMap, setDownloadProgressMap,
    completedUploads, setCompletedUploads, showProgressPanel, setShowProgressPanel} = useNotificationState();




    return (
        <NotificationWrapper>
            {
                activeNotifications.map(
                    (notification, index) => (
                            <Notification key={index}>
                                {notification.message}
                                <NotificationDeleteButton onClick = {() => removeNotification(index)}>
                                    X
                                </NotificationDeleteButton>
                            </Notification>
                    ))}
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
                                    <CancelButton title="Cancel Upload">
                                        ✖
                                    </CancelButton>
                                )}
                            </div>
                        );
                    })}
                </ProgressPanel>
            )}
        </NotificationWrapper>
    )
}

const NotificationWrapper = styled.div`
    height: auto;
    width: auto;
    position: absolute;
    bottom: 0;
    left: 0;
    display: flex;
    flex-direction: column-reverse;
    padding-bottom: .5rem;
    padding-left: .5rem;
`

const Notification = styled.div`
    height: auto;
    width: fit-content;
    padding: 1rem 2rem 1rem 1rem;
    position: relative;
    max-width: 20rem;
    margin-top: .5rem;
    text-align: left;
    background-color: white;
    border-radius: 10px;
    filter: drop-shadow(0px 0px 1px #000000);
`
const NotificationDeleteButton = styled.button`
    border: none;
    font: inherit;
    outline: inherit;
    height: inherit;
    text-align: center;
    position: absolute;
    top: .3rem;
    right: .3rem;
    background-color: inherit;
    
    
    
    &:hover {
        cursor: pointer;
        color: cornflowerblue;
    }
`
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