
function encrypt() {
  const plaintext = document.getElementById("blog-content-input");
  const key = document.getElementById("encryption-key-input");
  const output = document.getElementById("encrypted-blog-content");

  output.innerHTML = encipher(plaintext.value, key.value);
}
