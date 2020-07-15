// from https://gist.github.com/darrenmothersele/87869b6b1862b4e8cbb57d13051a3cd0
// by way of https://medium.com/@dazcyril/generating-cryptographic-random-state-in-javascript-in-the-browser-c538b3daae50
// random state string for oauth2

function randstr() {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  let text = '';
  for (let i = 0; i < 40; i++) {
  		text += possible.charAt(Math.floor(Math.random() * possible.length));
  }

  return text;
}

module.exports = randstr;
