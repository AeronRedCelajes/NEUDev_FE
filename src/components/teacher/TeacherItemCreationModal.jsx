// TeacherItemCreationModal.jsx
import React, { useState, useEffect } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { getItemTypes, getProgrammingLanguages, createItem, getSessionData } from '../api/API';
import { useAlert } from "../AlertContext";

const programmingLanguageMap = {
  Java:   { name: "Java",   image: "/src/assets/java2.png" },
  "C#":   { name: "C#",     image: "/src/assets/c.png" },
  Python: { name: "Python", image: "/src/assets/py.png" },
};

function AutoResizeTextarea({ value, ...props }) {
  const textareaRef = React.useRef(null);
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
      style={{ whiteSpace: "pre-wrap", overflow: "hidden", resize: "none" }}
      {...props}
    />
  );
}

const TeacherItemCreationModal = ({ show, onClose, onItemCreated }) => {
  const { openAlert } = useAlert();
  const [itemTypes, setItemTypes] = useState([]);
  const [programmingLanguages, setProgrammingLanguages] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [itemTypeName, setItemTypeName] = useState('');
  
  const [itemData, setItemData] = useState({
    itemName: "",
    itemDesc: "",
    itemDifficulty: "Beginner",
    itemPoints: 0,
    progLangIDs: [],
    testCases: []
  });
  
  // For password delete toggle in item bank we don’t need here.
  // For Console App test cases
  const [isConsoleApp, setIsConsoleApp] = useState(false);
  
  useEffect(() => {
    fetchItemTypes();
    fetchProgrammingLanguages();
  }, []);
  
  useEffect(() => {
    if (selectedItemType) {
      const type = itemTypes.find(t => t.itemTypeID === selectedItemType);
      setItemTypeName(type ? type.itemTypeName : '');
      setIsConsoleApp(type ? type.itemTypeName === "Console App" : false);
    }
  }, [selectedItemType, itemTypes]);
  
  const fetchItemTypes = async () => {
    const response = await getItemTypes();
    if (!response.error && response.length > 0) {
      setItemTypes(response);
      setSelectedItemType(response[0].itemTypeID);
      setItemTypeName(response[0].itemTypeName);
    } else {
      setItemTypes([]);
    }
  };
  
  const fetchProgrammingLanguages = async () => {
    const response = await getProgrammingLanguages();
    if (!response.error && Array.isArray(response)) {
      setProgrammingLanguages(response);
    } else {
      console.error("Error fetching programming languages:", response.error);
    }
  };
  
  // Handler for form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (
      !itemData.itemName.trim() ||
      !itemData.itemDesc.trim() ||
      itemData.progLangIDs.length === 0
    ) {
      openAlert({
        message: "Please fill in all required fields (name, description, at least one language).",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }
    if (isConsoleApp && (itemData.testCases || []).length === 0) {
      openAlert({
        message: "Please add at least one test case for this item.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }
    
    const computedItemPoints = Number(itemData.itemPoints);
    // For Console App, auto-distribute test case points
    const payload = {
      itemTypeID: selectedItemType,
      progLangIDs: itemData.progLangIDs,
      itemName: itemData.itemName.trim(),
      itemDesc: itemData.itemDesc.trim(),
      itemDifficulty: itemData.itemDifficulty,
      itemPoints: computedItemPoints,
      testCases: isConsoleApp
        ? itemData.testCases.filter(tc => tc.expectedOutput.trim() !== "").map(tc => ({
            expectedOutput: tc.expectedOutput,
            testCasePoints: computedItemPoints / (itemData.testCases.length || 1),
            isHidden: tc.isHidden || false
          }))
        : []
    };
    // Include teacherID if needed
    const sessionData = getSessionData();
    if (sessionData && sessionData.userID) {
      payload.teacherID = sessionData.userID;
    }
    const response = await createItem(payload);
    if (!response.error) {
      openAlert({
        message: "Item created successfully!",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      // Pass the created item back to parent
      onItemCreated(response);
      onClose();
      // Reset form data
      setItemData({
        itemName: "",
        itemDesc: "",
        itemDifficulty: "Beginner",
        itemPoints: 0,
        progLangIDs: [],
        testCases: []
      });
    } else {
      openAlert({
        message: "Failed to create item: " + response.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
    }
  };
  
  // Handler for test case removal
  const handleRemoveTestCase = (index) => {
    const updated = itemData.testCases.filter((_, i) => i !== index);
    setItemData({ ...itemData, testCases: updated });
  };

  // Render the modal
  return (
    <Modal show={show} onHide={onClose} backdrop="static" keyboard={false}>
      <Modal.Header closeButton>
        <Modal.Title>Create New Item</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          {/* Item Type Selector */}
          <Form.Group className="mb-3">
            <Form.Label>Item Type</Form.Label>
            <Form.Select
              value={selectedItemType || ""}
              onChange={(e) => setSelectedItemType(parseInt(e.target.value))}
              required
            >
              {itemTypes.map(type => (
                <option key={type.itemTypeID} value={type.itemTypeID}>
                  {type.itemTypeName}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
          
          {/* Item Name */}
          <Form.Group className="mb-3">
            <Form.Label>Item Name</Form.Label>
            <Form.Control
              type="text"
              value={itemData.itemName}
              onChange={(e) => setItemData({ ...itemData, itemName: e.target.value })}
              required
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
              required
            />
          </Form.Group>
          
          {/* Difficulty */}
          <Form.Group className="mb-3">
            <Form.Label>Difficulty</Form.Label>
            <Form.Select
              value={itemData.itemDifficulty}
              onChange={(e) => setItemData({ ...itemData, itemDifficulty: e.target.value })}
              required
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
              required
            />
            {isConsoleApp && (
              <Form.Text className="text-muted">
                For Console App items, test case points will be auto-distributed equally.
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
                checked={
                  itemData.progLangIDs.length > 0 &&
                  itemData.progLangIDs.length === programmingLanguages.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    const allIDs = programmingLanguages.map(lang => lang.progLangID);
                    setItemData({ ...itemData, progLangIDs: allIDs });
                  } else {
                    setItemData({ ...itemData, progLangIDs: [] });
                  }
                }}
              />
            </div>
            {programmingLanguages.map(lang => (
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
                }}
              />
            ))}
          </Form.Group>
          
          {/* Conditional Test Cases for Console App */}
          {isConsoleApp && (
            <>
              <Form.Group className="mb-3">
                <Form.Label>Test Cases</Form.Label>
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
                      onClick={() => handleRemoveTestCase(index)}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </Form.Group>
              {/* Optionally, add a button to add a new empty test case */}
              <Button
                variant="secondary"
                onClick={() =>
                  setItemData({
                    ...itemData,
                    testCases: [...itemData.testCases, { expectedOutput: "", isHidden: false }]
                  })
                }
              >
                + Add Test Case
              </Button>
            </>
          )}
          
          <div className="d-flex justify-content-end mt-3">
            <Button variant="secondary" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" className="ms-2">
              Create Item
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default TeacherItemCreationModal;