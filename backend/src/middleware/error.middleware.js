// src/middleware/error.middleware.js

const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  // Prisma unique constraint violation
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'A record with this value already exists',
      field: err.meta?.target,
    });
  }

  // Prisma record not found
  if (err.code === 'P2025') {
    return res.status(404).json({ error: 'Record not found' });
  }

  // Multer file type/size error
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File size exceeds the allowed limit' });
  }
  if (err.code === 'INVALID_FILE_TYPE') {
    return res.status(400).json({ error: err.message });
  }

  // Default
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = { errorHandler };
