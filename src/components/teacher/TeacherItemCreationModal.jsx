// File: src/components/teacher/ItemCreationModal.jsx
import React, { useEffect, useRef } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { useAlert } from "../AlertContext";
import { getProgrammingLanguages } from "../api/API";

// Optional language icon mapping – adjust as needed.
const programmingLanguageMap = {
  Java:   { name: "Java",   image: "/src/assets/java2.png" },
  "C#":   { name: "C#",     image: "/src/assets/c.png" },
  Python: { name: "Python", image: "/src/assets/py.png" },
};

// A helper for auto-resizing textareas
function AutoResizeTextarea({ value, ...props }) {
  const textareaRef = useRef(null);
  React.useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [value]);
  return (
    <Form.Control
      as="textarea"
      ref={textareaRef}
      value={value}
      rows={1}
      style={{
        whiteSpace: "pre-wrap",
        overflow: "hidden",
        resize: "none"
      }}
      {...props}
    />
  );
}

/**
 * ItemCreationModal
 * Props:
 * - show: boolean to display the modal.
 * - onHide: function to hide the modal.
 * - onSave: function(newItem) called when the item is saved successfully.
 * - initialData: (optional) item data for edit mode; if not provided, assume creation mode.
 * - isConsoleApp: boolean flag whether the item type is Console App.
 */
