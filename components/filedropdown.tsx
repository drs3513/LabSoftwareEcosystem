import { useState, useEffect } from "react";
import { deleteFile } from "@/lib/file";
import type { Schema } from "@/amplify/data/resource";

type FileDropdownProps = {
  file: Schema["File"]["type"]; // Explicitly typed file prop
  userId: string;
  onSelectFile: (fileId: string) => void;
};

export default function FileDropdown({ file, userId, onSelectFile }: FileDropdownProps) {
  
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const toggleDropdown = () => setDropdownOpen((prev) => !prev);

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${file.filename}?`);
    if (!confirmDelete) return;

    await deleteFile(file.fileId);
    alert("File deleted successfully!");
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(`#file-dropdown-${file.fileId}`)) {
        setDropdownOpen(false);
      }
    };

    if (dropdownOpen) {
      document.addEventListener("click", handleClickOutside);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [dropdownOpen, file.fileId]);

  return (
    <div
      id={`file-dropdown-${file.fileId}`}
      style={{ position: "relative", marginBottom: "5px" }}
    >
      <button
        onClick={toggleDropdown}
        style={{ cursor: "pointer" }}
        aria-expanded={dropdownOpen}
      >
        {file.filename} ▼
      </button>

      {dropdownOpen && (
        <div
          style={{
            position: "absolute",
            background: "#f9f9f9",
            border: "1px solid #ccc",
            padding: "5px",
            boxShadow: "2px 2px 5px rgba(0,0,0,0.2)",
            zIndex: 10,
          }}
        >
          <button
            onClick={() => onSelectFile(file.fileId)}
            style={{ display: "block", marginBottom: "5px" }}
          >
            Open Chat
          </button>
          <button
            onClick={handleDelete}
            style={{ display: "block", color: "red" }}
          >
            Delete File
          </button>
        </div>
      )}
    </div>
  );
}
