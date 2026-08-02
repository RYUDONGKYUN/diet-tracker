import path from "node:path";
import crypto from "node:crypto";
import multer from "multer";

function makeStorage(subdir: "meals" | "body") {
  return multer.diskStorage({
    destination: path.join(__dirname, "..", "..", "uploads", subdir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || ".jpg";
      cb(null, `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${ext}`);
    },
  });
}

const fileFilter: multer.Options["fileFilter"] = (_req, file, cb) => {
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("이미지 파일만 업로드할 수 있습니다."));
  }
  cb(null, true);
};

export const uploadMealPhoto = multer({
  storage: makeStorage("meals"),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export const uploadBodyPhoto = multer({
  storage: makeStorage("body"),
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

export function relativeUploadPath(subdir: "meals" | "body", filename: string): string {
  return `/uploads/${subdir}/${filename}`;
}
