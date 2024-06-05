const express = require('express');
const multer = require('multer');
const pdf = require('pdf-parse');
const cors = require('cors');
const { log } = require('console');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const ExcelJS = require('exceljs');  // Add this line to import ExcelJS


const User = require('./models/user');
const File = require('./models/file');

const connectDB = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const fileRoutes = require('./routes/fileRoutes');



require('dotenv').config(); // Load environment variables from .env file

// Connect to MongoDB
connectDB();

const app = express();
const port = process.env.PORT || 3030;


app.use(express.json());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());


// Multer storage configuration for handling file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });


app.get("/", (req, res) => {
    res.send("Hello ,its working");
});
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);
function extractPhoneNo(text) {
    const match = text.match(/Phone\s*(.*)/);
    if (match) {
        return match[1].trim();
    } else {
        // If "Phone" is not present, extract consecutive 10 numbers
        const matchNumbers = text.match(/\d{10}/);
        return matchNumbers ? matchNumbers[0] : 'Unknown';
    }
}

function extractEmail(text) {
    const match = text.match(/Email\s*(.*)/);
    if (match) {
        return match[1].trim();
    } else {
        // If "Email" is not present, extract anything with @gmail.com
        const matchEmail = text.match(/\b[A-Za-z0-9._%+-]+@gmail\.com\b/);
        return matchEmail ? matchEmail[0] : 'Unknown';
    }
}

