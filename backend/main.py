import os
from datetime import datetime
import pandas as pd
import torch
import google.generativeai as genai
import json
import nltk
import re
import string

from nltk.corpus import stopwords
from collections import Counter
from typing import Optional
from pydantic import BaseModel

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

try:
    nltk.data.find('corpora/stopwords')
except LookupError:
    nltk.download('stopwords')

class WordCloudRequest(BaseModel):
    sentiment_filter: Optional[str] = "all"  # Options: "all", "negative", "positive", "neutral"
    max_words: Optional[int] = 100
    min_frequency: Optional[int] = 2

# Load your trained model
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, "models", "further_trained_further_training_20250210_182333_acc_0.7381")
label_mapping = {"Negative": 0, "Neutral": 1, "Positive": 2, "Very Negative": 3, "Very Positive": 4}
inverse_label_mapping = {v: k for k, v in label_mapping.items()}

print(f"Loading model from: {MODEL_PATH}")
tokenizer = AutoTokenizer.from_pretrained(MODEL_PATH)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_PATH)

GEMINI_API_KEY = "" # Your api key here
genai.configure(api_key=GEMINI_API_KEY)

gemini_model = genai.GenerativeModel('gemini-1.5-pro')

class SummaryRequest(BaseModel):
    focus: Optional[str] = "all"  # Options: "all", "negative", "positive", "neutral"
    max_issues: Optional[int] = 5

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
    
@app.get("/files/{filename}")
def get_file_data(filename: str):
    try:
        # Validate filename to prevent path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid filename"}
            )
        
        # Build the path to the file
        file_path = os.path.join(BASE_DIR, "uploads", "analyzed_files", filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "File not found"}
            )
        
        # Load the file content based on extension
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Unsupported file type"}
            )
        
        # Basic statistics about the file
        predictions_count = {}
        if "PredictedSentiment" in df.columns:
            predictions_count = df["PredictedSentiment"].value_counts().to_dict()
        
        # Convert DataFrame to records for JSON response
        file_data = df.to_dict(orient="records")
        
        return {
            "status": "success", 
            "filename": filename,
            "total_records": len(df),
            "predictions_summary": predictions_count,
            "data": file_data
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
@app.post("/files/{filename}/summary")
def generate_file_summary(filename: str, request: SummaryRequest):
    try:
        # Validate filename to prevent path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid filename"}
            )
        
        # Build the path to the file
        file_path = os.path.join(BASE_DIR, "uploads", "analyzed_files", filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "File not found"}
            )
        
        # Load the file content based on extension
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Unsupported file type"}
            )
        
        # Filter data based on focus if needed
        filtered_df = df
        if request.focus != "all":
            sentiment_col = "PredictedSentiment" if "PredictedSentiment" in df.columns else "Sentiment"
            if request.focus == "negative":
                filtered_df = df[df[sentiment_col].isin(["Negative", "Very Negative"])]
            elif request.focus == "positive":
                filtered_df = df[df[sentiment_col].isin(["Positive", "Very Positive"])]
            elif request.focus == "neutral":
                filtered_df = df[df[sentiment_col] == "Neutral"]
        
        # Prepare data for Gemini
        survey_data = filtered_df.to_dict(orient="records")
        
        # Create a prompt for Gemini
        prompt = f"""
        You are analyzing customer survey data with sentiment analysis. The data contains the following fields:
        - SurveyID: Identifier for the survey
        - Question: The question asked
        - SurveyAnswer: Customer's response
        - Sentiment: Original sentiment (if available)
        - PredictedSentiment: AI-predicted sentiment
        
        Focus: {request.focus}
        
        Based on the survey answers, please provide:
        1. A summary of the key themes or patterns in the feedback
        2. The top {request.max_issues} specific issues mentioned by customers
        3. Any actionable insights or recommendations
        4. Notable positive feedback (if any)
        
        Format your response as JSON with the following structure:
        {{
            "key_themes": ["theme1", "theme2", ...],
            "main_issues": [
                {{"issue": "Issue description", "sentiment": "Negative/Positive", "frequency": "High/Medium/Low", "quotes": ["example quote"]}}
            ],
            "actionable_insights": ["insight1", "insight2", ...],
            "positive_highlights": ["highlight1", "highlight2", ...],
            "summary": "Overall summary paragraph"
        }}
        
        Here is the survey data (limited to {len(survey_data)} records):
        {json.dumps(survey_data[:100])}  # Limit to 100 records for token constraints
        """
        
        # Call Gemini API
        response = gemini_model.generate_content(prompt)
        
        try:
            # Try to parse the response as JSON
            analysis_result = json.loads(response.text)
        except json.JSONDecodeError:
            # If Gemini doesn't return proper JSON, extract what we can
            analysis_result = {
                "raw_response": response.text,
                "summary": "Could not parse structured data. See raw response."
            }
        
        return {
            "status": "success", 
            "filename": filename,
            "focus": request.focus,
            "total_records_analyzed": len(filtered_df),
            "analysis": analysis_result
        }
        
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )
    
