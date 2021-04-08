// function that converts a form json object into a formatted string for displaying in a text box
function formElementObjToString(formJSONObj) {
  // assuming one object
  id = formJSONObj._id;
  name = formJSONObj['element name'];
  elements = formJSONObj['elements'];;

  // format string
  // double escape to render properly in html
  formattedString = `${name}\\n`
  
  for (i = 0; i < elements.length; i++) {
    prompt = elements[i].prompt;
    type = elements[i]['element type'];
    formattedString += `${prompt}\\n${type}\\n`;

    // append options if it's a select
    if (type == 'dropdown') {
      // grab options
      options = elements[i].options;
  
      // append iteratively
      for (i = 0; i < options.length; i++) {
        formattedString = `${formattedString + options[i]}\\n`;
      }
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

  name = splitString[0];
  elements = splitString.slice(1);
  obj = {
    'element name': name,
    'elements': [],
  };

  let i=0;
  while (i < elements.length) {
    let element_type = elements[i];
    if (!(types.indexOf(element_type) > -1)) {
      errmsg = 'Form text box not formatted correctly!';
      throw errmsg;
    }
    i += 1;

    prompt = elements[i];
    i += 1;

    let element = {
      'element type': element_type,
      prompt
    }

    if ('dropdown' === element_type) {
      let options = [];
      while (i < elements.length && '' !== elements[i]) {
        // remove leading/trailing whitespace
        trimmed = elements[i].trim();
        if (trimmed.length > 0) {
          options.push(trimmed);
        }
        i += 1;
      }
      element.options = options;
    }

    obj.elements.push(element);
    i += 1;
  }

  return obj;
}

// exports
exports.formElementObjToString = formElementObjToString;
exports.formElementStringToObj = formElementStringToObj;
