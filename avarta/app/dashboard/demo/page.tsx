import PrototypeShowcase from "@/components/dashboard/PrototypeShowcase";
import PageHeading from "@/components/dashboard/PageHeading";

export default function DemoPage() {
  return (
    <>
      <PageHeading
        eyebrow="OPERATIONAL SIMULATION / LAB"
        title="Prototype Showcase & Scenario Simulator"
        blurb="Interactive multi-hazard physics simulations, Doppler radar eye models, hydrological hydrographs, and PINN spectral benchmarks."
      />
      <PrototypeShowcase />
    </>
  );
}