@app.get("/files/{filename}/wordcloud")
def generate_wordcloud_data(
    filename: str, 
    sentiment_filter: str = "all", 
    max_words: int = 100, 
    min_frequency: int = 2
):
    try:
        # Validate filename to prevent path traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Invalid filename"}
            )
        
        # Build the path to the file
        file_path = os.path.join(BASE_DIR, "uploads", "analyzed_files", filename)
        
        # Check if file exists
        if not os.path.exists(file_path):
            return JSONResponse(
                status_code=404,
                content={"status": "error", "message": "File not found"}
            )
        
        # Load the file content based on extension
        if filename.endswith(".csv"):
            df = pd.read_csv(file_path)
        elif filename.endswith((".xlsx", ".xls")):
            df = pd.read_excel(file_path)
        else:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "Unsupported file type"}
            )
        
        # Filter by sentiment if specified
        if sentiment_filter != "all":
            sentiment_col = "PredictedSentiment" if "PredictedSentiment" in df.columns else "Sentiment"
            if sentiment_filter == "negative":
                df = df[df[sentiment_col].isin(["Negative", "Very Negative"])]
            elif sentiment_filter == "positive":
                df = df[df[sentiment_col].isin(["Positive", "Very Positive"])]
            elif sentiment_filter == "neutral":
                df = df[df[sentiment_col] == "Neutral"]
        
        # Make sure we have survey answers to analyze
        if "SurveyAnswer" not in df.columns or df.empty:
            return JSONResponse(
                status_code=400,
                content={"status": "error", "message": "No survey answers found to analyze"}
            )
        
        # Combine all survey answers into a single text corpus
        text_corpus = " ".join(df["SurveyAnswer"].astype(str).tolist())
        
        # Preprocess text
        # Convert to lowercase
        text_corpus = text_corpus.lower()
        
        # Remove punctuation
        text_corpus = re.sub('[' + string.punctuation + ']', ' ', text_corpus)
        
        # Remove numbers
        text_corpus = re.sub(r'\d+', '', text_corpus)
        
        # Tokenize
        words = text_corpus.split()
        
        # Remove stop words
        stop_words = set(stopwords.words('english'))
        custom_stop_words = {'im', 'dont', 'didnt', 'cant', 'wont', 'wasnt', 
                            'ive', 'ill', 'thats', 'its', 'amp', 'us', 'please',
                            'would', 'also', 'still', 'even', 'get', 'got', 'said',
                            'one', 'two', 'three', 'first', 'second'}  # Add custom stop words
        stop_words.update(custom_stop_words)
        
        filtered_words = [word for word in words if word not in stop_words and len(word) > 2]
        
        # Count word frequencies
        word_counts = Counter(filtered_words)
        
        # Filter by minimum frequency and take top N words
        common_words = [
            {"text": word, "value": count}
            for word, count in word_counts.most_common(max_words)
            if count >= min_frequency
        ]
        
        return {
            "status": "success",
            "filename": filename,
            "sentiment_filter": sentiment_filter,
            "total_words_analyzed": len(filtered_words),
            "unique_words": len(word_counts),
            "wordcloud_data": common_words
        }
        
    except Exception as e:
        print(f"Error generating wordcloud: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"status": "error", "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    print("Starting FastAPI server...")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)
