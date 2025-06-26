import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import Certificate from '../models/Certificate.js';
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import { uploadFile } from '../config/cloudinary.js';

// Utility function to generate unique certificate ID
const generateCertificateId = () => {
  return `CERT-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
};

// Generate a new certificate
export const generateCertificate = async (req, res, next) => {
  try {
    const { studentId, courseId, enrollmentId, template, designOptions } = req.body;

    // Validate required fields
    if (!studentId || !courseId || !enrollmentId) {
      return res.status(400).json({
        success: false,
        message: 'Student ID, Course ID, and Enrollment ID are required',
      });
    }

    // Check if student exists and has role 'student'
    const student = await User.findOne({ _id: studentId, role: 'Student' });
    if (!student) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student or user is not a student',
      });
    }

    // Check if enrollment exists and is completed
    const enrollment = await Enrollment.findById(enrollmentId)
      .populate({
        path: 'student',
        match: { role: 'Student' }, // Ensure student has role 'student'
        select: 'firstName lastName role',
      })
      .populate('course');

    if (!enrollment || !enrollment.student) {
      return res.status(400).json({
        success: false,
        message: 'Enrollment not found or student is not valid',
      });
    }

    if (enrollment.status !== 'completed') {
      return res.status(400).json({
        success: false,
        message: 'Course not completed',
      });
    }

    // Verify student and course match
    if (
      enrollment.student._id.toString() !== studentId ||
      enrollment.course._id.toString() !== courseId
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid student or course for this enrollment',
      });
    }

    // Check if instructor exists and has role 'instructor'
    const instructor = await User.findOne({ _id: enrollment.course.instructor, role: 'instructor' });
    if (!instructor) {
      return res.status(400).json({
        success: false,
        message: 'Invalid instructor for this course',
      });
    }

    // Check if certificate already exists
    const existingCertificate = await Certificate.findOne({ enrollment: enrollmentId });
    if (existingCertificate) {
      return res.status(400).json({
        success: false,
        message: 'Certificate already exists for this enrollment',
      });
    }

    // Generate verification code and hash
    const verificationCode = crypto.randomBytes(16).toString('hex');
    const hash = crypto.createHash('sha256').update(verificationCode).digest('hex');

    // Simulate PDF generation (replace with actual PDF generation in production)
    const pdfUrl = {
      secure_url: 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1234567890/mock_certificate.pdf',
    }; // Mock for testing; replace with actual uploadFile call

    /*
    // For production, use a PDF generation library like pdfkit
    const pdfBuffer = await generatePDFBuffer(student, enrollment.course); // Implement this function
    const pdfUrl = await uploadFile(pdfBuffer, {
      folder: 'lms/certificates',
      resource_type: 'raw',
      public_id: `certificate_${enrollmentId}`,
      format: 'pdf',
    });
    */

    const certificate = await Certificate.create({
      student: studentId,
      course: courseId,
      enrollment: enrollmentId,
      certificateId: generateCertificateId(),
      instructor: enrollment.course.instructor,
      verificationUrl: `${process.env.APP_URL}/api/v1/certificates/verify/${verificationCode}`,
      template: template || 'default',
      pdfUrl: pdfUrl.secure_url,
      designOptions: designOptions || {
        template: 'default',
        colors: { primary: '#000000', secondary: '#ffffff' },
        logo: 'default_logo.png',
        signature: 'default_signature.png',
      },
      metadata: { hash, verificationCode },
    });

    res.status(201).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// Get certificate by ID
export const getCertificateById = async (req, res, next) => {
  try {
    const certificate = await Certificate.findById(req.params.id)
      .populate({
        path: 'student',
        match: { role: 'student' },
        select: 'firstName lastName',
      })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        match: { role: 'instructor' },
        select: 'firstName lastName',
      });

    if (!certificate || !certificate.student || !certificate.instructor) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found or invalid student/instructor',
      });
    }

    // Check if user has access to this certificate
    if (
      req.user.role !== 'admin' &&
      req.user._id.toString() !== certificate.student._id.toString() &&
      req.user._id.toString() !== certificate.instructor._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this certificate',
      });
    }

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// Verify certificate
export const verifyCertificate = async (req, res, next) => {
  try {
    const { certificateId } = req.params;
    const hash = crypto.createHash('sha256').update(certificateId).digest('hex');

    const certificate = await Certificate.findOne({
      'metadata.hash': hash,
      isRevoked: false,
    })
      .populate({
        path: 'student',
        match: { role: 'student' },
        select: 'firstName lastName',
      })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        match: { role: 'instructor' },
        select: 'firstName lastName',
      });

    if (!certificate || !certificate.student || !certificate.instructor) {
      return res.status(404).json({
        success: false,
        message: 'Invalid or revoked certificate',
      });
    }

    res.status(200).json({
      success: true,
      data: {
        certificateId: certificate.certificateId,
        student: certificate.student,
        course: certificate.course,
        issueDate: certificate.issueDate,
        isValid: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get all certificates for a student
export const getStudentCertificates = async (req, res, next) => {
  try {
    const query =
      req.user.role === 'student'
        ? { student: req.user._id, 'student.role': 'student' }
        : {};

    const certificates = await Certificate.find(query)
      .populate({
        path: 'student',
        match: { role: 'student' },
        select: 'firstName lastName',
      })
      .populate('course', 'title')
      .populate({
        path: 'instructor',
        match: { role: 'instructor' },
        select: 'firstName lastName',
      });

    // Filter out certificates with invalid student or instructor
    const validCertificates = certificates.filter(
      cert => cert.student && cert.instructor
    );

    res.status(200).json({
      success: true,
      count: validCertificates.length,
      data: validCertificates,
    });
  } catch (error) {
    next(error);
  }
};

// Revoke a certificate
export const revokeCertificate = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { revokedReason } = req.body;

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    certificate.isRevoked = true;
    certificate.revokedDate = Date.now();
    certificate.revokedReason = revokedReason || 'No reason provided';

    await certificate.save();

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};

// Update certificate design
export const updateCertificateDesign = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { template, designOptions } = req.body;

    const certificate = await Certificate.findById(id);
    if (!certificate) {
      return res.status(404).json({
        success: false,
        message: 'Certificate not found',
      });
    }

    // Update design options
    if (template) certificate.template = template;
    if (designOptions) certificate.designOptions = { ...certificate.designOptions, ...designOptions };

    // Simulate PDF regeneration (replace with actual PDF generation in production)
    const newPdfUrl = {
      secure_url: 'https://res.cloudinary.com/dcgilmdbm/image/upload/v1234567890/mock_certificate_updated.pdf',
    }; // Mock for testing; replace with actual uploadFile call

    /*
    // For production, use a PDF generation library
    const pdfBuffer = await generatePDFBuffer(certificate.student, certificate.course);
    const newPdfUrl = await uploadFile(pdfBuffer, {
      folder: 'lms/certificates',
      resource_type: 'raw',
      public_id: `certificate_${certificate.enrollment}_updated`,
      format: 'pdf',
    });
    */

    certificate.pdfUrl = newPdfUrl.secure_url;

    await certificate.save();

    res.status(200).json({
      success: true,
      data: certificate,
    });
  } catch (error) {
    next(error);
  }
};