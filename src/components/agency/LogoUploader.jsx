import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, X, Building2, Loader2 } from "lucide-react";

export default function LogoUploader({ value, onChange }) {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadPublicFile({ file });
      onChange(result.file_url);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemove = () => {
    onChange("");
  };

  return (
    <div>
      <Label>Logo / Profilbild</Label>
      <div className="flex items-center gap-3 mt-1">
        {value ? (
          <div className="relative">
            <img src={value} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-slate-200" />
            <button
              type="button"
              onClick={handleRemove}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ) : (
          <div className="w-16 h-16 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-slate-400" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Wird hochgeladen...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Bild hochladen
              </>
            )}
          </Button>
          <p className="text-xs text-slate-500">PNG, JPG oder SVG — wird im Seitenmenü angezeigt</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
}