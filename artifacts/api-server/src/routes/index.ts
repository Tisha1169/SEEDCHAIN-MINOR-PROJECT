import { Router, type IRouter } from "express";
import authRouter from "./auth";
import adminRouter from "./admin";
import farmsRouter from "./farms";
import lotsRouter from "./lots";
import publicRouter from "./public";
import ordersRouter from "./orders";
import miscRouter from "./misc";
import opsRouter from "./ops";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  res.json({ status: "ok" });
});

router.use(authRouter);
router.use(publicRouter);
router.use(adminRouter);
router.use(farmsRouter);
router.use(lotsRouter);
router.use(ordersRouter);
router.use(miscRouter);
router.use(opsRouter);

export default router;
