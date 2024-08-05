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
const categories = {
    industries: {
        'Metals and Mining': ['Aluminium', 'Iron and Steel', 'Mining'],
        'Power': ['Hydroelectric','Thermal','Solar'],
        'Petrochemical': ['Chemical','Manufacturing'],
        'Building Material': ['Cement','Glass'],
        'Others': ['Automobile', 'FMCG', 'Construction', 'Oil and gas', 'Industrial equipment', 'Consumer Durables', 'Miscellaneous']
    },
    functions: {
        'Operations': [
            "Operations", "Manpower management", "Production planning", "Shutdown maintenance", "Shift in charge",
            "Plant in charge", "Safety", "DCS", "Project Management", "HSE", "Preventive Maintenance", "Maintenance",
            "Breakdown Maintenance"
        ],
        'Production': [
            "Production Planning", "Manufacturing Processes", "Quality Control", "Lean Manufacturing", "Six Sigma",
            "Process Optimization", "Assembly Line Management", "Production Scheduling", "Inventory Management",
            "Supply Chain Coordination", "Cost Reduction", "Continuous Improvement", "Workflow Management", "Machine Operation",
            "Safety Compliance", "Equipment Maintenance", "Production Efficiency", "Capacity Planning", "Quality Assurance",
            "Resource Allocation", "Industrial Engineering", "Automation", "Production Reporting", "Just-in-Time Production",
            "Root Cause Analysis"
        ],
        'Commercial': [
            "Sales Management", "Business Development", "Market Analysis", "Client Relationship Management", "Contract Negotiation",
            "Pricing Strategy", "Revenue Growth", "Key Account Management", "Sales Forecasting", "Lead Generation",
            "Customer Retention", "Territory Management", "Competitive Analysis", "Product Launch", "Channel Management",
            "Strategic Partnerships", "Sales Planning", "Market Expansion", "Sales Presentations", "Sales Training",
            "Distribution Management", "Trade Marketing", "Sales Operations", "Digital Marketing", "E-commerce Management"
        ],
        'Finance': [
            "Financial Analysis", "Budgeting", "Forecasting", "Financial Reporting", "Accounting", "Financial Planning",
            "Investment Management", "Risk Management", "Taxation", "Auditing", "Cost Analysis", "Revenue Recognition",
            "Asset Management", "Treasury Management", "Financial Modeling", "Cash Flow Management", "Portfolio Management",
            "Corporate Finance", "Mergers and Acquisitions", "Compliance", "Internal Controls", "Variance Analysis",
            "Profit and Loss Management", "Financial Strategy", "Regulatory Reporting"
        ],
        'HR': [
            "Talent Acquisition", "Recruitment", "Employee Relations", "Performance Management", "HR Strategy",
            "Onboarding", "Training and Development", "Compensation and Benefits", "Payroll Management", "Workforce Planning",
            "Compliance", "HRIS", "Employee Engagement", "Succession Planning", "Diversity and Inclusion", "Labor Laws",
            "Organizational Development", "Conflict Resolution", "HR Metrics and Analytics", "Policy Development",
            "Employee Retention", "HR Business Partner", "Change Management", "Leadership Development", "Benefits Administration"
        ],
        'Others': ['Others']
    },
    experienceLevels: {
        '20': 'CXO',
        '10': 'Sr Mgt',
        '5': 'Middle Mgt'
    }
};

