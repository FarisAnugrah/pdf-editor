const express = require('express');
const path = require('path');
const app = express();
const port = 8085;

// Serve static files (the HTML we just created)
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'editor.html'));
});

app.listen(port, () => {
    console.log(`Web-based PDF Editor running at http://localhost:${port}`);
    console.log(`Open this link in your browser to start editing!`);
});