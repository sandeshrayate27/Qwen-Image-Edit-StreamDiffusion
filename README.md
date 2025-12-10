# Qwen-Image-Edit-2509 StreamDiffusion WebUI

Fast real-time image editing WebUI using Qwen-Image-Edit-2509 model.
Inspired by StreamDiffusion and StreamDiffusion2

Work in Progress

## Speed Improvements

| Configuration | Time/Image | FPS | Speedup |
|--------------|-----------|-----|---------|
| Original (28 steps) | 114.7s | 0.009 fps | 1x |
| Optimized (4 steps) | 9.5s | 0.11 fps | 12x |
| + torch.compile | 6.9s | 0.14 fps | 17x |
| **Lightning LoRA (2 steps)** | **5.6s** | **0.18 fps** | **20x** |

**Achieved 20x speedup** with Lightning LoRA optimization

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
   Port 3000           Port 8086            CUDA
                    (torch.compile)
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
REACT_APP_API_URL=http://your-gpu-server:8086 npm start
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
- Lightning LoRA (lightx2v/Qwen-Image-Lightning) provides stable 5.6s inference
- torch.compile is incompatible with LoRA (causes recompilation issues)

## Python Files

### Core Application

| File | Description |
|------|-------------|
| `server.py` | FastAPI backend server with Lightning LoRA. Handles GPU inference, CORS, request queuing |
| `webui_realtime.py` | Gradio WebUI for single-user webcam/image editing |
| `qwen_realtime.py` | StreamDiffusion2-style acceleration pipeline with latent caching and temporal consistency |

### Pipeline Implementations

| File | Description |
|------|-------------|
| `cached_pipeline.py` | Cached pipeline - reuses prompt/image embeddings for repeated inference |
| `cached_pipeline_v2.py` | Improved cached pipeline with VLM (Vision Language Model) cache support |
| `batched_cfg_pipeline.py` | Batched CFG - combines cond/uncond passes into single batch for ~1.5-1.7x speedup |
| `parallel_cfg_pipeline.py` | Parallel CFG using 2 GPUs (GPU6: cond, GPU7: uncond) with CUDA streams |
| `parallel_cfg_v2.py` ~ `parallel_cfg_v8.py` | Iterative improvements to parallel CFG implementation |
| `parallel_cfg_int8.py` | Parallel CFG with INT8 quantization |
| `parallel_cfg_int8_v2.py` | Improved parallel CFG with INT8 |

### Quantization

| File | Description |
|------|-------------|
| `int8_linear.py` | INT8 Linear layer using cuBLAS Lt GEMM. ~50% memory reduction |
| `int8_memory_optimized.py` | Memory-optimized INT8 implementation |
| `quantize_transformer.py` | Script to replace nn.Linear with Int8Linear in transformer |
| `cublaslt_int8.py` | INT8 GEMM using cuBLAS Lt via CuPy for Tensor Core acceleration |
| `triton_int8_gemm.py` | Triton kernel for fused INT8 GEMM (quantize + matmul + dequantize) |
| `triton_int8_gemm_v2.py` | Improved Triton INT8 GEMM kernel |

### Benchmarks

