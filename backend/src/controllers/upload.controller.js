import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { uploadImage } from '../services/cloudinary.service.js';

const uploadDirectory = path.resolve(
    process.cwd(),
    'src',
    'uploads',
    'imported'
);

fs.mkdirSync(uploadDirectory, {
    recursive: true,
});

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDirectory);
    },

    filename: (_req, file, cb) => {
        const extension =
            path.extname(file.originalname) || '.jpg';

        const safeName = path
            .basename(file.originalname, extension)
            .replace(/[^a-zA-Z0-9-_]/g, '-')
            .replace(/-+/g, '-')
            .slice(0, 60);

        cb(
            null,
            `${Date.now()}-${safeName}${extension.toLowerCase()}`
        );
    },
});

const fileFilter = (_req, file, cb) => {
    const allowedTypes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/avif',
        'image/gif',
    ];

    if (!allowedTypes.includes(file.mimetype)) {
        return cb(
            new Error(
                'Only JPG, PNG, WEBP, AVIF and GIF images are allowed.'
            )
        );
    }

    cb(null, true);
};

export const uploadProductImages = multer({
    storage,
    fileFilter,
    limits: {
        files: 8,
        fileSize: 8 * 1024 * 1024,
    },
}).array('images', 8);

export const uploadImages = async (req, res, next) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({
            success: false,
            message: 'Please select at least one image.',
        });
    }

    try {
        const images = [];
        for (const file of req.files) {
            const result = await uploadImage(file.path, 'rikkas_products');
            images.push({
                name: file.originalname,
                filename: file.filename,
                url: result.secure_url,
                size: file.size,
                type: file.mimetype,
            });
        }

        res.status(201).json({
            success: true,
            message: 'Images uploaded successfully.',
            images,
        });
    } catch (error) {
        next(error);
    }
};