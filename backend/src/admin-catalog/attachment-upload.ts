import { imageMulterOptions } from '../uploads/image-upload';

export const ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

export const attachmentMulterOptions = imageMulterOptions(ATTACHMENT_MAX_BYTES);
