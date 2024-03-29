const express = require('express');
const bodyParser = require('body-parser');
const querystring = require('querystring'); // Querystring stringifier
const path = require('path');

const PORT = process.env.PORT || 5000;

// for passport
const mongoose = require('mongoose');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const Account = require('./models/account');
const {
  v1: uuidv1,
  v4: uuidv4
} = require('uuid');

// for minio
const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.HOST_NAME,
  useSSL: false,
  accessKey: process.env.MINIO_ADMIN_USERNAME,
  secretKey: process.env.MINIO_ADMIN_PASSWORD,
  region: process.env.MINIO_REGION
});

// for mongodb
const DB = require('./javascripts/mongo-db');
const mongoConfig = require('./elements/config-mongo');
const formElementStrings = require('./javascripts/form-element-strings');
const formatMetadataEntriesForDisplay = require('./javascripts/format-metadata-entries-display');
// per https://docs.aws.amazon.com/AmazonS3/latest/userguide/object-keys.html; max length of 987 rather than 1024 because of autogenerated 37 character prefix (36 char uuid + slash)
const valid_object_name = /^[a-z0-9\/!\-_\.\*'\(\)]{1,987}$/i;

// javascripts
const validateMetadataForm = require('./javascripts/validate-metadata-form');
const randstr = require('./javascripts/randomstr');

// initialize app
app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(require('express-session')({
  secret: uuidv4(),
  resave: false,
  saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, '/public')));
app.set('views', path.join(__dirname, '/views'));
app.set('view engine', 'ejs');

// passport config
passport.use(new LocalStrategy(Account.authenticate()));
passport.serializeUser(Account.serializeUser());
passport.deserializeUser(Account.deserializeUser());

// mongoose
mongoose.connect('mongodb://mongo:27017/mongoose');

app.listen(PORT, () => console.log(`Listening on ${PORT}`));

// set local db object
app.locals.DB = new DB();

//set domain name
app.locals.hostName = process.env.HOST_NAME;

// middleware function to bypass authorization
const skipAuth = (req, res, next) => {
  console.log('Checking authorization...');
  if (req.isAuthenticated()) {
    res.locals.loggedIn = true;
  } else {
    res.locals.loggedIn = false;
  }
  next();
};

// middleware function to check authorization
const checkAuth = (req, res, next) => {
  console.log('Checking authorization...');
  if (req.isAuthenticated()) {
    res.locals.loggedIn = true;
    // continue past middleware
    next();
  } else {
    res.locals.loggedIn = false;
    Account.findOne(null, (err, anyUserAccount) => {
      if (err) {
        errmsg = `Error while trying to fetch user accounts. \n`;
        handleError(req, res, err, errmsg);
      } else if (anyUserAccount === null) {
        // no user accounts, so skip authentication
        console.log('no existing user accounts, skipping authorization...');
        next();
      } else {
        // redirect user to login page
        console.log('Not authorized, redirecting to login.');
        res.redirect('/login');
      }
    });
  }
};

// middleware function to check admin authorization
const checkAdmin = (req, res, next) => {
  console.log('Checking authorization...');
  if (req.isAuthenticated()) {
    res.locals.loggedIn = true;
    Account.findOne({username: req.user.username}, (err, userAccount) => {
      if (err) {
        errmsg = `Error while trying to fetch user account. \n`;
        handleError(req, res, err, errmsg);
      } else if (userAccount.administrator === true) {
        // continue past middleware
        next();
      } else {
        Account.findOne({administrator: true}, (err, anyAdministratorAccount) => {
          if (err) {
            errmsg = `Error while trying to fetch administrator accounts. \n`;
            handleError(req, res, err, errmsg);
          } else if (anyAdministratorAccount === null) {
            // no admin accounts, so proceed
            next();
          } else {
            // redirect user to login page
            console.log('Not administrator, redirecting to update-password.');
            res.redirect('/update-password');
          }
        });
      }
    });
  } else {
    res.locals.loggedIn = false;
    Account.findOne(null, (err, anyUserAccount) => {
      if (err) {
        errmsg = `Error while trying to fetch user accounts. \n`;
        handleError(req, res, err, errmsg);
      } else if (anyUserAccount === null) {
        // no user accounts, so skip authentication
        console.log('no existing user accounts, skipping authorization...');
        next();
      } else {
        // redirect user to login page
        console.log('Not authorized, redirecting to login.');
        res.redirect('/login');
      }
    });
  }
};

function getUsername(req) {
  if (req.user) {
    if (req.user.username) {
      return req.user.username;
    }
  }
  return "anonymous user";
}

// helper function to handle errors, notifying user appropriately
function handleError(req, res, err, errmsg) {
  // add error to locals
  res.locals.errmsg = errmsg;
  console.log(err);

  // clear session
  req.session = null;

  // add error to locals
  res.locals.errmsg = errmsg;

  // render error page
  res.status(500);
  res.render('pages/error');
}

// general get requests
app.get('/', skipAuth, (req, res) => res.render('pages/faq'));
app.get('/faq', skipAuth, (req, res) => res.render('pages/faq'));

// login page
app.get('/login', skipAuth, (req, res) => {
  res.render('pages/login', { user : req.user });
});

app.post('/login', passport.authenticate('local'), (req, res) => {
    res.redirect('/');
});

app.get('/logout', (req, res) => {
  req.logout();
  res.redirect('/');
});

app.get('/manage-users', checkAdmin, (req, res) => {
  res.locals.username = getUsername(req);
  Account.find({}, (err, userAccounts) => {
    if (err) {
      errmsg = `Error while trying to fetch user accounts. \n`;
      handleError(req, res, err, errmsg);
    } else {
      res.locals.accounts = JSON.stringify(userAccounts);
      res.render('pages/manage-users');
    }
  });
});

// add web app user
app.post('/add-user', checkAdmin, (req, res) => {

  Account.register(new Account({ username : req.body.username, administrator: false }), req.body.password, (err, account) => {
    if (err) {
      errmsg = `Error while trying to create user account. \n`;
      handleError(req, res, err, errmsg);
    } else {
      res.redirect('/manage-users');
    }
  });
});

// remove web app user
app.post('/remove-user', checkAdmin, (req, res) => {

  Account.findOneAndDelete({ username: req.body.username }, (err, account) => {
    if (err) {
      errmsg = `Error while trying to delete user account. \n`;
      handleError(req, res, err, errmsg);
    } else {
      res.redirect('/manage-users');
    }
  });
});

// toggle web app user admin status
app.post('/toggle-admin', checkAdmin, (req, res) => {

  Account.findOne({ username: req.body.username }, (err, account) => {
    if (err || account === null) {
      errmsg = `Error while trying to fetch specified user account. \n`;
      handleError(req, res, err, errmsg);
    } else  {
      Account.updateOne({ username: req.body.username }, { administrator: !account.administrator}, (err, updatedAccount) => {
        if (err) {
          errmsg = `Error while trying to update user admin status. \n`;
          handleError(req, res, err, errmsg);
        } else {
          res.redirect('/manage-users');
        }
      })
    }
  });
});

app.get('/update-password', checkAuth, (req, res) => {
  res.locals.username = getUsername(req);
  res.render('pages/update-password', { });
});

// make web app user admin
app.post('/update-password', checkAuth, (req, res) => {
  Account.findOne({username: req.user.username}, (err, userAccount) => {
    if (err) {
      errmsg = `Error while trying to fetch user account. \n`;
      handleError(req, res, err, errmsg);
    } else {
      userAccount.changePassword(req.body.oldPassword, req.body.newPassword, (err) => {
        if (err) {
          errmsg = `Error while trying to update password. \n`;
          handleError(req, res, err, errmsg);
        } else {
          res.redirect('/manage-users');
        }
      });
    }
  });
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

        // add docs to locals
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = getUsername(req);
        res.locals.valid_object_name = valid_object_name;

        // render data page
        res.render('pages/submit-data-boxuploader');
      });
  } catch (err) {
    // craft error message, log
    errmsg = `Error while getting ready to allow user to submit data.\n`;
    handleError(req, res, err, errmsg);
  }
});

