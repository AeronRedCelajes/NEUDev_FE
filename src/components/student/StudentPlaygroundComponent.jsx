import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Editor } from "@monaco-editor/react";
import {
  Row,
  Col,
  Dropdown,
  DropdownButton,
  Tab,
  Tabs,
  Button,
  Spinner,
  Modal,
  Form
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes, faDownload, faPlusSquare, faAdjust } from '@fortawesome/free-solid-svg-icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { ProfilePlaygroundNavbarComponent } from '../ProfilePlaygroundNavbarComponent';
import '../../style/student/playground.css';
import '../../style/DarkTerminalModal.css';
import { getProgrammingLanguages } from '../api/API';

// 1) Import your XtermTerminal component
import XtermTerminal from '../XtermTerminal'; 

// Mapping of known programming language IDs to names and images
const programmingLanguageMap = {
  1: { name: 'Java',   image: '/src/assets/java2.png' },
  2: { name: 'C#',     image: '/src/assets/c.png' },
  3: { name: 'Python', image: '/src/assets/py.png' }
};

// Helper: fallback file extension from language name
const getExtensionFromLanguageName = (name) => {
  switch (name) {
    case 'Java':   return 'java';
    case 'C#':     return 'cs';
    case 'Python': return 'py';
    default:       return 'txt';
  }
};

