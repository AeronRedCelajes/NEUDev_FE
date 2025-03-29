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
  getActivityItemsByStudent, 
  finalizeSubmission, 
  saveActivityProgress, 
  clearActivityProgress,
  getCurrentUserKey,
  runCheckCode,
  getActivityProgress
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
    case 'C#': return 'cs';
    case 'Python': return 'py';
    default: return 'txt';
  }
}

export const StudentCodingAssessmentComponent = () => {
  const { classID, actID } = useParams();
  const navigate = useNavigate();
  
  // Use the unique user ID from session to avoid conflict between accounts.
  const userID = getCurrentUserKey() || 'default';
  const stateKey = `activityState_${actID}_${userID}`;

  // Activity details
  const [activityName, setActivityName] = useState('');
  const [actDesc, setActDesc] = useState('');
  const [maxPoints, setMaxPoints] = useState(0);
  const [actDuration, setActDuration] = useState(''); // HH:MM:SS
  const [finalScorePolicy, setFinalScorePolicy] = useState('last_attempt'); // default

  // Items & allowed languages
  const [items, setItems] = useState([]);
  const [expandedItem, setExpandedItem] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedLanguage, setSelectedLanguage] = useState({
    name: 'Java',
    imgSrc: '/src/assets/java2.png'
  });

  // Code files (from progress)
  const [files, setFiles] = useState([{ id: 0, fileName: 'main', extension: 'py', content: '' }]);
  const [activeFileId, setActiveFileId] = useState(0);

  // Terminal & test case states
  const [lines, setLines] = useState([]);
  const [prompt, setPrompt] = useState('');
  const [typedInput, setTypedInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showTerminal, setShowTerminal] = useState(false);
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  // testCaseResults now holds objects with latest and best fields
  const [testCaseResults, setTestCaseResults] = useState({});

  // Timer and submission states
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [hasLoadedSavedState, setHasLoadedSavedState] = useState(false);

  // For summary modal (submission results)
  const [showFinishAttempt, setShowFinishAttempt] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [finalTitle, setFinalTitle] = useState('Result');
  const [finalTestCases, setFinalTestCases] = useState('0/0');
  const [finalScore, setFinalScore] = useState('0/0');
  const [finalSpeed, setFinalSpeed] = useState('00:00:00');
  const [finalActivityName, setFinalActivityName] = useState('');

  // For file modals
  const [showAddFileModal, setShowAddFileModal] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileExtension, setNewFileExtension] = useState('txt');
  const [showEditFileModal, setShowEditFileModal] = useState(false);
  const [editFileName, setEditFileName] = useState('');
  const [editFileExtension, setEditFileExtension] = useState('');

  // Submission alert modal for other tabs
  const [showSubmissionAlert, setShowSubmissionAlert] = useState(false);

  // Assessment start time
  const [startTime] = useState(Date.now());

  // For expanding summary in finish modal
  const [expandedTestCases, setExpandedTestCases] = useState({});
  const [expandedSummaryItems, setExpandedSummaryItems] = useState([]);

  // --- Track per-item times --- 
  // itemTimes: { [itemID]: { start: timestamp, accumulated: seconds } }
  const [itemTimes, setItemTimes] = useState({});

  // Running Check Code
  const [checkCodeStatus, setCheckCodeStatus] = useState({}); // structure: { [itemID]: { runCount, itemScore } }
  const [maxCheckCodeRuns, setMaxCheckCodeRuns] = useState(null);


  // --- Helper: Format seconds into HH:MM:SS ---
  const formatTimeLeft = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  };

  // For disabled state when submitting
  const [isDisabled, setIsDisabled] = useState(false);

  // --- Listen for submission events from other tabs ---
  useEffect(() => {
    const handleStorageChange = (e) => {
      const expectedKey = `activitySubmitted_${actID}_${userID}`;
      if (e.key === expectedKey && e.newValue) {
        setIsSubmitted(true);
        setShowSubmissionAlert(true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [actID, userID]);

  function shuffleArray(array) {
    const newArr = array.slice();
    for (let i = newArr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
  }

  // --- Fetch activity data ---
  useEffect(() => {
    async function fetchActivityData() {
      try {
        const resp = await getActivityItemsByStudent(actID);
        if (!resp.error) {
          setActivityName(resp.activityName);
          setActDesc(resp.actDesc);
          setMaxPoints(resp.maxPoints);
          setActDuration(resp.actDuration);
          if (resp.finalScorePolicy) {
            setFinalScorePolicy(resp.finalScorePolicy);
          }
          let fetchedItems = resp.items || [];
          // If randomizedItems flag is true, shuffle the items:
          if (resp.randomizedItems) {
            fetchedItems = shuffleArray(fetchedItems);
          }
          setItems(fetchedItems);
          if (fetchedItems.length > 0) {
            toggleItem(fetchedItems[0].itemID);
          }
          if (resp.allowedLanguages && resp.allowedLanguages.length > 0) {
            setProgrammingLanguages(resp.allowedLanguages);
            const first = resp.allowedLanguages[0];
            setSelectedLanguage({
              name: first.progLangName,
              imgSrc: languageIconMap[first.progLangName] || '/src/assets/py.png'
            });
          }
          if (resp.maxCheckCodeRuns) {
            setMaxCheckCodeRuns(resp.maxCheckCodeRuns);
          }
        }
      } catch (err) {
        console.error('Error fetching activity details:', err);
      }
    }
    fetchActivityData();
  }, [actID]);

  // --- Poll for updates (duration and items) every 10s ---
  useEffect(() => {
    const pollInterval = setInterval(async () => {
      try {
        const resp = await getActivityItemsByStudent(actID);
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
            if (!isSubmitted) {
              const saved = localStorage.getItem(stateKey);
              if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.teacherDuration !== teacherDurationSec) {
                  parsed.teacherDuration = teacherDurationSec;
                  parsed.endTime = Date.now() + effectiveSec * 1000;
                  localStorage.setItem(stateKey, JSON.stringify(parsed));
                } else {
                  const storedRemaining = Math.floor((parsed.endTime - Date.now()) / 1000);
                  if (storedRemaining < effectiveSec) {
                    effectiveSec = storedRemaining;
                  } else {
                    parsed.endTime = Date.now() + effectiveSec * 1000;
                    localStorage.setItem(stateKey, JSON.stringify(parsed));
                  }
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
  }, [actID, stateKey, isSubmitted]);

  // --- Initialize local state and timer from localStorage or new state ---
  useEffect(() => {
    if (isSubmitted) return;
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
    const newSavedState = localStorage.getItem(stateKey);
    if (newSavedState) {
      const parsed = JSON.parse(newSavedState);
      if (parsed.endTime && parsed.endTime > Date.now()) {
        endTime = parsed.endTime;
        initialTimeLeft = Math.floor((endTime - Date.now()) / 1000);
        if (parsed.files) setFiles(parsed.files);
        if (parsed.activeFileId !== undefined) setActiveFileId(parsed.activeFileId);
        if (parsed.testCaseResults) setTestCaseResults(parsed.testCaseResults);
        if (parsed.selectedItem) setSelectedItem(parsed.selectedItem);
        if (parsed.draftItemTimes) {
          setItemTimes(parsed.draftItemTimes);
        }
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
      // Changed keys: now using draftItemTimes, draftSelectedLanguage, and draftTimeRemaining
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
        draftItemTimes: itemTimes, 
        draftSelectedLanguage: selectedLanguage.name,
        draftTimeRemaining: timeLeft
      };
      localStorage.setItem(stateKey, JSON.stringify(newState));
    }
    if (initialTimeLeft <= 0) {
      setTimeLeft(0);
      setTimeExpired(true);
      setShowFinishAttempt(true);
      return;
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
  }, [startTime, actDuration, stateKey, isSubmitted]);

  // --- Sync local state to localStorage and backend progress ---
  useEffect(() => {
    if (!hasLoadedSavedState || isSubmitted) return;
    const saved = localStorage.getItem(stateKey);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    const originalEndTime = parsed.endTime;
    parsed.files = files;
    parsed.activeFileId = activeFileId;
    parsed.testCaseResults = testCaseResults;
    parsed.draftItemTimes = itemTimes; // renamed key
    parsed.draftSelectedLanguage = selectedLanguage.name; // renamed key
    parsed.draftTimeRemaining = timeLeft; // renamed key
    parsed.draftScore = computeTotalScore();
    parsed.selectedItem = selectedItem;
    parsed.draftCheckCodeRuns = checkCodeStatus;

    if (originalEndTime) {
      parsed.endTime = originalEndTime;
    }
    parsed.draftScore = computeTotalScore();
    localStorage.setItem(stateKey, JSON.stringify(parsed));
    
    const progressData = {
      draftFiles: JSON.stringify(files),
      draftTestCaseResults: JSON.stringify(testCaseResults || {}),
      draftTimeRemaining: timeLeft, // renamed key
      draftSelectedLanguage: selectedLanguage.name, // renamed key
      draftScore: computeTotalScore(),
      draftItemTimes: JSON.stringify(itemTimes), // renamed key
      // draftCheckCodeRuns: JSON.stringify(checkCodeStatus)
      // Removed draftTimeSpent since it's no longer needed.
    };
    saveActivityProgress(actID, progressData)
      .then(res => console.log("Progress saved to server:", res))
      .catch(err => console.error("Error saving progress:", err));
  }, [files, activeFileId, testCaseResults, itemTimes, checkCodeStatus, stateKey, hasLoadedSavedState, timeLeft, selectedLanguage, isSubmitted]);

  // --- Periodic progress sync every 5 seconds ---
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timeExpired && !isSubmitted) {
        const progressData = {
          draftFiles: JSON.stringify(files),
          draftTestCaseResults: JSON.stringify(testCaseResults),
          draftTimeRemaining: timeLeft, // renamed key
          draftSelectedLanguage: selectedLanguage.name, // renamed key
          draftScore: computeTotalScore(),
          draftItemTimes: JSON.stringify(itemTimes) // renamed key
        };
        saveActivityProgress(actID, progressData)
          .then(res => console.log("Periodic progress sync:", res))
          .catch(err => console.error("Error during periodic sync:", err));
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [files, activeFileId, testCaseResults, timeExpired, isSubmitted, actID, timeLeft, selectedLanguage]);

  // --- Auto-finalize submission on beforeunload ---
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (!timeExpired && !isSubmitted) {
        finalizeSubmissionHandler();
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timeExpired, isSubmitted]);

  // --- WebSocket setup for code execution ---
  useEffect(() => {
    const ws = new WebSocket('https://neudevcompiler.up.railway.app');
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

  // --- Per-item timer: When toggling items, update times ---
  const toggleItem = (itemID) => {
    const now = Date.now();
    if (selectedItem) {
      setItemTimes((prev) => {
        const prevItem = prev[selectedItem] || { accumulated: 0 };
        const startTimeValue = prev[selectedItem]?.start || now;
        const elapsed = Math.floor((now - startTimeValue) / 1000);
        return {
          ...prev,
          [selectedItem]: {
            start: null,
            accumulated: (prevItem.accumulated || 0) + elapsed,
          },
        };
      });
    }
    setSelectedItem(itemID);
    setExpandedItem(itemID);
    setItemTimes((prev) => ({
      ...prev,
      [itemID]: {
        accumulated: prev[itemID]?.accumulated || 0,
        start: now,
      },
    }));
  };

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
    console.log("New file created:", newFile);
  };

  const handleDeleteFile = (fileId) => {
    if (files.length === 1) return;
    if (window.confirm('Delete this file?')) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      if (activeFileId === fileId) {
        const remaining = files.filter(f => f.id !== fileId);
        if (remaining[0]) setActiveFileId(remaining[0].id);
      }
      console.log("File deleted. New files array:", files);
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
    console.log("Edited file saved");
  };

  const activeFile = files.find(f => f.id === activeFileId);

  const handleRunCode = () => {
    if (!activeFile || isSubmitted || timeExpired) return;
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

  // New handler to update check code run count and score deduction
  const handleCheckCodeRun = async () => {
    if (!selectedItem || isSubmitted || timeExpired) return;
    setLoading(true);
  
    try {
      const response = await runCheckCode(actID, selectedItem);
      if (!response.error) {
        // Here we expect response.runCount to be an integer.
        setCheckCodeStatus(prev => ({
          ...prev,
          [selectedItem]: {
            runCount: response.runCount
            // No need for itemScore if you do not want to display deductions
          }
        }));
      } else {
        console.error("Check code run error:", response.error);
      }
    } catch (err) {
      console.error("Error during check code run:", err);
    } finally {
      setLoading(false);
    }
  };

  // Modified handler that integrates both check code deduction and test case runs
  const handleCheckCode = async () => {
    if (!selectedItem || isSubmitted || timeExpired) return;
    
    // First, update check code run count and deduction
    await handleCheckCodeRun();
    
    // Then, run test cases as before for output verification
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

  // --- Compute per-item score (current attempt only) ---
  function computeItemScore(itemID) {
    const item = items.find(it => it.itemID === itemID);
    if (!item || !item.testCases) return 0;
  
    // Count how many test cases the user passed:
    const itemResults = testCaseResults[itemID] || {};
    let passedCount = 0;
    item.testCases.forEach(tc => {
      const r = itemResults[tc.testCaseID];
      if (r && r.latestPass) {
        passedCount++;
      }
    });
  
    // The fraction of test cases passed:
    const fraction = passedCount / item.testCases.length;
  
    // The partial score is fraction * item.actItemPoints
    const partialScore = fraction * item.actItemPoints;
  
    // Format or round as you prefer:
    return Math.round(partialScore * 100) / 100; // e.g. 2 decimal places
  }

  function formatPoints(value) {
    // Round to 2 decimals:
    const rounded = Math.round(value * 100) / 100;
    // If it’s a whole number, drop the .00
    if (Number.isInteger(rounded)) {
      return rounded.toString(); // e.g. "100"
    }
    // Else show 2 decimals, e.g. "99.99"
    return rounded.toFixed(2);
  }

  // --- Compute total score ---
  const computeTotalScore = () => {
    let total = 0;
    items.forEach(item => {
      total += computeItemScore(item.itemID);
    });
    return total;
  };

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

  const handleFinishAttempt = () => {
    setShowFinishAttempt(true);
  };

  function formatSecondsToHMS(seconds) {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map(v => String(v).padStart(2, '0')).join(':');
  }

  const finalizeSubmissionHandler = async (overallTimeSpent) => {
    if (isSubmitted) return;
    const now = Date.now();
  
    // Update active item's accumulated time if needed.
    let updatedTimes = { ...itemTimes };
    if (selectedItem) {
      const current = updatedTimes[selectedItem] || { accumulated: 0 };
      const startTimeValue = current.start || now;
      const elapsed = Math.floor((now - startTimeValue) / 1000);
      updatedTimes[selectedItem] = {
        start: null,
        accumulated: (current.accumulated || 0) + elapsed,
      };
    }
    setItemTimes(updatedTimes);
  
    // Build submission payload.
    // For each item, only include its specific testCaseResults.
    const submissionData = {
      overallTimeSpent,
      submissions: items.map(item => {
        const timeData = updatedTimes[item.itemID] || { accumulated: 0 };
        const secondsSpent = timeData.accumulated;
        return {
          itemID: item.itemID,
          codeSubmission: JSON.stringify(files),
          score: computeItemScore(item.itemID),
          itemTimeSpent: secondsSpent,
          timeSpent: overallTimeSpent,
          testCaseResults: JSON.stringify(testCaseResults[item.itemID] || {}),
          timeRemaining: timeLeft,
          selectedLanguage: selectedLanguage.name
        };
      })
    };
  
    console.log("Submitting final:", submissionData);
    const result = await finalizeSubmission(actID, submissionData);
    if (result.error) {
      console.error("Submission failed:", result.error, result.details);
    } else {
      setFinalScore(`${computeTotalScore()}/${maxPoints}`);
      setIsSubmitted(true);
      const submissionKey = `activitySubmitted_${actID}_${userID}`;
      localStorage.setItem(submissionKey, Date.now());
      await clearActivityProgress(actID);
      localStorage.removeItem(stateKey);
      console.log("Submission successful, cleared progress.");
    }
  };
  
  const handleSubmitAllAndFinish = async () => {
    if (isSubmitted || isDisabled) return; // Prevent multiple clicks

    setIsDisabled(true); // Disable button immediately

    let totalTC = 0;
    let correctTC = 0;
    items.forEach(it => {
      if (it.testCases) {
        totalTC += it.testCases.length;
        const itemRes = testCaseResults[it.itemID] || {};
        it.testCases.forEach(tc => {
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
  
    const [hh, mm, ss] = actDuration.split(':').map(Number);
    const totalActSeconds = (hh || 0) * 3600 + (mm || 0) * 60 + (ss || 0);
    const overallTimeSpent = timeExpired ? totalActSeconds : totalActSeconds - timeLeft;
    setFinalSpeed(formatTimeLeft(overallTimeSpent));
  
    await finalizeSubmissionHandler(overallTimeSpent);
    setShowFinishAttempt(false);
    setShowSubmit(true);

    console.log("Submitted!");
  };

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
      <Navbar className='profile-playground-navbar'>
        <a href='#'><i className='bi bi-arrow-left-circle' onClick={() => navigate(`/student/class/${classID}/activity`)}></i></a>
        <p>Back to previous page</p>

        <div className='right-navbar'>
            <span className='ping'>20 ms</span>
            <a href='#'><i className='bi bi-moon'></i></a>
        </div>
      </Navbar>

      <div className='container-fluid assessment-content'>
        <Row className='g-3'>
          <Col>
            <div className='assessment-time'>
              Time Left: {formatTimeLeft(timeLeft)}
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
                <Button
                  className='check'
                  onClick={handleCheckCode}
                  disabled={
                    loading ||
                    isSubmitted ||
                    timeExpired ||
                    (selectedItem &&
                      checkCodeStatus[selectedItem] &&
                      maxCheckCodeRuns &&
                      checkCodeStatus[selectedItem].runCount >= maxCheckCodeRuns)
                  }
                >
                  {loading ? (
                    <Spinner animation='border' size='sm' />
                  ) : (
                    <>
                      <FontAwesomeIcon icon={faCheck} className='check-icon' />
                      Check Code
                    </>
                  )}
                </Button>

                {selectedItem && checkCodeStatus[selectedItem] && (
                  <div className="check-code-status">
                    <span>
                      Check Code Runs: {checkCodeStatus[selectedItem].runCount}
                      {maxCheckCodeRuns ? ` / ${maxCheckCodeRuns}` : ""}
                    </span>
                  </div>
                )}
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
                    onClick={() => toggleItem(item.itemID)}
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
                    <p>Total Activity Score: {computeTotalScore()}/{maxPoints}</p>
                    {items.map((item, idx) => (
                      <div key={item.itemID} className='item-summary' onClick={() => toggleSummaryItem(item.itemID)} style={{ cursor: 'pointer' }}>
                        <p className='item-name'>{`Item ${idx + 1}: ${item.itemName}`}</p>
                        <p>{item.itemDesc} <br/> | <em>{item.itemType}</em></p>
                        <p className='item-score'>Score: {formatPoints(computeItemScore(item.itemID))} / {formatPoints(item.actItemPoints)}</p>
                      </div>
                    ))}
                    <div className='submit-finish'> 
                      <Button onClick={handleSubmitAllAndFinish} disabled={isDisabled}>
                        {isDisabled ? "Submitting..." : "Submit all and Finish"}
                      </Button>
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
                        <Button onClick={() => navigate(`/student/class/${classID}/activity`)}>Home</Button>
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
                          className='test-case'>
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
                  Score: {selectedItem ? formatPoints(computeItemScore(selectedItem)) : 0}/
                  {selectedItem ? items.find(x => x.itemID === selectedItem)?.actItemPoints : 0}
                </p>
              </div>
            </div>
          </Col>
        </Row>
      </div>

      {/* Terminal Modal */}
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
            }}>
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

      {/* Add File Modal */}
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

      {/* Edit File Modal */}
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

      {/* Submission Alert Modal for Other Tabs */}
      <Modal
        show={showSubmissionAlert}
        onHide={() => {
          setShowSubmissionAlert(false);
          navigate(`/student/class/${classID}/activity`);
        }}
        backdrop='static'
        keyboard={false}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Activity Submitted</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>This activity has already been submitted in another tab.</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="primary" onClick={() => {
            setShowSubmissionAlert(false);
            navigate(`/student/class/${classID}/activity`);
          }}>
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default StudentCodingAssessmentComponent;