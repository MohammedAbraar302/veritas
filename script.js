const API_KEY = "AIzaSyDqdbUBSRTctYcOPtroP8sPTVvGptZY7K8";
let uploadedFileBase64 = null;
let uploadedFileMimeType = null;
let uploadedFileName = null;
let isFileUploaded = false;

// Utility function to convert file to Base64
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// --- FILE UPLOAD HANDLER ---
async function handleFileUpload(event) {
    const file = event.target.files[0];
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const imagePreview = document.getElementById('imagePreview');
    const claimInput = document.getElementById('claimInput');
    
    uploadedFileBase64 = null;
    uploadedFileMimeType = null;
    isFileUploaded = false;
    imagePreview.classList.add('hidden');

    if (!file) {
        fileNameDisplay.textContent = "Click to upload Image (.jpg, .png) or Text Document (.txt)";
        return;
    }

    uploadedFileName = file.name;
    fileNameDisplay.textContent = `File Ready: ${uploadedFileName}`;
    
    // Check file type
    if (file.type.startsWith('image/')) {
        // Handle Image
        if (file.size > 4 * 1024 * 1024) { // 4MB limit for easy processing
            alert('Image file is too large. Please use an image smaller than 4MB.');
            event.target.value = '';
            fileNameDisplay.textContent = "Image too large. Please choose a smaller file.";
            return;
        }
        
        const base64DataUrl = await fileToBase64(file);
        const [mime, base64] = base64DataUrl.split(',');
        
        uploadedFileBase64 = base64;
        uploadedFileMimeType = file.type;
        isFileUploaded = true;
        
        imagePreview.src = base64DataUrl;
        imagePreview.classList.remove('hidden');
        claimInput.placeholder = "Optional: Add a text claim related to this image (e.g., 'This photo shows the President signing the bill').";
        claimInput.value = '';

    } else if (file.type === 'text/plain') {
        // Handle Text Document
        isFileUploaded = true;
        
        const reader = new FileReader();
        reader.onload = function(e) {
            claimInput.value = e.target.result;
            claimInput.placeholder = "Text content loaded from file.";
        };
        reader.readAsText(file);
    
    } else if (file.type.startsWith('video/')) {
        // Handle Video - Provide guidance
         alert('Video files cannot be automatically analyzed by this tool. Please manually extract a keyframe (image) and upload the image instead.');
         event.target.value = ''; // Clear file input
         fileNameDisplay.textContent = "Video detected. Please upload a keyframe image instead.";
         return;

    } else {
        // Handle unsupported files
        alert('Unsupported file type. Please upload a JPEG, PNG image, or a TXT document.');
        event.target.value = '';
        fileNameDisplay.textContent = "Unsupported file type. Please choose a different file.";
        return;
    }
}


