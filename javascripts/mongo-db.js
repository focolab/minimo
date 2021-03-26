// content loosely adapted from https://www.mongodb.com/blog/post/the-modern-application-stack-part-2-using-mongodb-with-nodejs
const { MongoClient } = require('mongodb');
const mongoConfig = require('../elements/config-mongo');

// initialize DB object with empty constructor
function DB() {
  this.db = null;		// mongodb database connection
}

DB.prototype.connect = function (uri) {
  // log for debugging...
  console.log('Connecting to Mongo db...');

  // trick for scope with "this"
  _this = this;
  return new Promise(((resolve, reject) => {
    	if (_this.db) {
    		console.log('Already connected to mongo db.');
    		resolve();
    	} else {
    		// going one scope level deeper...
    		const __this = _this;

    		// connect and store db connection
    		MongoClient.connect(uri)
    		.then((client) => {
    			__this.db = client.db();
    			resolve(true);
    		});
    	}
  }));
};

DB.prototype.uploadDocument = function (documentToUpload, myCollection, isUpdate) {
  // scoping
  _this = this;

  return new Promise(((resolve, reject) => {
    // more scoping
    __this = _this;

    // connect (if not already)
    __this.connect(mongoConfig.MONGODB_URI)
      .then(() => {
        // grab collection and upload
        if (isUpdate) {
          // filter based on id, will be unique
          __this.db.collection(myCollection).replaceOne({ 'element name': documentToUpload['element name'] }, documentToUpload)
            .then(() => {
              console.log('Successful document update!');
              resolve();
            });
        } else {
          __this.db.collection(myCollection).insertOne(documentToUpload)
            .then(() => {
              console.log('Successful document upload!');
              resolve();
            });
        }
      });
  }));
};

DB.prototype.deleteDocument = function (documentToDelete, myCollection) {
  // scoping
  _this = this;

  return new Promise(((resolve, reject) => {
    // more scoping
    __this = _this;

    // connect (if not already)
    __this.connect(mongoConfig.MONGODB_URI)
      .then(() => {
        // filter based on id, will be unique
        __this.db.collection(myCollection).deleteOne({ _id: documentToDelete._id })
          .then(() => {
            console.log('Successful document delete!');
            resolve();
          });
      });
  }));
};

DB.prototype.getDocuments = function (myCollection, query) {
  // get documents (adapted from https://stackoverflow.com/questions/21626896/nodejs-mongodb-native-find-all-documents)
  // scoping
  _this = this;

  // if no querystring provided, get all with blank query object
  if (!query) {
    queryobject = {};
  }

  queryobject = query;

  // make a promise
  return new Promise(((resolve, reject) => {
    // scoping
    __this = _this;

    // connect (if not already)
    __this.connect(mongoConfig.MONGODB_URI)
      .then(() => {
        // get all documents and return as array
        __this.db.collection(myCollection).find(queryobject).toArray((e, docs) => {
          console.log(`Grabbed ${docs.length} documents from ${myCollection}.`);
          resolve(docs);
        });
      });
  }));
};

module.exports = DB;
