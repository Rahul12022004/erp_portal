import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type MainTab = "tc" | "bonafide" | "hall" | "nodue"
type HallTab = "individual" | "online"

export default function Downloads() {
  const [tab, setTab] = useState<MainTab>("tc")
  const [hallTab, setHallTab] = useState<HallTab>("individual")

  return (
    <div className="p-6 bg-gray-50 min-h-screen space-y-6">

      <h1 className="text-2xl font-semibold">Downloads</h1>

      {/* MAIN TABS */}
      <div className="flex gap-3 flex-wrap">
        {[
          { id: "tc", label: "Download TC" },
          { id: "bonafide", label: "Bonafide" },
          { id: "hall", label: "Hall Ticket" },
          { id: "nodue", label: "No Due Certificate" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id as MainTab)}
            className={`px-4 py-2 rounded-md text-sm font-medium transition
              ${
                tab === t.id
                  ? "bg-primary text-white"
                  : "bg-gray-200 hover:bg-gray-300"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ================= DOWNLOAD TC ================= */}
      {tab === "tc" && (
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Class Name" className="w-[200px]" />
          <Input placeholder="Student Name" className="w-[200px]" />

          <Button className="bg-primary hover:bg-primary-dark">
            Download TC
          </Button>
        </div>
      )}

      {/* ================= BONAFIDE ================= */}
      {tab === "bonafide" && (
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Student Name" className="w-[200px]" />
          <Input placeholder="Purpose" className="w-[200px]" />

          <Button className="bg-primary hover:bg-primary-dark">
            Generate Bonafide
          </Button>
        </div>
      )}

      {/* ================= HALL TICKET ================= */}
      {tab === "hall" && (
        <div className="space-y-4">

          {/* SUB TABS */}
          <div className="flex gap-3">
            <button
              onClick={() => setHallTab("individual")}
              className={`px-3 py-2 rounded-md text-sm
                ${
                  hallTab === "individual"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                }`}
            >
              Individual Hall Ticket
            </button>

            <button
              onClick={() => setHallTab("online")}
              className={`px-3 py-2 rounded-md text-sm
                ${
                  hallTab === "online"
                    ? "bg-primary text-white"
                    : "bg-gray-200"
                }`}
            >
              Online Individual Hall Ticket
            </button>
          </div>

          {/* INDIVIDUAL */}
          {hallTab === "individual" && (
            <div className="flex flex-wrap gap-4">
              <Input placeholder="Class Name" className="w-[200px]" />

              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Exam Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mid">Mid Term</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>

              <Input placeholder="Student Name" className="w-[200px]" />

              <Button className="bg-primary hover:bg-primary-dark">
                Search
              </Button>
            </div>
          )}

          {/* ONLINE */}
          {hallTab === "online" && (
            <div className="flex flex-wrap gap-4">
              <Input placeholder="Class Name" className="w-[200px]" />

              <Select>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select Exam Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="online">Online Exam</SelectItem>
                </SelectContent>
              </Select>

              <Input placeholder="Student Name" className="w-[200px]" />

              <Button className="bg-primary hover:bg-primary-dark">
                Search
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ================= NO DUE ================= */}
      {tab === "nodue" && (
        <div className="flex flex-wrap gap-4">
          <Input placeholder="Class Name" className="w-[200px]" />
          <Input placeholder="Student Name" className="w-[200px]" />

          <Button className="bg-primary hover:bg-primary-dark">
            Search
          </Button>
        </div>
      )}
    </div>
  )
}