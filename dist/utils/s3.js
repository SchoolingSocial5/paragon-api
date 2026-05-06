"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadBufferToS3 = exports.uploadToS3 = exports.deleteFromS3 = exports.completeMultipartUpload = exports.getCloudFrontUrl = exports.getMultipartPreSignedUrl = exports.startMultipartUpload = exports.getPresignedUrl = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const s3Client = new client_s3_1.S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});
/**
 * Generates a pre-signed URL for client-side upload
 * @param fileName Original file name or desired name
 * @param contentType MIME type of the file
 * @param folder Folder in the bucket
 * @returns Object containing the upload URL and the final file key
 */
const getPresignedUrl = (fileName_1, contentType_1, ...args_1) => __awaiter(void 0, [fileName_1, contentType_1, ...args_1], void 0, function* (fileName, contentType, folder = 'posts') {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    const fileExtension = fileName.split('.').pop();
    const key = `${folder}/${(0, uuid_1.v4)()}-${Date.now()}.${fileExtension}`;
    const command = new client_s3_1.PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
    });
    const uploadUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 }); // 1 hour expiration
    return { uploadUrl, key };
});
exports.getPresignedUrl = getPresignedUrl;
/**
 * Start a multipart upload
 */
const startMultipartUpload = (fileName_1, contentType_1, ...args_1) => __awaiter(void 0, [fileName_1, contentType_1, ...args_1], void 0, function* (fileName, contentType, folder = 'posts') {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    const fileExtension = fileName.split('.').pop();
    const key = `${folder}/${(0, uuid_1.v4)()}-${Date.now()}.${fileExtension}`;
    const command = new client_s3_1.CreateMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000',
    });
    const response = yield s3Client.send(command);
    return { uploadId: response.UploadId, key };
});
exports.startMultipartUpload = startMultipartUpload;
/**
 * Generate a pre-signed URL for a specific part
 */
const getMultipartPreSignedUrl = (key, uploadId, partNumber) => __awaiter(void 0, void 0, void 0, function* () {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    const command = new client_s3_1.UploadPartCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        PartNumber: partNumber,
    });
    const uploadUrl = yield (0, s3_request_presigner_1.getSignedUrl)(s3Client, command, { expiresIn: 3600 });
    return uploadUrl;
});
exports.getMultipartPreSignedUrl = getMultipartPreSignedUrl;
/**
 * Helper to get CloudFront URL if available, otherwise return S3 URL
 */
const getCloudFrontUrl = (key) => {
    if (!key)
        return '';
    // If it's already a full URL, extract the key
    let finalKey = key;
    if (key.includes('amazonaws.com/')) {
        finalKey = key.split('amazonaws.com/')[1];
    }
    else if (process.env.CLOUDFRONT_URL && key.includes(process.env.CLOUDFRONT_URL)) {
        finalKey = key.split(`${process.env.CLOUDFRONT_URL}/`)[1];
    }
    const base = process.env.CLOUDFRONT_URL || '';
    if (base) {
        // Handle both "d123.cloudfront.net" and "https://d123.cloudfront.net"
        const protocol = base.startsWith('http') ? '' : 'https://';
        return `${protocol}${base.replace(/\/$/, '')}/${finalKey.replace(/^\//, '')}`;
    }
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    return `https://${bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${finalKey.replace(/^\//, '')}`;
};
exports.getCloudFrontUrl = getCloudFrontUrl;
/**
 * Complete a multipart upload
 */
const completeMultipartUpload = (key, uploadId, parts) => __awaiter(void 0, void 0, void 0, function* () {
    const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
    // Sort parts by PartNumber as required by S3
    parts.sort((a, b) => a.PartNumber - b.PartNumber);
    const command = new client_s3_1.CompleteMultipartUploadCommand({
        Bucket: bucketName,
        Key: key,
        UploadId: uploadId,
        MultipartUpload: {
            Parts: parts,
        },
    });
    yield s3Client.send(command);
    return (0, exports.getCloudFrontUrl)(key);
});
exports.completeMultipartUpload = completeMultipartUpload;
/**
 * Deletes an object from S3
 */
const deleteFromS3 = (key) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
        const command = new client_s3_1.DeleteObjectCommand({
            Bucket: bucketName,
            Key: key,
        });
        yield s3Client.send(command);
    }
    catch (error) {
        console.error('S3 Delete Error:', error);
        throw new Error(`Failed to delete from S3: ${error.message}`);
    }
});
exports.deleteFromS3 = deleteFromS3;
/**
 * Uploads a base64 image or buffer to S3
 * @param fileData Base64 string or Buffer
 * @param folder Folder in the bucket
 * @returns Profile picture URL
 */
const uploadToS3 = (fileData_1, ...args_1) => __awaiter(void 0, [fileData_1, ...args_1], void 0, function* (fileData, folder = 'profile-pictures') {
    try {
        let body;
        let contentType = 'image/jpeg';
        if (fileData.startsWith('data:')) {
            const match = fileData.match(/^data:(image\/\w+);base64,(.+)$/);
            if (!match)
                throw new Error('Invalid base64 string');
            contentType = match[1];
            body = Buffer.from(match[2], 'base64');
        }
        else {
            body = Buffer.from(fileData, 'base64');
        }
        const fileName = `${folder}/${(0, uuid_1.v4)()}-${Date.now()}.${contentType.split('/')[1]}`;
        const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: fileName,
            Body: body,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000',
        });
        yield s3Client.send(command);
        return (0, exports.getCloudFrontUrl)(fileName);
    }
    catch (error) {
        console.error('S3 Upload Error:', error);
        throw new Error(`Failed to upload to S3: ${error.message}`);
    }
});
exports.uploadToS3 = uploadToS3;
/**
 * Uploads a Buffer (from multer) to S3
 * @param buffer File buffer
 * @param fileName Generated or original file name
 * @param contentType MIME type
 * @param folder Folder in the bucket
 * @returns Final S3 URL
 */
const uploadBufferToS3 = (buffer_1, fileName_1, contentType_1, ...args_1) => __awaiter(void 0, [buffer_1, fileName_1, contentType_1, ...args_1], void 0, function* (buffer, fileName, contentType, folder = 'chat-media') {
    try {
        const bucketName = process.env.AWS_S3_BUCKET_NAME || '';
        const key = `${folder}/${(0, uuid_1.v4)()}-${Date.now()}-${fileName}`;
        const command = new client_s3_1.PutObjectCommand({
            Bucket: bucketName,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            CacheControl: 'public, max-age=31536000',
        });
        yield s3Client.send(command);
        return (0, exports.getCloudFrontUrl)(key);
    }
    catch (error) {
        console.error('S3 Buffer Upload Error:', error);
        throw new Error(`Failed to upload buffer to S3: ${error.message}`);
    }
});
exports.uploadBufferToS3 = uploadBufferToS3;