export default function ItemCreationModal({
  show,
  onHide,
  onSave,
  initialData = null,
  isConsoleApp,
}) {
  const { openAlert } = useAlert();
  const [itemData, setItemData] = React.useState({
    itemID: null,
    itemName: "",
    itemDesc: "",
    itemDifficulty: "Beginner",
    progLangIDs: [],
    testCases: [],
    itemPoints: 0
  });
  const [allProgLanguages, setAllProgLanguages] = React.useState([]);
  const [testLangID, setTestLangID] = React.useState(null);
  const [code, setCode] = React.useState("");
  const [compiling, setCompiling] = React.useState(false);
  const [terminalLines, setTerminalLines] = React.useState([]);
  const [terminalPartialLine, setTerminalPartialLine] = React.useState("");
  const [terminalUserInput, setTerminalUserInput] = React.useState("");
  const [showTerminalModal, setShowTerminalModal] = React.useState(false);
  const [testCaseAdded, setTestCaseAdded] = React.useState(false);
  const [errorOutput, setErrorOutput] = React.useState("");
  const wsRef = useRef(null);
  const inputRef = useRef(null);
  const errorRef = useRef(false);
  const outputRef = useRef("");

  // On mount (or when initialData changes), load data.
  useEffect(() => {
    if (initialData) {
      setItemData(initialData);
    } else {
      setItemData({
        itemID: null,
        itemName: "",
        itemDesc: "",
        itemDifficulty: "Beginner",
        progLangIDs: [],
        testCases: [],
        itemPoints: 0
      });
    }
    // Reset terminal states when modal opens
    setTerminalLines([]);
    setTerminalPartialLine("");
    setTerminalUserInput("");
    setTestCaseAdded(false);
  }, [initialData, show]);

  // Fetch all programming languages (if not already fetched)
  useEffect(() => {
    async function fetchProgLangs() {
      try {
        const response = await getProgrammingLanguages();
        if (!response.error && Array.isArray(response)) {
          setAllProgLanguages(response);
        }
      } catch (error) {
        console.error("Error fetching programming languages:", error);
      }
    }
    fetchProgLangs();
  }, []);

  // WebSocket for running code (if Console App)
  useEffect(() => {
    if (!isConsoleApp) return;
    const ws = new WebSocket("https://neudevcompiler.up.railway.app");
    wsRef.current = ws;
    ws.onopen = () => {
      console.log("WebSocket connected in modal");
    };
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === "stdout") {
        if ((data.data ?? "").includes("Traceback")) {
          errorRef.current = true;
        }
        handleStdout(data.data ?? "");
      } else if (data.type === "stderr") {
        errorRef.current = true;
        finalizeLine(`Error: ${data.data ?? ""}`, false);
      } else if (data.type === "exit") {
        if (terminalPartialLine || terminalUserInput) {
          finalizeLine(terminalPartialLine + terminalUserInput, false);
          setTerminalPartialLine("");
          setTerminalUserInput("");
        }
        finalizeLine("\n\n>>> Program Terminated", true);
        setCompiling(false);
        const finalOutput = outputRef.current.trim();
        if (errorRef.current || finalOutput.includes("Error:") || finalOutput.includes("Traceback")) {
          setErrorOutput(finalOutput);
          openAlert({ message: "Compilation error. You can add it as a test case.", autoCloseDelay: 2000 });
        } else {
          if (finalOutput) {
            const newTC = {
              expectedOutput: finalOutput,
              testCasePoints: "",
              isHidden: false
            };
            setItemData(prev => ({
              ...prev,
              testCases: [...prev.testCases, newTC]
            }));
            setTestCaseAdded(true);
          }
        }
      }
    };
    ws.onclose = () => {
      console.log("WebSocket connection closed in modal");
    };
    return () => {
      ws.close();
    };
  }, [isConsoleApp, terminalPartialLine, terminalUserInput]);

  function handleStdout(newData) {
    let buffer = terminalPartialLine + newData;
    const splitLines = buffer.split("\n");
    for (let i = 0; i < splitLines.length - 1; i++) {
      finalizeLine(splitLines[i]);
    }
    const lastPiece = splitLines[splitLines.length - 1];
    if (newData.endsWith("\n")) {
      if (lastPiece.trim() !== "") {
        finalizeLine(lastPiece);
      }
      setTerminalPartialLine("");
    } else {
      setTerminalPartialLine(lastPiece);
    }
  }
  function finalizeLine(text, skipOutput = false) {
    setTerminalLines(prev => [...prev, text]);
    if (!skipOutput) {
      outputRef.current += text + "\n";
    }
  }
  const handleRunCode = async () => {
    if (!isConsoleApp) return;
    if (!testLangID) {
      openAlert({
        message: "Please select a language to test with.",
        autoCloseDelay: 2000,
      });
      return;
    }
    const foundLang = allProgLanguages.find(l => l.progLangID === testLangID);
    if (!foundLang) {
      openAlert({
        message: "Selected language is not recognized.",
        autoCloseDelay: 2000,
      });
      return;
    }
    if (!code.trim()) {
      openAlert({
        message: "Please enter some code before running.",
        autoCloseDelay: 2000,
      });
      return;
    }
    setTerminalLines([]);
    setTerminalPartialLine("");
    setTerminalUserInput("");
    setTestCaseAdded(false);
    errorRef.current = false;
    outputRef.current = "";
    setShowTerminalModal(true);
    setCompiling(true);
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      // Use a short code mapping if needed (you can extend as needed)
      const compilerCodeMap = { 1: "java", 2: "cs", 3: "py" };
      const shortCode = compilerCodeMap[testLangID] || "py";
      ws.send(
        JSON.stringify({
          type: "init",
          language: shortCode,
          code: code,
          input: ""
        })
      );
    } else {
      finalizeLine("Error: WebSocket not connected.", false);
      errorRef.current = true;
      setCompiling(false);
    }
  };

  const handleModalSave = async () => {
    // Validate required fields
    if (!itemData.itemName.trim() || !itemData.itemDesc.trim() || itemData.progLangIDs.length === 0) {
      openAlert({
        message: "Please fill in all required fields for the item.",
        autoCloseDelay: 2000,
      });
      return;
    }
    if (isConsoleApp && (itemData.testCases || []).length === 0) {
      openAlert({
        message: "Please add at least one test case for this Console App item.",
        autoCloseDelay: 2000,
      });
      return;
    }
    // For Console App, auto-distribute test case points
    const computedItemPoints = Number(itemData.itemPoints);
    const payload = {
      itemTypeID: itemData.itemTypeID, // assume passed in via initialData or selected from context
      progLangIDs: itemData.progLangIDs,
      itemName: itemData.itemName.trim(),
      itemDesc: itemData.itemDesc.trim(),
      itemDifficulty: itemData.itemDifficulty,
      itemPoints: computedItemPoints,
      testCases: isConsoleApp
        ? itemData.testCases
            .filter(tc => tc.expectedOutput.trim() !== "")
            .map(tc => ({
              expectedOutput: tc.expectedOutput,
              testCasePoints: computedItemPoints / (itemData.testCases.length || 1),
              isHidden: tc.isHidden || false
            }))
        : []
    };
    // Here you can call the createItem API
    try {
      const { createItem } = await import("../api/API.js");
      const response = await createItem(payload);
      if (response.error) {
        openAlert({ message: response.error, autoCloseDelay: 2000 });
      } else {
        openAlert({ message: "Item created successfully.", autoCloseDelay: 2000 });
        // Pass the new item data back via onSave
        onSave(response);
        onHide();
      }
    } catch (error) {
      console.error("Error creating item:", error);
      openAlert({ message: "Error creating item.", autoCloseDelay: 2000 });
    }
  };

  return (
    <>
      <Modal show={show} onHide={onHide} backdrop="static" keyboard={false} size="md" className="modal-design">
        <Modal.Header closeButton>
          <Modal.Title>{initialData ? "Edit Item" : "Create Item"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Item Name */}
            <Form.Group className="mb-3">
              <Form.Label>Item Name</Form.Label>
              <Form.Control
                type="text"
                value={itemData.itemName}
                onChange={(e) => setItemData({ ...itemData, itemName: e.target.value })}
              />
            </Form.Group>
            {/* Item Description */}
            <Form.Group className="mb-3">
              <Form.Label>Item Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={itemData.itemDesc}
                onChange={(e) => setItemData({ ...itemData, itemDesc: e.target.value })}
              />
            </Form.Group>
            {/* Difficulty */}
            <Form.Group className="mb-3">
              <Form.Label>Difficulty</Form.Label>
              <Form.Select
                value={itemData.itemDifficulty}
                onChange={(e) => setItemData({ ...itemData, itemDifficulty: e.target.value })}
              >
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </Form.Select>
            </Form.Group>
            {/* Item Points */}
            <Form.Group className="mb-3">
              <Form.Label>Item Points</Form.Label>
              <Form.Control
                type="number"
                value={itemData.itemPoints}
                onChange={(e) => setItemData({ ...itemData, itemPoints: e.target.value })}
              />
              {isConsoleApp && (
                <Form.Text className="text-muted">
                  Test case points will be auto-distributed equally.
                </Form.Text>
              )}
            </Form.Group>
            {/* Programming Languages */}
            <Form.Group className="mb-3">
              <Form.Label>Programming Languages</Form.Label>
              <div style={{ marginBottom: "0.5rem" }}>
                <Form.Check
                  type="checkbox"
                  label="Applicable to all"
                  checked={itemData.progLangIDs.length > 0 && itemData.progLangIDs.length === allProgLanguages.length}
                  onChange={(e) => {
                    if (e.target.checked) {
                      const allIDs = allProgLanguages.map(lang => lang.progLangID);
                      setItemData({ ...itemData, progLangIDs: allIDs });
                      if (allIDs.length > 0) setTestLangID(allIDs[0]);
                    } else {
                      setItemData({ ...itemData, progLangIDs: [] });
                      setTestLangID(null);
                    }
                  }}
                />
              </div>
              {allProgLanguages.map((lang) => (
                <Form.Check
                  key={lang.progLangID}
                  type="checkbox"
                  label={lang.progLangName}
                  checked={itemData.progLangIDs.includes(lang.progLangID)}
                  onChange={() => {
                    const current = itemData.progLangIDs || [];
                    let updated;
                    if (current.includes(lang.progLangID)) {
                      updated = current.filter(id => id !== lang.progLangID);
                    } else {
                      updated = [...current, lang.progLangID];
                    }
                    setItemData({ ...itemData, progLangIDs: updated });
                    if (testLangID === lang.progLangID) setTestLangID(null);
                  }}
                />
              ))}
            </Form.Group>
            {/* Conditional for Console App: Test Cases & Code Solution */}
            {isConsoleApp && (
              <>
                {itemData.progLangIDs.length > 1 && (
                  <Form.Group className="mb-3">
                    <Form.Label>Select Language to Test This Code</Form.Label>
                    <Form.Select
                      value={testLangID || ""}
                      onChange={(e) => setTestLangID(parseInt(e.target.value, 10))}
                    >
                      <option value="">-- Pick a language --</option>
                      {itemData.progLangIDs.map((langID) => {
                        const found = allProgLanguages.find(l => l.progLangID === langID);
                        return (
                          <option key={langID} value={langID}>
                            {found ? found.progLangName : `LanguageID ${langID}`}
                          </option>
                        );
                      })}
                    </Form.Select>
                  </Form.Group>
                )}
                <Form.Group className="mb-3">
                  <Form.Label>Test Cases (added after each successful run)</Form.Label>
                  {(itemData.testCases || []).map((tc, index) => (
                    <div className="test-case-item" key={index}>
                      <Form.Label>Test Case {index + 1}</Form.Label>
                      <AutoResizeTextarea
                        readOnly
                        value={tc.expectedOutput}
                        style={{ marginBottom: "5px" }}
                      />
                      <Form.Label>Points (auto-distributed)</Form.Label>
                      <Form.Control
                        type="text"
                        value={
                          itemData.itemPoints && itemData.testCases.length > 0
                            ? (Number(itemData.itemPoints) / itemData.testCases.length).toFixed(2)
                            : ""
                        }
                        readOnly
                      />
                      <Form.Check
                        type="checkbox"
                        label="Hidden"
                        checked={tc.isHidden || false}
                        onChange={(e) => {
                          const updatedTestCases = [...itemData.testCases];
                          updatedTestCases[index].isHidden = e.target.checked;
                          setItemData({ ...itemData, testCases: updatedTestCases });
                        }}
                        style={{ marginTop: "5px" }}
                      />
                      <Button
                        variant="outline-danger"
                        size="sm"
                        style={{ marginTop: "5px" }}
                        onClick={() => {
                          const updated = itemData.testCases.filter((_, i) => i !== index);
                          setItemData({ ...itemData, testCases: updated });
                        }}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Code solution:</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={15}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Write your code solution here"
                  />
                </Form.Group>
                <div>
                  <Button className="run-code-button" onClick={handleRunCode} disabled={compiling}>
                    {compiling ? <Spinner animation="border" size="sm" /> : "Run Code"}
                  </Button>
                </div>
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            Cancel
          </Button>
          <Button className="success-button" onClick={handleModalSave}>
            {initialData ? "Save" : "Add"}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Terminal Modal (if needed) */}
      <Modal
        show={showTerminalModal}
        onHide={() => setShowTerminalModal(false)}
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
              backgroundColor: "#1e1e1e",
              color: "#fff",
              padding: "10px",
              fontFamily: "monospace",
              minHeight: "250px",
              overflowY: "auto"
            }}
            onClick={() => {
              if (inputRef.current) {
                inputRef.current.focus();
              }
            }}
          >
            {terminalLines.map((line, idx) => (
              <div key={idx} style={{ whiteSpace: "pre-wrap" }}>
                {line}
              </div>
            ))}
            <div style={{ whiteSpace: "pre-wrap" }}>
              <span>{terminalPartialLine}</span>
              <span
                ref={inputRef}
                contentEditable
                suppressContentEditableWarning
                style={{ outline: "none" }}
                onInput={(e) => setTerminalUserInput(e.currentTarget.textContent)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const ws = wsRef.current;
                    if (ws && ws.readyState === WebSocket.OPEN) {
                      ws.send(JSON.stringify({ type: "input", data: terminalUserInput }));
                    }
                    setTerminalPartialLine("");
                    setTerminalUserInput("");
                    if (inputRef.current) inputRef.current.textContent = "";
                  }
                }}
              />
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}