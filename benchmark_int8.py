#!/usr/bin/env python3
"""
Benchmark INT8 quantization for Qwen-Image-Edit-2509
"""
import os
os.environ['CUDA_VISIBLE_DEVICES'] = '7'

import torch
import time
from PIL import Image
from diffusers import QwenImageEditPlusPipeline
from diffusers.quantizers import PipelineQuantizationConfig
from transformers import BitsAndBytesConfig

torch.backends.cudnn.benchmark = True

def benchmark(pipeline, name, steps=4, runs=5):
    """Run benchmark and return average time"""
    dummy = Image.new('RGB', (512, 512), color='gray')

    # Determine device from pipeline
    device = next(pipeline.transformer.parameters()).device
    gen_device = 'cpu' if device.type == 'cpu' else device

    # Warmup
    print(f"  Warming up {name}... (device: {device})")
    with torch.no_grad():
        for _ in range(2):
            _ = pipeline(
                image=[dummy],
                prompt="test",
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=steps,
                guidance_scale=1.0,
            )
    if device.type == 'cuda':
        torch.cuda.synchronize()

    # Benchmark
    times = []
    for i in range(runs):
        if device.type == 'cuda':
            torch.cuda.synchronize()
        start = time.time()
        with torch.no_grad():
            _ = pipeline(
                image=[dummy],
                prompt="oil painting style",
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=steps,
                guidance_scale=1.0,
            )
        if device.type == 'cuda':
            torch.cuda.synchronize()
        elapsed = time.time() - start
        times.append(elapsed)
        print(f"    Run {i+1}: {elapsed:.3f}s")

    avg = sum(times) / len(times)
    print(f"  {name}: avg={avg:.3f}s, min={min(times):.3f}s, max={max(times):.3f}s")
    return avg


def main():
    print("=" * 60)
    print("INT8 Quantization Benchmark")
    print("=" * 60)

    # INT8 quantization config for diffusers pipeline
    quantization_config = PipelineQuantizationConfig(
        quant_backend="bitsandbytes_8bit",
        quant_kwargs={"llm_int8_threshold": 6.0},  # Default threshold
        components_to_quantize=["transformer"],  # Only quantize the transformer
    )

    print("\n[1] Loading with INT8 quantization...")
    try:
        pipeline = QwenImageEditPlusPipeline.from_pretrained(
            "Qwen/Qwen-Image-Edit-2509",
            quantization_config=quantization_config,
            torch_dtype=torch.bfloat16,
        )

        mem = torch.cuda.max_memory_allocated() / 1e9
        print(f"  GPU Memory: {mem:.2f} GB")

        int8_time = benchmark(pipeline, "INT8 (8-bit)")

        # Save a test image to check quality
        dummy = Image.new('RGB', (512, 512), color='gray')
        with torch.no_grad():
            result = pipeline(
                image=[dummy],
                prompt="oil painting of a landscape",
                generator=torch.Generator(device='cuda').manual_seed(42),
                true_cfg_scale=4.0,
                negative_prompt=" ",
                num_inference_steps=4,
                guidance_scale=1.0,
            )
        result.images[0].save("/mnt/raid6/project/stream/test_int8_output.jpg")
        print("  Test image saved to test_int8_output.jpg")

    except Exception as e:
        print(f"  INT8 failed: {e}")
        import traceback
        traceback.print_exc()
        return

    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)
    print(f"INT8 (4 steps): {int8_time:.3f}s")
    print(f"Compare with baseline bf16: ~9.5s")
    print(f"Speedup: {9.5/int8_time:.2f}x")


if __name__ == "__main__":
    main()
