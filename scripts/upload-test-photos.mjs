#!/usr/bin/env node
/**
 * Local script to download celeb photos and upload to Convex.
 * Run: node scripts/upload-test-photos.mjs
 *
 * Downloads from Wikimedia locally (avoids cloud rate limits),
 * then uploads to Convex storage via the HTTP API.
 */

import { execSync } from "child_process";

const USER_PHOTOS = {
  // Marcus Hale -> Michael B. Jordan
  jh79vzmj2hbfbev85ra67x2m1h80xt01: [
    "https://upload.wikimedia.org/wikipedia/commons/4/42/Michael_B._Jordan_by_Gage_Skidmore_3.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/8/8e/Michael_B_Jordan_-_Sinners.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/d/d1/TIFF_2019_just_mercy_%281_of_1%29-2_%2848690780886%29_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/c/cd/2018-05-12-_Cannes-L%27acteur_Michael_B._Jordan-2721_%2842075892224%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/6c/Michael_B._Jordan_2011_%28cropped%29.jpg",
  ],
  // Mateo Alvarez -> Oscar Isaac
  jh77f7e7y7xzfrd82qdfvp99cx80xq5v: [
    "https://upload.wikimedia.org/wikipedia/commons/6/6d/OscarIsaac.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/8/81/Oscar_Isaac_%2830694590031%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/0d/Oscar_Isaac_at_82nd_Venice_International_Film_Festival-1_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/e1/Oscar_Isaac.JPG",
    "https://upload.wikimedia.org/wikipedia/commons/c/c8/Oscar_Isaac_at_the_New_York_Premiere_of_Won%27t_Back_Down%2C_September_2012.jpg",
  ],
  // Lucas Carter -> Chris Evans
  jh73r9hfvzy0zvgke7s68jfmdh80wb4e: [
    "https://upload.wikimedia.org/wikipedia/commons/8/82/ChrisEvans08TIFF.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/0e/Chris_Evans_-_Captain_America_2_press_conference_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/c/c3/Chris_Evans_C2E2_2023_1_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/d/d5/Chris_Evans_at_the_2025_Toronto_International_Film_Festival_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/8/82/ChrisEvans08TIFF.jpg",
  ],
  // Jonah Reed -> Paul Mescal
  jh7fevw3z0xqwm4665xgznjb3h80xa78: [
    "https://upload.wikimedia.org/wikipedia/commons/4/46/Paul_Mescal_at_the_Toronto_International_Film_Festival_in_2025_2_%28cropped_2%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4a/Paul_mescal_2022_1.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/60/The_lost_daughter_mvff_2021.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/46/Paul_Mescal_at_the_Toronto_International_Film_Festival_in_2025_2_%28cropped_2%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4a/Paul_mescal_2022_1.jpg",
  ],
  // Daniel Okoye -> Idris Elba
  jh78s1ndr9b9zvvxt3egh7nvs180xy6v: [
    "https://upload.wikimedia.org/wikipedia/commons/d/d6/Idris_Elba-5272.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/6e/Idris_Elba_2007_Cropped.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3a/Idris_Elba_A_House_of_Dynamite-21_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/2/21/Molly%27s_Game_03_%2836342680794%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/34/RockNRolla08TIFF.jpg",
  ],
  // Leo Gutierrez -> Pedro Pascal
  jh7bp21k9v0jkeetq390ckh4t580xn0a: [
    "https://upload.wikimedia.org/wikipedia/commons/4/4d/Pedro_Pascal_%2814588037218%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/05/Pedro_Pascal_%2836124158715%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/ef/Pedro_Pascal_at_the_2025_Cannes_Film_Festival_02.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/7/70/Bella_Ramsey_and_Pedro_Pascal_at_SXSW_2025_02_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/4d/Pedro_Pascal_%2814588037218%29.jpg",
  ],
  // Aisha Thompson -> Zendaya
  jh7bb1s1yphqpw74ctqsx3fxbd80x740: [
    "https://upload.wikimedia.org/wikipedia/commons/2/28/Zendaya_-_2019_by_Glenn_Francis.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/0/0c/Zendaya_2019_by_Glenn_Francis.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/9/96/Zendaya_MTV_Awards_2.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/e/eb/Zendaya_by_Gage_Skidmore.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3c/Zendaya_promoting_Smallfoot_for_MTV_international.png",
  ],
  // Priya Nair -> Deepika Padukone
  jh74at4dewpwfa9g428wdztz4d80xdpv: [
    "https://upload.wikimedia.org/wikipedia/commons/d/d3/Deepika_Padukone_2025_%281%29.png",
    "https://upload.wikimedia.org/wikipedia/commons/9/95/Deepika_Padukone_at_Chhapaak_premiere.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/54/Deepika_Padukone_at_an_event.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Deepika_Padukone_promoting_Bajirao_Mastani_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/1/1e/Deepika_p_Lux-Award_2016.jpg",
  ],
  // Mei Lin Chen -> Gemma Chan
  jh78jbkfg3avrnf6x9zk5nmh6h80xt4k: [
    "https://upload.wikimedia.org/wikipedia/commons/6/62/Gemma_Chan_SAG_Awards_2019.png",
    "https://upload.wikimedia.org/wikipedia/commons/8/80/Gemma_Chan_Venice.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/f7/Gemma_Chan_at_82nd_Venice_International_Film_Festival-1_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/d/de/Gemma_Chan_at_the_Moet_BIFA_2014.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3f/BAFTA%27s_2013_%288463798201%29.jpg",
  ],
  // Nora Gallagher -> Florence Pugh
  jh7eexa2h697cv8djw24rge81980xrz0: [
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Florence_Pugh_%2848471906272%29_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/9/9e/Florence_Pugh_at_the_2024_Toronto_International_Film_Festival_13_%28cropped_2_%E2%80%93_color_adjusted%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/3/3f/Florence_Pugh_at_the_58th_BFI_London_Film_Festival_Awards_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/8/80/TheWondeBFI071022_%284_of_17%29_%2852415705140%29_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/56/Florence_Pugh_%2848471906272%29_%28cropped%29.jpg",
  ],
  // Priya Menon -> Priyanka Chopra
  jh7fxfatvgk476as2y5vw4yj0n80xnp2: [
    "https://upload.wikimedia.org/wikipedia/commons/9/91/Priyanka_Chopra_Jonas_attending_the_Nita_Mukesh_Ambani_Cultural_Centre_Gala_on_Day_2_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/9/91/Priyanka_Chopra_at_2019_Cannes_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/4/45/Priyanka_Chopra_at_Bulgary_launch%2C_2024_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/1/1a/Priyanka_Chopra_Promoting_In_My_City.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/f/f8/Priyanka-snapped-at-Olive-2.jpg",
  ],
  // Simone Laurent -> Janelle Monae
  jh7fpsctvsakn5fn6gctwhcr2580w6p9: [
    "https://upload.wikimedia.org/wikipedia/commons/8/83/Janelle_Monae_Age_Of_PleasureTour_2023.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/d/d3/Janelle_Monae_Paris_Fashion_Week_Autumn_Winter_2019_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/6b/Janelle_Monae_at_the_2022_TIFF_Premiere_of_Glass_Onion-_A_Knives_Out_Mystery_%2852358878321%29_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/c/ce/Janelle_Mon%C3%A1e_-_Way_Out_West_2014.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/7/7a/Janelle_Mon%C3%A1e_2016.jpg",
  ],
  // Ravi Patel -> Lil Nas X
  jh79bk7k5g5512b09y988am5th80xtx0: [
    "https://upload.wikimedia.org/wikipedia/commons/7/74/Lil_Nas_X_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/c/cb/Lil_Nas_X_back_stage_at_the_MTV_Video_Music_Awards_2019_%28cropped%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/5/56/191125_Lil_Nas_X_at_the_2019_American_Music_Awards.png",
    "https://upload.wikimedia.org/wikipedia/commons/0/01/Glasto2023_%28343_of_468%29_%2853008939166%29.jpg",
    "https://upload.wikimedia.org/wikipedia/commons/6/6c/Glasto2023_%28348_of_468%29_%2853009419903%29_%28cropped%29.jpg",
  ],
};

