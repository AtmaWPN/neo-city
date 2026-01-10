
const prev = document.getElementById("prev");
const next = document.getElementById("next");

const title = document.getElementById("blog-title");
const subtitle = document.getElementById("blog-subtitle");
const decryptor = document.getElementById("decryptor");
const key = document.getElementById("decryption-key");
const content = document.getElementById("blog-content");

const postsJson = fetch(`${window.location.origin}/blog/posts.json`)
  .then((response) => response.json())
  .then((json) => {
    const queryParams = new URLSearchParams(window.location.search);
    const postParam = queryParams.get("post");
    const blogPost = postParam !== null && !isNaN(parseInt(postParam)) ? parseInt(postParam) : json.posts.length - 1;
    const postIndex = json.posts.length - 1 - blogPost;
    
    prev.href = `${window.location.origin}/blog.html?post=${Math.max(blogPost - 1, 0)}`;
    next.href = `${window.location.origin}/blog.html${blogPost >= json.posts.length - 1 ? "" : `?post=${blogPost + 1}`}`;
    
    title.innerHTML = `${json.posts[postIndex].date} - ${json.posts[postIndex].title}`;
    if (json.posts[postIndex].subtitle) {
      subtitle.innerHTML = json.posts[postIndex].subtitle;
      subtitle.removeAttribute("hidden");
    } else {
      subtitle.setAttribute("hidden", "");
    }

    if (json.posts[postIndex].encrypted) {
      decryptor.style.display = "block";
    } else {
      decryptor.style.display = "none";
    }
    
    content.innerHTML = json.posts[postIndex].content;
    return json;
  });

function decrypt() {
  postsJson.then((json) => {
    const queryParams = new URLSearchParams(window.location.search);
    const postParam = queryParams.get("post");
    const blogPost = postParam !== null && !isNaN(parseInt(postParam)) ? parseInt(postParam) : json.posts.length - 1;
    const postIndex = json.posts.length - 1 - blogPost;

    content.innerHTML = decipher(json.posts[postIndex].content, key.value);
  })
}