// based on https://docs.min.io/docs/upload-files-from-browser-using-pre-signed-urls.html
app.get('/presigned-urls', checkAuth, async (req, res) => {
  let presignedUrls = [];
  let filenames = req.query.filenames.split(',');
  let prefix = uuidv1(); // use v1 to guarantee unique prefix

  for (var i = 0; i < filenames.length; i++) {
    
    if (valid_object_name.test(filenames[i])) {
      let object_key = prefix + '/' + filenames[i];
      try {
        const url = await minioClient.presignedPutObject('data', object_key);
        presignedUrls.push(url);
      } catch (err) {
        errmsg = `Error while trying to put object. \n`;
        handleError(req, res, err, errmsg);
      }

    } else {
      errmsg = `Attempted to upload object with invalid name. Only alphanumeric characters (a-z, A-Z, and 0-9) and the special characters /, !, -, _, ., *, ', (, and ) are permitted in object names. Object names must consist of at least 1 character and no more than 1024 characters.\n`;
      handleError(req, res, null, errmsg);
    }
  }
  res.send({ prefix: prefix, urls: presignedUrls });
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
  let formattedMetadata;
  let formUseCounts;

  try {
    // validate metadata form and/or add extra fields
    formUseCounts = JSON.parse(reqBody['submitted form counts']);
    delete reqBody['submitted form counts'];
    formattedMetadata = validateMetadataForm(reqBody);
  } catch (err) {
    // craft error message, log
    errmsg = `Unable to validate metadata form contents. Please notify web dev.\n`;
    handleError(req, res, err, errmsg);
  }

  // upload
  app.locals.DB.uploadDocument(formattedMetadata, mongoConfig.metadataCollection)
  .then( () =>
    // update form submission counts
    Promise.all(
      Object.keys(formUseCounts).map( 
        formName => app.locals.DB.incrementField({ 'form name': formName }, mongoConfig.formCollection, 'uses', formUseCounts[formName])
      )
    )
  ).then( () =>
    // render new page
    res.redirect('/manage-data')
  ).catch( err => handleError(req, res, err, "Error while updating metadata documents. Please manually check whether your data and metadata uploads succeeded, then notify a web dev.") );
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

        // add docs to locals
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = getUsername(req);

        // render manage forms page
        res.render('pages/manage-forms');
      });
  } catch (err) {
    errmsg = `Error while trying to get form entries. \n`;
    handleError(req, res, err, errmsg);
  }
});

