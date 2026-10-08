import { Upload, Image as ImageIcon } from "lucide-react";

export default function ImageUploader({ onImageSelect }) {
  function handleChange(event) {
    const file = event.target.files?.[0];

    if (file && onImageSelect) {
      onImageSelect(file);
    }
  }

  return (
    <div className="image-uploader">
      <label className="upload-area">
        <input
          type="file"
          accept="image/png,image/jpeg,image/webp"
          onChange={handleChange}
          hidden
        />

        <div className="upload-icon">
          <Upload size={24} />
        </div>

        <h3>Upload a review screenshot</h3>

        <p>
          Drop an image here or click to choose a screenshot.
        </p>

        <small>
          PNG, JPG or WebP
        </small>
      </label>

      <div className="image-note">
        <ImageIcon size={16} />
        <span>
          A screenshot can contain the review text, rating and
          other visible review information.
        </span>
      </div>
    </div>
  );
}
