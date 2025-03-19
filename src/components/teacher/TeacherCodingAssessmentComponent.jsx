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
import { 
  getActivityItemsByTeacher, 
  saveActivityProgress, 
  clearActivityProgress,
  getCurrentUserKey 
} from '../api/API';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';

const languageIconMap = {
  'C#': '/src/assets/c.png',
  Java: '/src/assets/java2.png',
  Python: '/src/assets/py.png'
};

function getExtensionFromLanguage(langName) {
  switch (langName) {
    case 'Java': return 'java';
    case 'C#':   return 'cs';
    case 'Python': return 'py';
    default:     return 'txt';
  }
}

export const TeacherCodingAssessmentComponent = () => {
  const { classID, actID } = useParams();
  const navigate = useNavigate();

  // Teacher key for local storage
  const teacherKey = getCurrentUserKey() || 'default';
  const stateKey = `activityState_${actID}_${teacherKey}`;

  // Activity states
  const [activityName, setActivityName] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [maxPoints, setMaxPoints] = useState(0);
  const [actDuration, setActDuration] = useState('');
  const [finalScorePolicy, setFinalScorePolicy] = useState('last_attempt');

  // Items & languages
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState({
    name: 'Java',
    imgSrc: '/src/assets/java2.png'
  });

  // Code files
  const [files, setFiles] = useState([{ id: 0, fileName: 'main', extension: 'py', content: '' }]);
  const [activeFileId, setActiveFileId] = useState(0);

  // Terminal/test states
  const [lines, setLines] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  const [testCaseResults, setTestCaseResults] = useState({});

  // Timer/test finishing states
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [isTestFinished, setIsTestFinished] = useState(false);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  // Summary modals
  const [showFinishAttempt, setShowFinishAttempt] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [finalTitle, setFinalTitle] = useState('Result');
  const [finalTestCases, setFinalTestCases] = useState('0/0');
  const [finalScore, setFinalScore] = useState('0/0');
  const [finalSpeed, setFinalSpeed] = useState('00:00:00');
  const [finalActivityName, setFinalActivityName] = useState('');

  // Test Completed flow
  const [showTestCompletedModal, setShowTestCompletedModal] = useState(false);

  // File modals
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('txt');
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editFileExtension, setEditFileExtension] = useState('txt');

  // Track per-item times
  const [itemTimes, setItemTimes] = useState({});

  // Start time
  const [startTime] = useState(Date.now());

  // Expand/collapse states for summary
  const [expandedTestCases, setExpandedTestCases] = useState({});
  const [expandedSummaryItems, setExpandedSummaryItems] = useState([]);

  // For disabled state when submitting
    const [isDisabled, setIsDisabled] = useState(false);
    
  // Format seconds to HH:MM:SS
  function formatTime(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  // --- 1) Fetch teacher data from backend
  useEffect(() => {
    async function fetchActivityData() {
      try {
        const resp = await getActivityItemsByTeacher(actID);
        if (!resp.error) {
          setActivityName(resp.activityName);
          setActDesc(resp.actDesc);
          setMaxPoints(resp.maxPoints);
          setActDuration(resp.actDuration);
          if (resp.finalScorePolicy) {
            setFinalScorePolicy(resp.finalScorePolicy);
          }
          setItems(resp.items || []);
          if (resp.items && resp.items.length > 0) {
            // Expand the first item
            toggleItem(resp.items[0].itemID);
          }
          if (resp.allowedLanguages && resp.allowedLanguages.length > 0) {
            setProgrammingLanguages(resp.allowedLanguages);
            const first = resp.allowedLanguages[0];
            setSelectedLanguage({
              name: first.progLangName,
              imgSrc: languageIconMap[first.progLangName] || '/src/assets/java2.png'
            });
          }
        }
      } catch (err) {
        console.error('Error fetching activity details:', err);
      }
    }
    fetchActivityData();
  }, [actID]);

  // --- 2) Poll for updates (duration, items) every 10s
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const resp = await getActivityItemsByTeacher(actID);
        if (!resp.error) {
          if (resp.actDuration) {
            const [hh, mm, ss] = resp.actDuration.split(':').map(Number);
            const teacherDurationSec = (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
            let effectiveSec = teacherDurationSec;

            if (resp.closeDate) {
              const closeDate = new Date(resp.closeDate);
              const remainingDeadlineSec = Math.floor((closeDate - Date.now()) / 1000);
              effectiveSec = Math.min(teacherDurationSec, remainingDeadlineSec);
            }

            if (!isTestFinished) {
              const saved = localStorage.getItem(stateKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.teacherDuration !== teacherDurationSec) {
                  parsed.teacherDuration = teacherDurationSec;
                  parsed.endTime = Date.now() + effectiveSec * 1000;
                  localStorage.setItem(stateKey, JSON.stringify(parsed));
                } else {
                  const storedRemaining = Math.floor((parsed.endTime - Date.now()) / 1000);
                  effectiveSec = Math.min(effectiveSec, storedRemaining);
                  parsed.endTime = Date.now() + effectiveSec * 1000;
                  localStorage.setItem(stateKey, JSON.stringify(parsed));
                }
              } else {
                const newEndTime = Date.now() + effectiveSec * 1000;
                localStorage.setItem(stateKey, JSON.stringify({ endTime: newEndTime, teacherDuration: teacherDurationSec }));
              }
            }
            setActDuration(resp.actDuration);
            setTimeLeft(effectiveSec);
          }
          if (resp.items) {
            setItems(resp.items);
          }
        }
      } catch (error) {
        console.error('Error polling activity updates:', error);
      }
    }, 10000);
    return () => clearInterval(pollInterval);
  }, [actID, stateKey, isTestFinished]);

  // --- 3) Initialize local state/timer
  useEffect(() => {
    if (isTestFinished) return;
    if (!actDuration) return;

    let initialTimeLeft;
    let endTime;
    const savedState = localStorage.getItem(stateKey);
    if (savedState) {
      const parsed = JSON.parse(savedState);
      if (!parsed.endTime || parsed.endTime < Date.now()) {
        localStorage.removeItem(stateKey);
      }
    }

    const newSaved = localStorage.getItem(stateKey);
    if (newSaved) {
      const parsed = JSON.parse(newSaved);
      if (parsed.endTime && parsed.endTime > Date.now()) {
        endTime = parsed.endTime;
        initialTimeLeft = Math.floor((endTime - Date.now()) / 1000);

        if (parsed.files) setFiles(parsed.files);
        if (parsed.activeFileId !== undefined) setActiveFileId(parsed.activeFileId);
        if (parsed.testCaseResults) setTestCaseResults(parsed.testCaseResults);
        if (parsed.selectedItem) setSelectedItem(parsed.selectedItem);
        // Use the new key for item times:
        if (parsed.draftItemTimes) setItemTimes(parsed.draftItemTimes);
      } else {
        setTimeLeft(0);
        setTimeExpired(true);
        setShowFinishAttempt(true);
        return;
      }
    } else {
      const [hh, mm, ss] = actDuration.split(':').map(Number);
      const totalSeconds = (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
      initialTimeLeft = totalSeconds;
      endTime = Date.now() + totalSeconds * 1000;
      // Initialize using the new key for item times.
      const newState = {
        startTime,
        endTime,
        teacherDuration: totalSeconds,
        files,
        activeFileId,
        actDuration,
        testCaseResults,
        selectedItem,
        draftScore: computeTotalScore(),
        draftItemTimes: itemTimes
      };
      localStorage.setItem(stateKey, JSON.stringify(newState));
    }

    if (initialTimeLeft <= 0) {
      setTimeLeft(0);
      setTimeExpired(true);
      setShowFinishAttempt(true);
    } else {
      setTimeLeft(initialTimeLeft);
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
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

    return () => clearInterval(timerRef.current);
  }, [startTime, actDuration, stateKey, isTestFinished]);

  // --- 4) Sync local state to localStorage & backend progress
  useEffect(() => {
    if (!hasLoadedSavedState || isTestFinished) return;
    const saved = localStorage.getItem(stateKey);
    if (!saved) return;

    const parsed = JSON.parse(saved);
    parsed.files = files;
    parsed.activeFileId = activeFileId;
    parsed.testCaseResults = testCaseResults;
    // Update to use the new key:
    parsed.draftItemTimes = itemTimes;
    parsed.draftScore = computeTotalScore();

    localStorage.setItem(stateKey, JSON.stringify(parsed));

    // Build progressData payload with the new key names:
    const progressData = {
      draftFiles: JSON.stringify(files),
      draftTestCaseResults: JSON.stringify(testCaseResults),
      draftTimeRemaining: timeLeft, // changed key
      draftSelectedLanguage: selectedLanguage.name, // changed key
      draftScore: computeTotalScore(),
      draftItemTimes: JSON.stringify(itemTimes) // changed key
    };
    saveActivityProgress(actID, progressData)
      .then(res => console.log("Progress saved to server:", res))
      .catch(err => console.error("Error saving progress:", err));
  }, [
    files, activeFileId, testCaseResults, itemTimes,
    stateKey, hasLoadedSavedState, timeLeft, selectedLanguage, isTestFinished
  ]);

  // --- 5) Periodic progress sync every 5s
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timeExpired && !isTestFinished) {
        const progressData = {
          draftFiles: JSON.stringify(files),
          draftTestCaseResults: JSON.stringify(testCaseResults),
          draftTimeRemaining: timeLeft, // changed key
          draftSelectedLanguage: selectedLanguage.name, // changed key
          draftScore: computeTotalScore()
        };
        saveActivityProgress(actID, progressData)
          .then(res => console.log("Periodic progress sync:", res))
          .catch(err => console.error("Error during periodic sync:", err));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [files, activeFileId, testCaseResults, timeExpired, isTestFinished, actID, timeLeft, selectedLanguage]);

  // --- 6) WebSocket setup
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
    setLines(prev => [...prev, text]);
  };

  // --- 7) Toggling items (track time)
  const toggleItem = (itemID) => {
    const now = Date.now();
    if (selectedItem) {
      setItemTimes(prev => {
        const prevItem = prev[selectedItem] || { accumulated: 0 };
        const startTimeValue = prevItem.start || now;
        const elapsed = Math.floor((now - startTimeValue) / 1000);
        return {
          ...prev,
          [selectedItem]: {
            start: null,
            accumulated: (prevItem.accumulated || 0) + elapsed
          }
        };
      });
    }
    setSelectedItem(itemID);
    setExpandedItem(itemID);
    setItemTimes(prev => ({
      ...prev,
      [itemID]: {
        accumulated: prev[itemID]?.accumulated || 0,
        start: now
      }
    }));
  };

  // --- 8) Language & file management
  const handleSelectLanguage = (langName) => {
    const icon = languageIconMap[langName] || '/src/assets/py.png';
    setSelectedLanguage({ name: langName, imgSrc: icon });
    setFiles(prevFiles =>
      prevFiles.map(file =>
        file.id === activeFileId
          ? { ...file, extension: getExtensionFromLanguage(langName) }
          : file
      )
    );
  };

  const handleTabSelect = (fileId) => {
    setActiveFileId(Number(fileId));
  };

  const handleFileChange = (newContent) => {
    setFiles(prev =>
      prev.map(f => f.id === activeFileId ? { ...f, content: newContent } : f)
    );
  };

  const openAddFileModal = () => {
    setNewFileExtension(getExtensionFromLanguage(selectedLanguage?.name || 'txt'));
    setNewFileName('');
    setShowAddFileModal(true);
  };

  const handleCreateNewFile = () => {
    const newId = files.length ? Math.max(...files.map(f => f.id)) + 1 : 0;
    const newFile = {
      id: newId,
      fileName: newFileName || `file${newId}`,
      extension: newFileExtension || 'txt',
      content: ''
    };
    setFiles(prev => [...prev, newFile]);
    setActiveFileId(newId);
    setShowAddFileModal(false);
  };

  const handleDeleteFile = (fileId) => {
    if (files.length === 1) return;
    if (window.confirm('Delete this file?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (activeFileId === fileId) {
        const remaining = files.filter(f => f.id !== fileId);
        if (remaining[0]) setActiveFileId(remaining[0].id);
      }
    }
  };

  const openEditFileModal = () => {
    const file = files.find(f => f.id === activeFileId);
    if (file) {
      setEditFileName(file.fileName);
      setEditFileExtension(file.extension);
      setShowEditFileModal(true);
    }
  };

  const handleEditFile = () => {
    setFiles(prev =>
      prev.map(f =>
        f.id === activeFileId
          ? { ...f, fileName: editFileName, extension: editFileExtension }
          : f
      )
    );
    setShowEditFileModal(false);
  };

  const activeFile = files.find(f => f.id === activeFileId);

  // --- 9) Code execution
  const handleRunCode = () => {
    if (!activeFile || isTestFinished || timeExpired) return;
    setLines([]);
    setPrompt('');
    setTypedInput('');
    setShowTerminal(true);
    setLoading(true);

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'init',
        language: activeFile.extension,
        code: activeFile.content,
        input: ''
      }));
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
            const pass = fullOutput.trim() === testCase.expectedOutput.trim();

            console.log("TestCase Output:", fullOutput, "Expected:", testCase.expectedOutput, "Pass:", pass);

            if (scoreUpdate) {
              setTestCaseResults(prev => {
                const itemResults = prev[selectedItem] || {};
                const existing = itemResults[testCase.testCaseID] || {
                  latestPass: null,
                  latestPoints: 0,
                  latestOutput: '',
                  bestPass: null,
                  bestPoints: 0,
                  bestOutput: ''
                };

                existing.latestPass = pass;
                existing.latestPoints = pass ? testCase.testCasePoints : 0;
                existing.latestOutput = fullOutput;

                if (existing.latestPoints > (existing.bestPoints || 0)) {
                  existing.bestPass = existing.latestPass;
                  existing.bestPoints = existing.latestPoints;
                  existing.bestOutput = existing.latestOutput;
                }

                return {
                  ...prev,
                  [selectedItem]: {
                    ...itemResults,
                    [testCase.testCaseID]: existing
                  }
                };
              });
            } else {
              setTestCaseResults(prev => {
                const itemResults = prev[selectedItem] || {};
                const existing = itemResults[testCase.testCaseID] || {
                  latestPass: null,
                  latestPoints: 0,
                  latestOutput: '',
                  bestPass: null,
                  bestPoints: 0,
                  bestOutput: ''
                };

                existing.latestPass = pass;
                existing.latestOutput = fullOutput;

                return {
                  ...prev,
                  [selectedItem]: {
                    ...itemResults,
                    [testCase.testCaseID]: existing
                  }
                };
              });
            }
            resolve();
          }
        };
        ws.addEventListener('message', handleMessage);
        ws.send(JSON.stringify({
          type: 'init',
          language: activeFile.extension,
          code: activeFile.content,
          input: testCase.inputData
        }));
      } else {
        finalizeLine('Error: WebSocket not connected.');
        setLoading(false);
        resolve();
      }
    });
  };

  const handleCheckCode = async () => {
    if (!selectedItem || isTestFinished || timeExpired) return;
    setTestCaseResults(prev => {
      const copy = { ...prev };
      delete copy[selectedItem];
      return copy;
    });
    const itemData = items.find(it => it.itemID === selectedItem);
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

  // --- Scoring
  const computeItemScore = (itemID) => {
    const item = items.find(it => it.itemID === itemID);
    if (!item || !item.testCases) return 0;
    const itemResults = testCaseResults[itemID] || {};
    let sum = 0;
    item.testCases.forEach(tc => {
      const r = itemResults[tc.testCaseID] || {};
      sum += r.latestPoints || 0;
    });
    return sum;
  };

  const computeTotalScore = () => {
    let total = 0;
    items.forEach(item => {
      total += computeItemScore(item.itemID);
    });
    return total;
  };

  // Summaries expand/collapse
  const toggleSummaryItem = (itemID) => {
    setExpandedSummaryItems(prev => {
      const arr = Array.isArray(prev) ? prev : [];
      return arr.includes(itemID) ? arr.filter(id => id !== itemID) : [...arr, itemID];
    });
  };

  const toggleSummaryTestCase = (tcIndex, itemID) => {
    setExpandedTestCases(prev => {
      const key = `${itemID}-${tcIndex}`;
      return { ...prev, [key]: !prev[key] };
    });
  };

  // --- Finish attempt for teacher
  const handleFinishAttempt = () => {
    setShowFinishAttempt(true);
  };

  // Actually finalize the teacher's test
  const handleSubmitAllAndFinish = async () => {
    if (isTestFinished || isDisabled) return; // Prevent multiple clicks

    setIsDisabled(true); // Disable button immediately

    let totalTC = 0, correctTC = 0;
    items.forEach(it => {
      if (it.testCases) {
        totalTC += it.testCases.length;
        const itemRes = testCaseResults[it.itemID] || {};
        it.testCases.forEach(tc => {
          const r = itemRes[tc.testCaseID];
          if (r && r.latestPass === true) correctTC++;
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

    const [hh, mm, ss] = actDuration.split(':').map(Number);
    const totalActSeconds = (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
    const overallTimeSpent = timeExpired ? totalActSeconds : totalActSeconds - timeLeft;
    setFinalSpeed(formatTime(overallTimeSpent));

    setIsTestFinished(true);
    setShowFinishAttempt(false);
    setShowResultModal(true);
    await clearActivityProgress(actID)
      .then(res => console.log("Cleared progress:", res))
      .catch(err => console.error("Error clearing progress:", err));
    localStorage.removeItem(stateKey);
  };

  const handleHomeButton = () => {
    setShowResultModal(false);
    setShowTestCompletedModal(true);
  };

  const handleTestCompletedConfirm = () => {
    setShowTestCompletedModal(false);
    navigate(`/teacher/class/${classID}/activity/${actID}/items`);
  };

  // Download code files
  const handleDownloadFiles = async () => {
    if (files.length === 1) {
      const single = files[0];
      const blob = new Blob([single.content], { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${single.fileName}.${single.extension}`);
    } else {
      const zip = new JSZip();
      files.forEach(file => {
        zip.file(`${file.fileName}.${file.extension}`, file.content);
      });
      const content = await zip.generateAsync({ type: 'blob' });
      saveAs(content, 'assessment_files.zip');
    }
  };

  return (
    <>
      <Navbar expand='lg' className='assessment-navbar-top'>
        <a href='#' onClick={() => navigate(`/teacher/class/${classID}/activity/${actID}/items`)}>
          <i className='bi bi-arrow-left-circle'></i>
        </a>
        <p>Back to Activity Items</p>
        <div className='assessment-navbar'>
          <span className='ping'>23 ms</span>
          <a href='#'><i className='bi bi-moon'></i></a>
        </div>
      </Navbar>

      <div className='container-fluid assessment-content'>
        <Row className='g-3'>
          {/* Left Column: Items list */}
          <Col>
            <div className='assessment-time'>
              Time Left: {formatTime(timeLeft)}
            </div>
            <div className='description-item'>
              {items.map((item, idx) => {
                const isOpen = expandedItem === item.itemID;
                return (
                  <div key={item.itemID}>
                    <div className='container item' onClick={() => toggleItem(item.itemID)}>
                      <h6>{`Item ${idx + 1}: ${item.itemName}`}</h6>
                      <p>{item.actItemPoints} point/s</p>
                    </div>
                    {isOpen && (
                      <div className='container item-details'>
                        <h5>{item.itemName}</h5>
                        <p className='item-description'>{item.itemDesc}</p>
                        <p><em>{item.itemType}</em></p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Col>

          {/* Middle Column: Code editor */}
          <Col xs={7} className='col-compiler'>
            <div className='compiler-container'>
              <div className='compiler-header'>
                <div className='left-corner'>
                  <Tabs activeKey={activeFileId} id='dynamic-file-tabs' onSelect={handleTabSelect}>
                    {files.map(file => (
                      <Tab
                        key={file.id}
                        eventKey={file.id}
                        title={
                          <div 
                            className={`d-flex align-items-center ${file.id === activeFileId ? 'active-tab' : ''}`}
                          >
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
                  <Button className='plus-sqaure-icon' variant='transparent' onClick={openAddFileModal}>
                    <FontAwesomeIcon icon={faPlusSquare} size="lg" />
                  </Button>

                  <Button className='pencil-icon' variant='transparent' onClick={openEditFileModal} title='Edit File'>
                    <i className='bi bi-pencil'></i>
                  </Button>
                </div>

                <div className='right-corner'>
                  <DropdownButton className='compiler-dropdown' id='language-dropdown' size='sm'
                    title={
                      <>
                        <img src={selectedLanguage.imgSrc} style={{ width: '17px', marginRight: '8px' }} alt='lang-icon' />
                        {selectedLanguage.name}
                      </>
                    }
                    onSelect={handleSelectLanguage}>
                    {programmingLanguages.map(lang => (
                      <Dropdown.Item eventKey={lang.progLangName} key={lang.progLangID}>
                        {languageIconMap[lang.progLangName] && (
                          <img src={languageIconMap[lang.progLangName]} alt='' style={{ width: '17px', marginRight: '8px' }} />
                        )}
                        {lang.progLangName}
                      </Dropdown.Item>
                    ))}
                  </DropdownButton>
                </div>
                <div className='compiler-header-border'></div>
              </div>

              <div>
                <textarea
                  className='code-editor w-100'
                  value={activeFile?.content || ''}
                  onChange={(e) => !isTestFinished && !timeExpired && handleFileChange(e.target.value)}
                  placeholder='Write your code here...'
                  disabled={isTestFinished || timeExpired}
                />
              </div>

              <div className='compiler-bottom'>
                <Button className='run' onClick={handleRunCode} disabled={loading || isTestFinished || timeExpired}>
                  {loading ? (
                    <Spinner animation='border' size='sm' />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCirclePlay} className='run-icon' />
                      Run Code
                    </>
                  )}
                </Button>
                <Button className='check' onClick={handleCheckCode} disabled={loading || isTestFinished || timeExpired}>
                  {loading ? (
                    <Spinner animation='border' size='sm' />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className='check-icon' />
                      Check Code
                    </>
                  )}
                </Button>
              </div>

              
            </div>
          </Col>

          {/* Right Column: Test cases & Finish Attempt */}
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
                    onClick={() => toggleItem(item.itemID)}
                  >
                    {idx + 1}
                  </Button>
                ))}
              </div>
              <div>
                <Button className='finish' onClick={handleFinishAttempt} disabled={isTestFinished}>
                  Finish attempt...
                </Button>
              </div>
            </div>

            <div className='test-container'>
              <div className='test-header'>
                Tests <i className='bi bi-info-circle'></i>
              </div>
              {selectedItem &&
                items.filter(it => it.itemID === selectedItem).map(it =>
                  it.testCases?.map((tc, idx) => {
                    const itemResults = testCaseResults[it.itemID] || {};
                    const r = itemResults[tc.testCaseID] || {
                      latestPass: null,
                      latestPoints: 0,
                      latestOutput: '',
                      bestPass: null,
                      bestPoints: 0,
                      bestOutput: ''
                    };
                    let passFail = 'untested';
                    if (r.latestPass === true) passFail = 'pass';
                    else if (r.latestPass === false) passFail = 'fail';

                    return (
                      <>
                      <div key={tc.testCaseID}>
                        <div onClick={() => 
                          setExpandedTestCases(prev => ({ 
                            ...prev, 
                            [tc.testCaseID]: !prev[tc.testCaseID] 
                          }))}
                          className='test-case'
                        >

                          <Button style={{
                            width: '25px',
                            height: '25px',
                            borderRadius: '50%',
                            border: 'none',
                            marginRight: '10px',
                            backgroundColor: passFail === 'pass' ? 'green' : passFail === 'fail' ? 'red' : '#D9D9D9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {passFail === 'pass' && (<FontAwesomeIcon icon={faCheck} style={{ color: '#fff' }} />)}
                            {passFail === 'fail' && (<FontAwesomeIcon icon={faTimes} style={{ color: '#fff' }} />)}
                            {passFail === 'untested' && (<FontAwesomeIcon icon={faQuestion} style={{ color: '#fff' }} />)}
                          </Button>
                          <p>{`Test Case ${idx + 1}`}</p>
                          <i className='bi bi-play-circle' style={{ cursor: 'pointer', marginLeft: 'auto' }}
                            onClick={(e) => { e.stopPropagation(); runSingleTestCase(tc, false); }}></i>
                        </div>
                      </div>
                      
                      {expandedTestCases[tc.testCaseID] && (
                        <div className='test-case-details'>
                          {tc.isHidden 
                            ? <p>This test case is hidden</p>
                            : (
                              <>
                                <p>Your Output: {r.latestOutput || 'none'}</p>
                                <p>Expected Output: {tc.expectedOutput}</p>
                                <p>
                                  Points: {finalScorePolicy === 'highest_score' ? (r.bestPoints || 0) : (r.latestPoints || 0)}/{tc.testCasePoints}
                                </p>
                              </>
                            )
                          }
                        </div>
                      )}
                      </>
                    );
                  })
                )}
              <div className='test-footer'>
                <p>
                  Score: {selectedItem ? computeItemScore(selectedItem) : 0}/
                  {selectedItem ? items.find(x => x.itemID === selectedItem)?.testCaseTotalPoints : 0}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Terminal Modal */}
      <Modal
        show={showTerminal}
        onHide={handleCloseTerminal}
        size='lg'
        backdrop='static'
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>NEUDev Terminal</Modal.Title>
        </Modal.Header>
        <Modal.Body style={{ backgroundColor: '#1e1e1e', color: '#fff' }}>
          <div
            style={{
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

      {/* Add File Modal */}
      <Modal show={showAddFileModal} onHide={() => setShowAddFileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Add File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Filename</Form.Label>
            <Form.Control
              type='text'
              placeholder='Enter filename (without extension)'
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className='mt-3'>
            <Form.Label>Extension</Form.Label>
            <Form.Control
              type='text'
              placeholder='e.g. py, cs, java...'
              value={newFileExtension}
              onChange={(e) => setNewFileExtension(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowAddFileModal(false)}>
            Cancel
          </Button>
          <Button variant='primary' onClick={handleCreateNewFile}>
            Create
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit File Modal */}
      <Modal show={showEditFileModal} onHide={() => setShowEditFileModal(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Filename</Form.Label>
            <Form.Control
              type='text'
              placeholder='Enter filename (without extension)'
              value={editFileName}
              onChange={(e) => setEditFileName(e.target.value)}
            />
          </Form.Group>
          <Form.Group className='mt-3'>
            <Form.Label>Extension</Form.Label>
            <Form.Control
              type='text'
              placeholder='e.g. py, cs, java...'
              value={editFileExtension}
              onChange={(e) => setEditFileExtension(e.target.value)}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant='secondary' onClick={() => setShowEditFileModal(false)}>
            Cancel
          </Button>
          <Button variant='primary' onClick={handleEditFile}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Finish Attempt (Summary) Modal */}
      <Modal
        show={showFinishAttempt}
        onHide={timeLeft > 0 ? () => setShowFinishAttempt(false) : undefined}
        backdrop='static'
        keyboard={false}
        size='md'
        className='activity-summary'
      >
        <Modal.Header closeButton>
          <Modal.Title>
            {timeExpired ? (
              <span style={{ color: 'red' }}>
                <FontAwesomeIcon icon={faExclamationTriangle} style={{ marginRight: '5px' }} />
                Time Expired
              </span>
            ) : (
              'Activity Summary'
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h3>{activityName}</h3>
          <p className='total-activity-score'>Total Activity Score: {computeTotalScore()}/{maxPoints}</p>
          {items.map((item, idx) => (
            <div
              key={item.itemID}
              className='item-summary'
              onClick={() => toggleSummaryItem(item.itemID)}
              style={{ cursor: 'pointer' }}
            >
              <p><strong>{`Item ${idx + 1}: ${item.itemName}`}</strong></p>
              <p>{item.itemDesc} | <em>{item.itemType}</em></p>
              <p><strong>Score: {computeItemScore(item.itemID)}/{item.actItemPoints}</strong></p>
            </div>
          ))}
          <div className='submit-finish'> 
            <Button onClick={handleSubmitAllAndFinish} disabled={isDisabled}>
              {isDisabled ? "Submitting..." : "Submit all and Finish"}
            </Button>
          </div>
        </Modal.Body>
      </Modal>

      {/* Result Modal */}
      <Modal
        show={showResultModal}
        onHide={() => setShowResultModal(false)}
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
              <Button onClick={handleHomeButton}>Home</Button>
            </Col>
          </Row>
          <div className='activity-standing'>
            <Row className='g-0'>
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

      {/* Test Completed Modal */}
      <Modal
        className='item-modal'
        show={showTestCompletedModal}
        onHide={() => setShowTestCompletedModal(false)}
        backdrop='static'
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Test Completed</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Your test attempt has been completed.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button className='add-button' onClick={handleTestCompletedConfirm}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default TeacherCodingAssessmentComponent;