
function processStyle() {
    const pageContent = document.getElementById("content");
    let htmlString = pageContent.innerHTML;

    const keywords = [ // the point of these words is that they are part of who I am
        "atma",
        "atmaweapon",
        "environment",
        "control",
        "commitment",
        "friction"
    ];

    const keywordRegex = new RegExp(keywords.map((it) => `((?![^<]*>)\\b${it}\\b)`).join("|"), "gi");
    htmlString = htmlString.replaceAll(keywordRegex, (match) => `<em>${match}</em>`);


    const importantWords = [ // these words just refer to things that are important to me
        "motorcycle"
    ]

    const importantWordRegex = new RegExp(importantWords.map((it) => `((?![^<]*>)\\b${it}\\b)`).join("|"), "gi");
    htmlString = htmlString.replaceAll(importantWordRegex, (match) => `<strong>${match}</strong>`);


    const punctuationRegex = /(?![^<]*>)[!%^&*()-+=/\\|{}\[\]:;,\.\?]/gi;
    htmlString = htmlString.replaceAll(punctuationRegex, (match) => `<span class="operator">${match}</span>`);


    let quoteCounter = 0;
    htmlString = htmlString.replaceAll(/(?![^<]*>)"/gi, () => {
        quoteCounter++;
        return quoteCounter % 2 === 1 ? "<span class=\"string\">\"" : "\"</span>"
    })

    pageContent.innerHTML = htmlString;


    const paragraphs = document.getElementsByTagName("p");
    const lineHeight = getLineHeight(pageContent);
    const indentLines = [...paragraphs].map((paragraph) => {
        const indentLine = document.createElement("div");
        indentLine.setAttribute("style", `width: 1px; background-color: #404040; position: absolute; top: ${lineHeight}px; left: 0;`);
        paragraph.appendChild(indentLine);
        return {indentLine, paragraph}
    })

    function setIndentLinesHeight() {
        indentLines.forEach(({indentLine, paragraph}) => {
            indentLine.setAttribute("style", `height: ${paragraph.offsetHeight - lineHeight}px; width: 1px; background-color: #404040; position: absolute; top: ${lineHeight}px; left: 0;`);
        })
        requestAnimationFrame(setIndentLinesHeight);
    }
    requestAnimationFrame(setIndentLinesHeight);


    const lists = document.getElementsByTagName("ul");
    const listIndentLines = [...lists].map((list) => {
        const indentLine = document.createElement("div");
        indentLine.setAttribute("style", `width: 1px; background-color: #404040; position: absolute; top: 0px; left: 0;`);
        list.appendChild(indentLine);
        return {indentLine, list}
    })

    function setListIndentLinesHeight() {
        listIndentLines.forEach(({indentLine, list}) => {
            indentLine.setAttribute("style", `height: ${list.offsetHeight}px; width: 1px; background-color: #404040; position: absolute; top: 0px; left: 0;`);
        })
        requestAnimationFrame(setListIndentLinesHeight);
    }
    requestAnimationFrame(setListIndentLinesHeight);
}

try {
    if (blogRendered) {
        processStyle();
    }
} catch {
    processStyle();
}