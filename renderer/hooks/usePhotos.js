import { useState, useCallback, useMemo } from 'react'

export function usePhotos() {
  const [photos, setPhotos] = useState([])

  const updatePhoto = useCallback((index, updates) => {
    setPhotos(prev => {
      const newPhotos = [...prev]
      newPhotos[index] = { ...newPhotos[index], ...updates }
      return newPhotos
    })
  }, [])

  const selectPhoto = useCallback((index) => {
    setPhotos(prev => prev.map((photo, i) => ({
      ...photo,
      selected: i === index
    })))
  }, [])

  const selectNext = useCallback(() => {
    setPhotos(prev => {
      const currentIndex = prev.findIndex(p => p.selected)
      const nextIndex = (currentIndex + 1) % prev.length
      return prev.map((photo, i) => ({
        ...photo,
        selected: i === nextIndex
      }))
    })
  }, [])

  const selectPrevious = useCallback(() => {
    setPhotos(prev => {
      const currentIndex = prev.findIndex(p => p.selected)
      const prevIndex = (currentIndex - 1 + prev.length) % prev.length
      return prev.map((photo, i) => ({
        ...photo,
        selected: i === prevIndex
      }))
    })
  }, [])

  const selectedPhoto = useMemo(() => 
    photos.find(p => p.selected), [photos]
  )

  const selectedPhotoIndex = useMemo(() => 
    photos.findIndex(p => p.selected), [photos]
  )

  const stats = useMemo(() => ({
    total: photos.length,
    indexed: photos.filter(p => p.faces?.length > 0).length,
    recognized: photos.filter(p => 
      p.faces?.some(f => f.recog === true)
    ).length,
    indexedPercent: photos.length ? 
      Math.round((photos.filter(p => p.faces?.length > 0).length / photos.length) * 100) : 0,
    recognizedPercent: photos.length ?
      Math.round((photos.filter(p => p.faces?.some(f => f.recog === true)).length / photos.length) * 100) : 0
  }), [photos])

  return {
    photos,
    setPhotos,
    updatePhoto,
    selectPhoto,
    selectNext,
    selectPrevious,
    selectedPhoto,
    selectedPhotoIndex,
    stats
  }
}
