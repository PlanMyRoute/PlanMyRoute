import { useState } from "react";
import { ExtendedInterest } from "@/components/interests/InterestSelector";

export function useTripPreferencesForm(
  initialInterests: ExtendedInterest[] = [],
) {
  const [selectedInterests, setSelectedInterests] =
    useState<ExtendedInterest[]>(initialInterests);
  const [travelStyle, setTravelStyle] = useState<
    "explorer" | "balanced" | "sedentary"
  >("balanced");

  const reset = () => {
    setSelectedInterests([]);
    setTravelStyle("balanced");
  };

  return {
    selectedInterests,
    setSelectedInterests,
    travelStyle,
    setTravelStyle,
    reset,
  };
}
