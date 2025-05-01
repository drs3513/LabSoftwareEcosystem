
import '@aws-amplify/ui-react/styles.css';
import React, { useEffect, useMemo, useRef, useState} from "react";
import {
    fetchCachedUrl,
} from "@/lib/file";
import programmingLanguageExtensions from "@/assets/extensions/programming_languages.json"


/**
 * Compares the extension of the previewed file with a list of known, working extensions
 * Opens a new page which contains the contents of the file
 * @param fileName - the name of the file which is being previewed
 * @param storageId - the storageId of the file which is being previewed
 * @param versionId - the versionId of the file which is being previewed
 **/
export default async function previewFile (fileName: string, storageId: string, versionId: string)  {
    const ext = fileName.split(".").pop()?.toLowerCase();
    if(!ext) return

    const isTextLike = ["txt", "md", "log", "csv", "json", "xml", "tds", "tdp"].includes(ext) || programmingLanguageExtensions.some(language => language.extensions !== undefined && language.extensions.includes(`.${ext}`))
    const isOfficeDoc = ["doc", "docx", "rtf", "dox", "word"].includes(ext);
    const isPDF = ext === "pdf";
    const isImage = ["png", "jpg", "jpeg"].includes(ext);


    const path = storageId;

    try {
        const cachedUrl = await fetchCachedUrl(path, versionId);
        const popup = window.open("", "_blank", "width=800,height=600");
        if (!popup) {
            alert("Popup blocked. Please allow popups for this site.");
            return;
        }

        const previewContent = isPDF
            ? `<iframe src="${cachedUrl}" width="100%" height="100%"></iframe>`
            : isImage
                ? `<img src="${cachedUrl}" alt="${fileName}" />`
                : isTextLike
                    ? `<pre><code id="code-block">Loading...</code></pre>`
                    : `<p id="message">Unsupported file type: "${`${ext.length > 0 ? ext : "Unknown"}`}".</p>`;

        const html = `
                          <!DOCTYPE html>
                          <html lang="en">
                          <head>
                            <title>Preview - ${fileName}</title>
                            <style>
                              html, body {
                                height: 100%;
                                margin: 0;
                                font-family: sans-serif;
                                background: #f0f0f0;
                              }
                              .toolbar {
                                width: 100%;
                                background: #333;
                                color: white;
                                padding: 10px;
                                display: flex;
                                justify-content: space-between;
                                align-items: center;
                                box-sizing: border-box;
                              }
                              .toolbar a {
                                color: white;
                                text-decoration: none;
                                padding: 8px 12px;
                                background-color: #007bff;
                                border-radius: 5px;
                              }
                              .preview {
                                height: calc(100% - 50px); /* Leave space for toolbar */
                                overflow: auto;
                                display: block;
                              }
                              iframe, img {
                                max-width: 100%;
                                max-height: 100%;
                                border: none;
                                margin: auto;
                              }
                              pre {
                                background: white;
                                padding: 1rem;
                                margin: 0;
                                width: 100%;
                                height: 100%;
                                box-sizing: border-box;
                                overflow: auto;
                                white-space: pre-wrap;
                                word-wrap: break-word;
                              }
                            </style>
                          </head>
                          <body>
                            <div class="toolbar">
                              <div>Previewing: ${fileName}</div>
                              <a href="${cachedUrl}" download="${fileName}">Download</a>
                            </div>
                            <div class="preview">
                              ${previewContent}
                            </div>
                            ${isTextLike ? `<script>
                                                fetch("${cachedUrl}")
                                                  .then(res => res.text())
                                                  .then(code => {
                                                    document.getElementById("code-block").textContent = code;
                                                  });
                                            </script>`
                                    : `<script> console.log("HERE"); document.getElementById("message").textContent = "Unsupported File Type: " + {ext.length > 0 ? ext : "\"Unknown\""}</script>`
        }
                          </body>
                          </html>
                        `;


        popup.document.write(html);
        popup.document.close();
    } catch (err) {
        console.error("Preview failed:", err);
    }
}