const categorie = {
    HR: [
        "Talent Acquisition", "Recruitment", "Employee Relations", "Performance Management", "HR Strategy",
        "Onboarding", "Training and Development", "Compensation and Benefits", "Payroll Management", "Workforce Planning",
        "Compliance", "HRIS", "Employee Engagement", "Succession Planning", "Diversity and Inclusion", "Labor Laws",
        "Organizational Development", "Conflict Resolution", "HR Metrics and Analytics", "Policy Development",
        "Employee Retention", "HR Business Partner", "Change Management", "Leadership Development", "Benefits Administration"
    ],
    Finance: [
        "Financial Analysis", "Budgeting", "Forecasting", "Financial Reporting", "Accounting", "Financial Planning",
        "Investment Management", "Risk Management", "Taxation", "Auditing", "Cost Analysis", "Revenue Recognition",
        "Asset Management", "Treasury Management", "Financial Modeling", "Cash Flow Management", "Portfolio Management",
        "Corporate Finance", "Mergers and Acquisitions", "Compliance", "Internal Controls", "Variance Analysis",
        "Profit and Loss Management", "Financial Strategy", "Regulatory Reporting"
    ],
    Operations: [
        "Operations", "Manpower management", "Production planning", "Shutdown maintenance", "Shift in charge",
        "Plant in charge", "Safety", "DCS", "Project Management", "HSE", "Preventive Maintenance", "Maintenance",
        "Breakdown Maintenance"
    ],
    Commercials: [
        "Sales Management", "Business Development", "Market Analysis", "Client Relationship Management", "Contract Negotiation",
        "Pricing Strategy", "Revenue Growth", "Key Account Management", "Sales Forecasting", "Lead Generation",
        "Customer Retention", "Territory Management", "Competitive Analysis", "Product Launch", "Channel Management",
        "Strategic Partnerships", "Sales Planning", "Market Expansion", "Sales Presentations", "Sales Training",
        "Distribution Management", "Trade Marketing", "Sales Operations", "Digital Marketing", "E-commerce Management"
    ],
    Production: [
        "Production Planning", "Manufacturing Processes", "Quality Control", "Lean Manufacturing", "Six Sigma",
        "Process Optimization", "Assembly Line Management", "Production Scheduling", "Inventory Management",
        "Supply Chain Coordination", "Cost Reduction", "Continuous Improvement", "Workflow Management", "Machine Operation",
        "Safety Compliance", "Equipment Maintenance", "Production Efficiency", "Capacity Planning", "Quality Assurance",
        "Resource Allocation", "Industrial Engineering", "Automation", "Production Reporting", "Just-in-Time Production",
        "Root Cause Analysis"
    ]
};


app.get("/", (req, res) => {
    res.send("Hello ,its working");
});
app.use('/auth', authRoutes);
app.use('/file', fileRoutes);

const determineLabel = (text) => {
    for (const [category, keywords] of Object.entries(categories)) {
        const keywordCount = keywords.reduce((count, keyword) => {
            if (text.includes(keyword)) {
                return count + 1;
            }
            return count;
        }, 0);

        // Assuming that if at least 5 keywords are present, it belongs to that category
        if (keywordCount >= 5) {
            return category;
        }
    }
    return 'Unknown';
};
const categorizeIndustry = (text) => {
    for (const [industry, sectors] of Object.entries(categories.industries)) {
        if (text.includes(industry)) {
            for (const sector of sectors) {
                if (text.includes(sector)) {
                    return { industry, sector };
                }
            }
        }
    }
    return { industry: 'Others', sector: 'Miscellaneous' };
};

const categorizeFunction = (text) => {
    for (const [func, keywords] of Object.entries(categories.functions)) {
        for (const keyword of keywords) {
            if (text.includes(keyword)) {
                return func;
            }
        }
    }
    return 'Others';
};

// const categorizeExperience = (text) => {
//     for (const [years, level] of Object.entries(categories.experienceLevels)) {
//         if (text.includes(years)) {
//             return level;
//         }
//     }
//     return 'Unspecified';
// };
const categorizeExperience = (experienceText) => {
    const yearsOfExperience = parseFloat(experienceText.replace(/[^0-9.]/g, '')); // Extract numerical part
    if (!isNaN(yearsOfExperience)) {
        if (yearsOfExperience >= 20) {
            return 'CXO';
        } else if (yearsOfExperience >= 10) {
            return 'Sr Mgt';
        } else if (yearsOfExperience >= 5) {
            return 'Middle Mgt';
        }
    }
    return 'Unspecified';
};

function extractFirstLine(text) {
    // Split text into lines
    const lines = text.split('\n');

    // Find the first line that contains text
    const firstLine = lines.find(line => line.trim() !== '');

    // Return the first non-empty line, trimmed
    return firstLine ? firstLine.trim() : '';
}

function extractPhoneNo(text) {
    const match = text.match(/Phone\s*:\s*(\+?\d[\d\s-]{7,}\d)/i);
    if (match) {
        return match[1].trim();
    } else {
        const matchNumbers = text.match(/\+?\d[\d\s-]{7,}\d/);
        return matchNumbers ? matchNumbers[0] : 'Unknown';
    }
}

