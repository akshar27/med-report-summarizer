from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import requests
import uvicorn
import os
import json
import re

app = FastAPI()

# Allow frontend to call backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API key (best practice: store in .env, not hardcoded)
CARDINAL_API_KEY = os.getenv("CARDINAL_API_KEY")

# Reference ranges for lab values
reference_ranges = {
    "Glucose": (70, 110),
    "Cholesterol": (100, 200),
    "Hemoglobin": (12, 16),
}

@app.get("/")
def root():
    return {"message": "API is live"}

@app.post("/upload")
async def upload_report(file: UploadFile = File(...)):
    url = "https://api.trycardinal.ai/extract"
    headers = {"x-api-key": CARDINAL_API_KEY}

    # Form data for Cardinal
    form_data = {
        "schema": """
        {
          "patient": "string",
          "date": "string",
          "labs": [
            {"test": "string", "value": "number", "unit": "string"}
          ]
        }
        """,
        "fast": "false",
        "customContext": "Extract patient info and lab test values (Glucose, Cholesterol, Hemoglobin) into JSON format."
    }

    files = {
        "file": (file.filename, await file.read(), file.content_type)
    }

    response = requests.post(url, headers=headers, data=form_data, files=files)

    if response.status_code != 200:
        return {"error": response.text}

    data = response.json()
    print("Cardinal raw response:", data)  # Debug log

    # Try to parse embedded JSON inside "response"
    labs_data = []
    if "response" in data:
        # Remove ```json ... ``` wrappers if present
        match = re.search(r"\{.*\}", data["response"], re.DOTALL)
        if match:
            try:
                parsed = json.loads(match.group(0))
                labs_data = parsed.get("labs", [])
            except Exception as e:
                print("JSON parsing failed:", e)

    # Add normal/abnormal flags
    for lab in labs_data:
        low, high = reference_ranges.get(lab["test"], (None, None))
        if low and (lab["value"] < low or lab["value"] > high):
            lab["status"] = "Abnormal"
        else:
            lab["status"] = "Normal"

    # Build patient-friendly summary
    patient_summary = " | ".join(
        f"⚠️ {lab['test']} {lab['value']}{lab['unit']} abnormal"
        if lab["status"] == "Abnormal"
        else f"✅ {lab['test']} normal ({lab['value']}{lab['unit']})"
        for lab in labs_data
    ) if labs_data else "No lab results found in this file."

    return {
        "doctor_view": data,
        "patient_view": patient_summary,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
