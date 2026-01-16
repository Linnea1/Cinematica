import React from "react";
import { buildTimelineMarkers } from "../game/timeLine";
import "./Timeline.css";

export default function Timeline({ board, isPlacing, chosenIndex }) {
  const markers = buildTimelineMarkers(board);

  return (
    <div className="timeline-wrapper">
      <div className="timeline-line" />

      <div className="timeline-row">
        {board.map((card, index) => {
          const marker = markers.find((m) => m.index === index);

          const decadeLabel =
            marker && typeof marker.decade === "number"
              ? `${String(marker.decade).slice(-2)}s`
              : null;

          return (
            <React.Fragment key={"t-" + index}>
              {isPlacing && (
                <div
                  className={`timeline-slot ghost-slot ${
                    chosenIndex === index ? "active" : ""
                  }`}
                />
              )}

              <div className="timeline-slot">
                {marker && (
                  <div className="decade-marker">
                    <span>{decadeLabel}</span>
                    <div className="tick" />
                  </div>
                )}
              </div>
            </React.Fragment>
          );
        })}

        {isPlacing && (
          <div
            className={`timeline-slot ghost-slot ${
              chosenIndex === board.length ? "active" : ""
            }`}
          />
        )}
      </div>
    </div>
  );
}
