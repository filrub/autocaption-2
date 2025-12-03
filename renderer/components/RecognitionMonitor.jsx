import { ActionIcon, Tooltip, Loader } from "@mantine/core";
import {
  IconAlertCircle,
  IconCloudCheck,
  IconServerBolt,
} from "@tabler/icons-react";
import { useRecognitionService } from "../hooks/useRecognitionService";
import { useEffect } from "react";

export default function RecognitionMonitor({ serverUrl }) {
  const { status, isLocalServer } = useRecognitionService(serverUrl);

  // Add pulse animation CSS
  useEffect(() => {
    if (!document.getElementById("recognition-monitor-styles")) {
      const styleSheet = document.createElement("style");
      styleSheet.id = "recognition-monitor-styles";
      styleSheet.textContent = `
        @keyframes pulse-opacity {
          0% { opacity: 1; }
          50% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        .pulse-animation {
          animation: pulse-opacity 1.5s ease-in-out infinite;
        }
      `;
      document.head.appendChild(styleSheet);
    }
  }, []);

  const serverType = isLocalServer ? "locale" : "remoto";

  // Checking state - show spinner
  if (status === "checking") {
    return (
      <Tooltip
        label={`Connessione al server ${serverType}...`}
        position="right"
        withArrow
      >
        <ActionIcon
          size="sm"
          color="blue"
          variant="light"
          radius="xl"
          aria-label="Connessione in corso"
        >
          <Loader size={12} color="blue" />
        </ActionIcon>
      </Tooltip>
    );
  }

  // Healthy state - show cloud/server icon
  if (status === "healthy") {
    const Icon = isLocalServer ? IconServerBolt : IconCloudCheck;
    return (
      <Tooltip
        label={`Server ${serverType} connesso`}
        position="right"
        withArrow
      >
        <ActionIcon
          size="sm"
          color="green"
          variant="filled"
          radius="xl"
          aria-label="Server connesso"
        >
          <Icon size={14} />
        </ActionIcon>
      </Tooltip>
    );
  }

  // Error state - show alert with pulse
  return (
    <Tooltip
      label={`Server ${serverType} non disponibile`}
      position="right"
      withArrow
    >
      <ActionIcon
        size="sm"
        color="red"
        variant="light"
        radius="xl"
        aria-label="Server non disponibile"
        className="pulse-animation"
      >
        <IconAlertCircle size={14} />
      </ActionIcon>
    </Tooltip>
  );
}
