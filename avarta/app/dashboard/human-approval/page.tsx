import HumanApprovalConsole from "@/components/dashboard/HumanApprovalConsole";
import PageHeading from "@/components/dashboard/PageHeading";

export default function HumanApprovalPage() {
  return <>
    <PageHeading eyebrow="09 / HUMAN-IN-THE-LOOP COMMAND AUTHORITY" title="Action approval console" blurb="LangGraph checkpoints hold every high-consequence intervention until a named duty officer approves, modifies, or rejects it."/>
    <HumanApprovalConsole/>
  </>;
}
