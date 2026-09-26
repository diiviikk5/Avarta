"""Spectral Fidelity and Power Spectral Density (PSD) Analysis.

Directly addresses the core thesis of MoES / NCMRWF Problem Statement #26078:
"standard deep learning models (like standard CNNs or U-Nets) suffer from
spectral smoothing—they tend to 'average out' spatial data, which destroys the
extreme amplitudes that forecasters actually need to track."

Computes:
1. 2D Fast Fourier Transform (FFT) of spatial fields
2. Radially integrated 1D Power Spectral Density E(k) vs spatial wavenumber k (km^-1)
3. Quantitative Spectral Amplitude Preservation Index comparing supplied
   fields. The bundled demonstration is an explicitly synthetic fixture, not
   output from the untrained diffusion architecture:
   - Coarse NWP (12 km)
   - Bilinear Interpolation (severe high-frequency roll-off / blurring)
   - Residual CNN (spectral smoothing at fine scales)
   - Generative Diffusion Downscaler (retains high-frequency power & sharp peaks)
   - High-Resolution Ground Truth
"""

from __future__ import annotations

from typing import Any, Dict, List, Tuple
import numpy as np


def compute_radial_psd(field: np.ndarray, dx_km: float = 5.0) -> Tuple[np.ndarray, np.ndarray]:
    """Compute radially averaged 1D Power Spectral Density using 2D Fast Fourier Transform.

    Args:
        field: 2D numpy array [H, W] of precipitation, wind, or temperature.
        dx_km: Spatial grid spacing in kilometers (default: 5.0 km).

    Returns:
        wavenumbers_k: Spatial frequencies k in km^-1.
        radial_psd: Radially averaged power spectrum E(k).
    """
    field = np.asarray(field, dtype=np.float64)
    H, W = field.shape

    # Detrend by subtracting mean and applying 2D Hann window to suppress edge spectral leakage
    mean_val = np.mean(field)
    window_y = np.hanning(H)
    window_x = np.hanning(W)
    window_2d = np.outer(window_y, window_x)
    windowed = (field - mean_val) * window_2d

    # 2D FFT and power spectrum
    fft_2d = np.fft.fft2(windowed)
    fft_shifted = np.fft.fftshift(fft_2d)
    power_2d = np.abs(fft_shifted) ** 2 / (H * W)

    # Frequency coordinates (cycles / km)
    freq_y = np.fft.fftshift(np.fft.fftfreq(H, d=dx_km))
    freq_x = np.fft.fftshift(np.fft.fftfreq(W, d=dx_km))
    ky, kx = np.meshgrid(freq_y, freq_x, indexing="ij")
    k_radial = np.sqrt(ky ** 2 + kx ** 2)

    # Bin radial power spectrum into discrete wavenumber intervals
    k_max = min(np.max(np.abs(freq_y)), np.max(np.abs(freq_x)))
    num_bins = min(H, W) // 2
    k_bins = np.linspace(0.005, k_max, num_bins)
    bin_centers = 0.5 * (k_bins[:-1] + k_bins[1:])
    radial_power = np.zeros(len(bin_centers), dtype=np.float64)

    for i in range(len(bin_centers)):
        mask = (k_radial >= k_bins[i]) & (k_radial < k_bins[i + 1])
        if np.any(mask):
            radial_power[i] = np.mean(power_2d[mask])
        else:
            radial_power[i] = 1e-12

    return bin_centers, radial_power


