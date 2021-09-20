const express = require("express");

const router = express.Router();

router.post("/alert", (req, res) => {
    console.log(req.body);
    res.status(200).send("ok");
}); 

module.exports = router;