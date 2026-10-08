// backend/controllers/app.controller.js

exports.getAppVersion = async (req, res) => {
  try {
    const latestVersion = process.env.LATEST_APP_VERSION || "1.0.0";
    const latestVersionCode = parseInt(
      process.env.LATEST_VERSION_CODE || "5001",
      10,
    );
    const minSupportedVersionCode = parseInt(
      process.env.MIN_SUPPORTED_VERSION_CODE || "5001",
      10,
    );
    const forceUpdate = process.env.FORCE_UPDATE === "true";
    const playStoreUrl =
      process.env.PLAY_STORE_URL ||
      "https://play.google.com/store/apps/details?id=uz.mark1";
    const changelog =
      process.env.APP_CHANGELOG ||
      "Yangi imkoniyatlar qo'shildi, xavfsizlik va tezkorlik oshirildi.";

    return res.status(200).json({
      success: true,
      data: {
        latest_version: latestVersion,
        latest_version_code: latestVersionCode,
        min_supported_version_code: minSupportedVersionCode,
        force_update: forceUpdate,
        play_store_url: playStoreUrl,
        title: "Yangi versiya mavjud! 🚀",
        message: changelog,
      },
    });
  } catch (err) {
    console.log(err.message);
    return res.status(500).json({ message: err.message });
  }
};
