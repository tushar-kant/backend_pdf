const File = require('../models/file');

const fileController = {
    // Method for retrieving all PDF files with download links
    viewAllFiles: async (req, res) => {
        try {
            // Retrieve all PDF files from MongoDB
            const pdfFiles = await File.find({ contentType: 'application/pdf' });

            // Map the PDF files to include download links
            const results = pdfFiles.map(file => ({
                _id: file._id,

                filename: file.filename,
                downloadLink: `/download?file=${encodeURIComponent(file.filename)}`,
                name: file.name,
                dob: file.dob,
                experience: file.experience,
                email: file.email,
                phoneNo: file.phoneNo,
                CTC: file.CTC,
                currentCompany: file.currentCompany,
                previousCompany: file.previousCompany,
                createdAt: file.createdAt,
                updatedAt: file.updatedAt
            }));

            // Send the list of PDF files with download links to the client
            res.json({ results });
        } catch (error) {
            console.error('Error retrieving PDF files:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    updateFile: async (req, res) => {
        try {
            const { id } = req.params;
            const updateData = req.body;
            const updatedFile = await File.findByIdAndUpdate(id, updateData, { new: true });

            if (!updatedFile) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json({ message: 'File updated successfully', updatedFile });
        } catch (error) {
            console.error('Error updating file:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};

module.exports = fileController;
