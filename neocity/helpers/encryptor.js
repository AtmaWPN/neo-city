const outputContent = document.getElementById("encrypted-blog-content");
const key = document.getElementById("encryption-key-input");
const inputContent = document.getElementById("blog-content-input");

function encrypt() {
  outputContent.innerHTML = inputContent.value;
  if (!key.value || !inputContent.value) return;

  const regex = /\<[^\>]\>/g;
  var matches = []
  while ((match = regex.exec(str)) != null) {
    console.log("match found at " + match.index);
    matches.push(match)
  }

  let charCodes = [];
  for (let i = 0; i < inputContent.value.length; i++) {
    // if character is in a tag, skip
    var tag = matches.find((it) => i == it.index)
    if (tag) {
      i += tag.match.length
      // TODO: add charCodes from the tag
    }

    charCodes.push(inputContent.value.charCodeAt(i) - key.value.charCodeAt(i % key.value.length));
  }
  const cipherText = String.fromCharCode(...charCodes);
  console.log(cipherText);
  outputContent.textContent = btoa(cipherText);
  console.log(btoa(cipherText));
}
