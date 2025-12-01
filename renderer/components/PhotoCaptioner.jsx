import { Paper, Indicator, Image, Skeleton } from "@mantine/core";
import { useEffect, useState, memo, useRef } from "react";
import { createCaption } from "../createCaption";
import {
  matchFaces,
  sortFacesByHeight,
  sortFacesLeftToRight,
} from "../utils/faceMatching";

const PhotoCaptioner = memo(function PhotoCaptioner({
  photo,
  photoIndex,
  thumbWidth = 200,
  saveCaptions,
  triggerRecognition,
  addToQueue,
  similarityThreshold,
  targetFolder,
  users,
  allUsers,
  filterGroup,
  onPhotoUpdate,
  onPhotoSelect,
  faceSizeThreshold,
  insightFaceServer,
  maxNumberOfFaces,
  isSelected,
}) {
  const [indexing, setIndexing] = useState(false);
  const [visible, setVisible] = useState(true);
  const processingRef = useRef(false);
  const abortControllerRef = useRef(null);
  const lastTriggerRef = useRef(0);

  useEffect(() => {
    // When trigger changes, add this photo to the processing queue
    if (triggerRecognition > lastTriggerRef.current && triggerRecognition > 0) {
      lastTriggerRef.current = triggerRecognition;

      // Add to queue with priority based on selection
      const priority = isSelected ? 100 : photoIndex;
      addToQueue(() => recognizeFaces(), priority);
    }
  }, [triggerRecognition]);

  useEffect(() => {
    if (saveCaptions) handleSaveCaption();
  }, [saveCaptions]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const recognizeFaces = async () => {
    // Prevent multiple simultaneous processing
    if (processingRef.current) {
      console.log(
        `Skipping recognition for ${photo.filename} - already processing`
      );
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    processingRef.current = true;
    setIndexing(true);

    try {
      // Use existing faces if already detected
      let facesInPhoto =
        photo.faces?.length > 0
          ? photo.faces
          : await window.electronAPI.insightFaceDetection(
              photo,
              insightFaceServer
            );

      // Check if request was aborted
      if (abortControllerRef.current.signal.aborted) {
        return;
      }

      // Sort by height, take top N, then sort left to right
      const sortedFaces = sortFacesLeftToRight(
        sortFacesByHeight(facesInPhoto).slice(0, maxNumberOfFaces)
      );

      const recognizedFaces = matchFaces(sortedFaces, users);

      // ALWAYS update photo, even if no faces found
      onPhotoUpdate(photoIndex, {
        faces: recognizedFaces,
        processed: true, // Mark as processed
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Face recognition error:", error);
        // Update with empty faces array on error
        onPhotoUpdate(photoIndex, {
          faces: [],
          processed: true,
          error: true,
        });
      }
    } finally {
      processingRef.current = false;
      setIndexing(false);
      abortControllerRef.current = null;
    }
  };

  const handleSaveCaption = async () => {
    try {
      const caption = createCaption({
        persons: photo.faces,
        similarityThreshold,
        isFootballTeam: photo.isFootballTeam,
        faceSizeThreshold,
        filterGroup,
        allUsers,
      });

      const result = await window.electronAPI.writeIptc(
        targetFolder,
        photo.filename,
        caption
      );

      if (result?.written) {
        setVisible(false);
      }
    } catch (error) {
      console.error("Save caption error:", error);
    }
  };

  if (!visible) return null;

  return (
    <Indicator
      size={16}
      color={indexing ? "orange" : "green"}
      offset={8}
      processing={indexing}
    >
      <Paper
        shadow="md"
        radius="md"
        m={4}
        p={0}
        style={{
          width: thumbWidth,
          height: thumbWidth * 0.66,
          overflow: "hidden",
          cursor: "pointer",
          border: isSelected ? "3px solid var(--mantine-color-blue-6)" : "none",
          transition: "all 0.2s ease",
        }}
        onClick={() => onPhotoSelect(photoIndex)}
      >
        {photo.data ? (
          <Image
            src={photo.data}
            alt={photo.filename}
            fit="cover"
            h="100%"
            w="100%"
          />
        ) : (
          <Skeleton height="100%" width="100%" animate />
        )}
      </Paper>
    </Indicator>
  );
});

export default PhotoCaptioner;
