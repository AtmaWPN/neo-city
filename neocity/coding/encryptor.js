const cipherMode = document.getElementById("cipher-mode");

function encrypt() {
  const input = document.getElementById("blog-content-input");
  const key = document.getElementById("encryption-key-input");
  const output = document.getElementById("encrypted-blog-content");

  const processedCiphertext = cipherMode.innerText === "Decipher" ? decipher(input.value, key.value) : encipher(input.value, key.value);

  output.innerHTML = processedCiphertext;
  console.log(escapeJSON(processedCiphertext));
}

function toggleMode() {
  cipherMode.innerText === "Decipher" ? cipherMode.innerText = "Encipher" : cipherMode.innerText = "Decipher";
}