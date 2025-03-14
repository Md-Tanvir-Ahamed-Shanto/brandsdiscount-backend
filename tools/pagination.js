const paginateOverview = (queryParam, companyid = false) => {
  return async function (req, res, next) {
    let assetOverviewFilter = ""; // filter for asset overview
    console.log(assetOverviewFilter);
    next();
  };
  // return async function (req, res, next) {
  //   let assetOverviewFilter = "";
  //   let sort = { createdAt: -1 };
  //   let filterPassword = "";

  //   if (req.query.sort) {
  //     if (req.query.sort == "scannerId") sort = { scannerId: 1 };
  //     if (req.query.sort == "clientId") sort = { clientId: 1 };
  //     if (req.query.sort == "jobName") sort = { jobName: 1 };
  //     if (req.query.sort == "productId") sort = { productId: 1 };
  //     if (req.query.sort == "variantId") sort = { variantId: 1 };
  //     if (req.query.sort == "comment") sort = { comment: 1 };
  //     if (req.query.sort == "jobUploadStatus") sort = { jobUploadStatus: 1 };
  //     if (req.query.sort == "createdAt") sort = { createdAt: 1 };
  //     if (req.query.sort == "updatedAt") sort = { updatedAt: 1 };
  //   }

  //   let page = 1;
  //   if (req.query.page) {
  //     page = parseInt(req.query.page);
  //   }

  //   let limit = 100;
  //   if (req.query.limit) {
  //     limit = parseInt(req.query.limit);
  //   }

  //   let pageCount = 1;

  //   if (queryParam == Asset) {
  //     if (req.user.role === "Administrator" || req.user.role === "Producer") {
  //       if (req.query.search) {
  //         companyFilter = {
  //           $or: [
  //             { name: { $regex: req.query.search, $options: "i" } },
  //             { mainCategory: { $regex: req.query.search, $options: "i" } },
  //             { subCategory: { $regex: req.query.search, $options: "i" } },
  //           ],
  //         };
  //       }
  //     } else {
  //       assetOverviewFilter = "-diomexParameter";

  //       if (req.query.search) {
  //         companyFilter = {
  //           $and: [
  //             { $or: [{ user: req.user.id }, { company: req.user.company }] },
  //             {
  //               $or: [
  //                 { name: { $regex: req.query.search, $options: "i" } },
  //                 { mainCategory: { $regex: req.query.search, $options: "i" } },
  //                 { subCategory: { $regex: req.query.search, $options: "i" } },
  //               ],
  //             },
  //           ],
  //         };
  //       }
  //     }
  //   }

  //   if (queryParam == FTP) {
  //     if (req.user.role !== "Administrator") {
  //       companyFilter = {
  //         $or: [
  //           // { user: req.user.id },
  //           { company: req.user.company },
  //         ],
  //       };

  //       filterPassword = "-serverCredentials.userPassword";
  //     }
  //   }

  //   let query = queryParam
  //     .find(companyFilter)
  //     .select(assetOverviewFilter)
  //     .select(filterPassword)
  //     .sort(sort);
  //   let startIndex = 0;
  //   if (limit > 0) {
  //     startIndex = (page - 1) * limit;
  //     if (companyid === false) {
  //       query.limit(limit).skip(startIndex);
  //     }
  //     pageCount = Math.ceil((await queryParam.countDocuments()) / limit);
  //   }

  //   if (queryParam === User) {
  //     query.populate("company");
  //   }

  //   let results = await query.exec(function (err, results) {
  //     console.log(results);
  //     if (err) console.log(err);
  //     //console.log(results);
  //     req.results = results;
  //     if (companyid !== false) {
  //       req.results = results.slice(startIndex, startIndex + limit);
  //     }
  //     req.page = page;
  //     req.pageCount = pageCount;
  //     if (companyid !== false) {
  //       req.pageCount = Math.ceil(results.length / limit);
  //     }
  //     req.limit = limit;
  //     next();
  //   });
  // };
};

module.exports = { paginateOverview };
