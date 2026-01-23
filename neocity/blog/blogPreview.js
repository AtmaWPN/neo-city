const title = document.getElementById("blog-title");
const subtitle = document.getElementById("blog-subtitle");
const date = document.getElementById("blog-date");
const content = document.getElementById("blog-preview");

let blogRendered = false;

const postsJson = fetch(`${window.location.origin}/blog/posts.json`)
  .then((response) => response.json())
  .then((json) => {
    let posts = json.posts.filter((it) => !it.encrypted)

    posts.sort((a, b) => a.day - b.day)
      .sort((a, b) => a.month - b.month)
      .sort((a, b) => a.year - b.year);

    const postIndex = posts.length - 1;
    if (postIndex === -1 || postIndex === null || postIndex === undefined) {
      content.innerHTML = `<p style="color:#f14c4c;">Invalid Date Error: ${
        !Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)
          ? `There is no post from ${month}/${day}/${year}`
          : `${postParam.join("-")} is not a valid date`
      }</p><p>Be sure to format dates yyyy-mm-dd</p>`;
      return json;
    }
    
    title.innerHTML = posts[postIndex].title;
    date.innerHTML = posts[postIndex].date;

    if (posts[postIndex].subtitle) {
      subtitle.innerHTML = posts[postIndex].subtitle;
      subtitle.removeAttribute("hidden");
    } else {
      subtitle.setAttribute("hidden", "");
    }

    content.innerHTML = posts[postIndex].content.replaceAll(/\<[^\>]+\>/g, "").split(" ").slice(0, 23).join(" ") + "...";

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        blogRendered = true;
        processStyle();
      })
    })
    return json;
  });
