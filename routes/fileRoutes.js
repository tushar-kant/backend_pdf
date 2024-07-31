const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

// Route for handling file upload
router.get('/viewall', fileController.viewAllFiles);

router.put('/update/:id', fileController.updateFile);

router.delete('/delete/:id', fileController.deleteFile);

module.exports = router;
