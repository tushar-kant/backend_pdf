const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const axios = require('axios');
const mongoose = require('mongoose');


const query = 'PROGRAMMING,css';


const app = express();
const port = process.env.PORT || 3030;
app.use(express.json());

// Multer storage configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Route for handling file uploads and PDF processing
app.post('/upload', upload.array('resume', 10), async (req, res) => {
    try {
        // Extract text from PDF for each uploaded file
        const files = req.files;
        const filePromises = files.map(async (file) => {
            const buffer = file.buffer;
            const data = await pdf(buffer);
            const text = data.text;

            // Store the extracted text in local storage
            const textFilePath = `uploads/${file.originalname}.txt`;
            fs.writeFileSync(textFilePath, text);

            // Store the original PDF file
            const pdfFilePath = `uploads/${file.originalname}`;
            fs.writeFileSync(pdfFilePath, buffer);

            return { pdfFilePath, textFilePath };
        });

        // Wait for all files to be processed
        const results = await Promise.all(filePromises);

        res.status(200).json({ 
            message: 'PDFs and text extracted and stored locally.',
            results: results
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.get('/download', (req, res) => {
    const { file } = req.query;
    const filePath = path.join(__dirname, 'uploads', file);

    // Check if the file exists
    if (!fs.existsSync(filePath)) {
        res.status(404).json({ error: 'File not found' });
        return;
    }

    // Set the appropriate content type for the response
    res.setHeader('Content-Type', 'application/octet-stream');
    // Set the Content-Disposition header to specify the file name
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);

    // Stream the file to the response
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);
});

app.post('/search', (req, res) => {
    const { queries } = req.body;
    console.log('Search queries:', queries);

    // Convert queries to an array if it's a single value
    const searchQueries = Array.isArray(queries) ? queries : [queries];

    // Array to store search results
    const results = [];

    // Read all files from the 'uploads' directory
    fs.readdir('uploads', (err, files) => {
        if (err) {
            console.error('Error reading files:', err);
            res.status(500).json({ error: 'Internal Server Error' });
            return;
        }

        // Loop through each file
        files.forEach(file => {
            // Read the content of each file
            const filePath = path.join('uploads', file);
            const content = fs.readFileSync(filePath, 'utf-8');

            // Check if the content contains all the query keywords
            // if (searchQueries.every(query => content.includes(query))) {
            //     // Store file name and add a download link
            //     const fileNameWithoutExtension = file.split('.').slice(0, -1).join('.');
            //     const downloadLink = `/download?file=${encodeURIComponent(fileNameWithoutExtension)}`;
            //     results.push({ file, downloadLink });
            // }
            if (searchQueries.every(query => content.toLowerCase().includes(query.toLowerCase()))) {
                // Store file name and add a download link
                const fileNameWithoutExtension = file.split('.').slice(0, -1).join('.');
                const downloadLink = `/download?file=${encodeURIComponent(fileNameWithoutExtension)}`;
                results.push({ file, downloadLink });
            }
        });

        // Send the search results to the client
        res.json({ results });
    });
});






// search(query);



// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});
