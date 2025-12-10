# Qwen-Image-Edit-2509 StreamDiffusion WebUI

Fast real-time image editing WebUI using Qwen-Image-Edit-2509 model.
Inspired by StreamDiffusion and StreamDiffusion2

## Speed Improvements

| Configuration | Time/Image | FPS |
|--------------|-----------|-----|
| Original (28 steps) | 114.7s | 0.009 fps |
| Optimized (4 steps) | 8.5s | 0.12 fps |
| Optimized (2 steps) | 4.1s | 0.24 fps |

**Achieved 14-28x speedup**

## Architecture

Two deployment options:

### Option 1: Gradio (Simple)
Single-file WebUI, good for single user testing.

### Option 2: Client-Server (Production)
Separated backend API and React frontend, supports multiple clients.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   React     │────▶│   FastAPI    │────▶│    GPU      │
│  Frontend   │◀────│   Backend    │◀────│   (A100)    │
└─────────────┘     └──────────────┘     └─────────────┘
   Port 3000           Port 8000            CUDA
```

## Requirements

- NVIDIA GPU (80GB VRAM recommended, e.g., A100)
- Python 3.11+
- CUDA 12.x
- Node.js 18+ (for React frontend)

## Installation

### Backend
```bash
pip install torch diffusers transformers accelerate fastapi uvicorn
```

### Frontend
```bash
cd frontend
npm install
```

## Usage

### Option 1: Gradio (Simple)
```bash
CUDA_VISIBLE_DEVICES=0 python webui_realtime.py
```
Open http://localhost:7865

### Option 2: Client-Server (Production)

1. Start API Server:
```bash
CUDA_VISIBLE_DEVICES=0 python server.py
```

2. Start React Frontend:
```bash
cd frontend
REACT_APP_API_URL=http://your-gpu-server:8000 npm start
```

For webcam access, HTTPS is required:
```bash
ngrok http 3000  # For frontend
```

## Features

- Real-time webcam image editing
- Image upload editing
- Two-image compositing with editing
- Custom prompts
- Multi-client support (with server.py)

## API Endpoints

- `GET /health` - Health check
- `POST /edit` - Edit image
  - `image`: Base64 encoded image
  - `prompt`: Edit instruction
  - `steps`: Inference steps (2-8)
  - `ref_image`: Optional reference image for compositing
  - `blend_ratio`: Blend ratio (0-1)

## Notes

- 1-step inference is numerically unstable (NaN), minimum 2 steps required
- Model size is approximately 67GB (transformer 58GB + VAE 9GB)
- Server queues requests - only one GPU inference at a time
