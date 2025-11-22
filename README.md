# Misinformation Detection Hub - Veritas

A fact-checking application that uses AI (Gemini API) to analyze claims and images for misinformation.

## Project Structure

```
veritas/
├── frontend/
│   ├── index.html       # Main UI
│   ├── script.js        # Frontend logic with Gemini API integration
│   └── README.md        # This file
└── backend/
    └── deepfake.py      # Python backend for image forensics (optional)
```

## Features

### ✅ Currently Implemented
- **AI-Powered Analysis**: Uses Google's Gemini API with web search grounding
- **Text Claim Checking**: Analyze any text claim for accuracy
- **Image Upload & Analysis**: Upload images for manipulation detection
- **Document Upload**: Support for .txt files
- **Source Verification**: Displays grounded sources from search results
- **Reverse Image Search**: Manual verification links for Google Images and TinEye
- **Real-time Loading Indicator**: Shows when analysis is in progress

### 🔧 Setup & Running

#### Prerequisites
- Python 3.x (with http.server module)
- Modern web browser
- Gemini API key (get one at https://aistudio.google.com)

#### Installation
1. Navigate to the project directory:
   ```powershell
   cd c:\Users\abraa\OneDrive\Desktop\veritas
   ```

2. Add your Gemini API key to `frontend/script.js` (line 3):
   ```javascript
   const API_KEY = "YOUR_GEMINI_API_KEY_HERE";
   ```

#### Running the Project
1. Start the HTTP server from the frontend directory:
   ```powershell
   cd frontend
   python -m http.server 8000
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:8000
   ```

## Usage

### Analyzing Text Claims
1. Paste a claim in the text area (minimum 10 characters)
2. Click "Analyze Content"
3. Wait for AI assessment and sources

### Analyzing Images
1. Click "Click to upload Image" 
2. Upload a JPEG or PNG file (max 4MB)
3. Optionally add a related text claim
4. Click "Analyze Content"

### Reverse Image Search (Manual)
1. Paste an image URL (http/https)
2. Click "Prepare Reverse Search Links"
3. Click Google Images or TinEye to verify the image source

## API & Technologies

- **Frontend**: HTML5, Tailwind CSS, Vanilla JavaScript
- **API**: Google Gemini 2.5 Flash with grounding (web search)
- **Backend Ready**: Flask + Python (image forensics - optional)

## Notes

- **API Key**: Required for functionality. Keep it private.
- **Video Analysis**: Currently limited to keyframe extraction
- **Rate Limiting**: Gemini API implements exponential backoff (max 5 retries)
- **Grounding**: Results are grounded in web search for accuracy

## Troubleshooting

### Analyze button not working
- Check that API key is set in `script.js`
- Verify internet connection
- Check browser console for errors (F12)

### Image upload not working
- Ensure file is JPEG or PNG
- File size must be under 4MB
- Check browser console for errors

### No sources appearing
- Sources come from Gemini API's web search grounding
- Some claims may not have grounded sources
- Try more specific claims

## Future Enhancements

- Backend deepfake detection integration
- Advanced image forensics
- Video frame extraction
- Database of verified claims
- User accounts and history
