const File = require('../models/file');

const fileController = {
    // Method for retrieving all PDF files with download links
    viewAllFiles: async (req, res) => {
        try {
            // Retrieve all PDF files from MongoDB
            const pdfFiles = await File.find({ contentType: 'application/pdf' });

            // Map the PDF files to include download links
            const results = pdfFiles.map(file => ({
                filename: file.filename,
                downloadLink: `/download?file=${encodeURIComponent(file.filename)}`
            }));

            // Send the list of PDF files with download links to the client
            res.json({ results });
        } catch (error) {
            console.error('Error retrieving PDF files:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

module.exports = fileController;
