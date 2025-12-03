import { contextBridge, ipcRenderer } from "electron";
import { electronAPI } from "@electron-toolkit/preload";

//const store = new Store()
// Custom APIs for renderer
const api = {};

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld("electron", electronAPI);
    contextBridge.exposeInMainWorld("api", api);
    contextBridge.exposeInMainWorld("electronAPI", {
      readDirectory: () => ipcRenderer.invoke("readDirectory"),
      listImages: (targetFolder) =>
        ipcRenderer.invoke("list-images", targetFolder),
      onImageLoadingProgress: (callback) => {
        ipcRenderer.on("image-loading-progress", (event, data) =>
          callback(data)
        );
        return () => ipcRenderer.removeAllListeners("image-loading-progress");
      },
      getImageData: (image) => ipcRenderer.invoke("getImageData", image),
      insightFaceDetection: (image, insightFaceServer) =>
        ipcRenderer.invoke("insightFaceDetection", image, insightFaceServer),
      matchMultipleFaces: (detectedFaces, users) =>
        ipcRenderer.invoke("matchMultipleFaces", detectedFaces, users),
      writeIptc: (targetFolder, photo, caption, options) =>
        ipcRenderer.invoke("writeIptc", targetFolder, photo, caption, options),
      handleEnrollPerson: (person) =>
        ipcRenderer.invoke("handleEnrollPerson", person),
      selectDirectory: () => ipcRenderer.invoke("selectDirectory"),
      selectLowResFolder: () => ipcRenderer.invoke("selectLowResFolder"),
      getAppVersion: () => ipcRenderer.invoke("getAppVersion"),
      detectFaces: (imagePath) => ipcRenderer.invoke("detect-faces", imagePath),
      checkRecognitionService: () =>
        ipcRenderer.invoke("check-recognition-service"),
      startRecognitionServer: () =>
        ipcRenderer.invoke("startRecognitionServer"),
    });
  } catch (error) {
    console.error(error);
  }
} else {
  window.electron = electronAPI;
  window.api = api;
}
