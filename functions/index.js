//developed by Raj Jariwala
const functions = require("firebase-functions")
const admin = require('firebase-admin');
const path = require("path");
const Busboy = require("busboy");
const os = require("os");
const cors = require("cors")({ origin: true });
const fs = require("fs");
//gc config   
const {Storage} = require("@google-cloud/storage")
const gcs = new Storage({
  projectId: "firestore-d3870",
  keyFilename: "firestore-d3870-firebase-adminsdk-26igj-48018dc0ac.json"
});

// firebase real-time database connection object 
admin.initializeApp();	

//rest api for upload file and add data
exports.addUser = functions.https.onRequest((req, res) => {

  //wrapping in cors for accept form-data
  cors(req, res, () => {
  	//only post method is allowed
    if (req.method !== "POST") {
      return res.status(500).json({
        message: "Not allowed"
      });
    }

    //busboy object initialize
    const busboy = new Busboy({ headers: req.headers });
    let uploadData = null;

    let fileName = "";

    busboy.on("file", (fieldname, file, filename, encoding, mimetype) => {
      const filepath = path.join(os.tmpdir(), filename);
      uploadData = { file: filepath, type: mimetype };
      file.pipe(fs.createWriteStream(filepath));
      // console.log(fieldname, file, filename)
      if(fieldname === "profile"){
      	let name = filename.split(".")
      	fileName = name[0];
      }
    });

    const fields = {};

    busboy.on('field', (fieldname, val) => {
      // console.log(`Processed field ${fieldname}: ${val}.`);
      fields[fieldname] = val;
    });

    busboy.on("finish", () => {
    	var fileObj = {};
    	fileObj[fileName] = {"status": "GIVEN"}
    	var stringKey = admin.database().ref('/allotments').push({
		 	person:{
			    emailAddress:fields.email,
			    name:fields.name
		  	},
		  	files:fileObj
		}).getKey();
      const bucket = gcs.bucket("gs://firestore-d3870.appspot.com");
      bucket
        .upload(uploadData.file, {
          uploadType: "media",
          metadata: {
            metadata: {
              contentType: uploadData.type
            }
          }
        })
        .then((ress) => {
          return res.send({
            message: stringKey
          });
        })
        .catch(err => {
        	console.log('catch', err)
          return res.status(500).json({
            error: err
          });
        });
    });
    busboy.end(req.rawBody);
  });
});
