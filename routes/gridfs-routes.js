const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');

const GridFSBucket = require('gridfs-bucket');
const methodOverride = require('method-override');
const bodyParser = require('body-parser');
const { appendFile } = require('fs');
const { render } = require('ejs');
const { setFlagsFromString } = require('v8');

const router = require('express').Router();

// Middleware
router.use(bodyParser.json());
router.use(methodOverride('_method'));

// Mongo URI
const mongoURI = 'mongodb+srv://hurricanemark:markn123%24@cluster0.brf1j.mongodb.net/oautho?authSource=admin&replicaSet=Cluster0-shard-0&readPreference=primary&ssl=true';

// Create mongo connection
const conn = mongoose.createConnection(mongoURI);

// Initialize gfs
// [ref](https://github.com/aheckmann/gridfs-stream)
let gfs; 
conn.once('open', () => {
    // Initialize gridfs-bucket stream
    gfs = new mongoose.mongo.GridFSBucket(conn.db, {bucketName: 'media'});
});



/* Create storage engine
 *
 * Internally the function crypto.randomBytes is used to generate names. 
 * In this example, files are named using the same format plus the extension 
 * as received from the client, also changing the collection where to store 
 * files to uploads (i.e. bucketName).
 */
const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            isVideo: Boolean,
            isImage: Boolean,
            bucketName: 'media'
          };
          resolve(fileInfo);
        });
      });
    },
    cache: true  //cache named 'default'
  });
  const upload = multer({ storage });

  // @route GET /
  // @desc Loads form
  router.get('/', (req, res) => {
    gfs.find().toArray((err, files) => {
        // check if file exists
        if(!files || files.length === 0) {
            res.render('index', {allfiles: false});
        } else {

            // classify file types to be used in index.ejs
            // from there index.ejs will invoke action = get or post
            files.map(file => {
                
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/gif' || file.contentType === 'image/png') {
                    file.isImage = true;
                    file.isVideo = false;
                } else if(file.contentType === 'video/webm' || file.contentType === 'video/mp4') {
                    file.isVideo = true;
                    file.isImage = false;
                } else {
                    file.isImage = false;
                    file.isVideo = false;
                }

            });

            res.render('index', { allfiles: files });
        }
    });
  })

  // @route POST /upload via middleware `upload.single()`
  // @desc Uploads myfile to DB
  router.post('/', upload.single('myfile'), (req, res, next) => {
    // console.log('FileName: ' + req.file.filename);
    res.redirect('/upload');
  })

  // @route GET /upload/files
  // @desc Retrieves multiple files from DB
  router.get('/files', (req, res) => {
    
    gfs.find().toArray((err, files) => {
        // check if file exists
        if(!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            });
        }

        // files exist
        return res.json(files);
    })
  });

  // @route GET /upload/files/:filename
  // @desc Retrieves single file from DB
  router.get('/files/:filename', (req, res) => {
    // specified filename will return array of one or none
    gfs.find({filename: req.params.filename}).toArray((err, files) => {
        // check if file exists
        if(!files || files.length === 0) {
            return res.status(404).json({
                err: 'No file exists'
            });
        }
        
        for (let i=0; i<files.length; i++) {
            if (files[i].filename === req.params.filename) {
                return res.json(files[i]);
            }
        }
        return res.status(404).json({
            err: 'No file exists'
        });
    });
  });


  // @route GET /upload/image/:filename
  // @desc Retrieves single file from DB
  // @note: index.ejs will POST a delete calling this.
  router.get('/media/:filename', (req, res) => {
    // console.log(req.params.filename);

    return new Promise(resolve => {
        setTimeout(() => {
            gfs.find({filename: req.params.filename}).toArray((err, files) => {
                // check if file exists
                if(!files || files.length === 0) {
                    return res.status(404).json({
                        err: 'No file exists'
                    });
                }
        
                // file exists, is it an image or video?
                let readstream;
                files.map(file => {
                    // console.log(file.filename  + ", " + file.contentType + ', ' + file.length);

                    
                    if(file.contentType === 'image/gif' || file.contentType === 'image/png' || file.contentType === 'image/jpeg') {
                        // Read output to browser vi ReadStream
                        // console.log("Found image file: " + file.filename + ", id: " + file._id);
                        readstream = gfs.openDownloadStreamByName(file.filename);
                        readstream.pipe(res);
                    } else if(file.contentType === 'video/webm') {
                        const videoSize = file.length;
                        const start = Number(range.replace(/\D/g, ""));
                        const end = videoSize - 1;

                        readstream = gfs.openDownloadStream(file._id, {start:start, end:end});
                        readstream.pipe(res);
                    }

                });
            })
        
        }, 300);
    });
  });

  // @router DELETE /files/:id
  // @desc Delete a file
  router.delete('/files/:id', (req, res) => {
    const obj_id = new mongoose.Types.ObjectId(req.params.id);
    gfs.delete(obj_id);
  
    res.redirect('/upload');
  });


  module.exports = router;