| File | Description |
|------|-------------|
| `benchmark_lightning.py` | Benchmark Lightning LoRA for faster inference |
| `benchmark_lightning_compile.py` | Benchmark Lightning LoRA with torch.compile |
| `benchmark_compile.py` | Benchmark torch.compile with max-autotune mode |
| `benchmark_optimizations.py` | General optimization benchmarks |
| `benchmark_bnb.py` | Benchmark BitsAndBytes NF4 quantization |
| `benchmark_bnb_int8.py` | Benchmark BitsAndBytes INT8 quantization |
| `benchmark_bnb_int8_v2.py` | Improved BitsAndBytes INT8 benchmark |
| `benchmark_nunchaku.py` | Benchmark Nunchaku INT4 quantization |
| `benchmark_cached.py` | Benchmark cached pipeline performance |
| `benchmark_vision_cache.py` | Benchmark VLM cache effectiveness |
| `benchmark_batched_cfg.py` | Benchmark batched CFG pipeline |
| `benchmark_batched_cfg_impl.py` | Batched CFG implementation benchmark |
| `benchmark_parallel_cfg.py` | Benchmark parallel CFG (2-GPU) |
| `benchmark_parallel_cfg_v2.py` ~ `benchmark_parallel_cfg_v6.py` | Parallel CFG benchmark variants |
| `benchmark_parallel_cfg_e2e.py` | End-to-end parallel CFG benchmark |
| `benchmark_parallel_cfg_int8.py` | Parallel CFG with INT8 benchmark |
| `benchmark_parallel_simple.py` | Simplified parallel benchmark |
| `benchmark_int8.py` | INT8 quantization benchmark |
| `benchmark_int8_v2.py` | Improved INT8 benchmark |
| `benchmark_int8_quantization.py` | INT8 quantization accuracy test |
| `benchmark_int8_only.py` | INT8-only inference benchmark |
| `benchmark_int8_speed.py` | INT8 speed comparison |
| `benchmark_torch_int_mm.py` | Benchmark torch._int_mm for INT8 matmul |

### Utilities & Tests

| File | Description |
|------|-------------|
| `compare_cfg_quality.py` | Compare image quality: True CFG vs No CFG (side-by-side) |
| `test_qwen_edit.py` | Basic Qwen-Image-Edit model test |
| `test_gpu_speed.py` | GPU speed test |
| `test_gpu_direct.py` | Direct GPU access test |
| `test_minimal.py` | Minimal inference test |
| `test_quantized.py` | Quantized model test |
| `test_compiled.py` | torch.compile test |
| `test_vlm_cache.py` | VLM cache functionality test |

## Acknowledgements

This project builds upon the following excellent works:

- **[StreamDiffusionV2](https://streamdiffusionv2.github.io/)** - A streaming system for dynamic and interactive video generation
- **[StreamDiffusion](https://github.com/cumulo-autumn/StreamDiffusion)** - Pipeline-level solution for real-time interactive generation
- **[Qwen-Image-Edit-2509](https://huggingface.co/Qwen/Qwen-Image-Edit-2509)** - Image editing model by Qwen team
- **[Qwen-Image-Lightning](https://huggingface.co/lightx2v/Qwen-Image-Lightning)** - Lightning LoRA for fast 2-step inference

## Citation

If you use this project, please cite the following works:

### StreamDiffusionV2
```bibtex
@article{feng2025streamdiffusionv2,
  title={StreamDiffusionV2: A Streaming System for Dynamic and Interactive Video Generation},
  author={Feng, Tianrui and Li, Zhi and Yang, Shuo and Xi, Haocheng and Li, Muyang and Li, Xiuyu and Zhang, Lvmin and Yang, Keting and Peng, Kelly and Han, Song and others},
  journal={arXiv preprint arXiv:2511.07399},
  year={2025}
}
```

### StreamDiffusion
```bibtex
@article{kodaira2023streamdiffusion,
  title={StreamDiffusion: A Pipeline-level Solution for Real-time Interactive Generation},
  author={Akio Kodaira and Chenfeng Xu and Toshiki Hazama and Takanori Yoshimoto and Kohei Ohno and Shogo Mitsuhori and Soichi Sugano and Hanying Cho and Zhijian Liu and Kurt Keutzer},
  year={2023},
  eprint={2312.12491},
  archivePrefix={arXiv},
  primaryClass={cs.CV}
}
```

### Qwen-Image
```bibtex
@misc{wu2025qwenimagetechnicalreport,
  title={Qwen-Image Technical Report},
  author={Wu, Chenfei and Li, Jiahao and Zhou, Jingren and others},
  year={2025},
  eprint={2508.02324},
  archivePrefix={arXiv},
  primaryClass={cs.CV}
}
```

## License

Apache License 2.0
