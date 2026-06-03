import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";

const docs = [
  {
    label: "Project Overview",
    file: "/docs/PROJECT_OVERVIEW.md",
  },
  {
    label: "Business Process",
    file: "/docs/BUSINESS_PROCESS.md",
  },
  {
    label: "Modules",
    file: "/docs/MODULES.md",
  },
  {
    label: "Workflows",
    file: "/docs/WORKFLOWS.md",
  },
  {
    label: "Status Matrix",
    file: "/docs/STATUS_MATRIX.md",
  },
  {
    label: "Roadmap",
    file: "/docs/ROADMAP.md",
  },
  {
    label: "Database Schema",
    file: "/docs/DATABASE_SCHEMA.md",
  },
  {
    label: "Database Usage",
    file: "/docs/DATABASE_USAGE.md",
  },
  {
    label: "Offline Architecture",
    file: "/docs/OFFLINE_ARCHITECTURE.md",
  },
  {
    label: "Offline Audit",
    file: "/docs/OFFLINE_AUDIT.md",
  },
  {
    label: "Deployment Guide",
    file: "/docs/DEPLOYMENT_GUIDE.md",
  },
  {
    label: "Technical Debt",
    file: "/docs/TECHNICAL_DEBT.md",
  },
  {
    label: "Release Notes",
    file: "/docs/CHANGELOG_BASELINE.md",
  },
];

export default function DocumentationPage() {
  const [selectedDoc, setSelectedDoc] = useState(docs[0]);
  const [content, setContent] = useState("");

  useEffect(() => {
    fetch(selectedDoc.file)
      .then((res) => res.text())
      .then(setContent)
      .catch(() =>
        setContent("# Error\n\nDokumen tidak dapat dimuat.")
      );
  }, [selectedDoc]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">
        System Documentation
      </h1>

      <div className="grid grid-cols-12 gap-6">

        <div className="col-span-3">
          <div className="bg-white border rounded-lg p-3">

            <h2 className="font-semibold mb-3">
              Documents
            </h2>

            <div className="space-y-2">
              {docs.map((doc) => (
                <button
                  key={doc.file}
                  onClick={() => setSelectedDoc(doc)}
                  className={`w-full text-left px-3 py-2 rounded ${
                    selectedDoc.file === doc.file
                      ? "bg-blue-600 text-white"
                      : "hover:bg-gray-100"
                  }`}
                >
                  {doc.label}
                </button>
              ))}
            </div>

          </div>
        </div>

        <div className="col-span-9">
          <div className="bg-white border rounded-lg p-6">

            <article className="prose max-w-none">
              <ReactMarkdown>
                {content}
              </ReactMarkdown>
            </article>

          </div>
        </div>

      </div>
    </div>
  );
}