import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  StorageReference,
  UploadResult,
} from 'firebase/storage';
import { storage } from './config';

export const uploadFile = async (
  path: string,
  file: File | Blob,
  metadata?: { [key: string]: string }
): Promise<UploadResult> => {
  const storageRef = ref(storage, path);
  return await uploadBytes(storageRef, file, metadata ? { customMetadata: metadata } : undefined);
};

export const getFileURL = async (path: string): Promise<string> => {
  const storageRef = ref(storage, path);
  return await getDownloadURL(storageRef);
};

export const deleteFile = async (path: string): Promise<void> => {
  const storageRef = ref(storage, path);
  return await deleteObject(storageRef);
};

export const getStorageRef = (path: string): StorageReference => {
  return ref(storage, path);
};

