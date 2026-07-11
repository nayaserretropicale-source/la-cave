"use client";

import { useState } from "react";
import SegTabs from "@/components/SegTabs";
import ActuScreen from "@/components/screens/ActuScreen";
import PromosScreen from "@/components/screens/PromosScreen";

export default function Infos() {
  const [tab, setTab] = useState("actu");
  return (
    <>
      <div className="px-4 pt-2">
        <SegTabs
          options={[
            { key: "actu", label: "Actualités" },
            { key: "promos", label: "Bons plans" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "actu" ? <ActuScreen /> : <PromosScreen />}
    </>
  );
}
