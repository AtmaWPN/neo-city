
function encrypt() {
  const input = document.getElementById("blog-content-input");
  const key = document.getElementById("encryption-key-input");
  const output = document.getElementById("encrypted-blog-content");
  const mode = document.querySelector('input[name="mode"]:checked').value;

  const processedCiphertext = mode === "decipher" ? decipher(input.value, key.value) : encipher(input.value, key.value);

  output.innerHTML = processedCiphertext;
  console.log(escapeJSON(processedCiphertext));
}
