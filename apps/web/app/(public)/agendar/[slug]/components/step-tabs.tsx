import { progressSteps } from "../booking-flow-config";
import type { Step } from "../booking-flow.types";

export function StepTabs({ step }: { step: Step }) {
  const progressIndex = progressSteps.indexOf(step as (typeof progressSteps)[number]);
  return (
    <div className="mt-3 flex gap-1">
      {progressSteps.map((item, index) => (
        <div
          key={item}
          className={`h-1.5 flex-1 rounded-full ${
            index <= progressIndex ? "bg-studio-green" : "bg-studio-light"
          }`}
        />
      ))}
    </div>
  );
}
