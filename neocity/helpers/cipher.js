const tagRegex = /\<[^\>]+\>/g;
const asciiInterval = [32, 126];
const excludeChars = [60, 62];
const includedChars = [32,33,34,35,36,37,38,39,40,41,42,43,44,45,46,47,48,49,50,51,52,53,54,55,56,57,58,59,61,63,64,65,66,67,68,69,70,71,72,73,74,75,76,77,78,79,80,81,82,83,84,85,86,87,88,89,90,91,92,93,94,95,96,97,98,99,100,101,102,103,104,105,106,107,108,109,110,111,112,113,114,115,116,117,118,119,120,121,122,123,124,125,126];
const charCount = includedChars.length;

function encipher(plaintext, key) {
  console.log("plaintext", plaintext);
  console.log("key", key);

  if (!key || !plaintext) return plaintext;

  var matches = []
  while ((match = tagRegex.exec(plaintext)) != null) {
    console.log("match found at " + match.index);
    matches.push(match);
  }

  let charCodes = [];
  let i = 0;
  while (i < plaintext.length) {
    var tag = matches.find((it) => it.index == i);
    if (tag) {
      i += tag[0].length;
      console.log("TAG:", tag[0]);
      for (let c = 0; c < tag[0].length; c++) {
        console.log(tag[0].charAt(c));
        charCodes.push(tag[0].charAt(c).charCodeAt());
      }
    } else {
      const output = actualMod((includedChars.indexOf(plaintext.charCodeAt(i)) - includedChars.indexOf(key.charCodeAt(i % key.length))), charCount);
      console.log(plaintext.charCodeAt(i));
      console.log(key.charCodeAt(i % key.length));
      console.log("output", output, includedChars[output]);
      charCodes.push(includedChars[output]);
      i++;
    }
  }
  console.log("CHAR CODES:", charCodes);
  const ciphertext = String.fromCharCode(...charCodes);
  return ciphertext;
}

function decipher(ciphertext, key) {
  console.log("ciphertext", ciphertext);
  console.log("key", key);

  if (!key || !ciphertext) return ciphertext;

  var matches = []
  while ((match = tagRegex.exec(ciphertext)) != null) {
    console.log("match found at " + match.index);
    matches.push(match);
  }

  let charCodes = [];
  let i = 0;
  while (i < ciphertext.length) {
    var tag = matches.find((it) => it.index == i);
    if (tag) {
      i += tag[0].length;
      console.log("TAG:", tag[0]);
      for (let c = 0; c < tag[0].length; c++) {
        console.log(tag[0].charAt(c));
        charCodes.push(tag[0].charAt(c).charCodeAt());
      }
    } else {
      const output = actualMod((includedChars.indexOf(ciphertext.charCodeAt(i)) + includedChars.indexOf(key.charCodeAt(i % key.length))), charCount);
      console.log(ciphertext.charCodeAt(i));
      console.log(key.charCodeAt(i % key.length));
      console.log("output", output, includedChars[output]);
      charCodes.push(includedChars[output]);
      i++;
    }
  }
  console.log("CHAR CODES:", charCodes);
  const plaintext = String.fromCharCode(...charCodes);
  return plaintext;
}

function actualMod(input, mod) {
  return (input%mod+mod)%mod
}

function escapeHTML(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function unescapeHTML(text) {
  return String(text)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function escapeJSON(text) {
  return String(text)
    .replaceAll("\b", "\\b")
    .replaceAll("\f", "\\f")
    .replaceAll("\n", "\\n")
    .replaceAll("\r", "\\r")
    .replaceAll("\t", "\\t")
    .replaceAll('"', '\\"')
    .replaceAll("\\", "\\\\")
}
