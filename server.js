const express = require('express');
const multer = require('multer');
const fs = require('fs');
const pdf = require('pdf-parse');
const path = require('path');
const axios = require('axios');
const cors = require('cors');
const { time } = require('console');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config(); // Load environment variables from .env file



const query = 'PROGRAMMING,css';


const app = express();
const port = process.env.PORT || 3030;


app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors());

mongoose.connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB Atlas");
}).catch((err) => {
    console.error("Error connecting to MongoDB Atlas", err);
});

// Multer storage configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });



app.get("/", (req, res) => {
    res.send("Hello ,its working");
});
app.post('/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        // Find user by username and password
        const user = await User.findOne({ username, password });
        if (user) {
            res.status(200).json({ message: 'Login successful' });
        } else {
            res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/register', async (req, res) => {
    const { username, password, email } = req.body;

    try {
        // Check if the username or email already exists
        const existingUser = await User.findOne({ $or: [{ username }, { email }] });
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }

        // Create a new user instance
        const newUser = new User({ username, password, email });

        // Save the new user to the database
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Error during registration:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

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
app.get('/viewall', (req, res) => {
    // Array to store all file names and download links
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
            // Check if the file has a ".pdf" extension
            if (file.toLowerCase().endsWith('.pdf')) {
                // Create download link for each PDF file
                const downloadLink = `/download?file=${encodeURIComponent(file)}`;

                results.push({ file, downloadLink });
            }
        });

        // Send the list of all files with download links to the client
        res.json({ results });
    });
});



const dummyData = [

    { station: 'Station A', passenger_count: 50, time: '13:03:00' },
    { station: 'Station B', passenger_count: 60, time: '13:03:10' },
    { station: 'Station C', passenger_count: 70, time: '13:03:20' },
    { station: 'Station D', passenger_count: 55, time: '13:03:30' },
    { station: 'Station E', passenger_count: 45, time: '13:03:40' },
    { station: 'Station F', passenger_count: 40, time: '13:03:50' },
    { station: 'Station G', passenger_count: 65, time: '13:04:00' },
    { station: 'Station H', passenger_count: 75, time: '13:04:20' },
    { station: 'Station I', passenger_count: 80, time: '13:04:40' },
    { station: 'Station J', passenger_count: 70, time: '13:04:50' },
    { station: 'Station I', passenger_count: 60, time: '13:04:58' },
    // { station: 'Station J', passenger_count: 50, time: '13:18:00' },
    // { station: 'Station K', passenger_count: 40, time: '13:18:10' },
    // { station: 'Station L', passenger_count: 35, time: '13:18:20' },
    // { station: 'Station M', passenger_count: 30, time: '13:18:30' },
    // { station: 'Station N', passenger_count: 25, time: '13:18:40' },
    // { station: 'Station O', passenger_count: 20, time: '13:18:50' },
    // { station: 'Station P', passenger_count: 13, time: '13:19:00' },
    // { station: 'Station Q', passenger_count: 10, time: '13:19:10' },
    // { station: 'Station R', passenger_count: 55, time: '13:19:20' },
    // { station: 'Station S', passenger_count: 34, time: '13:19:30' },
    // { station: 'Station T', passenger_count: 60, time: '13:19:40' },
    // { station: 'Station U', passenger_count: 30, time: '15:19:50' },
    // { station: 'Station V', passenger_count: 10, time: '15:20:00' },
    // { station: 'Station W', passenger_count: 80, time: '15:20:10' },
    // { station: 'Station X', passenger_count: 55, time: '15:20:20' },
    // { station: 'Station Y', passenger_count: 60, time: '15:20:30' },
    // { station: 'Station Z', passenger_count: 25, time: '15:20:40' },

    // Add more stations and passenger counts as needed
];


let dataIndex = 0;

// Array of timings in ascending order
const timings = dummyData.map(entry => entry.time);


// API endpoint to serve one data entry at a time
app.get('/api/metro-data', (req, res) => {
    // Get the current time in 'hh:mm:ss' format
    const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false });


    // Get the dataset values for the current time
    const datasetValues = getDatasetForTime(currentTime, timings);

    // Create the current data entry
    const currentData = {
        station: 'Station ' + (datasetValues.indexOf(Math.max(...datasetValues)) + 1), // Get the station with maximum passengers
        passenger_count: Math.max(...datasetValues),
        time: currentTime
    };

    // Send the current data as the response
    res.json(currentData);
    console.log('Served data:', currentData);
});

// Function to get dataset values for the current time
function getDatasetForTime(currentTime, timings) {
    for (let i = 0; i < timings.length; i++) {
        if (currentTime >= timings[i] && currentTime < timings[i + 1]) {
            return getDatasetValuesForTime(i);

        }
    }
    return [0, 0, 0, 0, 0];
}

// Function to get dataset values based on index
function getDatasetValuesForTime(index) {
    const datasetValues = [];
    for (let i = 0; i < dummyData.length; i++) {
        if (i === index || i === index + 1) {
            datasetValues.push(dummyData[i].passenger_count);
        } else {
            datasetValues.push(0);
        }
    }
    return datasetValues;
}



// Start the server
app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});


