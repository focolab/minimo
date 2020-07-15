const express = require('express');
const bodyParser = require('body-parser');
const querystring = require('querystring'); // Querystring stringifier
const path = require('path');

const PORT = process.env.PORT || 5000;

// for sessions
const cookieSession = require('cookie-session');

// for minio
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT,
  port: 9000,
  useSSL: false,
  accessKey: process.env.MINIO_ACCESS_KEY,
  secretKey: process.env.MINIO_SECRET_KEY,
});

// for mongodb
const DB = require('./javascripts/mongo-db');
const mongoConfig = require('./elements/config-mongo');
const formElementStrings = require('./javascripts/form-element-strings');
const formatMetadataEntriesForDisplay = require('./javascripts/format-metadata-entries-display');

// javascripts
const validateMetadataForm = require('./javascripts/validate-metadata-form');
const randstr = require('./javascripts/randomstr');

// initialize app
app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/public')));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');

// for cookie sessions
app.use(cookieSession({

  cookieName: 'session',
  keys: [randstr(), randstr()],

  // cookie options, expire after 30 days (in ms)
  maxAge: 1000 * 60 * 60 * 24 * 30,

}));

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// set local db object
app.locals.DB = new DB();

//set domain name
app.locals.minioEndpoint = process.env.MINIO_ENDPOINT;

// general get requests
app.get('/', (req, res) => res.render('pages/faq'));
app.get('/faq', (req, res) => res.render('pages/faq'));

// middleware function to check authorization
const checkAuth = function (req, res, next) {
  console.log('Checking authorization...');

  // for debugging
  SKIP_AUTH = true;
  if (SKIP_AUTH) {
    console.log('SKIP_AUTH is set to true, skipping authorization...');
    next();
  }

  // check cookie session for authentication flag
  else if (req.session.isAuthenticated) {
    // continue past middleware
    console.log('Already authorized!');
    next();
  } else {
    // redirect user to login page
    console.log('Not authorized, redirecting to login.');
    res.redirect('/login');
  }
};

// helper function to handle errors, notifying user appropriately
function handleError(req, res, errmsg) {
  // add error to locals
  res.locals.errmsg = errmsg;
  console.log(errmsg);

  // clear session
  req.session = null;

  // add error to locals
  res.locals.errmsg = errmsg;

  // render error page
  res.render('pages/error');
}

// login page
app.get('/login', (req, res) => {
  // if already authenticated, skip to members
  if (req.session.isAuthenticated) {
    console.log('Already authenticated! Moving on...');
    res.redirect('/faq');
  } else {
    req.session.isAuthenticated = true;
  }

  res.redirect('/faq');
});

app.get('/logout', (req, res) => {
  // clear session
  req.session = null;

  // redirect to index
  res.redirect('/');
});

// submit data page via uploader
app.get('/submit-data-boxuploader', checkAuth, (req, res) => {
  try {
    // render contentUploader object
    const service = 'contentUploader';

    // get and append form field data
    docs = app.locals.DB.getDocuments(mongoConfig.formCollection)
      .then((resolve, reject) => {
        if (reject) throw 'Error, rejected getting form data!';

        // grab returned docs
        docs = resolve;
        // console.log('docs0: ' + JSON.stringify(docs[0]))

        // add docs to locals
        console.log(JSON.stringify(docs));
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = req.session.username;

        // render data page
        res.render('pages/submit-data-boxuploader');
      });
  } catch (err) {
    // craft error message, log
    errmsg = `Error while getting ready to allow user to submit data.\n${err}`;
    handleError(req, res, errmsg);
  }
});

// taken from https://docs.min.io/docs/upload-files-from-browser-using-pre-signed-urls.html
app.get('/presigned-url', checkAuth, (req, res) => {
  minioClient.presignedPutObject('data', req.query.name, (err, url) => {
    if (err) throw err;
    res.end(url);
  });
});

app.get('/list-data-objects', checkAuth, (req, res) => {
  const stream = minioClient.listObjectsV2('data', req.query.prefix);
  const objects = [];
  stream.on('data', (obj) => { objects.push(obj); });
  stream.on('error', (err) => { objects.push(err); });
  stream.on('end', () => { res.send(objects); });
});

// page directed to after metadata form submit
app.post('/submitted-metadata', checkAuth, (req, res) => {
  // grab body from request
  reqBody = req.body;

  try {
    // validate metadata form and/or add extra fields
    formattedMetadata = validateMetadataForm(reqBody);

    // upload
    app.locals.DB.uploadDocument(formattedMetadata, mongoConfig.metadataCollection)
      .then(() => {
        // render new page
        res.redirect('/manage-data');
      });
  } catch (err) {
    // craft error message, log
    errmsg = `Error during metadata submission. Metadata was not submitted, but data may have been submitted. Please notify webdev.\n${err}`;
    handleError(req, res, errmsg);
  }
});

// form edit directory page
app.get('/manage-forms', checkAuth, (req, res) => {
  try {
    // get all form data
    docs = app.locals.DB.getDocuments(mongoConfig.formCollection)
      .then((resolve, reject) => {
        if (reject) throw 'Error, rejected getting form data!';

        // grab returned docs
        docs = resolve;
        // console.log('docs0: ' + JSON.stringify(docs[0]))

        // add docs to locals
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = req.session.username;

        // render manage forms page
        res.render('pages/manage-forms');
      });
  } catch (err) {
    errmsg = `Error while trying to get form entries. \n${err}`;
    handleError(req, res, errmsg);
  }
});

