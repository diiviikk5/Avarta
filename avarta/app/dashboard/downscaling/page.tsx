import { DownscaleEnhanced } from "@/components/dashboard/DownscaleEnhanced";
import PageHeading from "@/components/dashboard/PageHeading";

export default function DownscalingPage() {
  return (
    <>
      <PageHeading
        eyebrow="08 / HYPER-LOCAL 12 KM → 5 KM"
        title="Downscaling & Spectral Analysis"
        blurb="Generative diffusion downscaling preserving extreme amplitudes, 2D FFT Power Spectral Density benchmark, and rural agricultural decision support."
      />
      <DownscaleEnhanced />
    </>
  );
}
