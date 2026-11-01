// src/lib/welcomeImages.js
// Background photos for the three intro slides.
//
// HOW TO CHANGE A PHOTO
// 1. Put the image file in the  public/welcome/  folder, e.g. public/welcome/field.jpg
// 2. Set  src  below to  '/welcome/field.jpg'  (starts with a slash, no "public").
// 3. Leave  src  empty ('') to show the green placeholder block.
//
// TIPS: use landscape or portrait photos at least 1200px wide, under ~400 KB
// (JPG or WebP). Choose images where the bottom third is not too busy, because
// the slide text sits there. `position` decides which part stays visible when
// the photo is cropped: 'center', 'top', 'bottom', 'left', 'right' or '30% 60%'.

export const WELCOME_IMAGES = [
  { src: '', position: 'center' }, // slide 1: field after harvest
  { src: '', position: 'center' }, // slide 2: local buyer collecting residue
  { src: '', position: 'center' }, // slide 3: residue turned into products / energy
];
