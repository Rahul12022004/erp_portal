import { useState } from "react";

const tabs = [
  "Homework",
  "Lesson Plan",
  "Assignments",
  "Classwork",
  "Assignment",
];

const classes = ["Class 1", "Class 2", "Class 3", "Class 4"];

export default function AcademicsModule() {
  const [activeTab, setActiveTab] = useState("Classwork");
  const [selectedClass, setSelectedClass] = useState("Class 1");

  return (
    <div className="p-6">

      {/* HEADER + SELECT CLASS */}
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Academics</h2>

        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="border rounded-lg px-4 py-2"
        >
          {classes.map((cls) => (
            <option key={cls} value={cls}>
              {cls}
            </option>
          ))}
        </select>
      </div>

      {/* CARDS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {tabs.map((tab) => (
          <div
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`p-6 rounded-xl shadow-md cursor-pointer transition border ${
              activeTab === tab
                ? "bg-blue-500 text-white"
                : "bg-white hover:shadow-lg"
            }`}
          >
            <h4 className="text-lg font-semibold mb-2">{tab}</h4>

            <p className="text-sm opacity-80">
              Manage {tab.toLowerCase()} for {selectedClass}
            </p>
          </div>
        ))}
      </div>

      {/* ACTIVE TAB CONTENT */}
      <div className="mt-8 p-6 bg-white rounded-xl shadow">
        <h3 className="text-lg font-semibold mb-2">{activeTab}</h3>

        {activeTab === "Homework" && (
          <p>📘 Homework content for {selectedClass}</p>
        )}

        {activeTab === "Lesson Plan" && (
          <p>📅 Lesson plans for {selectedClass}</p>
        )}

        {activeTab === "Assignments" && (
          <p>📝 Assignments list for {selectedClass}</p>
        )}

        {activeTab === "Classwork" && (
          <p>📚 Classwork details for {selectedClass}</p>
        )}

        {activeTab === "Assignment" && (
          <p>📄 Single assignment view for {selectedClass}</p>
        )}
      </div>

    </div>
  );
}