import { Router, type IRouter } from "express";
import healthRouter from "./health";
import alertsRouter from "./alerts";
import authRouter from "./auth";
import usersRouter from "./users";
import telemetryRouter from "./telemetry"; // استيراد مسار الحساسات الجديد

const router: IRouter = Router();

router.use(healthRouter);
router.use(alertsRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(telemetryRouter); // تفعيل مسار معالجة إشارات الحساسات

export default router;