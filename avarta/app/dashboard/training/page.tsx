import TrainingLab from "@/components/dashboard/TrainingLab";
import PageHeading from "@/components/dashboard/PageHeading";

export default function TrainingPage() {
  return (
    <>
      <PageHeading
        eyebrow="05 // NEURAL ARCHITECTURE &amp; ML LAB"
        title="AI Core Readiness Lab"
        blurb="Inspect measured checkpoint history, run real PyTorch gradient probes, explore the spherical ensemble GNN, and audit the Stage 2 diffusion path without confusing architecture tests with trained skill."
      />
      <TrainingLab />
    </>
  );
}
