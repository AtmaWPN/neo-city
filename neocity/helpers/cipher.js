const tagRegex = /\<[^\>]\>/g;
const asciiInterval = [32, 126] // TODO: exclude certain characters from this range, probably "'", '"', "<", ">", "&"
const charCount = asciiInterval[1] - asciiInterval[0] + 1 // 95

function encipher(plaintext, key) {
  console.log("plaintext", plaintext);
  console.log("key", key);

  if (!key || !plaintext) return plaintext;

  var matches = []
  while ((match = tagRegex.exec(plaintext)) != null) {
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
      const output = actualMod((plaintext.charCodeAt(i) - key.charCodeAt(i % key.length)) - 32, charCount) + 32;
      console.log(plaintext.charCodeAt(i));
      console.log(key.charCodeAt(i % key.length));
      console.log(output);
      charCodes.push(output);
      i++;
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

function actualMod(input, mod) {
  return (input%mod+mod)%mod
}
