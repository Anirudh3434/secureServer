import Router from "express";
import {suggestion}  from "../controller/suggestion.controller.js";
import {searchCandidate} from "../controller/suggestion.controller.js";

const router = Router();

router.route("/").post(suggestion);
router.route("/search").post(searchCandidate);

export default router;