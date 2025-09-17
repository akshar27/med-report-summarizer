"use client";
import { useState } from "react";

export default function Home() {
  const [file, setFile] = useState(null);
  const [patientView, setPatientView] = useState("");
  const [doctorView, setDoctorView] = useState(null);
  const [error, setError] = useState("");

  const handleUpload = async () => {
    if (!file) {
      setError("Please select a file first.");
      return;
    }
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errText = await res.text();
        setError(`Server error: ${errText}`);
        return;
      }

      const data = await res.json();
      console.log("Backend response:", data);

      setPatientView(data.patient_view || "No patient summary found");
      setDoctorView(data.doctor_view || {});
      setError("");
    } catch (err) {
      console.error("Upload failed:", err);
      setError("Failed to connect to backend.");
    }
  };

  // Helper to render patient summary nicely
  const renderPatientSummary = () => {
    if (!patientView) return null;

    return patientView.split("|").map((part, i) => {
      const isAbnormal = part.includes("⚠️");
      return (
        <div
          key={i}
          className={`p-3 my-2 rounded-md ${
            isAbnormal ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
          }`}
        >
          {part.trim()}
        </div>
      );
    });
  };

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">🧪 Medical Report Summarizer</h1>

      {/* File Upload */}
      <div className="mb-4">
        <input
          type="file"
          onChange={(e) => setFile(e.target.files[0])}
          className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-4
                     file:rounded-md file:border-0 file:text-sm file:font-semibold
                     file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100"
        />
      </div>

      <button
        onClick={handleUpload}
        className="bg-blue-600 text-white px-5 py-2 rounded-md hover:bg-blue-700"
      >
        Upload & Summarize
      </button>

      {/* Error */}
      {error && (
        <div className="mt-4 p-4 bg-red-200 text-red-800 rounded-md">
          {error}
        </div>
      )}

      {/* Patient View */}
      {patientView && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">👩‍⚕️ Patient View</h2>
          {renderPatientSummary()}
        </div>
      )}

      {/* Doctor View */}
      {doctorView && doctorView.response && (
  <div className="mt-8">
    <h2 className="text-2xl font-semibold mb-4">🩺 Doctor View</h2>
    <div className="overflow-x-auto">
      <table className="table-auto border-collapse w-full text-sm">
        <thead>
          <tr className="bg-gray-200 text-left">
            <th className="border px-4 py-2">Test</th>
            <th className="border px-4 py-2">Value</th>
            <th className="border px-4 py-2">Unit</th>
            <th className="border px-4 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {(() => {
            try {
              // Extract actual labs from the response JSON string
              const match = doctorView.response.match(/\{.*\}/s);
              if (!match) return null;
              const parsed = JSON.parse(match[0]);

              return parsed.labs.map((lab, i) => (
                <tr key={i}>
                  <td className="border px-4 py-2 font-medium">{lab.test}</td>
                  <td className="border px-4 py-2">{lab.value}</td>
                  <td className="border px-4 py-2">{lab.unit}</td>
                  <td
                    className={`border px-4 py-2 font-semibold ${
                      lab.status === "Abnormal"
                        ? "text-red-600"
                        : lab.status === "Normal"
                        ? "text-green-600"
                        : "text-gray-500"
                    }`}
                  >
                    {lab.status || "N/A"}
                  </td>
                </tr>
              ));
            } catch (e) {
              console.error("Parsing error:", e);
              return (
                <tr>
                  <td colSpan="4" className="text-center p-4 text-red-500">
                    Could not parse lab results.
                  </td>
                </tr>
              );
            }
          })()}
        </tbody>
      </table>
    </div>
  </div>
)}
    </main>
  );
}