app.get('/edit-form-entry', checkAuth, (req, res) => {
  try {
    // get the requested form to edit, if not found create a new one
    formToEdit = req.query.editSelect;
    if (formToEdit) {
      console.log('Editing existing form entry.');

      // get form info
      app.locals.DB.getDocuments(mongoConfig.formCollection, { 'form name': formToEdit })
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
    errmsg = `Error while trying to get form to edit. \n`;
    handleError(req, res, err, errmsg);
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
    errmsg = `Error during edit form entry, form entry not edited. \n`;
    handleError(req, res, err, errmsg);
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
    app.locals.DB.getDocuments(mongoConfig.formCollection, { 'form name': formToDelete })
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
    errmsg = `Error during delete of form entry, delete not successful. \n`;
    handleError(req, res, err, errmsg);
  }
});

// form edit directory page
app.get('/manage-data', checkAuth, (req, res) => {
  try {
    // add username to locals
    res.locals.username = getUsername(req);

    // render manage forms page
    res.render('pages/manage-data');
  } catch (err) {
    errmsg = `Error while trying to manage metadata. \n`;
    handleError(req, res, err, errmsg);
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

        // add docs to locals
        res.locals.docs = JSON.stringify(docs);
        res.locals.username = getUsername(req);

        // render data page
        res.render('pages/link-metadata-to-data');
      });
  } catch (err) {
    errmsg = `Error while trying to link metadata to data! \n`;
    handleError(req, res, err, errmsg);
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
          let form_elements = forms[i]['elements']
          for (j = 0; j < form_elements.length; j++) {
            let metadata_field = form_elements[j]['element name'];
            if (metadata_fields.indexOf(metadata_field) === -1) {
              metadata_fields.push(metadata_field);
            }
          }
        }

        let mongo_query = {};
        if (req.query && req.query.search_field) {
          mongo_query[req.query.search_field] = ( req.query.search_term ? { $regex: req.query.search_term } : { $exists: true } );
        }

        // get all form data
        docs = app.locals.DB.getDocuments(mongoConfig.metadataCollection, mongo_query, { 'date uploaded': -1 })
          .then((resolve, reject) => {
            if (reject) throw 'Error, rejected getting datametadata!';

            // grab returned docs
            docs = resolve;

            // get formatted docs
            formattedDocs = formatMetadataEntriesForDisplay(docs, metadata_fields);

            // add docs to locals
            res.locals.docs = JSON.stringify(formattedDocs);
            res.locals.username = getUsername(req);

            // render manage forms page
            res.render('pages/browse-datametadata');
          });
      });
  } catch (err) {
    errmsg = `Error while trying to get datametadata entries. \n`;
    handleError(req, res, err, errmsg);
  }
});

// form edit directory page
app.get('/browse-data', checkAuth, (req, res) => {
  try {
    // add username to locals
    res.locals.username = getUsername(req);

    // passport is source of auth, so add minio access and secret keys to locals for auto login if user is authenticated 
    res.locals.accessKey = 'minimouser';
    res.locals.secretKey = process.env.MINIMO_USER_PASSWORD;

    // add prefix from querystring to locals
    res.locals.prefix = (req.query && req.query.prefix ? req.query.prefix : '');

    // render browse data page
    res.render('pages/browse-data');
  } catch (err) {
    errmsg = `Error while trying to browse data. \n`;
    handleError(req, res, err, errmsg);
  }
});
