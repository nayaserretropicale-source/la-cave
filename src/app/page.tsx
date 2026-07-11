"use client";

import { useState } from "react";
import SegTabs from "@/components/SegTabs";
import CaveScreen from "@/components/screens/CaveScreen";
import JournalScreen from "@/components/screens/JournalScreen";

export default function Home() {
  const [tab, setTab] = useState("cave");
  return (
    <>
      <div className="px-4 pt-2">
        <SegTabs
          options={[
            { key: "cave", label: "Ma cave" },
            { key: "journal", label: "Journal" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "cave" ? <CaveScreen /> : <JournalScreen />}
    </>
  );
}