function extractEmail(text) {
    const match = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    return match ? match[0].trim() : 'Unknown';
}
function extractCurrentCompany(text) {
    // Regular expression pattern to find the section containing professional experience
    const sectionPattern = /(?:PROFESSIONAL EXPERIENCE|ORGANIZATIONS|Employment scan|WORK EXPERIENCE)([\s\S]*?)(?:EXPERIENCE\s+SUMMARY|$)/i;
    const sectionMatch = text.match(sectionPattern);
// console.log(sectionMatch);
    if (sectionMatch) {
        const sectionText = sectionMatch[1]; // Extract the text from the matched section

        // Regular expression pattern to match company name and timeframe
        const companyPattern = /([^\n\r]+?)\s+from\s+(\d{1,2}(?:th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}\/\d{1,2}\/\d{2,4}))?\s*(?:-|to)\s*(Present|\d{1,2}(?:th)?\s+(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?|\d{1,2}\/\d{1,2}\/\d{2,4}))/ig;

        let currentCompany = { name: 'Unknown', timeframe: '' };
        let matchCompany;

        // Iterate through matches to find the most recent company
        while ((matchCompany = companyPattern.exec(sectionText)) !== null) {
            const companyName = matchCompany[1].trim();
            const timeframe = matchCompany[2] ? matchCompany[2].trim() : matchCompany[3].trim();

            // Check if this is a current or most recent company based on timeframe
            if (timeframe.toLowerCase().includes('present') || 
                currentCompany.timeframe < timeframe ||
                currentCompany.name === 'Unknown') {
                currentCompany = {
                    name: companyName,
                    timeframe: timeframe
                };
            }
        }

        return currentCompany;
    }

    return { name: 'Unknown', timeframe: '' };
}



function extractPreviousCompany(text) {
    const currentCompanyInfo = extractCurrentCompany(text);
    const currentCompanyIndex = text.indexOf(currentCompanyInfo.name);
    const textAfterCurrentCompany = text.slice(currentCompanyIndex + currentCompanyInfo.name.length);

    const previousCompanyPattern = /Company\s*:\s*(.*?)(\d{4})\s*-\s*(\d{4})/ig;
    let previousCompany = { name: 'Unknown', timeframe: [] };
    let match;
    while ((match = previousCompanyPattern.exec(textAfterCurrentCompany)) !== null) {
        const companyName = match[1].trim();
        const years = [match[2], match[3]];
        if (years[1] < currentCompanyInfo.timeframe[0]) {
            previousCompany = {
                name: companyName,
                timeframe: years
            };
            break; // Assuming we need the first previous company found
        }
    }
    return previousCompany.name;
}


function extractExperience(text) {
    // Regular expression pattern to find numbers near "experience"
    const nearExperiencePattern = /(?:\b\d+\b\s*(?:\+)?\s*(?:years?|yrs?))/ig;
    
    // Find all matches near "experience"
    let closestMatch = null;
    let closestDistance = Infinity;

    let match;
    while ((match = nearExperiencePattern.exec(text)) !== null) {
        // Calculate distance from "experience"
        const distance = Math.abs(match.index - text.toLowerCase().indexOf('experience'));

        // Update closest match if this one is closer
        if (distance < closestDistance) {
            closestMatch = match[0];
            closestDistance = distance;
        }
    }

    if (closestMatch) {
        return closestMatch.trim();
    }

    return 'Unknown'; // Return 'Unknown' if no experience-related number is found
}