const NAMES = {
  jh79vzmj2hbfbev85ra67x2m1h80xt01: "Marcus/MBJ",
  jh77f7e7y7xzfrd82qdfvp99cx80xq5v: "Mateo/Oscar",
  jh7bb1s1yphqpw74ctqsx3fxbd80x740: "Aisha/Zendaya",
  jh74at4dewpwfa9g428wdztz4d80xdpv: "Priya/Deepika",
  jh78jbkfg3avrnf6x9zk5nmh6h80xt4k: "Mei/Gemma",
  jh73r9hfvzy0zvgke7s68jfmdh80wb4e: "Lucas/Chris",
  jh7fevw3z0xqwm4665xgznjb3h80xa78: "Jonah/Paul",
  jh78s1ndr9b9zvvxt3egh7nvs180xy6v: "Daniel/Idris",
  jh7bp21k9v0jkeetq390ckh4t580xn0a: "Leo/Pedro",
  jh7eexa2h697cv8djw24rge81980xrz0: "Nora/Florence",
  jh7fxfatvgk476as2y5vw4yj0n80xnp2: "PriyaM/Priyanka",
  jh7fpsctvsakn5fn6gctwhcr2580w6p9: "Simone/Janelle",
  jh79bk7k5g5512b09y988am5th80xtx0: "Ravi/LilNasX",
};

