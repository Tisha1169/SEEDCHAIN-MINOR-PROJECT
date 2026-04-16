import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import farmsRouter from "./farms";
import batchesRouter from "./batches";
import harvestsRouter from "./harvests";
import storageRouter from "./storage";
import transportRouter from "./transport";
import ordersRouter from "./orders";
import dashboardRouter from "./dashboard";
import trackingRouter from "./tracking";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(farmsRouter);
router.use(batchesRouter);
router.use(harvestsRouter);
router.use(storageRouter);
router.use(transportRouter);
router.use(ordersRouter);
router.use(dashboardRouter);
router.use(trackingRouter);

export default router;
