import pandas as pd
import torch
import os

from fastapi import FastAPI, File, UploadFile, HTTPException
from transformers import AutoTokenizer, AutoModelForSequenceClassification

from fastapi.middleware.cors import CORSMiddleware


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins (you can restrict this to your frontend URL)
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods (GET, POST, etc.)
    allow_headers=["*"],  # Allow all headers
)


# Load your trained model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))  # Gets the backend directory
MODEL_PATH = os.path.join(BASE_DIR, "models", "further_trained_further_training_20250210_182333_acc_0.7381")
label_mapping = {"Negative": 0, "Neutral": 1, "Positive": 2, "Very Negative": 3, "Very Positive": 4}
inverse_label_mapping = {v: k for k, v in label_mapping.items()}


print(f"Loading model from: {MODEL_PATH}")
# Load tokenizer and model
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

def analyze_sentiment(text):
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    with torch.no_grad():
        outputs = model(**inputs)
    sentiment_class = torch.argmax(outputs.logits, dim=1).item()
    predicted_sentiment = inverse_label_mapping.get(sentiment_class, "Unknown")
    return predicted_sentiment  # Adjust this based on your label mapping

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
            raise HTTPException(status_code=400, detail="Unsupported file type")

        print(f"File loaded successfully. Columns: {df.columns.tolist()}")

        # Check for required columns
        required_columns = {"ID", "SurveyID", "Question", "SurveyAnswer", "Sentiment"}
        if not required_columns.issubset(df.columns):
            missing_columns = required_columns - set(df.columns)
            print(f"Missing columns: {missing_columns}")
            raise HTTPException(status_code=400, detail=f"Missing required columns: {missing_columns}")

        # Perform sentiment analysis
        print("Starting sentiment analysis...")
        df["PredictedSentiment"] = df["SurveyAnswer"].apply(analyze_sentiment)
        print("Sentiment analysis completed.")

        return {"message": "File processed successfully", "results": df.to_dict(orient="records")}

    except Exception as e:
        print(f"Error: {str(e)}")  # Print error to logs
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
