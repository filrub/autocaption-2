import { AppShell, Center, Box, ScrollArea, Text, Skeleton } from '@mantine/core'
import { useHotkeys, useLocalStorage } from '@mantine/hooks'
import { useState, useCallback, useEffect } from 'react'
import { notifications } from '@mantine/notifications'
import { IconExclamationCircle } from '@tabler/icons-react'
import { usePhotos } from '../hooks/usePhotos'
import { usePhotoQueue } from '../hooks/usePhotoQueue'
import Sidebar from './Sidebar'
import PhotoViewer from './PhotoViewer'
import PhotoCaptioner from './PhotoCaptioner'
import LoadingProgress from './LoadingProgress'
import './photowall.css'

const INSIGHT_FACE_SERVERS = [
  {
    value: 'http://127.0.0.1:8000/detect_faces',
    label: 'Locale (più veloce)',
    test: 'http://127.0.0.1:8000/health'
  },
  {
    value: 'http://home.fotorubin.com:8000/detect_faces',
    label: 'Remoto',
    test: 'http://home.fotorubin.com:8000/health'
  }
]

export default function AutoCaption({ users, setUsers, supabase, loadingUsers }) {
  const {
    photos,
    setPhotos,
    updatePhoto,
    selectPhoto,
    selectNext,
    selectPrevious,
    selectedPhoto,
    selectedPhotoIndex,
    stats
  } = usePhotos()

  // Photo processing queue (max 3 concurrent requests)
  const photoQueue = usePhotoQueue(3)

  const [targetFolder, setTargetFolder] = useLocalStorage({
    key: 'targetFolder',
    defaultValue: ''
  })

  const [insightFaceServer, setInsightFaceServer] = useLocalStorage({
    key: 'insightFaceServer',
    defaultValue: INSIGHT_FACE_SERVERS[0].value
  })

  const [similarityThreshold, setSimilarityThreshold] = useLocalStorage({
    key: 'similarityThreshold',
    defaultValue: 50
  })

  const [faceSizeThreshold, setFaceSizeThreshold] = useLocalStorage({
    key: 'faceSizeThreshold',
    defaultValue: 40
  })

  const [maxNumberOfFaces, setMaxNumberOfFaces] = useLocalStorage({
    key: 'maxNumberOfFaces',
    defaultValue: 20
  })

  const [displayWidth, setDisplayWidth] = useLocalStorage({
    key: 'displayWidth',
    defaultValue: 800
  })

  const [saveCaptions, setSaveCaptions] = useState(false)
  const [triggerRecognition, setTriggerRecognition] = useState(0) // Changed from getUserName
  const [loadingProgress, setLoadingProgress] = useState(null)
  const [isLoadingImages, setIsLoadingImages] = useState(false)

  // Setup progress listener
  useEffect(() => {
    const cleanup = window.electronAPI.onImageLoadingProgress((data) => {
      setLoadingProgress(data)
    })

    return cleanup
  }, [])

  // Monitor queue progress
  useEffect(() => {
    if (photoQueue.isProcessing) {
      const message = `${photoQueue.processedCount}/${photos.length} foto processate (${photoQueue.activeCount} in corso)`
      
      // Update notification every 5 photos
      if (photoQueue.processedCount > 0 && photoQueue.processedCount % 5 === 0) {
        notifications.show({
          id: 'queue-progress',
          title: '⚡ Riconoscimento in corso',
          message,
          color: 'blue',
          autoClose: 2000,
          loading: true
        })
      }
    } else if (photoQueue.processedCount > 0 && !photoQueue.isProcessing) {
      // Processing completed
      notifications.show({
        id: 'queue-complete',
        title: '✅ Riconoscimento completato!',
        message: `${photoQueue.processedCount} foto processate con successo`,
        color: 'green',
        autoClose: 4000
      })
    }
  }, [photoQueue.isProcessing, photoQueue.processedCount, photoQueue.activeCount, photos.length])

  const handleSelectFolder = useCallback(async () => {
    try {
      const folder = await window.electronAPI.selectDirectory()
      if (folder) setTargetFolder(folder)
      return folder
    } catch (error) {
      notifications.show({
        title: 'Errore',
        message: 'Impossibile selezionare la cartella',
        color: 'red'
      })
      return null
    }
  }, [setTargetFolder])

  const handleStartRecognition = useCallback(async () => {
    setSaveCaptions(false)
    setPhotos([])
    setLoadingProgress(null)
    setIsLoadingImages(true)
    
    try {
      const images = await window.electronAPI.listImages(targetFolder)
      
      if (!images || images.length === 0) {
        notifications.show({
          title: 'Attenzione',
          message: 'Nessuna immagine trovata nella cartella',
          color: 'yellow'
        })
        return
      }

      images[0].selected = true
      setPhotos(images)
      
      notifications.show({
        title: 'Caricamento completato',
        message: `${images.length} immagini caricate`,
        color: 'green',
        autoClose: 3000
      })
    } catch (error) {
      notifications.show({
        title: 'Errore',
        message: error.message || 'Errore durante il caricamento',
        color: 'red',
        icon: <IconExclamationCircle size={18} />
      })
    } finally {
      setIsLoadingImages(false)
      setLoadingProgress(null)
    }
  }, [targetFolder, setPhotos])

  // Must be declared BEFORE handleStartWorkflow (which uses it)
  const handleRefreshNames = useCallback(() => {
    // Clear any previous queue
    photoQueue.clearQueue()
    photoQueue.resetCounters()
    
    // Increment trigger to force re-render
    setTriggerRecognition(prev => prev + 1)
    
    notifications.show({
      title: '🔄 Riconoscimento in coda',
      message: `${photos.length} foto aggiunte alla coda di processamento`,
      color: 'blue',
      autoClose: 3000
    })
  }, [photos.length, photoQueue])

  const handleSaveCaptions = useCallback(() => {
    setSaveCaptions(true)
    setTimeout(() => setSaveCaptions(false), 1000)
  }, [])

  // 🚀 Combined handler that does everything!
  const handleStartWorkflow = useCallback(async () => {
    let folderToUse = targetFolder
    
    // Step 1: Select folder if not already selected
    if (!folderToUse) {
      notifications.show({
        title: 'Seleziona cartella',
        message: 'Scegli la cartella con le foto da analizzare',
        color: 'blue',
        autoClose: 2000
      })
      
      folderToUse = await handleSelectFolder()
      if (!folderToUse) {
        // User cancelled folder selection
        return
      }
    }
    
    // Step 2: Load images
    setSaveCaptions(false)
    setPhotos([])
    setLoadingProgress(null)
    setIsLoadingImages(true)
    
    try {
      const images = await window.electronAPI.listImages(folderToUse)
      
      if (!images || images.length === 0) {
        notifications.show({
          title: 'Attenzione',
          message: 'Nessuna immagine trovata nella cartella',
          color: 'yellow'
        })
        return
      }

      images[0].selected = true
      setPhotos(images)
      
      notifications.show({
        title: '✅ Immagini caricate!',
        message: `${images.length} immagini pronte. Avvio riconoscimento...`,
        color: 'green',
        autoClose: 2000
      })
      
      // Step 3: Start recognition automatically after a brief delay
      setTimeout(() => {
        handleRefreshNames()
        notifications.show({
          title: '🎯 Riconoscimento avviato',
          message: 'Analisi dei volti in corso...',
          color: 'blue',
          autoClose: 3000
        })
      }, 500)
      
    } catch (error) {
      notifications.show({
        title: 'Errore',
        message: error.message || 'Errore durante il caricamento',
        color: 'red',
        icon: <IconExclamationCircle size={18} />
      })
    } finally {
      setIsLoadingImages(false)
      setLoadingProgress(null)
    }
  }, [targetFolder, handleSelectFolder, setPhotos, handleRefreshNames])

  useHotkeys([
    ['ArrowLeft', selectPrevious],
    ['ArrowRight', selectNext],
    ['Shift+Enter', handleSaveCaptions]
  ])

  return (
    <>
      <AppShell.Navbar p="md" w={320}>
        <Sidebar
          users={users}
          targetFolder={targetFolder}
          onSelectFolder={handleSelectFolder}
          onStartRecognition={handleStartWorkflow}
          onRefreshNames={handleRefreshNames}
          onSaveCaptions={handleSaveCaptions}
          insightFaceServer={insightFaceServer}
          onServerChange={setInsightFaceServer}
          servers={INSIGHT_FACE_SERVERS}
          similarityThreshold={similarityThreshold}
          onSimilarityChange={setSimilarityThreshold}
          faceSizeThreshold={faceSizeThreshold}
          onFaceSizeChange={setFaceSizeThreshold}
          maxNumberOfFaces={maxNumberOfFaces}
          onMaxFacesChange={setMaxNumberOfFaces}
          stats={stats}
          disabled={loadingUsers}
          isLoadingImages={isLoadingImages}
        />
      </AppShell.Navbar>

      <AppShell.Main>
        <Box p="xl">
          {isLoadingImages && loadingProgress && (
            <Center mb="xl">
              <LoadingProgress 
                processed={loadingProgress.processed}
                total={loadingProgress.total}
                message="Caricamento immagini in corso..."
              />
            </Center>
          )}

          {!isLoadingImages && selectedPhoto ? (
            <PhotoViewer
              photo={selectedPhoto}
              photoIndex={selectedPhotoIndex}
              displayWidth={displayWidth}
              similarityThreshold={similarityThreshold}
              faceSizeThreshold={faceSizeThreshold}
              maxNumberOfFaces={maxNumberOfFaces}
              users={users}
              onPhotoUpdate={updatePhoto}
              supabase={supabase}
            />
          ) : !isLoadingImages ? (
            <Center h={600}>
              <Skeleton height={400} width={600} radius="md" />
            </Center>
          ) : null}

          {photos.length > 0 && !isLoadingImages && (
            <ScrollArea h={180} mt="xl">
              <div 
                className="myGallery"
                style={{ 
                  display: 'flex', 
                  gap: '8px',
                  padding: '16px 0'
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
                    users={users}
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
    </>
  )
}
