const express = require('express');
const router = express.Router();
const fileController = require('../controllers/fileController');

router.get('/viewall', fileController.viewAllFiles);
router.put('/update/:id', fileController.updateFile);


module.exports = router;