function extractCTC(text) {
    // Regular expression pattern to match CTC formats
    const ctcPattern = /(?:CTC|Current Total Compensation|Current CTC)\s*:\s*(?:Rs\s*)?(\d{1,3}(?:,?\d{3})*\.?\d*)/i;

    // Attempt to match the pattern in the text
    const match = text.match(ctcPattern);
    if (match) {
        // Extracted CTC value, removing commas and converting to a numeric format
        const ctcValue = match[1].replace(/,/g, '');
        return parseFloat(ctcValue).toFixed(2); // Convert to float and fix to 2 decimal places
    }

    return 'Unknown'; // Return 'Unknown' if no CTC is found
}
function extractDOB(text) {
    // Regular expression pattern to match "Date of Birth" or "DOB" followed by 3 lines
    const dobPattern = /(?:Date\s*of\s*Birth|DOB)\s*:\s*(.*?)(?:\n|$)/i;

    // Attempt to match the pattern in the text
    const match = text.match(dobPattern);
    if (match) {
        // Extracted content after DOB
        const lines = text.split('\n');
        const startIndex = lines.findIndex(line => line.match(dobPattern));
        if (startIndex !== -1) {
            // Extract the next 3 lines after the line containing DOB, concatenate them without adding newlines
            const extractedLines = lines.slice(startIndex + 0, startIndex + 3);
            return extractedLines.join(' ').trim();
        }
    }

    return 'Unknown'; // Return 'Unknown' if no DOB line is found
}
app.post('/upload', upload.array('resume', 10), async (req, res) => {
    try {
        const files = req.files;
        const filePromises = files.map(async (file) => {
            const buffer = file.buffer;
            const data = await pdf(buffer);
            const text = data.text;
            
            // Extract and categorize information
            const { industry, sector } = categorizeIndustry(text);
            const functionCategory = categorizeFunction(text);
            const experience = extractExperience(text);

            const experienceLevel = categorizeExperience(experience);
            
            // Extract other details
            const dob = extractDOB(text);
            // const experience = extractExperience(text);
            const ctc = extractCTC(text);
            const phoneNo = extractPhoneNo(text);
            const email = extractEmail(text);
            const currentCompany = extractCurrentCompany(text).name;
            const previousCompany = extractPreviousCompany(text);
            const name = extractFirstLine(text);
            
            // Store the original PDF file in MongoDB
            const newFile = new File({
                filename: file.originalname,
                contentType: file.mimetype,
                data: buffer,
                dob,
                experience,
                phoneNo,
                email,
                CTC: ctc,
                currentCompany,
                previousCompany,
                name,
                industry,
                sector,
                functionCategory,
                experienceLevel
            });
            await newFile.save();

            return { pdfFile: newFile };
        });

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
const extractName = (text) => {
    const match = text.match(/^\s*(\S+\s+\S+)/);
    return match ? match[1].trim() : 'Unknown';
};


const extractOrgLast = (text) => {
    const match = text.match(/(?:PROFESSIONAL EXPERIENCE|ORGANIZATIONS|Employment scan|WORK EXPERIENCE)(?:.|\n)*?Project Name\s*:\s*(.*?)(?:\n|$)/i);
    return match ? match[1].trim() : 'Unknown';
};

const extractPosition = (text) => {
    const match = text.match(/(?:PROFESSIONAL EXPERIENCE|ORGANIZATIONS|Employment scan|WORK EXPERIENCE)(?:.|\n)*?Project Role\s*:\s*(.*?)(?:\n|$)/i);
    return match ? match[1].trim() : 'Unknown';
};

const extractLocation = (text) => {
    const match = text.match(/(?:Place|Address|Location)\s*:\s*(.*?)(?:\n|$)/i);
    return match ? match[1].trim() : 'Unknown';
};


app.post('/download-excel', async (req, res) => {
    const { queries, searchOption, experience, ctc } = req.body;

    try {
        const pdfFiles = await File.find({ contentType: 'application/pdf' });

        const results = [];

        for (const pdfFile of pdfFiles) {
            const text = await pdf(pdfFile.data);
            let isMatched = true; // Flag to check if the document matches all filters

            const name = extractName(text.text);
            const orgLast = extractOrgLast(text.text);
            const position = extractPosition(text.text);
            const location = extractLocation(text.text);
            console.log('Extracted information from PDF:', { name, orgLast, position, location });

            // const ctc = extractCtc(text.text);
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

            // Check if CTC filter is provided and document meets the criteria
            if (ctc) {
                if (parseInt(pdfFile.CTC) > parseInt(ctc)) {
                    console.log('CTC:', pdfFile.CTC, 'Query CTC:', ctc);
                    isMatched = false;
                }
            }
            if (isMatched) {
                results.push({
                    fileName: pdfFile.filename,
                    experience: pdfFile.experience,
                    phone_no: pdfFile.phoneNo,
                    email: pdfFile.email,
                    dob: pdfFile.dob,
                    ctc: pdfFile.CTC,
                    orgLast: orgLast,
                    position: position,
                    location: location,
                    name:name
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
            { header: 'CTC', key: 'ctc', width: 30 },
            { header: 'Organization Last', key: 'orgLast', width: 30 },
            { header: 'Position', key: 'position', width: 30 },
            { header: 'Location', key: 'location', width: 30 },
            { header: 'Name', key: 'name', width: 30 }

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