def evaluate_spectral_benchmark(
    ground_truth: np.ndarray,
    coarse_12km: np.ndarray,
    bilinear: np.ndarray,
    residual_cnn: np.ndarray,
    generative_diffusion: np.ndarray,
    dx_km: float = 5.0,
) -> Dict[str, Any]:
    """Calculate comparative spectral benchmark across all downscaling tiers.

    Returns wavenumber bins and dB power curves for UI plotting, plus
    the high-frequency Spectral Amplitude Preservation Index (SAPI).
    """
    k_bins, psd_true = compute_radial_psd(ground_truth, dx_km=dx_km)
    _, psd_coarse = compute_radial_psd(coarse_12km, dx_km=12.0)
    _, psd_bilinear = compute_radial_psd(bilinear, dx_km=dx_km)
    _, psd_cnn = compute_radial_psd(residual_cnn, dx_km=dx_km)
    _, psd_diff = compute_radial_psd(generative_diffusion, dx_km=dx_km)

    # Convert to decibels (10 * log10(P / P_ref))
    p_ref = max(1e-6, float(np.max(psd_true)))
    to_db = lambda p: [round(float(10.0 * np.log10(max(1e-12, val) / p_ref)), 2) for val in p]

    # Calculate High-Frequency Spectral Preservation Index (wavenumbers > 0.04 km^-1, wavelengths < 25 km)
    high_k_idx = k_bins >= 0.04
    true_high_power = float(np.sum(psd_true[high_k_idx])) if np.any(high_k_idx) else 1.0

    retention_bilinear = round(float(np.sum(psd_bilinear[high_k_idx])) / max(1e-9, true_high_power), 3)
    retention_cnn = round(float(np.sum(psd_cnn[high_k_idx])) / max(1e-9, true_high_power), 3)
    retention_diffusion = round(float(np.sum(psd_diff[high_k_idx])) / max(1e-9, true_high_power), 3)

    return {
        "wavenumbers_k": [round(float(k), 4) for k in k_bins],
        "wavelengths_km": [round(float(1.0 / max(1e-6, k)), 1) for k in k_bins],
        "psd_db": {
            "ground_truth": to_db(psd_true),
            "generative_diffusion": to_db(psd_diff),
            "residual_cnn": to_db(psd_cnn),
            "bilinear": to_db(psd_bilinear),
        },
        "preservation_metrics": {
            "diffusion_retention_ratio": retention_diffusion,
            "cnn_retention_ratio": retention_cnn,
            "bilinear_retention_ratio": retention_bilinear,
            "spectral_smoothing_resolved": bool(retention_diffusion >= 0.50 and retention_diffusion > retention_cnn * 2 and retention_bilinear < 0.10),
        },
        "scientific_interpretation": (
            "On this hand-constructed synthetic stress test, the diffusion-like candidate field "
            "retains more high-frequency power than the smoothed baselines. This validates the PSD "
            "metric and desired objective, not a trained diffusion model or real 5 km forecast skill."
        ),
    }


def generate_synthetic_spectral_case() -> Dict[str, Any]:
    """Generate reproducible fixture fields to exercise the spectral metric."""
    rng = np.random.default_rng(42)
    H, W = 64, 64

    # Synthetic sharp convective rain cell (cloudburst with 140 mm peak)
    y, x = np.ogrid[:H, :W]
    center_y, center_x = H // 2, W // 2
    r2 = (y - center_y) ** 2 + (x - center_x) ** 2

    # High-resolution true field: sharp core + fine turbulent eddies
    core = 140.0 * np.exp(-r2 / (2.0 * 4.0 ** 2))
    fine_turbulence = 25.0 * np.sin(x * 0.8) * np.cos(y * 0.8) + rng.normal(0, 4.0, (H, W))
    ground_truth = np.clip(core + fine_turbulence, 0.0, 160.0)

    # Coarse field: averaged over 4x4 blocks
    from scipy.ndimage import uniform_filter, zoom
    coarse_12km = uniform_filter(ground_truth, size=4)[::2, ::2]

    # Bilinear: upsampled coarse field (very smooth)
    bilinear = zoom(coarse_12km, 2.0, order=1)
    if bilinear.shape != (H, W):
        bilinear = bilinear[:H, :W]

    # CNN: slightly sharper than bilinear, but still attenuated high frequencies
    residual_cnn = np.clip(bilinear * 1.15 + uniform_filter(rng.normal(0, 3.0, (H, W)), size=2), 0.0, 110.0)

    # Generative Diffusion: retains high-frequency variance and sharp peak
    generative_diffusion = np.clip(bilinear * 0.85 + core * 0.5 + rng.normal(0, 5.0, (H, W)), 0.0, 155.0)

    result = evaluate_spectral_benchmark(
        ground_truth=ground_truth,
        coarse_12km=coarse_12km,
        bilinear=bilinear,
        residual_cnn=residual_cnn,
        generative_diffusion=generative_diffusion,
    )
    result["evidence_scope"] = "synthetic_metric_fixture"
    result["candidate_field"] = "hand_constructed_diffusion_like_field_not_model_output"
    result["validated_5km_skill"] = False
    return result
