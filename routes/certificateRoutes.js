import express from 'express';
import { protect, authorize, checkVerified } from '../middleware/auth.js';
import {
  generateCertificate,
  getCertificateById,
  verifyCertificate,
  getStudentCertificates,
  revokeCertificate,
  updateCertificateDesign
} from '../controllers/certificateController.js';

const router = express.Router();

// Routes for certificate management
router.route('/')
  .get(protect, authorize(['student', 'admin']), checkVerified, getStudentCertificates);

router.route('/generate')
  .post(protect, authorize(['admin', 'instructor']), checkVerified, generateCertificate);

router.route('/:id')
  .get(protect, authorize(['student', 'admin', 'instructor']), checkVerified, getCertificateById);

router.route('/verify/:certificateId')
  .get(verifyCertificate);

router.route('/revoke/:id')
  .put(protect, authorize(['admin']), checkVerified, revokeCertificate);

router.route('/design/:id')
  .put(protect, authorize(['admin', 'instructor']), checkVerified, updateCertificateDesign);

export default router;