import React, { useEffect, useState, useMemo, useRef } from "react";
import { buildTimelineMarkers } from "../game/timeLine";
import "./Timeline.css";

export default function Timeline({
  board,
  isPlacing,
  chosenIndex,
  wrapperRef,
  boardLineRef,
}) {
  const markers = useMemo(() => buildTimelineMarkers(board), [board]);
  const [lineStyle, setLineStyle] = useState({ left: 0, width: 0 });
  const [markerPositions, setMarkerPositions] = useState([]);
  const markerPositionsRef = useRef([]);

  useEffect(() => {
    const update = () => {
      const wrap = wrapperRef?.current;
      const boardLine = boardLineRef?.current;
      if (!wrap || !boardLine) return;

      const allChildren = Array.from(boardLine.children || []);
      const children = allChildren.filter(
        (c) => !c.classList.contains("edge-spacer"),
      );

      if (children.length >= 1) {
        const first = children[0];
        const last = children[children.length - 1];

        const left = boardLine.offsetLeft + first.offsetLeft;
        let width = last.offsetLeft + last.offsetWidth - first.offsetLeft;

        if (isPlacing) {
          const rawExtra = (board.length || 0) * 6 + 20;
          const extra = Math.min(rawExtra, 80);
          const adjLeft = left - Math.floor(extra / 2);
          width = width + extra;
          setLineStyle({ left: adjLeft, width });
        } else {
          setLineStyle({ left, width });
        }

        return;
      }

      const left = boardLine.offsetLeft || 0;
      const width = boardLine.offsetWidth || 0;
      setLineStyle({ left, width });
    };

    update();
    const wrap = wrapperRef?.current;
    if (wrap) {
      wrap.addEventListener("scroll", update, { passive: true });
    }
    window.addEventListener("resize", update);

    let ro;
    const boardLineEl = boardLineRef?.current;
    if (boardLineEl && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => update());
      ro.observe(boardLineEl);
    }

    return () => {
      if (wrap) wrap.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      if (ro && boardLineEl) ro.unobserve(boardLineEl);
    };
  }, [wrapperRef, boardLineRef, board.length, isPlacing, chosenIndex]);

  useEffect(() => {
    const compute = () => {
      const boardLine = boardLineRef?.current;
      const wrap = wrapperRef?.current;
      if (!boardLine || !wrap) return setMarkerPositions([]);

      const cards = boardLine.querySelectorAll(".cardContainer");
      const positions = [];

      markers.forEach((m) => {
        const el = cards.item ? cards.item(m.index) : cards[m.index];
        if (!el || typeof el.getBoundingClientRect !== "function") return;
        let elRect;
        try {
          elRect = el.getBoundingClientRect();
        } catch (err) {
          return;
        }
        const wrapRect = wrap.getBoundingClientRect();

        const left =
          elRect.left - wrapRect.left + elRect.width / 2 + wrap.scrollLeft;
        positions.push({ index: m.index, left });
      });

      const prev = markerPositionsRef.current;
      const same =
        prev.length === positions.length &&
        prev.every(
          (p, i) =>
            p.index === positions[i].index &&
            Math.abs(p.left - positions[i].left) < 0.5,
        );

      if (!same) {
        markerPositionsRef.current = positions;
        setMarkerPositions(positions);
      }
    };

    compute();
    const wrap = wrapperRef?.current;
    if (wrap) wrap.addEventListener("scroll", compute, { passive: true });
    window.addEventListener("resize", compute);
    return () => {
      if (wrap) wrap.removeEventListener("scroll", compute);
      window.removeEventListener("resize", compute);
    };
  }, [markers, wrapperRef, boardLineRef]);

  return (
    <div className="timeline-wrapper">
      <div
        className="timeline-line"
        style={{
          left: lineStyle.left + "px",
          width: lineStyle.width + "px",
          right: "auto",
        }}
      />

      <div className="timeline-row">
        {board.map((card, index) => (
          <React.Fragment key={"t-" + index}>
            {isPlacing && (
              <div
                className={`timeline-slot ghost-slot ${
                  chosenIndex === index ? "active" : ""
                }`}
              />
            )}

            <div className="timeline-slot" />
          </React.Fragment>
        ))}

        {isPlacing && (
          <div
            className={`timeline-slot ghost-slot ${
              chosenIndex === board.length ? "active" : ""
            }`}
          />
        )}

        {markerPositions.map((p) => {
          const marker = markers.find((m) => m.index === p.index);
          const decadeLabel = marker
            ? `${String(marker.decade).slice(-2)}s`
            : null;
          return (
            <div
              key={"m-" + p.index}
              className="decade-marker absolute"
              style={{ left: p.left + "px" }}
            >
              <span>{decadeLabel}</span>
              <div className="tick" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