export const StudentPlaygroundComponent = () => {
  const navigate_dashboard = useNavigate();

  // ----------------------------
  // Dynamic Programming Languages
  // ----------------------------
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  // ----------------------------
  // Multiple Files State
  // ----------------------------
  const [files, setFiles] = useState([
    { id: 0, fileName: 'main', extension: 'py', content: '' }
  ]);
  const [activeFileId, setActiveFileId] = useState(0);

  // "Add File" Modal
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('txt');

  // ----------------------------
  // Terminal & WebSocket
  // ----------------------------
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const wsRef = useRef(null);

  // ----------------------------
  // Editor Theme State
  // ----------------------------
  const [editorTheme, setEditorTheme] = useState("vs-dark");

  const toggleTheme = () => {
    setEditorTheme(prevTheme => (prevTheme === "vs-dark" ? "light" : "vs-dark"));
  };

  // ----------------------------
  // 1) Fetch dynamic languages
  // ----------------------------
  const fetchProgrammingLanguages = async () => {
    try {
      const response = await getProgrammingLanguages();
      if (!response.error && Array.isArray(response)) {
        setProgrammingLanguages(response);
        if (response.length > 0) {
          setSelectedLanguage(response[0]);
          setFiles((prev) => {
            const updated = [...prev];
            updated[0].extension =
              response[0].progLangExtension ||
              getExtensionFromLanguageName(response[0].progLangName);
            return updated;
          });
        }
      } else {
        console.error("❌ Failed to fetch programming languages:", response.error);
      }
    } catch (err) {
      console.error("❌ Error fetching programming languages:", err);
    }
  };

  useEffect(() => {
    fetchProgrammingLanguages();
  }, []);

  // ----------------------------
  // 2) Handle language selection
  // ----------------------------
  const handleSelectLanguage = (lang) => {
    setSelectedLanguage(lang);
    // Update the active file's extension
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? {
              ...f,
              extension: lang.progLangExtension || getExtensionFromLanguageName(lang.progLangName)
            }
          : f
      )
    );
  };

  // ----------------------------
  // 3) Multiple Files Logic
  // ----------------------------
  const activeFile = files.find((f) => f.id === activeFileId);

  const handleTabSelect = (fileId) => setActiveFileId(fileId);

  const handleFileChange = (newContent) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f))
    );
  };

  const openAddFileModal = () => {
    setNewFileExtension(
      selectedLanguage?.progLangExtension ||
      getExtensionFromLanguageName(selectedLanguage?.progLangName || 'txt')
    );
    setNewFileName('');
    setShowAddFileModal(true);
  };

  const handleCreateNewFile = () => {
    const newId = files.length > 0 ? Math.max(...files.map((f) => f.id)) + 1 : 0;
    const newFile = {
      id: newId,
      fileName: newFileName || `file${newId}`,
      extension: newFileExtension || 'txt',
      content: ''
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
    setShowAddFileModal(false);
  };

  const handleDeleteFile = (fileId) => {
    if (files.length === 1) return;
    if (window.confirm("Are you sure you want to delete this file?")) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (activeFileId === fileId) {
        const remaining = files.filter((f) => f.id !== fileId);
        setActiveFileId(remaining[0]?.id || 0);
      }
    }
  };

  // ----------------------------
  // 4) WebSocket Setup
  // ----------------------------
  useEffect(() => {
    // Replace 'wss://' if your server is secure, or 'ws://' otherwise
    const ws = new WebSocket('wss://neudevcompiler-production.up.railway.app');
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
    };

    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };

    ws.onerror = (err) => {
      console.error('WebSocket error:', err);
    };

    return () => {
      ws.close();
    };
  }, []);

  // ----------------------------
  // 5) Run Code via WebSocket
  // ----------------------------
  const handleRunCode = () => {
    if (!activeFile) return;

    setShowModal(true);
    setLoading(true);

    const ext =
      selectedLanguage?.progLangExtension ||
      getExtensionFromLanguageName(selectedLanguage?.progLangName || 'txt');

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'init',
          language: ext,
          code: activeFile.content,
          input: ''
        })
      );
      console.log('Code sent to server:\n', activeFile.content);
    } else {
      console.error('Error: WebSocket not connected.');
      setLoading(false);
    }
  };

  // ----------------------------
  // 6) Download Files (Single or ZIP)
  // ----------------------------
  const handleDownloadFiles = async () => {
    if (files.length === 1) {
      const singleFile = files[0];
      const blob = new Blob([singleFile.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${singleFile.fileName}.${singleFile.extension}`);
    } else {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(`${file.fileName}.${file.extension}`, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'playground_files.zip');
    }
  };

  // ----------------------------
  // 7) Stop Running Program on Terminal Close
  // ----------------------------
  const handleCloseTerminal = () => {
    if (loading && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
    setLoading(false);
    setShowModal(false);
  };

  // ----------------------------
  // Render
  // ----------------------------
  return (
    <>
      <ProfilePlaygroundNavbarComponent />
      <div className="playground">
        <div className="playground-container">
          <div className="playground-header">
            <div className="left-corner">
              <Tabs
                activeKey={activeFileId}
                id="dynamic-file-tabs"
                onSelect={(k) => handleTabSelect(Number(k))}
                fill
              >
                {files.map((file) => (
                  <Tab
                    key={file.id}
                    eventKey={file.id}
                    title={
                      <div className="d-flex align-items-center">
                        <span>{`${file.fileName}.${file.extension}`}</span>
                        {files.length > 1 && (
                          <Button
                            className='tab-close-button'
                            variant="link"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteFile(file.id);
                            }}
                            title="Delete file"
                          >
                            <FontAwesomeIcon icon={faTimes} color="gray" />
                          </Button>
                        )}
                      </div>
                    }
                  />
                ))}
              </Tabs>
              <Button className='plus-sqaure-icon' variant='light' onClick={openAddFileModal}>
                <FontAwesomeIcon icon={faPlusSquare} size="lg" />
              </Button>
            </div>

            <div className="right-corner">
              <Button variant="link" onClick={handleDownloadFiles} title="Download Files">
                <FontAwesomeIcon icon={faDownload} size="lg" />
              </Button>
              <DropdownButton
                className="playground-dropdown"
                id="language-dropdown"
                size="sm"
                title={
                  selectedLanguage ? (
                    <>
                      {selectedLanguage.progLangImage ||
                      (programmingLanguageMap[selectedLanguage.progLangID] &&
                        programmingLanguageMap[selectedLanguage.progLangID].image) ? (
                        <img
                          src={
                            selectedLanguage.progLangImage ||
                            programmingLanguageMap[selectedLanguage.progLangID]?.image
                          }
                          style={{ width: '20px', marginRight: '8px' }}
                          alt="language-icon"
                        />
                      ) : null}
                      {selectedLanguage.progLangName ||
                        programmingLanguageMap[selectedLanguage.progLangID]?.name ||
                        'Select Language'}
                    </>
                  ) : (
                    'Loading...'
                  )
                }
              >
                {programmingLanguages.map((lang) => {
                  const imageSrc =
                    lang.progLangImage ||
                    programmingLanguageMap[lang.progLangID]?.image;
                  const languageName =
                    lang.progLangName ||
                    programmingLanguageMap[lang.progLangID]?.name;
                  return (
                    <Dropdown.Item
                      key={lang.progLangID}
                      onClick={() => handleSelectLanguage(lang)}
                    >
                      {imageSrc && (
                        <img
                          src={imageSrc}
                          alt={`${languageName}-icon`}
                          style={{ width: '20px', marginRight: '8px' }}
                        />
                      )}
                      {languageName}
                    </Dropdown.Item>
                  );
                })}
              </DropdownButton>
              <Button variant="link" onClick={toggleTheme} title="Toggle Theme">
                <FontAwesomeIcon icon={faAdjust} size="lg" />
              </Button>
            </div>
            <div className="header-border"></div>
          </div>

          {/* Code Editor */}
          <div className="playground-editor">
            <Editor
              height="70vh" // Adjust height
              language={selectedLanguage?.progLangName.toLowerCase()} // Set language
              value={activeFile?.content || ""}
              onChange={(newValue) => handleFileChange(newValue)}
              theme={editorTheme}
              options={{
                fontSize: 14,
                minimap: { enabled: true },
                automaticLayout: true,
              }}
            />
          </div>

          <div className="playground-bottom">
            <div className="d-flex gap-2">
              <Button onClick={handleRunCode} disabled={loading}>
                {loading ? <Spinner animation="border" size="sm" /> : 'Run Code'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Terminal Modal */}
      <Modal
        show={showModal}
        onHide={handleCloseTerminal}
        size="lg"
        backdrop="static"
        keyboard={false}
        centered
        className="dark-terminal-modal"
      >
          {wsRef.current && (
            <XtermTerminal
              ws={wsRef.current}
              title="NEUDev Terminal"
              onClose={handleCloseTerminal}
            />
          )}
      </Modal>

      {/* Add File Modal */}
      <Modal show={showAddFileModal} onHide={() => setShowAddFileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Filename</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter filename (without extension)"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mt-3">
            <Form.Label>Extension</Form.Label>
            <Form.Control
              type="text"
              placeholder="e.g. py, cs, java..."
              value={newFileExtension}
              onChange={(e) => setNewFileExtension(e.target.value)}
            />
            <Form.Text className="text-muted">
              The available extensions depend on the selected language.
            </Form.Text>
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddFileModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCreateNewFile}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StudentPlaygroundComponent;