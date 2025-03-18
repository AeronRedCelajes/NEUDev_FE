import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { faCaretDown, faEllipsisV, faEye, faEyeSlash, faClock, faDownload, faTimes } from '@fortawesome/free-solid-svg-icons';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

import { ProfilePlaygroundNavbarComponent } from '../ProfilePlaygroundNavbarComponent';
import '../../style/student/playground.css';
import '../../style/DarkTerminalModal.css';
import { getProgrammingLanguages } from '../api/API';

const programmingLanguageMap = {
  1: { name: 'Java', image: '/src/assets/java2.png' },
  2: { name: 'C#', image: '/src/assets/c.png' },
  3: { name: 'Python', image: '/src/assets/py.png' }
};

const getExtensionFromLanguageName = (name) => {
  switch (name) {
    case 'Java':
      return 'java';
    case 'C#':
      return 'cs';
    case 'Python':
      return 'py';
    default:
      return 'txt';
  }
};

export const TeacherPlaygroundComponentTest = () => {
  const navigate_dashboard = useNavigate();

  // Dynamic Programming Languages
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState(null);

  // Multiple Files State – each file has id, fileName, extension, content
  const [files, setFiles] = useState([
    { id: 0, fileName: 'main', extension: 'py', content: '' }
  ]);
  const [activeFileId, setActiveFileId] = useState(0);

  // "Add File" Modal State
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('txt');

  // Terminal & WebSocket States
  const [lines, setLines] = useState([]);
  const [prompt, setPrompt] = useState(''); // current partial line from the server
  const [typedInput, setTypedInput] = useState(''); // what the user types in the input area
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);

  const wsRef = useRef(null);
  const inputRef = useRef(null);

  // Helper: place caret at end of contentEditable element
  const placeCaretAtEnd = (el) => {
    if (!el) return;
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  };

  // Fetch dynamic programming languages from your API
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

  // Handle language selection
  const handleSelectLanguage = (lang) => {
    setSelectedLanguage(lang);
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? { ...f, extension: lang.progLangExtension || getExtensionFromLanguageName(lang.progLangName) }
          : f
      )
    );
  };

  // File management and tab selection
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

  // WebSocket Setup – assume backend is in canonical mode
  useEffect(() => {
    const ws = new WebSocket('https://neudevcompiler-production.up.railway.app');
    wsRef.current = ws;
    ws.onopen = () => {
      console.log('WebSocket connected');
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stdout') {
        handleStdout(data.data ?? '');
      } else if (data.type === 'stderr') {
        finalizeLine('Error: ' + (data.data ?? ''));
      } else if (data.type === 'exit') {
        finalizeLine('\n\n>>> Program Terminated');
        setLoading(false);
      }
    };
    ws.onclose = () => {
      console.log('WebSocket connection closed');
    };
    return () => {
      ws.close();
    };
  }, []);

  // Handle output from the backend
  const handleStdout = (newData) => {
    let buffer = prompt + newData;
    const splitLines = buffer.split('\n');
    for (let i = 0; i < splitLines.length - 1; i++) {
      finalizeLine(splitLines[i]);
    }
    const lastPiece = splitLines[splitLines.length - 1];
    if (newData.endsWith('\n')) {
      finalizeLine(lastPiece);
      setPrompt('');
    } else {
      setPrompt(lastPiece);
    }
  };

  const finalizeLine = (text) => {
    setLines((prev) => [...prev, text]);
  };

  // Send code to the backend to run it
  const handleRunCode = () => {
    if (!activeFile) return;
    setLines([]);
    setPrompt('');
    setTypedInput('');
    setShowModal(true);
    setLoading(true);
    const ext =
      selectedLanguage?.progLangExtension ||
      getExtensionFromLanguageName(selectedLanguage?.progLangName || 'txt');
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'init',
        language: ext,
        code: activeFile.content,
        input: ''
      }));
      console.log('Code sent to server:\n', activeFile.content);
    } else {
      finalizeLine('Error: WebSocket not connected.');
      setLoading(false);
    }
  };

  // User Input Handling – we now use a separate input textarea
  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data: typedInput }));
      }
      // Do not merge the prompt and user input locally.
      // Clear prompt & typed input for the next line.
      setPrompt('');
      setTypedInput('');
      if (inputRef.current) {
        inputRef.current.textContent = '';
      }
    }
  };

  const handleInputChange = (e) => {
    setTypedInput(e.currentTarget.textContent);
  };

  const handleTerminalClick = () => {
    if (inputRef.current) {
      inputRef.current.focus();
      placeCaretAtEnd(inputRef.current);
    }
  };

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      placeCaretAtEnd(inputRef.current);
    }
  }, [lines, prompt, typedInput]);

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

  const handleCloseTerminal = () => {
    if (loading && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
    setLoading(false);
    setShowModal(false);
    setLines([]);
    setPrompt('');
    setTypedInput('');
  };

  return (
    <>
      <ProfilePlaygroundNavbarComponent />
      <div className="playground">
        <div className="playground-container">
          <div className="playground-header">
            <Row>
              <Col sm={10} className="left-corner">
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
                              variant="link"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFile(file.id);
                              }}
                              title="Delete file"
                            >
                              <FontAwesomeIcon icon={faTimes} color="red" />
                            </Button>
                          )}
                        </div>
                      }
                    />
                  ))}
                </Tabs>
                <Button variant="link" style={{ textDecoration: 'none' }} onClick={openAddFileModal}>
                  <span className="bi bi-plus-square-fill"></span>
                </Button>
              </Col>
              <Col sm={2} className="right-corner d-flex justify-content-end align-items-center">
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
                            src={selectedLanguage.progLangImage || programmingLanguageMap[selectedLanguage.progLangID]?.image}
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
                    const imageSrc = lang.progLangImage || programmingLanguageMap[lang.progLangID]?.image;
                    const languageName = lang.progLangName || programmingLanguageMap[lang.progLangID]?.name;
                    return (
                      <Dropdown.Item key={lang.progLangID} onClick={() => handleSelectLanguage(lang)}>
                        {imageSrc && (
                          <img src={imageSrc} alt={`${languageName}-icon`} style={{ width: '20px', marginRight: '8px' }} />
                        )}
                        {languageName}
                      </Dropdown.Item>
                    );
                  })}
                </DropdownButton>
              </Col>
            </Row>
            <div className="header-border"></div>
          </div>
          <div className="playground-editor">
            <textarea
              className="code-editor"
              value={activeFile?.content || ''}
              onChange={(e) => handleFileChange(e.target.value)}
              rows={15}
              placeholder="Write your code here..."
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
      <Modal
        show={showModal}
        onHide={handleCloseTerminal}
        size="lg"
        backdrop="static"
        keyboard={false}
        centered
        className="dark-terminal-modal"
      >
        <Modal.Header closeButton className="dark-terminal-modal-header">
          <Modal.Title>NEUDev Terminal</Modal.Title>
        </Modal.Header>
        <Modal.Body className="dark-terminal-modal-body">
          <div
            className="terminal"
            style={{
              backgroundColor: '#1e1e1e',
              color: '#fff',
              padding: '10px',
              fontFamily: 'monospace',
              minHeight: '250px',
              overflowY: 'auto'
            }}
            onClick={handleTerminalClick}
          >
            {lines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                {line}
              </div>
            ))}
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <span>{prompt}</span>
              <span
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                style={{ outline: 'none' }}
                onInput={handleInputChange}
                onKeyDown={handleInputKeyDown}
              />
            </div>
          </div>
        </Modal.Body>
      </Modal>
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
              The available extensions will depend on the currently selected language.
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

export default TeacherPlaygroundComponentTest;