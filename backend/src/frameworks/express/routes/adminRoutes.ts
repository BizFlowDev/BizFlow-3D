import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { controllers } from '../../../config/diContainer.js';
import { authMiddleware } from '../../../adapters/middleware/authMiddleware.js';
import { allowRoles } from '../../../adapters/middleware/rbacMiddleware.js';

const router = Router();
const { adminController } = controllers;

// ── Report template upload storage ────────────────────────────────────────────
const uploadDir = path.resolve(__dirname, '../../../../uploads/report-templates');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `template-${Date.now()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.docx', '.doc', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) cb(null, true);
    else cb(new Error('Định dạng file không hợp lệ (chấp nhận xlsx, docx, pdf)'));
  },
});

router.use(authMiddleware);

// System admin only routes
router.use(allowRoles('admin'));

// Stores
router.post('/stores', adminController.createStore);
router.get('/stores', adminController.listStores);
router.get('/stores/:storeId', adminController.getStoreById);
router.patch('/stores/:storeId/subscription', adminController.manageStores);
router.patch('/stores/:storeId/status', adminController.toggleStoreStatus);

// System config
router.get('/system-config', adminController.listSystemConfig);
router.put('/system-config', adminController.updateSystemConfig);

// Announcements
router.get('/announcements', adminController.listAnnouncements);
router.post('/announcements', adminController.createAnnouncement);

// Report templates
router.get('/templates', adminController.listTemplates);
router.post('/templates', upload.single('template'), adminController.uploadTemplate);

// Subscription Plans
router.get('/subscription-plans', adminController.listSubscriptionPlans);
router.post('/subscription-plans', adminController.createSubscriptionPlan);
router.put('/subscription-plans/:planId', adminController.updateSubscriptionPlan);
router.delete('/subscription-plans/:planId', adminController.deleteSubscriptionPlan);

// Subscription History
router.get('/subscription-history', adminController.listSubscriptionHistory);

// Analytics
router.get('/analytics', adminController.getSystemAnalytics);

export default router;

