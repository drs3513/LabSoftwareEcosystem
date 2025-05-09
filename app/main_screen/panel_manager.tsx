import styled from "styled-components";
import Panel from "./panel";
import { useState, useEffect } from "react";



const Holder = styled.div`
  display: flex;
  flex-direction: row;
  height: calc(100vh - 1.5rem - 2px);
  
`;

const Border = styled.div<{ $width: string; $width_type: string }>`
  width: ${(props) => "calc(" + props.$width + props.$width_type + " - 4px)" || "3px"};
  border-right: #D7DADD 1px solid;
  border-left: #D7DADD 1px solid;
  background-color: black;
  &:hover {
    cursor: ew-resize;
  }
`;

function getWindowDimensions() {
  const { innerWidth: width, innerHeight: height } = window;
  return { width, height };
}

export default function PanelManager() {

  // Resizing Panel Logic
  const [windowDimensions, setWindowDimensions] = useState(getWindowDimensions());

  useEffect(() => {
    function handleResize() {
      setWindowDimensions(getWindowDimensions());
    }
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  });

  const [left_panel_width, changeLeftPanelWidth] = useState("20%");
  const [middle_panel_width, changeMiddlePanelWidth] = useState("60%");
  const [right_panel_width, changeRightPanelWidth] = useState("20%");
  const [over_left, changeOverLeft] = useState(false);
  const [over_right, changeOverRight] = useState(false);

  const border_width = 10;
  const border_width_type = "px";

  function resizeLeftStart() {
    changeOverLeft(true);
  }

  function resizeRightStart() {
    changeOverRight(true);
  }

  function resizeEnd() {
    changeOverLeft(false);
    changeOverRight(false);
  }

  /**
   * Allows for the user to resize each of the three panels by clicking and dragging their mouse
   * Converts percentages of the screen width to pixels, and then back to percentages, as to maintain continuity with 
   * screen resizes
   * @param e
   */
  function resizePanels(e: React.MouseEvent<HTMLDivElement>) {
    if (e.clientX > 30) {
      if (over_left) {
        let left_panel_width_px = (parseInt(left_panel_width) / 100) * windowDimensions.width;
        let middle_panel_width_px = (parseInt(middle_panel_width) / 100) * windowDimensions.width;
        const right_panel_width_px = parseInt(right_panel_width);
        middle_panel_width_px -= e.clientX - left_panel_width_px;
        left_panel_width_px = Math.floor((e.clientX / windowDimensions.width) * 1000) / 10;
        middle_panel_width_px = Math.ceil((middle_panel_width_px / windowDimensions.width) * 1000) / 10;
        if (left_panel_width_px + middle_panel_width_px + right_panel_width_px > 100) {
          middle_panel_width_px = left_panel_width_px + middle_panel_width_px + right_panel_width_px - 100;
        } else if (left_panel_width_px + middle_panel_width_px + right_panel_width_px < 100) {
          middle_panel_width_px += 100 - (left_panel_width_px + middle_panel_width_px + right_panel_width_px);
        }
        if (middle_panel_width_px > 0) {
          changeLeftPanelWidth(left_panel_width_px + "%");
          changeMiddlePanelWidth(middle_panel_width_px + "%");
        }
      }
      if (over_right) {
        let left_panel_width_px = (parseInt(left_panel_width) / 100) * windowDimensions.width;
        let middle_panel_width_px = e.clientX - left_panel_width_px;
        let right_panel_width_px = windowDimensions.width - e.clientX;
        left_panel_width_px = Math.floor((left_panel_width_px / windowDimensions.width) * 1000) / 10;
        middle_panel_width_px = Math.floor((middle_panel_width_px / windowDimensions.width) * 1000) / 10;
        right_panel_width_px = Math.ceil((right_panel_width_px / windowDimensions.width) * 1000) / 10;
        if (left_panel_width_px + middle_panel_width_px + right_panel_width_px > 100) {
          right_panel_width_px -= left_panel_width_px + middle_panel_width_px + right_panel_width_px - 100;
        } else if (left_panel_width_px + middle_panel_width_px + right_panel_width_px < 100) {
          right_panel_width_px += 100 - (left_panel_width_px + middle_panel_width_px + right_panel_width_px);
        }
        if (middle_panel_width_px > 0) {
          changeMiddlePanelWidth(middle_panel_width_px + "%");
          changeRightPanelWidth(right_panel_width_px + "%");
        }
      }
    }
  }

  return (
    <Holder onMouseMove={(e) => resizePanels(e)} onMouseUp={resizeEnd}>
      {/* Left Panel - Project Panel */}
      <Panel type={1} backgroundColor="black" width={`calc(${left_panel_width} - ${border_width / 2}${border_width_type})`}>
      </Panel>

      {/* Left-Middle Border */}
      <Border $width={border_width.toString()} $width_type={border_width_type} onMouseDown={resizeLeftStart} />

      {/* Middle Panel - File Panel */}
      <Panel type={2} backgroundColor="black" width={`calc(${middle_panel_width} - ${border_width}${border_width_type})`}>
      </Panel>

      {/* Middle-Right Border */}
      <Border $width={border_width.toString()} $width_type={border_width_type} onMouseDown={resizeRightStart} />

      {/* Right Panel - Chat Panel */}
      <Panel type={3} backgroundColor="white" width={`calc(${right_panel_width} - ${border_width / 2}${border_width_type})`}>

      </Panel>
    </Holder>
  );
}
