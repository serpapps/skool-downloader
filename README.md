# Skool Video Downloader (Browser Extension)

A browser extension that adds a download button to Skool (`skool.com`) classroom pages to easily download videos for convenient offline viewing.

- Save entire school classrooms and course content for unlimited offline access anytime, anywhere
- Protect your educational investment by downloading all materials before courses expire or disappear
- Create a personal library of video lectures, assignments, and resources that you own forever
- Never lose access to paid courses again - backup everything before platforms shut down or remove content

![skool-downloader](https://github.com/user-attachments/assets/0b750532-0dd0-4768-a8c4-489b4e92c1c6)

## 🔗 Links

- 🎁 Get it [here](https://serp.ly/skool-video-downloader-extension)
- ❓ Check FAQs [here](https://github.com/orgs/serpapps/discussions/categories/faq)
- 🐛 Report bugs [here](https://github.com/serpapps/skool-downloader/issues)
- 🆕 Request features [here](https://github.com/serpapps/skool-downloader/issues)

### Resources

- 💬 [Community](https://serp.ly/@serp/community)
- 💌 [Newsletter](https://serp.ly/@serp/email)
- 🛒 [Shop](https://serp.ly/@serp/store)
- 🎓 [Courses](https://serp.ly/@serp/courses)

## Table of Contents
- [Features](#features)
- [Screenshots](#screenshots)
- [Videos](#videos)
- [Installation Instructions](#installation-instructions)

## Features

- One-click download from any video page
- 100% privacy-friendly – no tracking or data collection
- Auto-detect videos on the page
- Floating download button
- 1-on-1 support via our community



## Screenshots

<img width="600" alt="skool video downloader 1" src="https://github-production-user-asset-6210df.s3.amazonaws.com/45643901/476263189-ebf39f38-8331-42d9-a652-02a7af804b56.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250813%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250813T000746Z&X-Amz-Expires=300&X-Amz-Signature=f0969db3e1cd328f54d307e0a753e76cfc0dadcc0389d1b8471e9d96c51eff09&X-Amz-SignedHeaders=host" />

---

<img width="600" alt="skool video downloader 2" src="https://github-production-user-asset-6210df.s3.amazonaws.com/45643901/476263193-14211553-216e-47b5-8c20-3cb3c962d10d.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250813%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250813T000753Z&X-Amz-Expires=300&X-Amz-Signature=cc148845f862bb52cd2598f1c38116a1b8eee70fad693dee5051658ccae19ac9&X-Amz-SignedHeaders=host" />

---

<img width="600" alt="skool video downloader 3" src="https://github-production-user-asset-6210df.s3.amazonaws.com/45643901/476263257-e5054dce-6e6f-484c-81bd-09fbb78ecbf6.png?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIAVCODYLSA53PQK4ZA%2F20250813%2Fus-east-1%2Fs3%2Faws4_request&X-Amz-Date=20250813T000759Z&X-Amz-Expires=300&X-Amz-Signature=25fd87a78b7cbc8d17f0c5cf71ae7e5a5e9dfe69325bdac560138b00403c57b5&X-Amz-SignedHeaders=host" />



## Videos


<br><br>
<a href="https://www.youtube.com/watch?v=YBBSkdb1YAw" target="_blank">
<img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/how-to-download-skoolcom-course-videos-loom-vimeo-wistia-youtube-community-posts.jpg" width="700px">
</a>


## [2.0.0] - 2025-08-09

### Added
- Support for downloading videos across all Skool.com page types
- Multi-platform video support for major video hosting services
- Enhanced compatibility with various video formats

### Supported Platforms & Pages

| Page Type | Wistia | Loom | Vimeo | YouTube |
|-----------|--------|------|-------|---------|
| Classrooms | ✅ | ✅ | ✅ | ✅ |
| Community Posts | ✅ | ✅ | ✅ | ✅ |
| About Pages | ✅ | ✅ | ✅ | ✅ |

### What's New
- **Universal Page Support**: Download videos from classrooms, community posts, and about pages
- **Multi-Platform Compatibility**: Full support for Wistia, Loom, Vimeo, and YouTube videos
- **Enhanced Detection**: Improved video detection across all supported platforms
- **Streamlined Experience**: Consistent download functionality regardless of page type or video platform


## Installation Instructions

Each release now has its own specific installation instructions to make it easier to updgrade, or rollback, to different versions.

You can find the installation instructions for the specific version in the release: 

- https://github.com/serpapps/skool-downloader/releases


### How to Use

1. Visit the skool.com page where you want to download the video ('refresh' the page if needed)
2. Click the extension icon in your browser
3. Wait a second or two for the video to load (Click the video on the page if needed) 
4. Click "Download video"

## Follow along installation & setup 👇

<a href="https://www.youtube.com/watch?v=YBBSkdb1YAw" target="_blank">
<img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/how-to-download-skoolcom-course-videos-loom-vimeo-wistia-youtube-community-posts.jpg" width="700px">
</a>


## Permissions Justifications

### activeTab  
We use the `activeTab` permission so the extension can interact with the currently open Skool lesson page when the user activates the extension. This is necessary to detect and process downloadable video content on the page.


### clipboardRead  
The `clipboardRead` permission is used so the extension can read download links or other relevant information from the clipboard, if the user chooses to copy a video URL or lesson link for processing within the extension.


### contextMenus  
We use the `contextMenus` permission to add right-click options, making it easy for users to initiate downloads or perform actions related to Skool classroom videos directly from the context menu.


### cookies  
The `cookies` permission is required to access authentication tokens and session cookies for Skool.com. This allows the extension to properly access and download videos that require user authentication.


### downloads  
We use the `downloads` permission to save videos from Skool classroom lessons to the user’s device for offline viewing. This is a core function of the extension.


### notifications  
The `notifications` permission is used to inform the user about the progress, completion, or errors related to downloads, improving transparency and user experience.


### offscreen  
The `offscreen` permission allows us to process video data or perform background tasks (such as fetching video streams) without interrupting the user’s browsing experience.


### scripting  
We use the `scripting` permission to inject and execute scripts on Skool lesson pages. This is necessary to identify video elements and facilitate downloading.


### webNavigation  
The `webNavigation` permission is needed to detect when the user navigates to new Skool lesson pages. This allows the extension to automatically update its state and provide download options on the correct pages.



<details>
  <summary>More</summary>


Skool is an online community platform that combines discussion forums, online courses, and private groups into one simple, distraction-free space designed for creators, educators, and entrepreneurs who want to build engaged communities, deliver content, and grow their businesses—all.

However, like many course platforms, they don't provide a way to download the videos that you (the actual users) pay for access to - or even offer an offline viewing option.

So we created a way for you to download your skool.com classroom videos even if you're not technically inclined.



<a href="https://www.youtube.com/watch?v=WRSzeFI_Q7g" target="_blank">
<img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/easily-download-skool-videos-free-chrome-extension-1752429029672.jpg" width="700px">
</a>

<br><br>

<a href="https://www.youtube.com/watch?v=J9eetd89HZk" target="_blank">
<img src="https://raw.githubusercontent.com/devinschumacher/uploads/refs/heads/main/images/how-to-download-skoolcom-videos-browser-extension.jpg" width="700px">
</a>

</details> 
