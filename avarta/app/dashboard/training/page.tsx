import TrainingLab from "@/components/dashboard/TrainingLab";
import PageHeading from "@/components/dashboard/PageHeading";

export default function TrainingPage() {
  return (
    <>
      <PageHeading
        eyebrow="05 // NEURAL ARCHITECTURE &amp; ML LAB"
        title="AI Core &amp; Live Training Engine"
        blurb="Audit real-time PyTorch forward-backward passes, icosahedral message-passing GNNs, generative diffusion denoising, and verifiable model checkpoints."
      />
      <TrainingLab />
    </>
  );
}
