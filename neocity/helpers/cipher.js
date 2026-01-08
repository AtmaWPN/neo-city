const tagRegex = /\<[^\>]\>/g;
const asciiInterval = [32, 126] // TODO: exclude certain characters from this range
const charCount = asciiInterval[1] - asciiInterval[0] + 1

function encipher(plaintext, key) {
  if (!key || !plaintext) return;

  var matches = []
  while ((match = regex.exec(plaintext)) != null) {
    console.log("match found at " + match.index);
    matches.push(match)
  }

  let charCodes = [];
  let i = 0;
  while (i < plaintext.length) {
    // if character is in a tag, skip
    var tag = matches.find((it) => it.index == i);
    if (tag) {
      i += tag[0].length;
      console.log("TAG:", tag[0]);
      for (let c = 0; c < tag[0].length; c++) {
        console.log(tag[0].charAt(c));
        charCodes.push(tag[0].charAt(c).charCodeAt());
      }
    } else {
      i++;
      charCodes.push(plaintext.charCodeAt(i) - key.charCodeAt(i % key.length)); // TODO: mod output to within the asciiInterval
    }
  }
  console.log("CHAR CODES:", charCodes);
  const ciphertext = String.fromCharCode(...charCodes);
  console.log("CIPHERTEXT:", ciphertext);
  console.log("BTOA:", btoa(ciphertext));
  return ciphertext;
}

function decipher(ciphertext, key) {

}
