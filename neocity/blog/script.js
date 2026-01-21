
const prev = document.getElementById("prev");
const next = document.getElementById("next");

const title = document.getElementById("blog-title");
const subtitle = document.getElementById("blog-subtitle");
const decryptor = document.getElementById("decryptor");
const key = document.getElementById("decryption-key");
const content = document.getElementById("blog-content");

let blogRendered = false;

const postsJson = fetch(`${window.location.origin}/blog/posts.json`)
  .then((response) => response.json())
  .then((json) => {
    console.log(json);
    const queryParams = new URLSearchParams(window.location.search);
    const showEncryptedParam = queryParams.get("e");
    const postParam = queryParams.get("post")?.split("-");
    const [year, month, day] = postParam?.length === 3 ? postParam.map((it) => parseInt(it)) : [null, null, null];
    console.log(year, month, day);

    let posts = json.posts;
    if (showEncryptedParam !== "true") {
      posts = json.posts.filter((it) => !it.encrypted)
      if (posts.every((it) => it.year !== year || it.month !== month || it.day !== day)) {
        const actualPost = json.posts.find((it) => it.year === year && it.month === month && it.day === day);
        if (actualPost) {
          posts.push(actualPost);
        }
      }
    }
    posts.sort((a, b) => a.day - b.day)
      .sort((a, b) => a.month - b.month)
      .sort((a, b) => a.year - b.year);
    console.log(posts);

    const postIndex = postParam?.length === 3 ? posts.findIndex((it) => it.year === year && it.month === month && it.day === day) : posts.length - 1;
    console.log(postIndex);
    if (postIndex === -1 || postIndex === null || postIndex === undefined) {
      decryptor.style.display = "none";
      content.innerHTML = `<p style="color:#f14c4c;">Invalid Date Error: ${
        !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)
          ? `There is no post from ${month}/${day}/${year}`
          : `${postParam.join("-")} is not a valid date`
      }</p><p>Be sure to format dates yyyy-mm-dd</p>`;
      return json;
    }
    
    const prevPost = posts[postIndex - 1] ?? posts[0];
    prev.href = `${window.location.origin}/blog.html?post=${prevPost.year}-${prevPost.month}-${prevPost.day}${showEncryptedParam === "true" ? "&e=true" : ""}`;
    const nextPost = posts[postIndex + 1] ?? posts[posts.length - 1];
    next.href = `${window.location.origin}/blog.html?post=${nextPost.year}-${nextPost.month}-${nextPost.day}${showEncryptedParam === "true" ? "&e=true" : ""}`;
    
    title.innerHTML = `${posts[postIndex].date} - ${posts[postIndex].title}`;
    console.log(title.innerHTML);
    if (posts[postIndex].subtitle) {
      subtitle.innerHTML = posts[postIndex].subtitle;
      subtitle.removeAttribute("hidden");
    } else {
      subtitle.setAttribute("hidden", "");
    }

    if (posts[postIndex].encrypted) {
      decryptor.style.display = "block";
    } else {
      decryptor.style.display = "none";
    }
    
    content.innerHTML = posts[postIndex].content;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blogRendered = true;
        processStyle();
      })
    })
    return json;
  });

function decrypt() {
  postsJson.then((json) => {
    const queryParams = new URLSearchParams(window.location.search);
    const postParam = queryParams.get("post")?.split("-");
    const [year, month, day] = postParam?.length === 3 ? postParam.map((it) => parseInt(it)) : [null, null, null];
    const postIndex = postParam?.length === 3 ? json.posts.findIndex((it) => it.year === year && it.month === month && it.day === day) : posts.length - 1;

    content.innerHTML = decipher(json.posts[postIndex].content, key.value);
  })
}
