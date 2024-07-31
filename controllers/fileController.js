const File = require('../models/file');
const categories = {
    industries: {
        'Metals and Mining': ['Aluminium', 'Iron and Steel', 'Mining'],
        'Power': ['Hydroelectric/Thermal/Solar'],
        'Petrochemical': ['Chemical Manufacturing'],
        'Building Material': ['Cement/Glass'],
        'Others': ['Automobile', 'FMCG', 'Construction', 'Oil and gas', 'Industrial equipment', 'Consumer Durables', 'Miscellaneous']
    },
    functions: {
        'Operations': ['Opr', 'Prod'],
        'Production': ['Opr', 'Prod'],
        'Commercial': ['Comcl'],
        'Finance': ['Fin'],
        'HR': ['HR'],
        'Others': ['Others']
    },
    experienceLevels: {
        '20': 'CXO',
        '10': 'Sr Mgt',
        '5': 'Middle Mgt'
    }
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

const categorizeExperience = (experienceText) => {
    console.log(experienceText);
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

const fileController = {
    // Method for retrieving all PDF files with download links
    viewAllFiles: async (req, res) => {
        try {
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
                updatedAt: file.updatedAt,
                industry: file.industry,
                sector: file.sector,
                functionCategory: file.functionCategory,
                experienceLevel: file.experienceLevel
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
            const { file, experience, ...updateData } = req.body;
            let updatedFile;

            if (file) {
                // Extract text from the new file
                const buffer = Buffer.from(file, 'base64'); // Convert base64 to buffer if sent as base64
                const data = await pdf(buffer);
                const text = data.text;

                // Categorize the new file content
                const { industry, sector } = categorizeIndustry(text);
                const functionCategory = categorizeFunction(text);

                // Update fields based on new file content
                updateData.industry = industry;
                updateData.sector = sector;
                updateData.functionCategory = functionCategory;
            }

            // Categorize experience level based on the experience from updateData
            if (experience) {
                const experienceLevel = categorizeExperience(experience);
                updateData.experienceLevel = experienceLevel;
            }

            updatedFile = await File.findByIdAndUpdate(id, { ...updateData }, { new: true });
            if (!updatedFile) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json({ message: 'File updated successfully', updatedFile });
        } catch (error) {
            console.error('Error updating file:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    },
    deleteFile: async (req, res) => {
        try {
            const { id } = req.params;

            const deletedFile = await File.findByIdAndDelete(id);

            if (!deletedFile) {
                return res.status(404).json({ error: 'File not found' });
            }

            res.json({ message: 'File deleted successfully' });
        } catch (error) {
            console.error('Error deleting file:', error);
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
};
module.exports = fileController;
