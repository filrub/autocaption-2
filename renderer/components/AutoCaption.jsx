import {
  AppShell,
  Center,
  Box,
  ScrollArea,
  Text,
  Skeleton,
  Loader,
  Stack,
} from "@mantine/core";
import { useHotkeys, useLocalStorage } from "@mantine/hooks";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { notifications } from "@mantine/notifications";
import { IconExclamationCircle } from "@tabler/icons-react";
import { usePhotos } from "../hooks/usePhotos";
import { usePhotoQueue } from "../hooks/usePhotoQueue";
import { matchFaces } from "../utils/faceMatching";
import Sidebar from "./Sidebar";
import PhotoViewer from "./PhotoViewer";
import PhotoCaptioner from "./PhotoCaptioner";
import LoadingProgress from "./LoadingProgress";
import UserAdminModalContent from "./UserAdminModalContent";
import "./photowall.css";

const INSIGHT_FACE_SERVERS = [
  {
    value: "http://127.0.0.1:8000/detect_faces",
    label: "Locale (più veloce)",
    test: "http://127.0.0.1:8000/health",
  },
  {
    value: "http://home.fotorubin.com:8000/detect_faces",
    label: "Remoto",
    test: "http://home.fotorubin.com:8000/health",
  },
];

export default function AutoCaption({
  users,
  setUsers,
  supabase,
  loadingUsers,
}) {
  const {
    photos,
    setPhotos,
    updatePhoto,
    selectPhoto,
    selectNext,
    selectPrevious,
    selectedPhoto,
    selectedPhotoIndex,
    stats,
  } = usePhotos();

  // Photo processing queue (max 3 concurrent requests)
  const photoQueue = usePhotoQueue(3);

  const [targetFolder, setTargetFolder] = useLocalStorage({
    key: "targetFolder",
    defaultValue: "",
  });

  const [insightFaceServer, setInsightFaceServer] = useLocalStorage({
    key: "insightFaceServer",
    defaultValue: INSIGHT_FACE_SERVERS[0].value,
  });

  const [similarityThreshold, setSimilarityThreshold] = useLocalStorage({
    key: "similarityThreshold",
    defaultValue: 50,
  });

  const [faceSizeThreshold, setFaceSizeThreshold] = useLocalStorage({
    key: "faceSizeThreshold",
    defaultValue: 40,
  });

  const [borderMargin, setBorderMargin] = useLocalStorage({
    key: "borderMargin",
    defaultValue: 0,
  });

  const [maxNumberOfFaces, setMaxNumberOfFaces] = useLocalStorage({
    key: "maxNumberOfFaces",
    defaultValue: 20,
  });

  const [displayWidth, setDisplayWidth] = useLocalStorage({
    key: "displayWidth",
    defaultValue: 800,
  });

  const [saveCaptions, setSaveCaptions] = useState(false);
  const [triggerRecognition, setTriggerRecognition] = useState(0); // Changed from getUserName
  const [loadingProgress, setLoadingProgress] = useState(null);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const completionShownRef = useRef(false); // Track if completion notification was shown

  // Groups and admin modal
  const [groups, setGroups] = useState([]);
  const [filterGroup, setFilterGroup] = useLocalStorage({
    key: "filterGroup",
    defaultValue: null,
  });

  // Filter users by selected group
  const filteredUsers = useMemo(() => {
    if (!filterGroup) return users;
    return users.filter((user) => user.groups?.includes(filterGroup));
  }, [users, filterGroup]);

  // Load groups from database
  const loadGroups = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("groups")
        .select("name")
        .order("name");
      if (error) throw error;
      setGroups(data.map((g) => g.name));
    } catch (error) {
      console.error("Error loading groups:", error);
    }
  }, [supabase]);

  // User admin modal state
  const [userAdminOpen, setUserAdminOpen] = useState(false);

  // Load groups on mount
  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Callback when a new user is enrolled - updates users and re-recognizes all photos
  const handleUserEnrolled = useCallback(
    (newUser) => {
      console.log("🆕 User enrolled, updating recognition:", newUser);

      // Add new user to users array (main list)
      setUsers((prevUsers) => {
        // Check if user already exists (updating existing)
        const existingIndex = prevUsers.findIndex(
          (u) => u.name === newUser.name
        );
        if (existingIndex >= 0) {
          // Update existing user
          const updated = [...prevUsers];
          updated[existingIndex] = { ...updated[existingIndex], ...newUser };
          return updated;
        }
        // Add new user with empty groups initially
        return [...prevUsers, { ...newUser, groups: [] }];
      });

      // Re-run recognition on all photos (not detection, just matching)
      // Use filteredUsers + newUser for matching if group filter is active
      setPhotos((prevPhotos) => {
        // Build updated filtered list
        let matchUsers = filteredUsers;

        // If the new user would be in filteredUsers (no filter or user in filter group), add/update them
        if (!filterGroup || newUser.groups?.includes(filterGroup)) {
          const existingIndex = matchUsers.findIndex(
            (u) => u.name === newUser.name
          );
          if (existingIndex >= 0) {
            matchUsers = matchUsers.map((u) =>
              u.name === newUser.name ? { ...u, ...newUser } : u
            );
          } else {
            matchUsers = [...matchUsers, newUser];
          }
        }

        return prevPhotos.map((photo) => {
          if (!photo.faces || photo.faces.length === 0) return photo;

          // Re-run matchFaces with updated users
          const reRecognizedFaces = matchFaces(photo.faces, matchUsers);
          return { ...photo, faces: reRecognizedFaces };
        });
      });

      notifications.show({
        title: "🔄 Riconoscimento aggiornato",
        message: `Tutte le foto sono state ri-analizzate con ${newUser.name}`,
        color: "blue",
        autoClose: 3000,
      });
    },
    [filteredUsers, filterGroup, setUsers, setPhotos]
  );

  // Setup progress listener
  useEffect(() => {
    const cleanup = window.electronAPI.onImageLoadingProgress((data) => {
      setLoadingProgress(data);
    });

    return cleanup;
  }, []);

  // Monitor queue progress
  useEffect(() => {
    if (photoQueue.isProcessing) {
      // Reset completion flag when processing starts
      completionShownRef.current = false;

      const message = `${photoQueue.processedCount}/${photos.length} foto processate`;

      // Update the SAME notification continuously
      notifications.update({
        id: "queue-progress",
        title: "⚡ Riconoscimento in corso",
        message,
        color: "blue",
        autoClose: false, // Keep it open
        loading: true,
        withCloseButton: true,
      });
    } else if (photoQueue.processedCount > 0 && !completionShownRef.current) {
      // Processing completed - show final notification ONCE
      completionShownRef.current = true;

      notifications.hide("queue-progress"); // Hide the progress notification

      // Show completion notification
      notifications.show({
        id: "queue-complete",
        title: "✅ Riconoscimento completato!",
        message: `${photoQueue.processedCount} foto processate con successo`,
        color: "green",
        autoClose: 4000,
        withCloseButton: true,
      });
    }
  }, [photoQueue.isProcessing, photoQueue.processedCount, photos.length]);

  const handleSelectFolder = useCallback(async () => {
    try {
      const folder = await window.electronAPI.selectDirectory();
      if (folder) setTargetFolder(folder);
      return folder;
    } catch (error) {
      notifications.show({
        title: "Errore",
        message: "Impossibile selezionare la cartella",
        color: "red",
      });
      return null;
    }
  }, [setTargetFolder]);

  const handleStartRecognition = useCallback(async () => {
    setSaveCaptions(false);
    setPhotos([]);
    setLoadingProgress(null);
    setIsLoadingImages(true);

    try {
      const images = await window.electronAPI.listImages(targetFolder);

      if (!images || images.length === 0) {
        notifications.show({
          title: "Attenzione",
          message: "Nessuna immagine trovata nella cartella",
          color: "yellow",
        });
        return;
      }

      images[0].selected = true;
      setPhotos(images);

      notifications.show({
        title: "Caricamento completato",
        message: `${images.length} immagini caricate`,
        color: "green",
        autoClose: 3000,
      });
    } catch (error) {
      notifications.show({
        title: "Errore",
        message: error.message || "Errore durante il caricamento",
        color: "red",
        icon: <IconExclamationCircle size={18} />,
      });
    } finally {
      setIsLoadingImages(false);
      setLoadingProgress(null);
    }
  }, [targetFolder, setPhotos]);

  // Must be declared BEFORE handleStartWorkflow (which uses it)
  const handleRefreshNames = useCallback(() => {
    // Clear any previous queue
    photoQueue.clearQueue();
    photoQueue.resetCounters();

    // Reset completion flag
    completionShownRef.current = false;

    // Initialize the progress notification
    notifications.show({
      id: "queue-progress",
      title: "🔄 Riconoscimento in coda",
      message: `0/${photos.length} foto processate`,
      color: "blue",
      autoClose: false,
      loading: true,
      withCloseButton: true,
    });

    // Increment trigger to force re-render
    setTriggerRecognition((prev) => prev + 1);
  }, [photos.length, photoQueue]);

  const handleSaveCaptions = useCallback(() => {
    setSaveCaptions(true);
    setTimeout(() => setSaveCaptions(false), 1000);
  }, []);

  // 🚀 Combined handler that does everything!
  const handleStartWorkflow = useCallback(async () => {
    let folderToUse = targetFolder;

    // Step 1: Select folder if not already selected
    if (!folderToUse) {
      notifications.show({
        title: "Seleziona cartella",
        message: "Scegli la cartella con le foto da analizzare",
        color: "blue",
        autoClose: 2000,
      });

      folderToUse = await handleSelectFolder();
      if (!folderToUse) {
        // User cancelled folder selection
        return;
      }
    }

    // Step 2: Load images
    setSaveCaptions(false);
    setPhotos([]);
    setLoadingProgress(null);
    setIsLoadingImages(true);

    try {
      const images = await window.electronAPI.listImages(folderToUse);

      if (!images || images.length === 0) {
        notifications.show({
          title: "Attenzione",
          message: "Nessuna immagine trovata nella cartella",
          color: "yellow",
        });
        return;
      }

      images[0].selected = true;
      setPhotos(images);

      notifications.show({
        title: "✅ Immagini caricate!",
        message: `${images.length} immagini pronte. Avvio riconoscimento...`,
        color: "green",
        autoClose: 2000,
      });

      // Step 3: Start recognition automatically after a brief delay
      setTimeout(() => {
        handleRefreshNames();
        notifications.show({
          title: "🎯 Riconoscimento avviato",
          message: "Analisi dei volti in corso...",
          color: "blue",
          autoClose: 3000,
        });
      }, 500);
    } catch (error) {
      notifications.show({
        title: "Errore",
        message: error.message || "Errore durante il caricamento",
        color: "red",
        icon: <IconExclamationCircle size={18} />,
      });
    } finally {
      setIsLoadingImages(false);
      setLoadingProgress(null);
    }
  }, [targetFolder, handleSelectFolder, setPhotos, handleRefreshNames]);

  useHotkeys([
    ["ArrowLeft", selectPrevious],
    ["ArrowRight", selectNext],
    ["Shift+Enter", handleSaveCaptions],
  ]);

  return (
    <>
      <AppShell.Navbar p="md" w={320}>
        <Sidebar
          users={users}
          groups={groups}
          targetFolder={targetFolder}
          onSelectFolder={handleSelectFolder}
          onStartRecognition={handleStartWorkflow}
          onRefreshNames={handleRefreshNames}
          onSaveCaptions={handleSaveCaptions}
          onOpenUserAdmin={() => setUserAdminOpen(true)}
          insightFaceServer={insightFaceServer}
          onServerChange={setInsightFaceServer}
          servers={INSIGHT_FACE_SERVERS}
          similarityThreshold={similarityThreshold}
          onSimilarityChange={setSimilarityThreshold}
          faceSizeThreshold={faceSizeThreshold}
          onFaceSizeChange={setFaceSizeThreshold}
          borderMargin={borderMargin}
          onBorderMarginChange={setBorderMargin}
          maxNumberOfFaces={maxNumberOfFaces}
          onMaxFacesChange={setMaxNumberOfFaces}
          filterGroup={filterGroup}
          onFilterGroupChange={setFilterGroup}
          stats={stats}
          disabled={loadingUsers}
          isLoadingImages={isLoadingImages}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="xl">
          {loadingUsers ? (
            <Center h={600}>
              <Stack align="center" gap="md">
                <Loader size="xl" type="dots" />
                <Text size="lg" c="dimmed">
                  Caricamento database utenti...
                </Text>
              </Stack>
            </Center>
          ) : isLoadingImages && loadingProgress ? (
            <Center mb="xl">
              <LoadingProgress
                processed={loadingProgress.processed}
                total={loadingProgress.total}
                message="Caricamento immagini in corso..."
              />
            </Center>
          ) : null}

          {!loadingUsers && !isLoadingImages && selectedPhoto ? (
            <PhotoViewer
              photo={selectedPhoto}
              photoIndex={selectedPhotoIndex}
              displayWidth={displayWidth}
              similarityThreshold={similarityThreshold}
              faceSizeThreshold={faceSizeThreshold}
              borderMargin={borderMargin}
              maxNumberOfFaces={maxNumberOfFaces}
              users={filteredUsers}
              onPhotoUpdate={updatePhoto}
              onUserEnrolled={handleUserEnrolled}
              supabase={supabase}
            />
          ) : !isLoadingImages && !loadingUsers ? (
            <Center h={600}>
              <Skeleton height={400} width={600} radius="md" />
            </Center>
          ) : null}

          {photos.length > 0 && !isLoadingImages && !loadingUsers && (
            <ScrollArea h={180} mt="xl">
              <div
                className="myGallery"
                style={{
                  display: "flex",
                  gap: "8px",
                  padding: "16px 0",
                }}
              >
                {photos.map((photo, index) => (
                  <PhotoCaptioner
                    key={`photo-${index}`}
                    photo={photo}
                    photoIndex={index}
                    thumbWidth={150}
                    saveCaptions={saveCaptions}
                    triggerRecognition={triggerRecognition}
                    addToQueue={photoQueue.addToQueue}
                    targetFolder={targetFolder}
                    similarityThreshold={similarityThreshold}
                    faceSizeThreshold={faceSizeThreshold}
                    maxNumberOfFaces={maxNumberOfFaces}
                    users={filteredUsers}
                    onPhotoUpdate={updatePhoto}
                    onPhotoSelect={selectPhoto}
                    insightFaceServer={insightFaceServer}
                    isSelected={photo.selected}
                  />
                ))}
              </div>
            </ScrollArea>
          )}

          {photos.length === 0 && !isLoadingImages && (
            <Center h={400}>
              <Text c="dimmed" fs="italic">
                Seleziona una cartella e avvia il riconoscimento
              </Text>
            </Center>
          )}
        </Box>
      </AppShell.Main>

      {userAdminOpen && (
        <UserAdminModalContent
          supabase={supabase}
          onClose={() => setUserAdminOpen(false)}
          onUsersChanged={loadGroups}
        />
      )}
    </>
  );
}
