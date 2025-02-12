# Company Project

This project consists of a sentiment analysis system with a FastAPI backend and a Next.js frontend.

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/saalim-k/company_project.git
cd company_project
```

### 2. Create and Activate Virtual Environment (Linux/macOS)
```bash
python -m venv sentiment_env
source sentiment_env/bin/activate
```
For Windows:
```powershell
python -m venv sentiment_env
sentiment_env\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

## Running the Backend
To start the FastAPI backend, run:
```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

## Running the Frontend
Navigate to the `frontend` directory and install dependencies:
```bash
cd frontend
npm install
```
Then, start the development server:
```bash
npm run dev
```
The frontend will be available at [http://localhost:3000](http://localhost:3000).

## Project Structure
```
company_project/
│── backend/         # FastAPI Backend
│── frontend/        # Next.js Frontend
│── training/        # Model Training Scripts
│── .gitignore       # Git Ignore File
│── .gitattributes   # Git LFS Tracking
│── requirements.txt # Python Dependencies
│── README.md        # Project Documentation
```

## Notes
- The backend serves a sentiment analysis API.
- The frontend provides a UI for uploading data and viewing sentiment analysis results.
- `.safetensors` model files are tracked using Git LFS.

## Contributors
- **Mohamed Saalim** ([saalim-k](https://github.com/saalim-k))

