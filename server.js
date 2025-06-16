// server.js
const express = require('express');
const path = require('path');
const fs = require('fs'); // Node.js File System module for reading/writing files
const multer = require('multer'); // Middleware for handling file uploads
const { v4: uuidv4 } = require('uuid'); // For generating unique IDs

const app = express();
const port = process.env.PORT || 3000;

// --- IMPORTANT: Persistence Warning ---
// The 'uploads' directory and 'videos.json' will be stored on the server's
// ephemeral filesystem. This means ALL UPLOADED VIDEOS AND THEIR METADATA
// WILL BE LOST if the server restarts (e.g., due to inactivity, new deployments, etc.)
// For a production application, you MUST use a persistent cloud storage service
// (like AWS S3, Google Cloud Storage, DigitalOcean Spaces) for videos, and
// a persistent database (like PostgreSQL, MongoDB) for metadata.
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const VIDEOS_DB_PATH = path.join(__dirname, 'videos.json');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLODS_DIR);
}

// Initialize videos data (load from file or start empty)
let videos = [];
if (fs.existsSync(VIDEOS_DB_PATH)) {
    try {
        const data = fs.readFileSync(VIDEOS_DB_PATH, 'utf8');
        videos = JSON.parse(data);
        console.log(`Loaded ${videos.length} videos from ${VIDEOS_DB_PATH}`);
    } catch (err) {
        console.error(`Error reading videos.json: ${err.message}`);
        videos = [];
    }
}

// Helper to save videos data to JSON file
const saveVideosData = () => {
    try {
        fs.writeFileSync(VIDEOS_DB_PATH, JSON.stringify(videos, null, 2), 'utf8');
        console.log('Videos data saved to videos.json');
    } catch (err) {
        console.error(`Error writing videos.json: ${err.message}`);
    }
};

// --- Multer Storage Configuration ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Define where to store the uploaded files on the server's disk
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Generate a unique filename to prevent conflicts
        const uniqueSuffix = Date.now() + '-' + uuidv4();
        const fileExtension = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + fileExtension);
    }
});

// Create the Multer upload middleware instance
// 'videoFile' is the name of the input field in the HTML form that contains the file.
const upload = multer({
    storage: storage,
    limits: { fileSize: 1024 * 1024 * 500 } // Limit file size to 500MB (adjust as needed)
}).single('videoFile'); // Expecting a single file upload with field name 'videoFile'

// --- Express Middleware ---
app.use(express.json()); // For parsing JSON request bodies
app.use(express.urlencoded({ extended: true })); // For parsing URL-encoded request bodies

// Serve static files from the 'uploads' directory
// This route makes uploaded videos accessible via their URL (e.g., /uploads/myvideo.mp4)
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve all other static files from the root directory (where index.html is)
app.use(express.static(path.join(__dirname)));

// --- API Routes ---

// Route to handle video uploads
app.post('/upload', (req, res) => {
    upload(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            // A Multer error occurred when uploading.
            console.error('Multer Error:', err);
            return res.status(400).json({ success: false, message: `Upload failed: ${err.message}` });
        } else if (err) {
            // An unknown error occurred when uploading.
            console.error('Unknown Upload Error:', err);
            return res.status(500).json({ success: false, message: `An unknown error occurred during upload: ${err.message}` });
        }

        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No video file provided.' });
        }

        // Get video metadata from the request body
        const { title, description } = req.body;

        if (!title || title.trim() === '') {
            // Delete the uploaded file if title is missing
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error(`Error deleting unindexed file: ${unlinkErr.message}`);
            });
            return res.status(400).json({ success: false, message: 'Video title is required.' });
        }

        // Construct the URL for the uploaded video
        const videoUrl = `/uploads/${req.file.filename}`;
        const newVideo = {
            id: uuidv4(), // Generate a unique ID for the video
            title: title.trim(),
            description: description ? description.trim() : '',
            videoUrl: videoUrl,
            uploadedAt: new Date().toISOString(), // Use ISO string for date
            // In a real app, you'd add userId here, possibly from an auth system
            uploadedByUserId: 'anonymous_user', // Placeholder, implement real auth for this
            fileName: req.file.filename,
            fileType: req.file.mimetype,
            fileSize: req.file.size,
        };

        // Add the new video to our in-memory list and save to JSON file
        videos.push(newVideo);
        saveVideosData(); // Save to file immediately

        res.status(200).json({
            success: true,
            message: 'Video uploaded successfully!',
            video: newVideo
        });
        console.log(`Video uploaded: ${newVideo.title}`);
    });
});

// Route to get the list of all videos
app.get('/videos', (req, res) => {
    // Sort videos by uploadedAt in descending order (newest first) before sending
    const sortedVideos = [...videos].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    res.status(200).json({
        success: true,
        videos: sortedVideos
    });
    console.log('Video list requested.');
});

// Default route for the home page - serves index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// --- Start the Server ---
app.listen(port, () => {
  console.log(`BlipView server running on port ${port}`);
  console.log(`Open your browser to http://localhost:${port}`);
  console.warn('\n--- WARNING: Server-side storage is EPHEMERAL on Render.com ---');
  console.warn('All uploaded videos and their metadata will be LOST on server restarts.');
  console.warn('For persistent storage, use cloud object storage (e.g., AWS S3) and a persistent database (e.g., PostgreSQL).\n');
});
