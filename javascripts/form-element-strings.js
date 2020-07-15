// function that converts a form json object into a formatted string for displaying in a text box
function formElementObjToString(formJSONObj) {
  // assuming one object
  id = formJSONObj._id;
  name = formJSONObj['element name'];
  prompt = formJSONObj.prompt;
  type = formJSONObj['element type'];

  // console.log('id: ' + id)
  // console.log('name: ' + name)
  // console.log('prompt: ' + prompt)
  // console.log('type: ' + type)

  // format string
  // double escape to render properly in html
  formattedString = `${name}\\n${prompt}\\n${type}\\n`;

  // append options if it's a select
  if (type == 'dropdown') {
    // grab options
    options = formJSONObj.options;

    // append iteratively
    for (i = 0; i < options.length; i++) {
      formattedString = `${formattedString + options[i]}\\n`;
    }
  }

  return formattedString;
}

// function that converts a form element string to a json obj
// also does some basic format checking to make sure we've formatted correctly
function formElementStringToObj(formJSONString) {
  types = ['dropdown', 'text', 'textbox'];

  // replace possible line breaks with regular one
  fmtString = formJSONString.replace(/(\r\n|\r)/gm, '\n');

  // split on return
  splitString = fmtString.split('\n');

  // check to make sure type is in right place
  typeNdx = 2;
  if (!(types.indexOf(splitString[typeNdx]) > -1)) {
    errmsg = 'Form text box not formatted correctly!';
    throw errmsg;
  }

  // grab fields
  name = splitString[0];
  prompt = splitString[1];
  type = splitString[2];

  // build object
  obj = {
    'element name': name,
    'element type': type,
    prompt,
  };

  // if dropdown add options
  if (type == 'dropdown') {
    options = [];
    for (i = typeNdx + 1; i < splitString.length; i++) {
      // remove leading/trailing whitespace
      trimmed = splitString[i].trim();

      // append to options
      if (trimmed.length > 0) {
        // console.log('trimmed[' + i + ']: ' + trimmed)
        options.push(trimmed);
      }
    }

    // update obj
    obj.options = options;

    // insert a blank line option at the first option actually do this on the front end
    // obj["options"] = obj["options"].splice(0, 0, "")
  }

  return obj;
}

// exports
exports.formElementObjToString = formElementObjToString;
exports.formElementStringToObj = formElementStringToObj;
