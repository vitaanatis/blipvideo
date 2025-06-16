// server.js
const express = require('express');
const path = require('path');
const app = express();
const port = process.env.PORT || 3000; // Use port from environment variable (e.g., Render.com) or default to 3000

// Serve static files from the current directory where server.js is located.
// This assumes your index.html and any other static assets (CSS, images, etc.)
// are in the same root directory as this server.js file.
app.use(express.static(path.join(__dirname)));

// Define the root route to serve your index.html file.
// When a request comes to the root URL ("/"), it will send back index.html.
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server and listen for incoming requests on the specified port.
app.listen(port, () => {
  // Log a message to the console indicating the server has started.
  // This message will be visible in your Render.com logs.
  console.log(`BlipView server running on port ${port}`);
  console.log(`Open your browser to http://localhost:${port}`);
});

/*
To use this server.js file with 'package.json' for Render.com deployment:

1.  Ensure your 'index.html' (containing the BlipView front-end code)
    is in the same directory as this 'server.js' file.

2.  Create a 'package.json' file (see the next Canvas for its content)
    in the same directory. This file lists your project's dependencies
    and scripts.

3.  Ensure Node.js and npm are installed on your local machine for testing.

4.  On your local machine, navigate to your project directory in the terminal
    and install the required dependencies:
    npm install

5.  To run the server locally:
    node server.js

6.  For deployment on Render.com:
    a. Push your entire project folder (including 'index.html', 'server.js',
       'package.json', and the 'node_modules' folder if you install locally
       before pushing, though Render usually handles `npm install`) to a
       GitHub repository.
    b. On Render.com, create a new "Web Service".
    c. Connect it to your GitHub repository.
    d. Configure the "Build Command" (e.g., `npm install`) and the
       "Start Command" (e.g., `node server.js`). Render will automatically
       set the PORT environment variable for your application.
*/
