const express = require("express");
const router = express.Router();
const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");
const axios = require("axios");
const FormData = require("form-data");
const prisma = require("../db/connection");
const { time } = require("console");
// const pMap = require("p-map").default;

const BATCH_SIZE = 100;
const CSV_PATH = path.join(__dirname, "../products_extracted.csv");

// 🔐 Set your Cloudflare config
const CLOUDFLARE_UPLOAD_URL = `https://api.cloudflare.com/client/v4/accounts/${process.env.CLOUDFLARE_ACCOUNT_ID}/images/v1`;
const CLOUDFLARE_AUTH = `Bearer ${process.env.CLOUDFLARE_IMAGES_TOKEN}`;

// ✅ Upload image to Cloudflare if needed
async function uploadToCloudflare(url) {
  try {
    const res = await axios.get(url, { responseType: "arraybuffer" });
    const form = new FormData();
    form.append("file", res.data, { filename: "upload.jpg" });

    const upload = await axios.post(CLOUDFLARE_UPLOAD_URL, form, {
      headers: { ...form.getHeaders(), Authorization: CLOUDFLARE_AUTH },
    });

    const result = upload.data.result;
    return { id: result.id, url: result.variants?.[0] || url };
  } catch (err) {
    console.warn(`Cloudflare upload failed for ${url}: ${err.message}`);
    return { id: null, url };
  }
}

// ✅ Process raw image string into usable image array
async function processImages(rawImageString) {
  const urls =
    rawImageString
      ?.split("|")
      .map((url) => url.trim())
      .filter((url) => url.length > 0) || [];

  const images = await Promise.all(
    urls.map((url) =>
      url.includes("brandsdiscounts")
        ? uploadToCloudflare(url)
        : { id: null, url }
    )
  );

  return images;
}

// ✅ Import endpoint
router.post("/import-products", async (req, res) => {
  const products = [];

  // Step 1: Parse CSV
  await new Promise((resolve, reject) => {
    fs.createReadStream(CSV_PATH)
      .pipe(csv())
      .on("data", (row) => products.push(row))
      .on("end", resolve)
      .on("error", reject);
  });

  let importedCount = 0;

  for (let i = 0; i < products.length; i += BATCH_SIZE) {
    const batch = products.slice(i, i + BATCH_SIZE);

    // ✅ Step 2: Preprocess heavy operations before transaction
    // const preprocessedBatch = await Promise.all(
    //   batch.map(async (row) => {
    //     const {
    //       "attribute:pa_size": sizeName,
    //       images,
    //       "attribute:pa_item-location": itemLocation,
    //       "attribute:Condition": condition,
    //       "attribute:pa_color": color,
    //       "attribute:pa_brand": brandName,
    //       "attribute:pa_size-type": sizeType,
    //     } = row;

    //     const processedImages = images
    //       ?.split("|")
    //       .map((url) => ({ id: null, url: url.trim() }));

    //     let size = null;
    //     console.log("sizeName:", sizeName);
    //     size = await prisma.size.upsert({
    //       where: { name: sizeName },
    //       update: {},
    //       create: { name: sizeName },
    //     });

    //     return {
    //       ...row,
    //       processedImages,
    //       sizeId: size?.id || null,
    //       itemLocation,
    //       condition,
    //       color,
    //       brandName,
    //       sizeType,
    //     };
    //   })
    // );
    // Limit concurrent operations to 5 or 10 depending on your DB setup
    // let preprocessedBatch = [];
    // (async () => {
    //   const { default: pMap } = await import("p-map"); // Destructure the default export
    //   preprocessedBatch = await pMap(
    //     batch,
    //     async (row) => {
    //       const { "attribute:pa_size": sizeName, images, ...rest } = row;

    //       const processedImages = images
    //         ?.split("|")
    //         .map((url) => ({ id: null, url: url.trim() }));

    //       let size = await prisma.size.upsert({
    //         where: { name: sizeName },
    //         update: {},
    //         create: { name: sizeName },
    //       });

    //       return {
    //         ...row,
    //         processedImages,
    //         sizeId: size.id,
    //         ...rest,
    //       };
    //     },
    //     { concurrency: 5 }
    //   );
    // })();
    let preprocessedBatch = [];

    for (const row of batch) {
      const {
        "attribute:pa_size": sizeName,
        images,
        "attribute:pa_item-location": itemLocation,
        "attribute:Condition": condition,
        "attribute:pa_color": color,
        "attribute:pa_brand": brandName,
        "attribute:pa_size-type": sizeType,
      } = row;

      const processedImages = images
        ?.split("|")
        .map((url) => ({ id: null, url: url.trim() }));

      let size = null;
      console.log("sizeName:", sizeName);
      size = await prisma.size.upsert({
        where: { name: sizeName },
        update: {},
        create: { name: sizeName },
      });

      preprocessedBatch.push({
        ...row,
        processedImages,
        sizeId: size?.id || null,
        itemLocation,
        condition,
        color,
        brandName,
        sizeType,
      });
    }

    // ✅ Step 3: Write to DB in a transaction (only light DB work)
    await prisma.$transaction(
      async (tx) => {
        for (const row of preprocessedBatch) {
          const {
            post_title: title,
            brandName,
            color,
            sku,
            processedImages,
            itemLocation,
            postName,
            category_ids: categoryId,
            subCategoryId,
            parentCategoryId,
            regular_price: regularPrice,
            sale_price: salePrice,
            sale_price: platFormPrice,
            discountPercent,
            stock: stockQuantity,
            condition,
            post_content: description,
            stock_status: status,
            sizeId,
            sizeType,
          } = row;

          // ✅ Skip already imported
          const exists = await tx.product.findUnique({ where: { sku } });
          if (exists) continue;

          // ✅ Create product
          await tx.product.create({
            data: {
              title,
              brandName,
              color,
              sku,
              images: processedImages,
              itemLocation,
              postName,
              categoryId,
              subCategoryId,
              parentCategoryId,
              regularPrice: parseFloat(regularPrice || "0"),
              salePrice: parseFloat(salePrice || "0"),
              platFormPrice: parseFloat(platFormPrice || "0"),
              discountPercent: parseFloat(discountPercent || "0"),
              stockQuantity: parseInt(stockQuantity || "0"),
              condition,
              description,
              status,
              sizeId,
              sizeType,
            },
          });

          importedCount++;
        }
      },
      { timeout: 10000 }
    ); // 10 seconds timeout

    console.log(
      `✅ Batch ${i / BATCH_SIZE + 1} done. Total imported: ${importedCount}`
    );
  }

  res.json({
    message: `🎉 Import complete. ${importedCount} new products added.`,
  });
});

module.exports = router;
