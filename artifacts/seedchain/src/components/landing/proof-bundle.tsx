import type { LandingProps } from "./shared";
import { Closing, CustomerExperience, FarmerPassport, Intelligence } from "./proof";

export default function ProofBundle(props: LandingProps) {
  return (
    <>
      <FarmerPassport {...props} />
      <Intelligence {...props} />
      <CustomerExperience {...props} />
      <Closing />
    </>
  );
}
