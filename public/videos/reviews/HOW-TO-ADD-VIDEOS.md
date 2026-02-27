# Add your downloaded videos here

## Step 1: Copy your video files
- Copy your downloaded videos (e.g. from Instagram) into this folder:  
  **`public/videos/reviews/`**
- Use **MP4** format for best compatibility.
- Name them however you like, e.g.:
  - `customer-review-1.mp4`
  - `customer-review-2.mp4`
  - `unboxing-priya.mp4`

## Step 2: Tell the site which testimonial shows which video
Open **`src/components/TestimonialsCarousel.tsx`** and add a **`videoUrl`** line to the testimonial you want the video on.

Example — to show a video on "Rahul Krishnamurthy":
```ts
{
  id: "2",
  name: "Rahul Krishnamurthy",
  ...
  videoUrl: "/videos/reviews/customer-review-1.mp4",   // ← add this (use your filename)
},
```

Use the **exact filename** you put in this folder. The path always starts with `/videos/reviews/`.

## Step 3: Save and refresh
Save the file and refresh your browser. The video will appear at the top of that testimonial card with play controls.