async function main() {
  // Check current photo counts
  const currentJson = execSync("bunx convex run photos:listAll", {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  const currentPhotos = JSON.parse(currentJson);

  for (const [userId, urls] of Object.entries(USER_PHOTOS)) {
    const name = NAMES[userId] || userId;
    const existing = currentPhotos.filter((p) => p.userId === userId);
    if (existing.length >= 5) {
      console.log(`${name}: already has ${existing.length} photos, skipping`);
      continue;
    }

    console.log(`\n${name}: has ${existing.length}/5, seeding...`);

    // Delete existing photos for this user
    for (const photo of existing) {
      execSync(
        `bunx convex run photos:remove '{"photoId": "${photo._id}"}'`,
        { encoding: "utf8", cwd: process.cwd() },
      );
    }

    // Download and upload each photo
    for (let order = 0; order < urls.length; order++) {
      const url = urls[order];
      try {
        // Download locally
        const response = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0 (Macintosh)" },
        });
        if (!response.ok) {
          console.log(`  Photo ${order}: FAILED (${response.status})`);
          continue;
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get("content-type") || "image/jpeg";

        // Write to temp file, upload via convex CLI
        const fs = await import("fs");
        const tmpFile = `/tmp/celeb_photo_${userId}_${order}.bin`;
        fs.writeFileSync(tmpFile, buffer);

        // Use the Convex action to store from URL (we'll call seedPhotosForUser for just this one)
        // Actually, let's use a simpler approach: call the mutation directly after storing
        const result = execSync(
          `bunx convex run actions/seedTestPhotos:seedPhotosForUser '{"userId": "${userId}", "urls": ${JSON.stringify([url])}}'`,
          { encoding: "utf8", cwd: process.cwd(), timeout: 30000 },
        );
        console.log(`  Photo ${order}: OK`);
      } catch (e) {
        console.log(`  Photo ${order}: FAILED (${e.message?.slice(0, 80)})`);
      }
    }
  }

  console.log("\nDone! Checking final counts...");
  const finalJson = execSync("bunx convex run photos:listAll", {
    encoding: "utf8",
    cwd: process.cwd(),
  });
  const finalPhotos = JSON.parse(finalJson);
  for (const [userId, name] of Object.entries(NAMES)) {
    const count = finalPhotos.filter((p) => p.userId === userId).length;
    console.log(`${name}: ${count}/5`);
  }
}

main().catch(console.error);
