const plaintext = getElementById("blog-content-input");
const key = getElementById("encryption-key-input");
const output = getElementById("encrypted-blog-content");

function encrypt() {
  output.innerHTML = encipher(plaintext.value, key.value);
}