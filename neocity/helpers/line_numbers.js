function getLineHeight(element) { // google gemini ai-slop code
  const computedStyle = window.getComputedStyle(element);
  // getComputedStyle generally returns pixel values for 'line-height', 
  // even if the CSS used 'normal' or a unitless number.
  let lineHeight = computedStyle.lineHeight; 

  // If it still returns 'normal' (older browsers/edge cases), a fallback is needed.
  // However, modern browsers typically resolve 'normal' to a pixel value.
  if (lineHeight === 'normal') {
      // Fallback: create a temporary element to measure a single line of text.
      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
          display: inline-block;
          position: absolute;
          visibility: hidden;
          font-family: ${computedStyle.fontFamily};
          font-size: ${computedStyle.fontSize};
          line-height: normal;
      `;
      tempDiv.textContent = 'M'; // Use a tall character like 'M'
      document.body.appendChild(tempDiv);
      lineHeight = tempDiv.offsetHeight + 'px';
      document.body.removeChild(tempDiv);
  }
  
  // Parse the pixel value as a number
  return parseFloat(lineHeight);
}

function main() {
  var content = document.getElementById('content');
  var lineNumbers = document.createElement('ol');
  lineNumbers.id = "numbers";
  document.body.insertBefore(lineNumbers, content);
  
  var lines = "";
  
  function setLineNumbers() {
    lines = "<li></li>".repeat(content.offsetHeight / getLineHeight(content));
    if (lineNumbers.innerHTML !== lines) lineNumbers.innerHTML = lines;
    requestAnimationFrame(setLineNumbers);
  }
  
  requestAnimationFrame(setLineNumbers);
}

main();
