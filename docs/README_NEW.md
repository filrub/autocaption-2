# AutoCAPTION

Professional photo captioning tool with AI-powered facial recognition for photojournalists.

## Features

- 🎯 Automatic face detection using InsightFace
- 👤 Face recognition with Supabase database
- 📝 IPTC caption generation
- 🖼️ Batch image processing
- ⚡ Fast local or remote recognition server
- 💾 Persistent settings and preferences

## Tech Stack

- **Frontend**: Electron + React + Mantine UI
- **Backend**: FastAPI + InsightFace (Python)
- **Database**: Supabase
- **Image Processing**: Sharp, ExifTool

## Prerequisites

- Node.js 18+
- Python 3.9+
- ExifTool (system installation)

## Installation

1. Install dependencies:
```bash
npm install
```

2. Install Python dependencies:
```bash
pip install fastapi uvicorn numpy opencv-python insightface --break-system-packages
```

3. Set up environment variables:
Create a `.env` file:
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_key
```

## Development

Start the app in development mode:
```bash
npm run dev
```

Start the Python recognition server separately:
```bash
python src/main/recognition.py
```

## Building

Build for your platform:
```bash
# macOS
npm run build:mac

# Windows
npm run build:win

# Linux
npm run build:linux
```

## Recognition Server

The app includes a bundled Python server for face recognition. The server:
- Automatically starts with the app (production)
- Runs on port 8000
- Uses InsightFace (buffalo_l model)
- Supports both CPU and GPU (CUDA)

## Configuration

Settings are stored in:
- **Main settings**: localStorage
- **Lowres cache**: `~/Pictures/autocaption-lowres/`
- **Logs**: Standard Electron log locations

## Architecture

```
src/
├── main/           # Electron main process
│   ├── config/     # Configuration constants
│   ├── *-manager.js # Service managers
│   └── recognition.py # Python server
├── preload/        # IPC bridge
├── renderer/       # React UI
│   ├── components/
│   ├── hooks/
│   └── utils/
└── shared/         # Shared utilities
    └── utils/
```

## License

Proprietary - Filippo Rubin Fotografia
