
"use strict";

const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");
const musicSearch = document.getElementById("musicSearch");
const searchMessage = document.getElementById("searchMessage");
const accountNotice = document.getElementById("accountNotice");
const accountMessage = document.getElementById("accountMessage");

// Display the current year.
document.getElementById("year").textContent =
  new Date().getFullYear();

// Open and close the mobile navigation.
menuToggle.addEventListener("click", () => {
  const isOpen = navigation.classList.toggle("open");

  menuToggle.setAttribute("aria-expanded", String(isOpen));
  menuToggle.textContent = isOpen ? "✕" : "☰";
});

// Close the mobile navigation after choosing a section.
document.querySelectorAll(".nav-link").forEach((link) => {
  link.addEventListener("click", () => {
    navigation.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.textContent = "☰";

    document.querySelectorAll(".nav-link").forEach((item) => {
      item.classList.remove("active");
    });

    link.classList.add("active");
  });
});

// The real music search will be added when the library exists.
musicSearch.addEventListener("input", () => {
  const query = musicSearch.value.trim();

  if (query.length === 0) {
    searchMessage.textContent = "";
    return;
  }

  searchMessage.textContent =
    "Music search will work when the song library is connected.";
});

// Clearly label the account button as a future feature.
accountNotice.addEventListener("click", () => {
  accountMessage.textContent =
    "Registration and secure sign-in will be enabled in a later stage.";
});

console.log("JabezTunes website loaded successfully.");

const uploadForm = document.getElementById("uploadForm");
const uploadMessage = document.getElementById("uploadMessage");

if (uploadForm && uploadMessage && supabaseClient) {
  uploadForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const submitButton = uploadForm.querySelector(
      'button[type="submit"]'
    );
    submitButton.disabled = true;
    uploadMessage.textContent = "Uploading...";

    try {
      const { data: sessionData, error: sessionError } =
        await supabaseClient.auth.getSession();

      if (sessionError) throw sessionError;

      const user = sessionData.session?.user;
      if (!user) {
        throw new Error("Please sign in before uploading music.");
      }

      const { data: profile, error: profileError } =
        await supabaseClient
          .from("profiles")
          .select("id, display_name, role")
          .eq("id", user.id)
          .single();

      if (profileError) throw profileError;

      if (!["admin", "artist"].includes(profile.role)) {
        throw new Error(
          "Your account must be approved as an artist before uploading."
        );
      }

      const title = document.getElementById("songTitle").value.trim();
      const genre = document.getElementById("songGenre").value.trim();
      const description =
        document.getElementById("songDescription").value.trim();
      const audioFile = document.getElementById("audioFile").files[0];
      const coverFile = document.getElementById("coverFile").files[0];

      if (!title || !genre || !audioFile) {
        throw new Error("Enter the title and genre and choose an audio file.");
      }

      if (audioFile.size > 20 * 1024 * 1024) {
        throw new Error("The audio file must be 20 MB or smaller.");
      }

      const allowedAudioTypes = [
        "audio/mpeg",
        "audio/mp4",
        "audio/ogg",
        "audio/wav",
        "audio/aac"
      ];

      if (!allowedAudioTypes.includes(audioFile.type)) {
        throw new Error("Choose a supported audio file.");
      }

      if (coverFile) {
        if (coverFile.size > 5 * 1024 * 1024) {
          throw new Error("The cover image must be 5 MB or smaller.");
        }

        if (!["image/jpeg", "image/png", "image/webp"].includes(coverFile.type)) {
          throw new Error("Choose a JPEG, PNG, or WebP cover image.");
        }
      }

      const audioPath =
        `${user.id}/${crypto.randomUUID()}-${audioFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

      const { error: audioError } = await supabaseClient.storage
        .from("music")
        .upload(audioPath, audioFile, {
          upsert: false,
          contentType: audioFile.type
        });

      if (audioError) throw audioError;

      let coverPath = null;

      if (coverFile) {
        coverPath =
          `${user.id}/${crypto.randomUUID()}-${coverFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;

        const { error: coverError } = await supabaseClient.storage
          .from("covers")
          .upload(coverPath, coverFile, {
            upsert: false,
            contentType: coverFile.type
          });

        if (coverError) {
          await supabaseClient.storage.from("music").remove([audioPath]);
          throw coverError;
        }
      }

      const { error: insertError } = await supabaseClient
        .from("songs")
        .insert({
          artist_id: user.id,
          title,
          artist_name: profile.display_name || "JabezTunes Artist",
          genre,
          description,
          audio_path: audioPath,
          cover_path: coverPath
        });

      if (insertError) {
        await supabaseClient.storage.from("music").remove([audioPath]);
        if (coverPath) {
          await supabaseClient.storage.from("covers").remove([coverPath]);
        }
        throw insertError;
      }

      uploadForm.reset();
      uploadMessage.textContent =
        "Song submitted successfully! It will be available after approval.";
    } catch (error) {
      uploadMessage.textContent =
        error.message || "Upload failed. Please try again.";
    } finally {
      submitButton.disabled = false;
    }
  });
            }