app.get('/edit-form-entry', checkAuth, (req, res) => {
  try {
    // get the requested form to edit, if not found create a new one
    formToEdit = req.query.editSelect;
    if (formToEdit) {
      console.log('Editing existing form entry.');

      // get form info
      app.locals.DB.getDocuments(mongoConfig.formCollection, { 'element name': formToEdit })
        .then((resolve, reject) => {
          if (reject) throw 'Error, rejected while getting form data for edit form entry!';

          // get just the first doc returned
          doc = resolve[0];

          // convert doc to string
          docString = formElementStrings.formElementObjToString(doc);

          // store in locals
          res.locals.docString = docString;
          res.locals.docid = doc._id;

          // render edit form page
          res.render('pages/edit-form-entry');
        });
    } else {
      console.log('Creating new form entry...');

      // render edit form entry without arguments
      res.locals.docString = '';
      res.locals.docid = '';
      res.render('pages/edit-form-entry');
    }
  } catch (err) {
    errmsg = `Error while trying to get form to edit: ${err}`;
    handleError(req, res, errmsg);
  }
});

app.post('/edit-form-entry', checkAuth, (req, res) => {
  try {
    // get body of post request
    reqbody = req.body;

    // get fields from form
    formString = reqbody.editFormBox;
    formuid = reqbody.uid;

    // convert to form obj
    formObj = formElementStrings.formElementStringToObj(formString);

    // initialize flag for update
    isUpdate = false;

    // if a form uid was provided (i.e. we're editing an existing form), update
    if (formuid.length > 0) {
      // add existing uid
      // no longer necessary because we do this via the upload
      // formObj["_id"] = formuid

      // set update flag
      isUpdate = true;
    }

    // perform upload
    app.locals.DB.uploadDocument(formObj, mongoConfig.formCollection, isUpdate)
      .then((resolve, reject) => {
        if (reject) throw `Error during form document upload!${reject}`;

        // render new page
        res.redirect('/manage-forms');
      });
  } catch (err) {
    errmsg = `Error during edit form entry, form entry not edited: ${err}`;
    handleError(req, res, errmsg);
  }
});

// ADD CHECK AUTH FOR DEPLOYMENT
app.post('/delete-form-entry', checkAuth, (req, res) => {
  try {
    // get body of post request
    reqbody = req.body;

    // get fields from form
    formToDelete = reqbody.deleteSelect;

    // make sure we get uid of object (DB.deleteDocument wants this)
    app.locals.DB.getDocuments(mongoConfig.formCollection, { 'element name': formToDelete })
      .then((resolve, reject) => {
        if (reject) throw 'Error, rejected while deleting form entry!';

        // get docid
        doc = resolve[0];
        docid = doc._id;

        // do delete
        app.locals.DB.deleteDocument({ _id: docid }, mongoConfig.formCollection);
      })
      .then((resolve, reject) => {
        // render edit form page
        res.redirect('/manage-forms');
      });
  } catch (err) {
    errmsg = `Error during delete of form entry, delete not successful: ${err}`;
    handleError(req, res, errmsg);
  }
});

// form edit directory page
app.get('/manage-data', checkAuth, (req, res) => {
  try {
    // add username to locals
    res.locals.username = req.session.username;

    // render manage forms page
    res.render('pages/manage-data');
  } catch (err) {
    errmsg = `Error while trying to manage metadata. \n${err}`;
    handleError(req, res, errmsg);
  }
});

app.get('/link-metadata-to-data', checkAuth, (req, res) => {
  try {
    // render contentUploader object
    const service = 'contentPicker';

    // get and append form field data
    docs = app.locals.DB.getDocuments(mongoConfig.formCollection)
      .then((resolve, reject) => {
        if (reject) throw 'Error, rejected getting form data!';

        // grab returned docs
        docs = resolve;
        // console.log('docs0: ' + JSON.stringify(docs[0]))

        // add docs to locals
        console.log(JSON.stringify(docs));
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = req.session.username;

        // render data page
        res.render('pages/link-metadata-to-data');
      });
  } catch (err) {
    errmsg = `Error while trying to link metadata to data!\n${err}`;
    handleError(req, res, errmsg);
  }
});

// form browse page
app.get('/browse-datametadata', checkAuth, (req, res) => {
  try {
    // get all form data
    forms = app.locals.DB.getDocuments(mongoConfig.formCollection)
      .then((resolve, reject) => {
        if (reject) throw 'Error, rejected getting form data!';

        // grab returned docs
        forms = resolve;
        const metadata_fields = [];
        for (i = 0; i < forms.length; i++) {
          metadata_fields.push(forms[i]['element name']);
        }

        // get all form data
        docs = app.locals.DB.getDocuments(mongoConfig.metadataCollection)
          .then((resolve, reject) => {
            if (reject) throw 'Error, rejected getting datametadata!';

            // grab returned docs
            docs = resolve;
            console.log(`docs0: ${JSON.stringify(docs[0])}`);

            // get formatted docs
            formattedDocs = formatMetadataEntriesForDisplay(docs, metadata_fields);

            // add docs to locals
            res.locals.docs = JSON.stringify(formattedDocs);
            res.locals.username = req.session.username;

            // render manage forms page
            res.render('pages/browse-datametadata');
          });
      });
  } catch (err) {
    errmsg = `Error while trying to get datametadata entries. \n${err}`;
    handleError(req, res, errmsg);
  }
});

// form edit directory page
app.get('/browse-data', checkAuth, (req, res) => {
  try {
    // add username to locals
    res.locals.username = req.session.username;

    // render browse data page
    res.render('pages/browse-data');
  } catch (err) {
    errmsg = `Error while trying to browse data. \n${err}`;
    handleError(req, res, errmsg);
  }
});
