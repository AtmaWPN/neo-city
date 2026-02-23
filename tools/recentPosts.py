import urllib.request
import json


print("Recent Posts")

try:
    with urllib.request.urlopen("https://atmaweapon.neocities.org/blog/posts.json") as response:
        body = response.read().decode('utf-8')
        data = json.loads(body)
        recent_posts = list(map(lambda post: f"{post["date"]} - {post["title"]}", data["posts"][:5]))
        for item in recent_posts:
            print(item)
except urllib.error.HTTPError as e:
    print(f"HTTP error: {e.code} {e.reason}")
except urllib.error.URLError as e:
    print(f"URL error: {e.reason}")
