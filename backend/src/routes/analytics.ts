import { Router } from 'express';
import { getAnalyticsOverview, getAnalyticsOperators, getAnalyticsDailyChart, exportConversations, getLiveVisitorsHandler } from '../controllers/analytics';
import { authenticate } from '../middlewares/auth';

const router = Router();

router.use(authenticate);

router.get('/:projectId/overview', getAnalyticsOverview);
router.get('/:projectId/operators', getAnalyticsOperators);
router.get('/:projectId/daily', getAnalyticsDailyChart);
router.get('/:projectId/export', exportConversations);
router.get('/:projectId/live-visitors', getLiveVisitorsHandler);

export default router;
