// this function does all the sanitizing and formating on metadata
// to be submitted to mongo db.
// Returns a boolean ("ready to upload or not") and if ready, a formatted
// metadata JSON object

// THIS SHOULD ONLY BE HIGH LEVEL VALIDATION
// take care of low-level validation using
// https://www.w3schools.com/js/js_validation.asp
validateMetadataForm = function (body, app) {
  // get number of experiments
  numExprs = body['expr num'];

  console.log('Formatting submitted form for metadata db...');
  console.log(`Body: ${body}`);
  console.log(`Body string: ${JSON.stringify(body)}`);

  // grab each field from form object and save as JSON
  const formattedMetadata = {};
  for (const key in body) {
    if (body.hasOwnProperty(key)) {
      // do something with e.g. req.body[key]
      let value = body[key];
      // console.log("value: " + value + "; which is of type: " + typeof(value))

      // if multiple entries (from multiple expr forms), remove extras...
      if (Array.isArray(value)) {
        // take only the relevant expr from the form
        // console.log('We found an array attribute!')
        if (value.length > numExprs) {
          // console.log('Cutting ' + value + ' into ' + value.slice(0, numExprs))
          value = value.slice(0, numExprs);
        }
      }
      formattedMetadata[key] = value;
    }
  }

  // console.log('file list is ' + formattedMetadata["filelist"])

  // if metadata has filelist, refactor appropriately
  if (formattedMetadata.filelist != '') {
    // console.log('parsing file list...: ' + formattedMetadata["filelist"])

    // file list was submitted alongside form
    parsedFilelist = JSON.parse(formattedMetadata.filelist);

    // console.log('parsed file list: ' + parsedFilelist)

    // store parsed filelist
    formattedMetadata.filelist = parsedFilelist;
  }

  // this function returns formatted metadata
  return formattedMetadata;
};

module.exports = validateMetadataForm;
