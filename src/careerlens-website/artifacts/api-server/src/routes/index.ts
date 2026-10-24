import { Router, type IRouter } from "express";
import healthRouter from "./health";
import careerRouter from "./career";
import careerAdminRouter from "./career-admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(careerRouter);
router.use(careerAdminRouter);

export default router;
