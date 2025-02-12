import os
from datetime import datetime
import pandas as pd
import torch

from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from transformers import AutoTokenizer, AutoModelForSequenceClassification
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load your trained model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "further_trained_further_training_20250210_182333_acc_0.7381")
label_mapping = {"Negative": 0, "Neutral": 1, "Positive": 2, "Very Negative": 3, "Very Positive": 4}
inverse_label_mapping = {v: k for k, v in label_mapping.items()}

print(f"Loading model from: {MODEL_PATH}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

def analyze_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    sentiment_class = torch.argmax(outputs.logits, dim=1).item()
    predicted_sentiment = inverse_label_mapping.get(sentiment_class, "Unknown")
    return predicted_sentiment

@app.get("/")
def home():
    return {"message": "FastAPI is running"}

@app.post("/upload/")
async def upload_file(file: UploadFile = File(...)):
    try:
        print(f"Received file: {file.filename}")

        # Read file into DataFrame
        if file.filename.endswith(".csv"):
            df = pd.read_csv(file.file)
        elif file.filename.endswith(".xlsx"):
            df = pd.read_excel(file.file)
        else:
            print("Unsupported file type")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Unsupported file type"},
            )

        print(f"File loaded successfully. Columns: {df.columns.tolist()}")

        # Check for required columns
        required_columns = {"ID", "SurveyID", "Question", "SurveyAnswer", "Sentiment"}
        if not required_columns.issubset(df.columns):
            missing_columns = required_columns - set(df.columns)
            print(f"Missing columns: {missing_columns}")
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": f"Missing required columns: {missing_columns}"},
            )

        # Perform sentiment analysis
        print("Starting sentiment analysis...")
        df["PredictedSentiment"] = df["SurveyAnswer"].apply(analyze_sentiment)
        print("Sentiment analysis completed.")

        # Save the analyzed file to /uploads/analyzed_files
        upload_dir = os.path.join(BASE_DIR, "uploads", "analyzed_files")
        os.makedirs(upload_dir, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d%H%M%S")
        base_filename, ext = os.path.splitext(file.filename)
        if ext.lower() == ".csv":
            new_filename = f"{base_filename}_{timestamp}_analyzed.csv"
            save_path = os.path.join(upload_dir, new_filename)
            df.to_csv(save_path, index=False)
        elif ext.lower() in [".xlsx", ".xls"]:
            new_filename = f"{base_filename}_{timestamp}_analyzed.xlsx"
            save_path = os.path.join(upload_dir, new_filename)
            df.to_excel(save_path, index=False)
        else:
            # Fallback to CSV if file extension is not as expected
            new_filename = f"{base_filename}_{timestamp}_analyzed.csv"
            save_path = os.path.join(upload_dir, new_filename)
            df.to_csv(save_path, index=False)

        print(f"Analyzed file saved to: {save_path}")

        return {"status": "success", 
                "message": "File processed successfully", 
                "results": df.to_dict(orient="records"),
                "analyzed_file": new_filename}

    except Exception as e:
        print(f"Error: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)},
        )

@app.get("/files/")
def list_analyzed_files():
    try:
        upload_dir = os.path.join(BASE_DIR, "uploads", "analyzed_files")
        if not os.path.exists(upload_dir):
            return {"status": "success", "files": []}

        file_names = os.listdir(upload_dir)
        # Optionally filter only analyzed files (e.g., check suffix)
        analyzed_files = [f for f in file_names if "analyzed" in f]
        return {"status": "success", "files": analyzed_files}
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)