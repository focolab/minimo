// function that converts a form json object into a formatted string for displaying in a text box
function formElementObjToString(formJSONObj) {
  // assuming one object
  id = formJSONObj._id;
  form_name = formJSONObj['form name'];
  elements = formJSONObj['elements'];;
  
  formattedString = `${form_name}\\n`

  for (i = 0; i < elements.length; i++) {
    formattedString += '\\n'
    name = elements[i]['element name'];
    prompt = elements[i].prompt;
    type = elements[i]['element type'];

    // format string
    // double escape to render properly in html
    formattedString += `${name}\\n${prompt}\\n${type}\\n`;

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
  // split on double newline
  splitString = fmtString.split('\n\n');

  form_name = splitString[0];
  elements = splitString.slice(1);
  obj = {
    'form name': form_name,
    'elements': [],
  };

  for (i = 0; i < elements.length; i++) {
    lines = elements[i].split('\n');

    let element_type = lines[2];
    if (!(types.indexOf(element_type) > -1)) {
      errmsg = 'Form text box not formatted correctly!';
      throw errmsg;
    }

    element_name = lines[0];
    prompt = lines[1];

    let element = {
      'element name': element_name,
      'element type': element_type,
      prompt
    }

    if ('dropdown' === element_type) {
      let options = [];
      for (j = 3; j < lines.length; j++) {
        // remove leading/trailing whitespace
        trimmed = lines[j].trim();
        if (trimmed.length > 0) {
          options.push(trimmed);
        }
      }
      element.options = options;
    }

    obj.elements.push(element);
  }

  return obj;
}

// exports
exports.formElementObjToString = formElementObjToString;
exports.formElementStringToObj = formElementStringToObj;
