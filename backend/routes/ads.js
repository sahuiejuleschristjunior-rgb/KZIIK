const router = require("express").Router();
const auth = require("../middlewares/authMiddleware");
const ctrl = require("../controllers/adsController");

router.post("/track", auth, ctrl.track);
router.post("/create/:postId", auth, ctrl.create);
router.get("/my", auth, ctrl.getMy);
router.get("/:id", auth, ctrl.getOne);
router.put("/:id/status", auth, ctrl.updateStatus);

module.exports = router;
