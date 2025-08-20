// components/SurvivorOptIn.tsx
"use client";
import SubscribeCta from "./SubscribeCta";

export default function SurvivorOptIn() {
  return (
    <SubscribeCta
      tag="survivor"
      source="/survivor"
      title="Survivor Reminder"
      subtitle="Get the safest pick + one spicy upset every Saturday."
      buttonLabel="Remind me"
      redirectToRefer={true}
    />
  );
}
