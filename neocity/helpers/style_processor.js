const pageContent = document.getElementById("content");

const keywords = [ // the point of these words is that they are part of who I am
    "atma",
    "atmaweapon",
    "environment",
    "control",
    "commitment",
    "friction"
];

const keywordRegex = new RegExp(keywords.map((it) => `((?![^<]*>)\\b${it}\\b)`).join("|"), "gi");
pageContent.innerHTML = pageContent.innerHTML.replaceAll(keywordRegex, (match) => `<em>${match}</em>`);


const importantWords = [ // these words just refer to things that are important to me
    "motorcycle"
]

const importantWordRegex = new RegExp(importantWords.map((it) => `((?![^<]*>)\\b${it}\\b)`).join("|"), "gi");
pageContent.innerHTML = pageContent.innerHTML.replaceAll(importantWordRegex, (match) => `<strong>${match}</strong>`);


const punctuationRegex = /(?![^<]*>)[!%^&*()-+=/\\|{}\[\];,\.\?]/gi;

pageContent.innerHTML = pageContent.innerHTML.replaceAll(punctuationRegex, (match) => {
    console.log(match);
    return `<span class="operator">${match}</span>`
});


let quoteCounter = 0;
pageContent.innerHTML = pageContent.innerHTML.replaceAll(/(?![^<]*>)"/gi, () => {
    quoteCounter++;
    return quoteCounter % 2 === 1 ? "<span class=\"string\">\"" : "\"</span>"
})