// Route for handling file uploads and PDF processing
app.post('/upload', upload.array('resume', 10), async (req, res) => {
    try {
        // Extract text from PDF for each uploaded file
        const files = req.files;
        const dob = req.body.dob; // Assuming DOB is sent in the request body
        const ctc = req.body.ctc; // Assuming DOB is sent in the request body

        const experience = req.body.experience; // Assuming experience is sent in the request body
        const filePromises = files.map(async (file) => {
            const buffer = file.buffer;
            const data = await pdf(buffer);
            const text = data.text;
            console.log(text);
            const phoneNo = extractPhoneNo(text); // Extract phone number
            const email = extractEmail(text); // Extract email
            console.log('Phone No:', phoneNo);
            // Store the original PDF file in MongoDB
            const newFile = new File({
                filename: file.originalname,
                contentType: file.mimetype,
                data: buffer,
                dob, // Storing DOB
                experience,
                phoneNo: phoneNo,
                email: email,// Storing email
                CTC: ctc
            });
            await newFile.save();

            // Store the extracted text in MongoDB
            // const newTextFile = new File({
            //     filename: `${file.originalname}.txt`,
            //     contentType: 'text/plain',
            //     data: Buffer.from(text, 'utf-8')
            // });
            // await newTextFile.save();

            return { pdfFile: newFile };
        });

        // Wait for all files to be processed
        const results = await Promise.all(filePromises);

        res.status(200).json({
            message: 'PDFs and text extracted and stored in MongoDB.',
            results: results
        });
    } catch (error) {
        console.error('Error processing upload:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.get('/download', async (req, res) => {
    try {
        const { file } = req.query;

        // Find the file in MongoDB by filename
        const foundFile = await File.findOne({ filename: file });

        // If the file is not found, return a 404 error
        if (!foundFile) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Set the appropriate content type for the response
        res.setHeader('Content-Type', foundFile.contentType);

        // Set the Content-Disposition header to specify the file name
        res.setHeader('Content-Disposition', `attachment; filename="${file}"`);

        // Send the file data in the response
        res.send(foundFile.data);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});
app.post('/search', async (req, res) => {
    const { queries, searchOption, experience, ctc } = req.body; // Include experience and ctc in the request body
    console.log('Search queries:', queries);
    try {
        const pdfFiles = await File.find({ contentType: 'application/pdf' });
        const results = [];
        for (const pdfFile of pdfFiles) {
            const text = await pdf(pdfFile.data);
            let isMatched = true; // Flag to check if the document matches all filters

            // Check if the text content contains all the query keywords
            if (searchOption === 'allKeywords') {
                if (!queries.every(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
                    isMatched = false; // If any query keyword is not found, set isMatched to false
                }
            } else if (searchOption === 'anyKeyword') {
                if (!queries.some(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
                    isMatched = false; // If none of the query keywords is found, set isMatched to false
                }
            }
            if (experience) {
                if (parseInt(pdfFile.experience) < parseInt(experience)) {
                    console.log('Experience:', pdfFile.experience, 'Query Experience:', experience);
                    isMatched = false;
                }
            }
            

            if (ctc) {
                if (parseInt(pdfFile.CTC) > parseInt(ctc)) {
                    console.log('CTC:', pdfFile.CTC, 'Query CTC:', ctc);
                    isMatched = false;
                }
            }
            
            // If all filters are matched, add document to results
            if (isMatched) {
                results.push({
                    fileName: pdfFile.filename,
                    downloadLink: `/download?file=${encodeURIComponent(pdfFile.filename)}`
                });
            }
        }
        // Send the search results to the client
        res.json({ results });
    } catch (error) {
        console.error('Error searching PDF files:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// app.post('/search', async (req, res) => {
//     const { queries, searchOption } = req.body;
//     console.log('Search queries:', queries);

//     try {
//         // Retrieve PDF files from MongoDB
//         const pdfFiles = await File.find({ contentType: 'application/pdf' });

//         // Array to store search results
//         const results = [];

//         // Loop through each PDF file
//         for (const pdfFile of pdfFiles) {
//             // Extract text from the PDF file
//             const text = await pdf(pdfFile.data);

//             // Check if the text content contains all the query keywords
//             if (searchOption === 'allKeywords') {
//                 // Check if the text content contains all the query keywords
//                 if (queries.every(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
//                     // Store file name and add a download link
//                     results.push({
//                         fileName: pdfFile.filename,
//                         downloadLink: `/download?file=${encodeURIComponent(pdfFile.filename)}`
//                     });
//                 }
//             }
//             else if (searchOption === 'anyKeyword') {
//                 // Check if the text content contains at least one common keyword
//                 if (queries.some(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
//                     // Store file name and add a download link
//                     results.push({
//                         fileName: pdfFile.filename,
//                         downloadLink: `/download?file=${encodeURIComponent(pdfFile.filename)}`
//                     });
//                 }
//             }
//         }

//         // Send the search results to the client
//         res.json({ results });
//     } catch (error) {
//         console.error('Error searching PDF files:', error);
//         res.status(500).json({ error: 'Internal Server Error' });
//     }
// });
function extractName(text) {
    const match = text.match(/^\s*(\S+\s+\S+)/); // Match the first two non-space words
    return match ? match[1].trim() : 'Unknown';
}


function extractIndustry(text) {
    const match = text.match(/Industry\s*(.*)/);
    return match ? match[1].trim() : 'Unknown';
}

function extractOrgLast(text) {
    const match = text.match(/PROFESSIONAL EXPERIENCE(?:.|\n)*?Project Name\s*:\s*(.*)/);
    return match ? match[1].trim() : 'Unknown';
}

function extractPosition(text) {
    const match = text.match(/WORK EXPERIENCE(?:.|\n)*?Project Role\s*:\s*(.*)/);
    return match ? match[1].trim() : 'Unknown';
}

function extractLocation(text) {
    const match = text.match(/(?:Place|Address)\s*(.*)/);
    return match ? match[1].trim() : 'Unknown';
}

function extractCtc(text) {
    const match = text.match(/CTC \s*(.*)/);
    return match ? match[1].trim() : 'Unknown';
}




app.post('/download-excel', async (req, res) => {
    const { queries, searchOption, experience, ctc } = req.body;

    try {
        const pdfFiles = await File.find({ contentType: 'application/pdf' });

        const results = [];

        for (const pdfFile of pdfFiles) {
            const text = await pdf(pdfFile.data);
            let isMatched = true; // Flag to check if the document matches all filters

            // const name = extractName(text.text);
            const industry = extractIndustry(text.text);
            const orgLast = extractOrgLast(text.text);
            const position = extractPosition(text.text);
            const location = extractLocation(text.text);
            const ctc = extractCtc(text.text);
            if (searchOption === 'allKeywords') {
                if (!queries.every(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
                    isMatched = false; // If any query keyword is not found, set isMatched to false
                }
            } else if (searchOption === 'anyKeyword') {
                if (!queries.some(query => text.text.toLowerCase().includes(query.toLowerCase()))) {
                    isMatched = false; // If none of the query keywords is found, set isMatched to false
                }
            }
            if (experience && parseInt(pdfFile.experience) > parseInt(experience)) {
                console.log('Experience:', pdfFile.experience, 'Query Experience:', experience);
                isMatched = false;
            }
            

            // Check if CTC filter is provided and document meets the criteria
            if (ctc && parseInt(pdfFile.CTC) < parseInt(ctc)) {
                console.log('CTC:', pdfFile.CTC, 'Query CTC:', ctc);
                isMatched = false;
            }
            if (isMatched) {
                results.push({
                    fileName: pdfFile.filename,
                    experience: pdfFile.experience,
                    phone_no: pdfFile.phoneNo,
                    email: pdfFile.email,
                    dob: pdfFile.dob,
                    location: extractLocation(text.text),
                    ctc: pdfFile.CTC
                });
            }
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Search Results');

        worksheet.columns = [
            { header: 'PDF Name', key: 'fileName', width: 30 },
            { header: 'Experience', key: 'experience', width: 30 },
            { header: 'Phone No', key: 'phone_no', width: 30 },
            { header: 'Email', key: 'email', width: 30 },
            { header: 'DOB', key: 'dob', width: 30 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'CTC', key: 'ctc', width: 30 }

        ];
        results.forEach(result => {
            worksheet.addRow(result);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=search_results.xlsx');

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error('Error generating Excel file:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

const dummyData = [
    { station: 'Station A', passenger_count: 50, time: '15:45:00' },
    { station: 'Station B', passenger_count: 60, time: '15:45:10' },
    { station: 'Station C', passenger_count: 70, time: '15:45:20' },
    { station: 'Station D', passenger_count: 55, time: '15:45:30' },
    { station: 'Station E', passenger_count: 45, time: '15:45:40' },
    { station: 'Station F', passenger_count: 40, time: '15:45:50' },
    { station: 'Station G', passenger_count: 65, time: '15:46:00' },
    { station: 'Station H', passenger_count: 75, time: '15:46:10' },
    { station: 'Station I', passenger_count: 80, time: '15:46:20' },
    { station: 'Station J', passenger_count: 70, time: '15:46:30' },
    { station: 'Station K', passenger_count: 60, time: '15:46:40' },
    { station: 'Station L', passenger_count: 55, time: '15:46:50' },
    { station: 'Station M', passenger_count: 45, time: '15:47:00' },
    { station: 'Station N', passenger_count: 40, time: '15:47:10' },
    { station: 'Station O', passenger_count: 65, time: '15:47:20' },

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
        station: 'Station ' + (datasetValues.indexOf(Math.max(...datasetValues))), // Get the station with maximum passengers
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


