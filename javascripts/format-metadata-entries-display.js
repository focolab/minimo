function formatMetadataEntriesForDisplay(metadataJSONObj, metadataFields) {
  // function for formatting and ordering json objects for displaying
  // takes care of some parsing and makes sure we only display the important
  // data to the user...

  // Set form order here
  fields = [
    'date uploaded',
    // 'date recorded',
    // 'username',
    // 'subject strain',
    // 'subject treatment',
    // 'project',
    // 'apparatus',
    // 'recording comments',
    '_id',
  ];

  for (i = 0; i < metadataFields.length; i++) {
    field = metadataFields[i];
    if (!(fields.includes(field))) {
      fields.push(field);
    }
  }

  // TODO how do I get formatted entries ordered on date?
  // newer entries have 'date uploaded',
  // older entries have...?
  // lets look up if we have some useful order objects functions

  // assuming list of object
  objList = [];
  for (i = 0; i < metadataJSONObj.length; i++) {
    // iterate in order through our hardcoded fields
    innerObj = {};
    for (j = 0; j < fields.length; j++) {

      // if obj has key, append key/obj to formatted obj
      if (metadataJSONObj[i].hasOwnProperty(fields[j])) {
        innerObj[fields[j]] = metadataJSONObj[i][fields[j]];
      }

      // link to minio folder if possible
      if ('filelist' in metadataJSONObj[i]) {
        if ('folderID' in metadataJSONObj[i].filelist) {
          innerObj.folderID = metadataJSONObj[i].filelist.folderID;
        }
      }
    }

    // append inner object to list
    objList.push(innerObj);
  }

  // sort results by date uploaded
  objList.sort((a, b) => parseInt(b['date uploaded']) - parseInt(a['date uploaded']));

  return objList;
}

module.exports = formatMetadataEntriesForDisplay;