// --- CORE ANALYSIS FUNCTION (Gemini API Call) ---
async function analyzeContent() {
    const claimInput = document.getElementById('claimInput');
    const claim = claimInput.value.trim();
    const resultContainer = document.getElementById('resultContainer');
    const analysisResult = document.getElementById('analysisResult');
    const sourceList = document.getElementById('sourceList');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const checkButton = document.getElementById('checkButton');
    const errorMessage = document.getElementById('errorMessage');

    // Reset UI
    resultContainer.classList.add('hidden');
    loadingIndicator.classList.add('hidden');
    errorMessage.classList.add('hidden');
    analysisResult.textContent = '';
    sourceList.innerHTML = '';
    checkButton.disabled = true;

    const isImageAnalysis = uploadedFileBase64 && uploadedFileMimeType;
    const isTextAnalysis = claim.length > 10;
    
    if (!isImageAnalysis && !isTextAnalysis) {
        errorMessage.textContent = "Please enter a claim (min 10 characters) OR upload an image.";
        errorMessage.classList.remove('hidden');
        checkButton.disabled = false;
        return;
    }

    loadingIndicator.classList.remove('hidden');

    const systemPrompt = `You are a dedicated and impartial fact-checking AI. Your task is to analyze the content provided (text claim or image/text combination) using the provided Google Search results (grounding). Based ONLY on the evidence, determine the accuracy of the content.
    1. State your final assessment clearly (e.g., "VERIFIED", "UNVERIFIED", "MISLEADING", "FALSE", or "VISUAL ASSESSMENT").
    2. If an image is provided, first describe the image content and comment on any visual anomalies that suggest manipulation.
    3. Provide a concise explanation of *why* you reached that conclusion, referencing the evidence found.
    4. Do not introduce outside knowledge not present in the search results.
    5. Format your response in clear paragraphs.`;
    
    let userQueryParts = [];

    if (isImageAnalysis) {
         userQueryParts.push({ 
            text: `Analyze this image for signs of manipulation, visual inconsistencies, and provide a grounded assessment of its original context or any claims associated with it.` 
        });
        userQueryParts.push({
            inlineData: {
                mimeType: uploadedFileMimeType,
                data: uploadedFileBase64
            }
        });
        if (claim.length > 0) {
            userQueryParts.push({ text: `Also, specifically check the following text claim in relation to the image: "${claim}"` });
        }
    } else {
        userQueryParts.push({ text: `Analyze the accuracy of the following claim:\n\nCLAIM: "${claim}"` });
    }

    const payload = {
        contents: [{ parts: userQueryParts }],
        tools: [{ "google_search": {} }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
    };

    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`;
    
    // Exponential backoff retry logic
    const MAX_RETRIES = 5;
    let attempt = 0;
    let response;
    
    while (attempt < MAX_RETRIES) {
        try {
            response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.status === 429) {
                const delay = Math.pow(2, attempt) * 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                attempt++;
                continue;
            }

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            break;

        } catch (e) {
            errorMessage.textContent = `An error occurred during the API request: ${e.message}`;
            loadingIndicator.classList.add('hidden');
            checkButton.disabled = false;
            return;
        }
    }
    
    loadingIndicator.classList.add('hidden');
    checkButton.disabled = false;

    try {
        const result = await response.json();
        const candidate = result.candidates?.[0];

        if (candidate && candidate.content?.parts?.[0]?.text) {
            const text = candidate.content.parts[0].text;
            analysisResult.textContent = text;
            
            // 1. Extract grounding sources
            let sources = [];
            const groundingMetadata = candidate.groundingMetadata;
            if (groundingMetadata && groundingMetadata.groundingAttributions) {
                sources = groundingMetadata.groundingAttributions
                    .map(attribution => ({
                        uri: attribution.web?.uri,
                        title: attribution.web?.title,
                    }))
                    .filter(source => source.uri && source.title);
            }

            // 2. Display sources
            if (sources.length > 0) {
                sources.forEach(source => {
                    const li = document.createElement('li');
                    const a = document.createElement('a');
                    a.href = source.uri;
                    a.target = "_blank";
                    a.className = "text-primary hover:underline";
                    a.textContent = `${source.title} (${source.uri})`;
                    li.appendChild(a);
                    sourceList.appendChild(li);
                });
            } else {
                sourceList.innerHTML = '<li>No specific web sources were directly cited to ground this response.</li>';
            }

            resultContainer.classList.remove('hidden');

        } else {
            errorMessage.textContent = "AI analysis failed to return a valid response. This often happens if the claim is too vague or the file upload was unsuccessful.";
            errorMessage.classList.remove('hidden');
        }

    } catch (e) {
        errorMessage.textContent = `Error processing response: ${e.message}`;
        errorMessage.classList.remove('hidden');
    }
}

// --- Manual Reverse Search Logic (Kept from previous version) ---
function runReverseSearch() {
    const imageUrl = document.getElementById('imageUrl').value.trim();
    const messageElement = document.getElementById('visMessage');
    const linksContainer = document.getElementById('searchLinks');
    const linkIds = ['googleLink', 'tineyeLink'];

    // Clear previous states
    messageElement.classList.add('hidden');
    linksContainer.classList.add('hidden');
    
    linkIds.forEach(id => {
        const link = document.getElementById(id);
        link.removeAttribute('href');
    });


    // Simple validation
    if (!imageUrl || (!imageUrl.startsWith('http://') && !imageUrl.startsWith('https://'))) {
        messageElement.classList.remove('hidden');
        return;
    }

    // URL encoding the image URL is crucial
    const encodedUrl = encodeURIComponent(imageUrl);

    // 1. Google Reverse Image Search (using the 'url' parameter)
    const googleSearchUrl = `https://www.google.com/searchbyimage?image_url=${encodedUrl}&encoded_image=&image_content=&filename=&hl=en`;
    document.getElementById('googleLink').href = googleSearchUrl;
    
    // 2. TinEye Reverse Image Search
    const tineyeSearchUrl = `https://www.tineye.com/search?url=${encodedUrl}`;
    document.getElementById('tineyeLink').href = tineyeSearchUrl;
    
    // Show links
    linksContainer.classList.remove('hidden');
    // Using alert for preparation notice, as this is legacy/manual section
    alert('Links prepared! Click the Google Images or TinEye links to perform the search in a new tab.');
}

// Initialize the links and file listeners on page load
document.addEventListener('DOMContentLoaded', () => {
    // Set default href to '#' on load for the links
    document.getElementById('googleLink').href = '#';
    document.getElementById('tineyeLink').href = '#';

    // Attach listener for file input change
    document.getElementById('fileInput').addEventListener('change', handleFileUpload);
});