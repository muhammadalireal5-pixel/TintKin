"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Check, X, RotateCcw, Maximize2, Move } from "lucide-react";

/**
 * ImageCropper Component
 * Allows users to manually frame their face within an adjustable bounding box.
 * 
 * @param {Object} props
 * @param {string} props.imageSrc - URL of image to crop
 * @param {File} props.originalFile - Original File object
 * @param {Function} props.onCropComplete - Callback (croppedFile, croppedUrl)
 * @param {Function} props.onCancel - Callback ()
 */
export default function ImageCropper({ imageSrc, originalFile, onCropComplete, onCancel }) {
  const imgRef = useRef(null);

  // Crop state in display pixels relative to the image
  const [crop, setCrop] = useState({ x: 0, y: 0, width: 180, height: 220 });
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDims, setImageDims] = useState({ width: 0, height: 0 });

  // Drag interaction state
  const dragRef = useRef({
    active: false,
    mode: null, // 'move' | 'nw' | 'ne' | 'sw' | 'se'
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, width: 0, height: 0 },
    imgW: 0,
    imgH: 0,
  });

  const MIN_SIZE = 60;

  // Initialize crop when image is loaded and dimensions are known
  const initCrop = useCallback((imgWidth, imgHeight) => {
    if (!imgWidth || !imgHeight) return;
    // Default to a portrait rectangle (approx 4:5 ratio) taking ~80% of the image
    const targetW = Math.round(Math.min(imgWidth * 0.85, imgHeight * 0.75));
    const targetH = Math.round(Math.min(imgHeight * 0.9, targetW * 1.25));
    const x = Math.round(Math.max(0, (imgWidth - targetW) / 2));
    const y = Math.round(Math.max(0, (imgHeight - targetH) / 2));

    setCrop({
      x,
      y,
      width: Math.max(MIN_SIZE, targetW),
      height: Math.max(MIN_SIZE, targetH),
    });
  }, []);

  const measureAndInit = useCallback(() => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const w = Math.round(rect.width);
    const h = Math.round(rect.height);

    if (w > 0 && h > 0) {
      setImageDims({ width: w, height: h });
      initCrop(w, h);
      setImageLoaded(true);
    }
  }, [initCrop]);

  const handleImageLoad = () => {
    measureAndInit();
  };

  // Recalculate on window resize or element resize
  useEffect(() => {
    const handleResize = () => {
      if (imgRef.current) {
        const rect = imgRef.current.getBoundingClientRect();
        const w = Math.round(rect.width);
        const h = Math.round(rect.height);
        if (w > 0 && h > 0) {
          setImageDims({ width: w, height: h });
        }
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Window-level pointer drag handlers for butter-smooth tracking
  useEffect(() => {
    const onPointerMove = (e) => {
      if (!dragRef.current.active) return;
      e.preventDefault();

      const { mode, startX, startY, startCrop, imgW, imgH } = dragRef.current;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;

      setCrop(() => {
        let { x, y, width, height } = startCrop;

        if (mode === "move") {
          x = Math.max(0, Math.min(imgW - startCrop.width, startCrop.x + dx));
          y = Math.max(0, Math.min(imgH - startCrop.height, startCrop.y + dy));
        } else if (mode === "se") {
          width = Math.max(MIN_SIZE, Math.min(imgW - startCrop.x, startCrop.width + dx));
          height = Math.max(MIN_SIZE, Math.min(imgH - startCrop.y, startCrop.height + dy));
        } else if (mode === "sw") {
          const maxDx = startCrop.width - MIN_SIZE;
          const actualDx = Math.min(maxDx, Math.max(-startCrop.x, dx));
          x = startCrop.x + actualDx;
          width = startCrop.width - actualDx;
          height = Math.max(MIN_SIZE, Math.min(imgH - startCrop.y, startCrop.height + dy));
        } else if (mode === "ne") {
          width = Math.max(MIN_SIZE, Math.min(imgW - startCrop.x, startCrop.width + dx));
          const maxDy = startCrop.height - MIN_SIZE;
          const actualDy = Math.min(maxDy, Math.max(-startCrop.y, dy));
          y = startCrop.y + actualDy;
          height = startCrop.height - actualDy;
        } else if (mode === "nw") {
          const maxDx = startCrop.width - MIN_SIZE;
          const actualDx = Math.min(maxDx, Math.max(-startCrop.x, dx));
          x = startCrop.x + actualDx;
          width = startCrop.width - actualDx;

          const maxDy = startCrop.height - MIN_SIZE;
          const actualDy = Math.min(maxDy, Math.max(-startCrop.y, dy));
          y = startCrop.y + actualDy;
          height = startCrop.height - actualDy;
        }

        return {
          x: Math.round(x),
          y: Math.round(y),
          width: Math.round(width),
          height: Math.round(height),
        };
      });
    };

    const onPointerUp = () => {
      if (dragRef.current.active) {
        dragRef.current.active = false;
        dragRef.current.mode = null;
      }
    };

    window.addEventListener("pointermove", onPointerMove, { passive: false });
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
    };
  }, []);

  const startDrag = (e, mode) => {
    e.preventDefault();
    e.stopPropagation();

    const imgW = imageDims.width || imgRef.current?.clientWidth || 300;
    const imgH = imageDims.height || imgRef.current?.clientHeight || 300;

    dragRef.current = {
      active: true,
      mode,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
      imgW,
      imgH,
    };
  };

  const handleApplyCrop = () => {
    if (!imgRef.current) return;
    const img = imgRef.current;
    const rect = img.getBoundingClientRect();
    const scaleX = img.naturalWidth / rect.width;
    const scaleY = img.naturalHeight / rect.height;

    const sourceX = Math.max(0, Math.round(crop.x * scaleX));
    const sourceY = Math.max(0, Math.round(crop.y * scaleY));
    const sourceW = Math.min(img.naturalWidth - sourceX, Math.round(crop.width * scaleX));
    const sourceH = Math.min(img.naturalHeight - sourceY, Math.round(crop.height * scaleY));

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, sourceW);
    canvas.height = Math.max(1, sourceH);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const croppedFile = new File([blob], originalFile?.name || "selfie-cropped.jpg", {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
        const croppedUrl = URL.createObjectURL(blob);
        onCropComplete(croppedFile, croppedUrl);
      },
      "image/jpeg",
      0.95
    );
  };

  const handleUseFull = () => {
    onCropComplete(originalFile, imageSrc);
  };

  const handleReset = () => {
    if (imageDims.width && imageDims.height) {
      initCrop(imageDims.width, imageDims.height);
    } else {
      measureAndInit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-md mx-auto">
      {/* Instructional header */}
      <div className="text-center mb-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-sage mb-1 flex items-center justify-center gap-1.5">
          <Move size={13} /> Frame Your Face
        </p>
        <p className="text-xs text-muted">
          Drag the box or corners so your forehead, cheeks, and chin are inside.
        </p>
      </div>

      {/* Outer framing stage with dark background */}
      <div className="w-full max-w-[340px] mx-auto rounded-2xl overflow-hidden select-none bg-neutral-900 shadow-xl border border-white/20 flex items-center justify-center p-2">
        {/* Inner wrapper that matches the image dimensions EXACTLY */}
        <div className="relative inline-block overflow-hidden leading-none max-h-[380px] max-w-full">
          {/* Source Image */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageSrc}
            alt="Crop preview"
            onLoad={handleImageLoad}
            className="max-h-[360px] max-w-full w-auto h-auto block select-none pointer-events-none rounded-lg"
            draggable={false}
          />

          {/* Interactive Crop Boundary — Strictly bound to the image's coordinate space */}
          {imageLoaded && imageDims.width > 0 && (
            <div
              style={{
                left: `${crop.x}px`,
                top: `${crop.y}px`,
                width: `${crop.width}px`,
                height: `${crop.height}px`,
                boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
              }}
              onPointerDown={(e) => startDrag(e, "move")}
              className="absolute border-2 border-white cursor-move z-10 touch-none shadow-sm"
            >
              {/* Subtle Rule-of-Thirds Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white" />
              </div>

              {/* Subtle Face Alignment Oval */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="w-[74%] h-[84%] rounded-[50%] border border-dashed border-white/35" />
              </div>

              {/* 4 Corner Resize Handles */}
              <div
                onPointerDown={(e) => startDrag(e, "nw")}
                className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-white shadow-lg border-2 border-primary cursor-nwse-resize z-20 flex items-center justify-center touch-none hover:scale-110 active:scale-95 transition-transform"
                title="Resize top-left"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              <div
                onPointerDown={(e) => startDrag(e, "ne")}
                className="absolute -top-3 -right-3 w-6 h-6 rounded-full bg-white shadow-lg border-2 border-primary cursor-nesw-resize z-20 flex items-center justify-center touch-none hover:scale-110 active:scale-95 transition-transform"
                title="Resize top-right"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              <div
                onPointerDown={(e) => startDrag(e, "sw")}
                className="absolute -bottom-3 -left-3 w-6 h-6 rounded-full bg-white shadow-lg border-2 border-primary cursor-nesw-resize z-20 flex items-center justify-center touch-none hover:scale-110 active:scale-95 transition-transform"
                title="Resize bottom-left"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>

              <div
                onPointerDown={(e) => startDrag(e, "se")}
                className="absolute -bottom-3 -right-3 w-6 h-6 rounded-full bg-white shadow-lg border-2 border-primary cursor-nwse-resize z-20 flex items-center justify-center touch-none hover:scale-110 active:scale-95 transition-transform"
                title="Resize bottom-right"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Controls */}
      <div className="w-full max-w-[340px] mt-4 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={handleReset}
          className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors py-1.5 px-2.5 rounded-lg hover:bg-black/5"
          title="Reset Box"
        >
          <RotateCcw size={13} /> Reset
        </button>

        <button
          type="button"
          onClick={handleUseFull}
          className="flex items-center gap-1 text-xs text-muted hover:text-primary transition-colors py-1.5 px-2.5 rounded-lg hover:bg-black/5"
          title="Skip Crop"
        >
          <Maximize2 size={13} /> Full Photo
        </button>

        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 transition-colors py-1.5 px-2.5 rounded-lg hover:bg-red-50"
        >
          <X size={13} /> Cancel
        </button>
      </div>

      {/* Main Confirm Button */}
      <div className="w-full max-w-[340px] mt-3">
        <button
          type="button"
          onClick={handleApplyCrop}
          className="w-full py-2.5 px-4 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-primary/90 shadow-md flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
        >
          <Check size={16} /> Confirm Framing
        </button>
      </div>
    </div>
  );
}
