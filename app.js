const express = require('express');
const app = express();
const gridfsRouter = require('./routes/gridfs-routes.js');

app.set('view engine', 'ejs');



// Allow access to 'public' folder where resources are available to this app
app.use(express.static('public'));

// Routes handlers: https://localhsot:5000/upload/
app.use('/upload', gridfsRouter);

const port = 5000;
app.listen(port, () => {
    console.log('MongoUpload server is listening on ' + port);
})