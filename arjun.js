let posts = JSON.parse(localStorage.getItem("posts")) || [];

function showPosts() {

  const postsContainer = document.getElementById("posts");

  postsContainer.innerHTML = "";

  posts.reverse().forEach((post, index) => {

    postsContainer.innerHTML += `
      <div class="post">
        <h3>${post.title}</h3>

        <small>${post.date}</small>

        <p>${post.content}</p>

        <button class="delete-btn" onclick="deletePost(${index})">
          Delete
        </button>
      </div>
    `;
  });
}

function addPost() {

  const title = document.getElementById("title").value;

  const content = document.getElementById("content").value;

  if(title === "" || content === ""){
    alert("Please fill all fields");
    return;
  }

  const post = {
    title: title,
    content: content,
    date: new Date().toLocaleString()
  };

  posts.push(post);

  localStorage.setItem("posts", JSON.stringify(posts));

  document.getElementById("title").value = "";
  document.getElementById("content").value = "";

  showPosts();
}

function deletePost(index){

  posts.splice(index,1);

  localStorage.setItem("posts", JSON.stringify(posts));

  showPosts();
}

showPosts();