import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Navbar,
  Row,
  Col,
  Button,
  Dropdown,
  DropdownButton,
  Tabs,
  Tab,
  Modal,
  Spinner,
  Form
} from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faCirclePlay,
  faCheck,
  faTimes,
  faPlusSquare,
  faQuestion,
  faExclamationTriangle
} from '@fortawesome/free-solid-svg-icons';
import '/src/style/student/assessment.css';
import { getActivityItemsByStudent, finalizeSubmission, saveActivityProgress, clearActivityProgress } from '../api/API';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const languageIconMap = {
  'C#': '/src/assets/c.png',
  Java: '/src/assets/java2.png',
  Python: '/src/assets/py.png'
};

function getExtensionFromLanguage(langName) {
  switch (langName) {
    case 'Java':
      return 'java';
    case 'C#':
      return 'cs';
    case 'Python':
      return 'py';
    default:
      return 'txt';
  }
}

export const StudentCodingAssessmentComponent = () => {
  const { classID, actID } = useParams();
  const navigate = useNavigate();
  const stateKey = `activityState_${actID}`;

  const [activityName, setActivityName] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [maxPoints, setMaxPoints] = useState(0);
  const [actDuration, setActDuration] = useState('');

  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState({
    name: 'Java',
    imgSrc: '/src/assets/java2.png'
  });

  // Use files from saved progress (if any)
  const [files, setFiles] = useState([{ id: 0, fileName: 'main', extension: 'py', content: '' }]);
  const [activeFileId, setActiveFileId] = useState(0);

  const [lines, setLines] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const wsRef = useRef(null);
  const inputRef = useRef(null);

  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const [timeExpired, setTimeExpired] = useState(false);

  const [testCaseResults, setTestCaseResults] = useState({});

  const [showFinishAttempt, setShowFinishAttempt] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);

  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('txt');
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editFileExtension, setEditFileExtension] = useState('');

  const [finalTitle, setFinalTitle] = useState('Result');
  const [finalTestCases, setFinalTestCases] = useState('0/0');
  const [finalScore, setFinalScore] = useState('0/0');
  const [finalRank, setFinalRank] = useState('-');
  const [finalSpeed, setFinalSpeed] = useState('0m');
  const [finalActivityName, setFinalActivityName] = useState('');

  const [startTime] = useState(Date.now());

  const [expandedTestCases, setExpandedTestCases] = useState({});
  const [expandedSummaryItems, setExpandedSummaryItems] = useState([]);

  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  // Fetch the latest activity details (to capture any teacher changes)
  useEffect(() => {
    async function fetchActivityData() {
      try {
        const resp = await getActivityItemsByStudent(actID);
        if (!resp.error) {
          setActivityName(resp.activityName);
          setActDesc(resp.actDesc);
          setMaxPoints(resp.maxPoints);
          setActDuration(resp.actDuration);
          setItems(resp.items || []);
          if (resp.items && resp.items.length > 0) {
            setExpandedItem(resp.items[0].itemID);
            setSelectedItem(resp.items[0].itemID);
          }
          if (resp.allowedLanguages && resp.allowedLanguages.length > 0) {
            setProgrammingLanguages(resp.allowedLanguages);
            const first = resp.allowedLanguages[0];
            setSelectedLanguage({
              name: first.progLangName,
              imgSrc: languageIconMap[first.progLangName] || '/src/assets/py.png'
            });
            // Update file extension for current file based on allowed languages
            setFiles((prev) =>
              prev.map((f) => ({
                ...f,
                extension: first.progLangExtension || getExtensionFromLanguage(first.progLangName)
              }))
            );
          }
          if (resp.rank) {
            setFinalRank(resp.rank);
          }
        }
      } catch (err) {
        console.error('Error fetching activity details:', err);
      }
    }
    fetchActivityData();
  }, [actID]);

  // Local Storage Initialization & Timer Setup using DB progress if available
  useEffect(() => {
    if (!actDuration) return;
    let initialTimeLeft;
    let endTime;
    const savedState = localStorage.getItem(stateKey);

    // Clear old state if endTime is missing or expired
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (!parsed.endTime || parsed.endTime < Date.now()) {
        localStorage.removeItem(stateKey);
      }
    }

    const newSavedState = localStorage.getItem(stateKey);
    if (newSavedState) {
      console.log("From assessment page: Found savedState for", stateKey, newSavedState);
      const parsed = JSON.parse(newSavedState);
      if (parsed.endTime && parsed.endTime > Date.now()) {
        endTime = parsed.endTime;
        initialTimeLeft = Math.floor((endTime - Date.now()) / 1000);
        console.log("From assessment page: Resuming with saved files:", parsed.files);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.activeFileId !== undefined) setActiveFileId(parsed.activeFileId);
        if (parsed.testCaseResults) setTestCaseResults(parsed.testCaseResults);
        if (parsed.selectedItem) setSelectedItem(parsed.selectedItem);
      } else {
        console.log("From assessment page: Saved state expired. Showing summary modal for manual submission.");
        setTimeLeft(0);
        setTimeExpired(true);
        setShowFinishAttempt(true);
        return;
      }
    } else {
      console.log("From assessment page: No savedState found. Creating new attempt.");
      const [hh, mm, ss] = actDuration.split(':').map(Number);
      const totalSeconds = (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
      initialTimeLeft = totalSeconds;
      endTime = Date.now() + totalSeconds * 1000;
      const newState = {
        endTime,
        files,
        activeFileId,
        actDuration,
        testCaseResults,
        selectedItem
      };
      localStorage.setItem(stateKey, JSON.stringify(newState));
      console.log("From assessment page: New state created in localStorage:", newState);
    }

    if (initialTimeLeft <= 0) {
      setTimeLeft(0);
      setTimeExpired(true);
      setShowFinishAttempt(true);
      return;
    } else {
      setTimeLeft(initialTimeLeft);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimeLeft(0);
            setTimeExpired(true);
            setShowFinishAttempt(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    setHasLoadedSavedState(true);
    return () => {
      clearInterval(timerRef.current);
    };
  }, [actDuration, stateKey]);

  // Sync local state changes to local storage and database
  useEffect(() => {
    if (!hasLoadedSavedState) return;
    const saved = localStorage.getItem(stateKey);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    const originalEndTime = parsed.endTime; // Preserve endTime
    parsed.files = files;
    parsed.activeFileId = activeFileId;
    parsed.testCaseResults = testCaseResults;
    parsed.selectedItem = selectedItem;
    if (originalEndTime) {
      parsed.endTime = originalEndTime;
    }
    localStorage.setItem(stateKey, JSON.stringify(parsed));
    
    console.log("From assessment page: Syncing localStorage:", parsed);
    // Prepare progress data payload
    const progressData = {
      itemID: selectedItem,
      draftFiles: JSON.stringify(files),
      draftTestCaseResults: JSON.stringify(testCaseResults),
      timeRemaining: timeLeft,
    };
    saveActivityProgress(actID, progressData)
      .then((res) => console.log("From assessment page: Progress saved to server:", res))
      .catch((err) => console.error("From assessment page: Error saving progress:", err));
  }, [files, activeFileId, testCaseResults, selectedItem, stateKey, hasLoadedSavedState, timeLeft]);

  // Periodically sync progress every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timeExpired && !isSubmitted) {
        const progressData = {
          itemID: selectedItem,
          draftFiles: JSON.stringify(files),
          draftTestCaseResults: JSON.stringify(testCaseResults),
          timeRemaining: timeLeft,
        };
        saveActivityProgress(actID, progressData)
          .then((res) => console.log("Periodic progress sync:", res))
          .catch((err) => console.error("Error during periodic progress sync:", err));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [files, activeFileId, testCaseResults, selectedItem, timeExpired, isSubmitted, actID, timeLeft]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!timeExpired && !isSubmitted) {
        finalizeSubmissionHandler();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [timeExpired, isSubmitted]);

  const formatTimeLeft = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
  };

  useEffect(() => {
    const ws = new WebSocket('wss://neudevcompiler-production.up.railway.app');
    wsRef.current = ws;
    ws.onopen = () => console.log('WebSocket connected');
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'stdout') {
        handleStdout(data.data || '');
      } else if (data.type === 'stderr') {
        finalizeLine('Error: ' + (data.data || ''));
      } else if (data.type === 'exit') {
        finalizeLine('\n\n>>> Program Terminated');
        setLoading(false);
      }
    };
    ws.onclose = () => console.log('WebSocket closed');
    return () => ws.close();
  }, []);

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

  const handleClassClick = () => {
    navigate(`/student/class/${classID}/activity`);
  };

  const toggleItem = (itemID) => {
    setExpandedItem((prev) => (prev === itemID ? null : itemID));
    setSelectedItem(itemID);
  };

  const handleSelectLanguage = (langName) => {
    const icon = languageIconMap[langName] || '/src/assets/py.png';
    setSelectedLanguage({ name: langName, imgSrc: icon });
    setFiles((prevFiles) =>
      prevFiles.map((file) =>
        file.id === activeFileId
          ? { ...file, extension: getExtensionFromLanguage(langName) }
          : file
      )
    );
  };

  const handleTabSelect = (fileId) => {
    setActiveFileId(fileId);
  };

  const handleFileChange = (newContent) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, content: newContent } : f))
    );
  };

  const openAddFileModal = () => {
    setNewFileExtension(getExtensionFromLanguage(selectedLanguage?.name || 'txt'));
    setNewFileName('');
    setShowAddFileModal(true);
  };

  const handleCreateNewFile = () => {
    const newId = files.length ? Math.max(...files.map((f) => f.id)) + 1 : 0;
    const newFile = {
      id: newId,
      fileName: newFileName || `file${newId}`,
      extension: newFileExtension || 'txt',
      content: ''
    };
    setFiles((prev) => [...prev, newFile]);
    setActiveFileId(newId);
    setShowAddFileModal(false);
    console.log("From assessment page: New file created", newFile);
  };

  const handleDeleteFile = (fileId) => {
    if (files.length === 1) return;
    if (window.confirm('Delete this file?')) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      if (activeFileId === fileId) {
        const remaining = files.filter((f) => f.id !== fileId);
        if (remaining[0]) setActiveFileId(remaining[0].id);
      }
      console.log("From assessment page: File deleted, new files array:", files);
    }
  };

  const openEditFileModal = () => {
    const file = files.find((f) => f.id === activeFileId);
    if (file) {
      setEditFileName(file.fileName);
      setEditFileExtension(file.extension);
      setShowEditFileModal(true);
    }
  };

  const handleEditFile = () => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? { ...f, fileName: editFileName, extension: editFileExtension }
          : f
      )
    );
    setShowEditFileModal(false);
    console.log("From assessment page: Edited file saved");
  };

  const activeFile = files.find((f) => f.id === activeFileId);

  const handleRunCode = () => {
    if (!activeFile || isSubmitted || timeExpired) return;
    setLines([]);
    setPrompt('');
    setTypedInput('');
    setShowTerminal(true);
    setLoading(true);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'init',
          language: activeFile.extension,
          code: activeFile.content,
          input: ''
        })
      );
    } else {
      finalizeLine('Error: WebSocket not connected.');
      setLoading(false);
    }
  };

  const runSingleTestCase = (testCase, scoreUpdate = false) => {
    return new Promise((resolve) => {
      if (!selectedItem) {
        resolve();
        return;
      }
      setLoading(true);
      setLines([]);
      setPrompt('');
      setTypedInput('');
      setShowTerminal(true);
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        let outputBuffer = [];
        const handleMessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'stdout') {
            outputBuffer.push(data.data || '');
          } else if (data.type === 'stderr') {
            outputBuffer.push('Error: ' + (data.data || ''));
          } else if (data.type === 'exit') {
            ws.removeEventListener('message', handleMessage);
            setLoading(false);
            let fullOutput = outputBuffer.join('');
            fullOutput = fullOutput.replace(/\n\n>>> Program Terminated\s*$/, '').trim();
            const pass = fullOutput === testCase.expectedOutput;
            setTestCaseResults((prev) => {
              const itemResults = prev[selectedItem] || {};
              const existing = itemResults[testCase.testCaseID] || {
                lockedPass: null,
                lockedPoints: 0,
                lockedOutput: '',
                latestPass: null,
                latestOutput: ''
              };
              const updated = { ...existing };
              updated.latestPass = pass;
              updated.latestOutput = fullOutput;
              if (scoreUpdate) {
                updated.lockedPass = pass;
                updated.lockedOutput = fullOutput;
                updated.lockedPoints = pass ? testCase.testCasePoints : 0;
              }
              return {
                ...prev,
                [selectedItem]: {
                  ...itemResults,
                  [testCase.testCaseID]: updated
                }
              };
            });
            resolve();
          }
        };
        ws.addEventListener('message', handleMessage);
        ws.send(
          JSON.stringify({
            type: 'init',
            language: activeFile.extension,
            code: activeFile.content,
            input: testCase.inputData
          })
        );
      } else {
        finalizeLine('Error: WebSocket not connected.');
        setLoading(false);
        resolve();
      }
    });
  };

  const handleCheckCode = async () => {
    if (!selectedItem || isSubmitted || timeExpired) return;
    setTestCaseResults((prev) => {
      const copy = { ...prev };
      delete copy[selectedItem];
      return copy;
    });
    const itemData = items.find((it) => it.itemID === selectedItem);
    if (!itemData || !itemData.testCases) return;
    for (let i = 0; i < itemData.testCases.length; i++) {
      await runSingleTestCase(itemData.testCases[i], true);
    }
    setLoading(false);
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const ws = wsRef.current;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data: typedInput }));
      }
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

  const handleCloseTerminal = () => {
    if (loading && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'kill' }));
    }
    setLoading(false);
    setShowTerminal(false);
    setLines([]);
    setPrompt('');
    setTypedInput('');
  };

  const computeItemScore = (itemID) => {
    const item = items.find((it) => it.itemID === itemID);
    if (!item || !item.testCases) return 0;
    const itemResults = testCaseResults[item.itemID] || {};
    let sum = 0;
    for (let tc of item.testCases) {
      const r = itemResults[tc.testCaseID];
      if (r && r.lockedPass !== null) {
        sum += r.lockedPoints;
      }
    }
    return sum;
  };

  const computeTotalScore = () => {
    let total = 0;
    items.forEach((item) => {
      total += computeItemScore(item.itemID);
    });
    return total;
  };

  const toggleSummaryItem = (itemID) => {
    setExpandedSummaryItems((prev) => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(itemID) ? arr.filter((id) => id !== itemID) : [...arr, itemID];
    });
  };

  const toggleSummaryTestCase = (tcIndex, itemID) => {
    setExpandedTestCases((prev) => {
      const key = `${itemID}-${tcIndex}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  const handleFinishAttempt = () => {
    setShowFinishAttempt(true);
  };

  // Finalize submission, then clear progress from DB and localStorage
  const finalizeSubmissionHandler = async () => {
    if (isSubmitted) return;
    let itemID = selectedItem;
    if (!itemID && items.length > 0) {
      itemID = items[0].itemID;
    }
    if (!itemID) {
      console.error("❌ No item available for submission");
      return;
    }
    const submissionData = {
      itemID,
      codeSubmission: activeFile ? activeFile.content : '',
      score: computeTotalScore(),
      timeSpent: Math.floor((Date.now() - startTime) / 60000)
    };
    console.log("From assessment page: Submitting final:", submissionData);

    const result = await finalizeSubmission(actID, submissionData);
    if (result.error) {
      console.error("From assessment page: Submission failed:", result.error, result.details);
    } else {
      setIsSubmitted(true);
      if (result.rank) setFinalRank(result.rank);
      // Clear progress from DB and localStorage for a fresh attempt
      await clearActivityProgress(actID);
      localStorage.removeItem(stateKey);
      console.log("From assessment page: Submission successful, cleared progress.");
    }
  };

  const handleSubmitAllAndFinish = async () => {
    if (isSubmitted) return;
    let totalTC = 0;
    let correctTC = 0;
    items.forEach((it) => {
      if (it.testCases) {
        totalTC += it.testCases.length;
        const itemRes = testCaseResults[it.itemID] || {};
        it.testCases.forEach((tc) => {
          const r = itemRes[tc.testCaseID];
          if (r && r.lockedPass === true) correctTC++;
        });
      }
    });
    setFinalTestCases(`${correctTC}/${totalTC}`);

    const totalScore = computeTotalScore();
    const mp = maxPoints || 1;
    const percent = (totalScore / mp) * 100;
    setFinalTitle(percent < 60 ? 'Bummer...' : 'You are Awesome!');
    setFinalActivityName(activityName);
    setFinalScore(`${totalScore}/${mp}`);

    if (timeExpired) {
      const [hh, mm, ss] = actDuration.split(':').map(Number);
      setFinalSpeed(`${mm}m ${ss}s`);
    } else {
      const endTime = Date.now();
      const diff = endTime - startTime;
      const mm = Math.floor(diff / 60000);
      const ss = Math.floor((diff % 60000) / 1000);
      setFinalSpeed(`${mm}m ${ss}s`);
    }

    await finalizeSubmissionHandler();
    setShowFinishAttempt(false);
    setShowSubmit(true);
  };

  const handleDownloadFiles = async () => {
    if (files.length === 1) {
      const single = files[0];
      const blob = new Blob([single.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${single.fileName}.${single.extension}`);
    } else {
      const zip = new JSZip();
      files.forEach((file) => {
        zip.file(`${file.fileName}.${file.extension}`, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'assessment_files.zip');
    }
  };

  return (
    <>
      <Navbar expand='lg' className='assessment-navbar-top'>
        <a href='#' onClick={handleClassClick}>
          <i className='bi bi-arrow-left-circle'></i>
        </a>
        <p>Back to previous page</p>
        <div className='assessment-navbar'>
          <span className='ping'>{formatTimeLeft(timeLeft)}</span>
          <a href='#'>
            <i className='bi bi-moon'></i>
          </a>
        </div>
      </Navbar>

      <div className='container-fluid assessment-content'>
        <Row className='g-3'>
          <Col>
            <div style={{ marginBottom: '1rem', fontWeight: 'bold' }}>
              Time Left: {formatTimeLeft(timeLeft)}
            </div>
            <div className='description-item'>
              {items.map((item, idx) => {
                const isOpen = expandedItem === item.itemID;
                return (
                  <div key={item.itemID}>
                    <div className='container item' onClick={() => toggleItem(item.itemID)}>
                      <h6>{`Item ${idx + 1}`}</h6>
                      <p className='point'>{item.actItemPoints} point/s</p>
                    </div>
                    {isOpen && (
                      <div className='container item-details'>
                        <h5>{item.itemName}</h5>
                        <p className='item-description'>{item.itemDesc}</p>
                        <div className='sample-output'>Sample Output</div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Col>

          <Col xs={7} className='col-compiler'>
            <div className='compiler-container'>
              <div className='compiler-header'>
                <Row>
                  <Col sm={10} className='compiler-left-corner'>
                    <Tabs
                      activeKey={activeFileId}
                      id='dynamic-file-tabs'
                      onSelect={(k) => setActiveFileId(Number(k))}
                    >
                      {files.map((file) => (
                        <Tab
                          key={file.id}
                          eventKey={file.id}
                          title={
                            <div className='d-flex align-items-center'>
                              <span>{`${file.fileName}.${file.extension}`}</span>
                              {files.length > 1 && (
                                <Button
                                  variant='link'
                                  size='sm'
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteFile(file.id);
                                  }}
                                  title='Delete file'
                                >
                                  <FontAwesomeIcon icon={faTimes} color='red' />
                                </Button>
                              )}
                            </div>
                          }
                        />
                      ))}
                    </Tabs>
                    <Button variant='link' style={{ textDecoration: 'none' }} onClick={openAddFileModal} title='Add File'>
                      <FontAwesomeIcon icon={faPlusSquare} />
                    </Button>
                    <Button variant='link' style={{ textDecoration: 'none' }} onClick={openEditFileModal} title='Edit File'>
                      <i className='bi bi-pencil'></i>
                    </Button>
                  </Col>
                  <Col sm={1} className='compiler-right-corner'>
                    <DropdownButton
                      className='compiler-dropdown'
                      id='language-dropdown'
                      size='sm'
                      title={
                        <>
                          <img src={selectedLanguage.imgSrc} style={{ width: '17px', marginRight: '8px' }} alt='lang-icon' />
                          {selectedLanguage.name}
                        </>
                      }
                      onSelect={handleSelectLanguage}
                    >
                      {programmingLanguages.map((lang) => (
                        <Dropdown.Item eventKey={lang.progLangName} key={lang.progLangID}>
                          {languageIconMap[lang.progLangName] && (
                            <img src={languageIconMap[lang.progLangName]} alt='' style={{ width: '17px', marginRight: '8px' }} />
                          )}
                          {lang.progLangName}
                        </Dropdown.Item>
                      ))}
                    </DropdownButton>
                  </Col>
                </Row>
                <div className='compiler-header-border'></div>
              </div>

              <div style={{ padding: '1rem', minHeight: '300px' }}>
                <textarea
                  className='code-editor w-100'
                  style={{ height: '400px' }}
                  value={activeFile?.content || ''}
                  onChange={(e) => !isSubmitted && !timeExpired && handleFileChange(e.target.value)}
                  placeholder='Write your code here...'
                  disabled={isSubmitted || timeExpired}
                />
              </div>

              <div className='compiler-bottom'>
                <Button className='run' onClick={handleRunCode} disabled={loading || isSubmitted || timeExpired}>
                  {loading ? (
                    <Spinner animation='border' size='sm' />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCirclePlay} className='run-icon' />
                      Run Code
                    </>
                  )}
                </Button>
                <Button className='check' onClick={handleCheckCode} disabled={loading || isSubmitted || timeExpired}>
                  {loading ? (
                    <Spinner animation='border' size='sm' />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className='check-icon' />
                      Check Code
                    </>
                  )}
                </Button>
                <Button variant='link' onClick={openAddFileModal}>
                  <FontAwesomeIcon icon={faPlusSquare} />
                </Button>
                <Button variant='link' onClick={handleDownloadFiles}>
                  <i className='bi bi-download'></i>
                </Button>
              </div>
            </div>
          </Col>

          <Col>
            <div className='item-navigation'>
              <div>
                <p>
                  Item Navigation <i className='bi bi-info-circle'></i>
                </p>
                {items.map((item, idx) => (
                  <Button
                    key={item.itemID}
                    className={`item-button ${selectedItem === item.itemID ? 'active' : ''}`}
                    onClick={() => {
                      setSelectedItem(item.itemID);
                      setExpandedItem(item.itemID);
                    }}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
              <div>
                <Button className='finish' onClick={handleFinishAttempt} disabled={isSubmitted}>
                  Finish attempt...
                </Button>

                <Modal
                  show={showFinishAttempt}
                  onHide={timeLeft > 0 ? () => setShowFinishAttempt(false) : undefined}
                  backdrop='static'
                  keyboard={false}
                  size='md'
                  className='activity-summary'
                >
                  <Modal.Header closeButton={timeLeft > 0}>
                    <Modal.Title>
                      {timeExpired ? (
                        <span style={{ color: 'red' }}>
                          <FontAwesomeIcon icon={faExclamationTriangle} /> Time Expired
                        </span>
                      ) : (
                        'Activity Summary'
                      )}
                    </Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    <h3>{activityName}</h3>
                    <p>Total Activity Score: {computeTotalScore()}/{maxPoints}</p>
                    {items.map((item, idx) => (
                      <div key={item.itemID}>
                        <div className='item-summary' onClick={() => toggleSummaryItem(item.itemID)} style={{ cursor: 'pointer' }}>
                          <p>{`Item ${idx + 1}: ${item.itemName} (${item.itemType})`}</p>
                          <p>Score: {computeItemScore(item.itemID)}/{item.actItemPoints}</p>
                          <i className='bi bi-arrow-right-circle'></i>
                        </div>
                        {expandedSummaryItems.includes(item.itemID) && (
                          <div className='item-details-summary'>
                            {item.testCases?.map((tc, index) => (
                              <div
                                key={tc.testCaseID}
                                className='test-case-summary'
                                onClick={() => toggleSummaryTestCase(index, item.itemID)}
                                style={{ cursor: 'pointer', paddingLeft: '1rem', borderBottom: '1px solid #ddd', marginBottom: '0.5rem' }}
                              >
                                <p><strong>Test Case {index + 1}</strong></p>
                                {expandedTestCases[`${item.itemID}-${index}`] && (
                                  <>
                                    <p>Your Output: {testCaseResults[item.itemID]?.[tc.testCaseID]?.lockedOutput || '(none)'}</p>
                                    <p>Expected Output: {tc.expectedOutput}</p>
                                    <p>Points: {testCaseResults[item.itemID]?.[tc.testCaseID]?.lockedPoints || 0}/{tc.testCasePoints}</p>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                    <div className='submit-finish'>
                      <Button onClick={handleSubmitAllAndFinish}>Submit all and Finish</Button>
                    </div>
                  </Modal.Body>
                </Modal>

                <Modal
                  show={showSubmit}
                  onHide={() => setShowSubmit(false)}
                  backdrop='static'
                  keyboard={false}
                  size='md'
                  className='activity-score'
                >
                  <Modal.Body>
                    <Row>
                      <Col className='col-robot'>
                        <div className='robot'>
                          <img src='/src/assets/robot 1.png' alt='robot' />
                        </div>
                      </Col>
                      <Col className='col-activity-details'>
                        <div className='activity-details'>
                          <h4>{finalTitle}</h4>
                          <p>{finalActivityName}</p>
                        </div>
                        <div className='activity-item-score'>
                          <p>Test Cases</p>
                          <p>{finalTestCases}</p>
                        </div>
                        <Button onClick={handleClassClick}>Home</Button>
                      </Col>
                    </Row>
                    <div className='activity-standing'>
                      <Row className='g-0'>
                        <Col className='activity-standing-button'>
                          <p>Rank</p>
                          <button disabled>{finalRank}</button>
                        </Col>
                        <Col className='activity-standing-button'>
                          <p>Overall Score</p>
                          <button disabled>{finalScore}</button>
                        </Col>
                        <Col className='activity-standing-button'>
                          <p>Speed</p>
                          <button disabled>{finalSpeed}</button>
                        </Col>
                      </Row>
                    </div>
                  </Modal.Body>
                </Modal>
              </div>
            </div>

            <div className='test-container'>
              <div className='test-header'>
                Tests <i className='bi bi-info-circle'></i>
              </div>
              {selectedItem &&
                items
                  .filter((it) => it.itemID === selectedItem)
                  .map((it) =>
                    it.testCases?.map((tc, idx) => {
                      const itemResults = testCaseResults[it.itemID] || {};
                      const r =
                        itemResults[tc.testCaseID] || {
                          lockedPass: null,
                          lockedPoints: 0,
                          lockedOutput: '',
                          latestPass: null,
                          latestOutput: ''
                        };
                      let passFail = 'untested';
                      if (r.latestPass === true) passFail = 'pass';
                      else if (r.latestPass === false) passFail = 'fail';

                      return (
                        <div key={tc.testCaseID} className='test-case'>
                          <div onClick={() =>
                            setExpandedTestCases((prev) => ({
                              ...prev,
                              [tc.testCaseID]: !prev[tc.testCaseID]
                            }))
                          } style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                            <Button style={{
                              width: '25px',
                              height: '25px',
                              borderRadius: '50%',
                              border: 'none',
                              marginRight: '10px',
                              backgroundColor:
                                passFail === 'pass'
                                  ? 'green'
                                  : passFail === 'fail'
                                  ? 'red'
                                  : '#D9D9D9',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {passFail === 'pass' && (<FontAwesomeIcon icon={faCheck} style={{ color: '#fff' }} />)}
                              {passFail === 'fail' && (<FontAwesomeIcon icon={faTimes} style={{ color: '#fff' }} />)}
                              {passFail === 'untested' && (<FontAwesomeIcon icon={faQuestion} style={{ color: '#fff' }} />)}
                            </Button>
                            <p>{`Test Case ${idx + 1}`}</p>
                            <i className='bi bi-play-circle'
                              style={{ cursor: 'pointer', marginLeft: 'auto' }}
                              onClick={(e) => {
                                e.stopPropagation();
                                runSingleTestCase(tc, false);
                              }}></i>
                          </div>
                          {expandedTestCases[tc.testCaseID] && (
                            <div className='test-case-details' style={{ paddingLeft: '35px' }}>
                              <p>Your Output: {r.latestOutput || '(none)'}</p>
                              <p>Expected Output: {tc.expectedOutput}</p>
                              <p>Points: {r.lockedPoints}/{tc.testCasePoints}</p>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
              <div className='test-footer'>
                <p>
                  Score: {selectedItem ? computeItemScore(selectedItem) : 0}/
                  {selectedItem
                    ? items.find((x) => x.itemID === selectedItem)?.testCaseTotalPoints
                    : 0}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      <Modal show={showTerminal} onHide={handleCloseTerminal} size='lg' backdrop='static' keyboard={false} centered>
        <Modal.Header closeButton>
          <Modal.Title>NEUDev Terminal</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>
          <div style={{
              padding: '10px',
              fontFamily: 'monospace',
              minHeight: '300px',
              overflowY: 'auto'
            }}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.focus();
                const range = document.createRange();
                range.selectNodeContents(inputRef.current);
                range.collapse(false);
                const sel = window.getSelection();
                sel.removeAllRanges();
                sel.addRange(range);
              }
            }}
          >
            {lines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: 'pre-wrap' }}>
                {line}
              </div>
            ))}
            <div style={{ whiteSpace: 'pre-wrap' }}>
              <span>{prompt}</span>
              <span ref={inputRef} contentEditable suppressContentEditableWarning style={{ outline: 'none' }}
                onInput={handleInputChange} onKeyDown={handleInputKeyDown} />
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
            <Form.Control type='text' placeholder='Enter filename (without extension)' value={newFileName} onChange={(e) => setNewFileName(e.target.value)} />
          </Form.Group>
          <Form.Group className='mt-3'>
            <Form.Label>Extension</Form.Label>
            <Form.Control type='text' placeholder='e.g. py, cs, java...' value={newFileExtension} onChange={(e) => setNewFileExtension(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowAddFileModal(false)}>Cancel</Button>
          <Button variant='primary' onClick={handleCreateNewFile}>Create</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditFileModal} onHide={() => setShowEditFileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Filename</Form.Label>
            <Form.Control type='text' placeholder='Enter filename (without extension)' value={editFileName} onChange={(e) => setEditFileName(e.target.value)} />
          </Form.Group>
          <Form.Group className='mt-3'>
            <Form.Label>Extension</Form.Label>
            <Form.Control type='text' placeholder='e.g. py, cs, java...' value={editFileExtension} onChange={(e) => setEditFileExtension(e.target.value)} />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowEditFileModal(false)}>Cancel</Button>
          <Button variant='primary' onClick={handleEditFile}>Save Changes</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StudentCodingAssessmentComponent;