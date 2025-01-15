const express = require('express');
const controllers = require('./controllers');
const { mailOptions } = require('./constants');
const router = express.Router();

router.get('/mail/user/:email', controllers.getUser);
router.get('/mail/send', controllers.sendMail);
router.get('/mail/drafts/:email', controllers.getDrafts);
router.get('/mail/read/:email/:messageId', controllers.readMail);
router.get('/mail/list/:email', controllers.getMails);

// module.exports = {
//     auth,
//     mailOptions
// }

module.exports = router;