const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.get('/viewall', fileController.viewAllFiles);

module.exports = router;
