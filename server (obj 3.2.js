// server.js - Local Node.js Express REST API Gateway
const express = require('express');
const axios = require('axios');
const app = express();

// Allow large payloads (up to 50MB for video binary streams)
app.use(express.json({ limit: '50mb' }));

// MASID System Configurations
const API_SECRET_TOKEN = 'MASID_SECRET_AUTH_KEY_2026'; // Secret key between RPi5 and Backend
const BUNNY_STORAGE_ZONE = 'masid-video-evidence';       // Storage Zone Name
const BUNNY_API_KEY = 'YOUR_BUNNY_ACCESS_KEY_HERE';     // Paste your Access Key from FTP & API Access tab
const BUNNY_HOST = 'sg.storage.bunnycdn.com';           // Singapore Endpoint

/**
 * Task 3.2 Endpoint: Secure Video Upload Gateway
 */
app.post('/api/v1/upload-video', async (req, res) => {
    try {
        const authHeader = req.headers['x-masid-auth'];

        // 1. Authenticate request from Raspberry Pi 5
        if (!authHeader || authHeader !== API_SECRET_TOKEN) {
            return res.status(401).json({ success: false, message: 'Unauthorized: Invalid API Key' });
        }

        const { fileName, videoBase64, timestamp, location, sha256Hash } = req.body;

        if (!fileName || !videoBase64) {
            return res.status(400).json({ success: false, message: 'Missing video file or payload' });
        }

        // Convert base64 string back to raw binary video buffer
        const videoBuffer = Buffer.from(videoBase64, 'base64');

        // 2. Upload raw binary stream directly to Bunny.net Singapore Storage Zone
        const bunnyUploadUrl = `https://${BUNNY_HOST}/${BUNNY_STORAGE_ZONE}/${fileName}`;

        const response = await axios.put(bunnyUploadUrl, videoBuffer, {
            headers: {
                'AccessKey': BUNNY_API_KEY,
                'Content-Type': 'application/octet-stream'
            },
            maxBodyLength: Infinity,
            maxContentLength: Infinity
        });

        if (response.status === 201 || response.status === 200) {
            const cdnUrl = `https://masid-cdn.b-cdn.net/${fileName}`;
            console.log(`\n[SUCCESS] Uploaded to Bunny SG PoP: ${fileName}`);
            console.log(`[SHA-256 HASH]: ${sha256Hash}`);
            console.log(`[CDN LINK]: ${cdnUrl}\n`);

            return res.status(200).json({
                success: true,
                message: 'Video successfully authenticated & uploaded to Bunny.net SG PoP',
                videoUrl: cdnUrl,
                hash: sha256Hash,
                timestamp: timestamp,
                location: location
            });
        }
    } catch (error) {
        console.error('[API ERROR]:', error.response ? error.response.data : error.message);
        return res.status(500).json({ success: false, error: error.message });
    }
});

// Start local API server on port 5000
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`====================================================`);
    console.log(`  MASID Node.js API Server Running Locally!         `);
    console.log(`  Listening on Port: ${PORT}                        `);
    console.log(`====================================================`);
});
