import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAlert } from "../AlertContext"; 
import TeacherCMNavigationBarComponent from './TeacherCMNavigationBarComponent';
import { 
  getItems,
  createActivity, 
  getItemTypes, 
  getProgrammingLanguages,
  getSessionData
} from '../api/API';
import ItemCreationModal from './ItemCreationModal'; // Reusable modal component

const programmingLanguageMap = {
  "C#":     { name: "C#",     image: "/src/assets/c.png" },
  "Java":   { name: "Java",   image: "/src/assets/java2.png" },
  "Python": { name: "Python", image: "/src/assets/py.png" }
};

export const TeacherCreateActivityComponent = () => {
  const navigate = useNavigate();
  const { openAlert } = useAlert();

  // -------------------- Activity Form State --------------------
  const [activityTitle, setActivityTitle] = useState('');
  const [activityDescription, setActivityDescription] = useState('');
  const [actDifficulty, setDifficulty] = useState('');
  const [durationInMinutes, setDurationInMinutes] = useState("0");
  const [activityAttempts, setActivityAttempts] = useState("1");
  const [finalScorePolicy, setFinalScorePolicy] = useState("last_attempt");

  // -------------------- Global Check Code Settings State --------------------
  const [checkCodeRestriction, setCheckCodeRestriction] = useState(false);
  const [maxCheckCodeRuns, setMaxCheckCodeRuns] = useState("");
  const [checkCodeDeduction, setCheckCodeDeduction] = useState("");

  // -------------------- Item Bank State (Dynamic List) --------------------
  const [selectedItems, setSelectedItems] = useState([]); // now dynamic
  const [presetItems, setPresetItems] = useState([]);
  // Remove fixed "selectedItem" and "selectedItemIndex" if you want to separate the two modals:
  // One modal for selecting existing items and a separate one for creating new items.
  const [itemBankScope, setItemBankScope] = useState("personal");

  // -------------------- Item Types & Programming Languages --------------------
  const [selectedProgLangs, setSelectedProgLangs] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [itemTypes, setItemTypes] = useState([]);

  // -------------------- Dates --------------------
  const [dateOpened, setDateOpened] = useState('');
  const [dateClosed, setDateClosed] = useState('');

  // -------------------- Programming Languages from Server --------------------
  const [programmingLanguages, setProgrammingLanguages] = useState([]);

  // -------------------- Sorting Preset Items --------------------
  const [itemSortField, setItemSortField] = useState("itemName");
  const [itemSortOrder, setItemSortOrder] = useState("asc");

  const toggleItemSortOrder = (field) => {
    if (itemSortField === field) {
      setItemSortOrder(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setItemSortField(field);
      setItemSortOrder("asc");
    }
  };

  const difficultyOrder = {
    "Beginner": 1,
    "Intermediate": 2,
    "Advanced": 3
  };

  const sortedPresetItems = [...presetItems].sort((a, b) => {
    let fieldA, fieldB;
    switch (itemSortField) {
      case "itemName":
        fieldA = (a.itemName || "").toLowerCase();
        fieldB = (b.itemName || "").toLowerCase();
        break;
      case "itemDifficulty":
        fieldA = difficultyOrder[a.itemDifficulty] || 0;
        fieldB = difficultyOrder[b.itemDifficulty] || 0;
        break;
      case "itemPoints":
        fieldA = a.itemPoints || 0;
        fieldB = b.itemPoints || 0;
        break;
      default:
        fieldA = (a.itemName || "").toLowerCase();
        fieldB = (b.itemName || "").toLowerCase();
    }
    if (fieldA < fieldB) return itemSortOrder === "asc" ? -1 : 1;
    if (fieldA > fieldB) return itemSortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // -------------------- Lifecycle --------------------
  useEffect(() => {
    fetchItemTypes();
    fetchProgrammingLanguages();
  }, []);

  useEffect(() => {
    if (selectedItemType) {
      fetchPresetItems();
    }
  }, [selectedItemType, itemBankScope]);

  // -------------------- API Calls --------------------
  const fetchItemTypes = async () => {
    const response = await getItemTypes();
    if (!response.error && response.length > 0) {
      setItemTypes(response);
      setSelectedItemType(response[0].itemTypeID);
    } else {
      console.error("Failed to fetch item types:", response.error);
    }
  };

  const fetchProgrammingLanguages = async () => {
    const response = await getProgrammingLanguages();
    if (!response.error && Array.isArray(response)) {
      setProgrammingLanguages(response);
    } else {
      console.error("Failed to fetch programming languages:", response.error);
    }
  };

  const fetchPresetItems = async () => {
    const sessionData = getSessionData();
    const teacherID = sessionData.userID;
    const response = await getItems(selectedItemType, { scope: itemBankScope, teacherID });
    if (!response.error) {
      setPresetItems(response);
    } else {
      console.error("Failed to fetch preset items:", response.error);
    }
  };

  // -------------------- Handler for Adding a New Item --------------------
  const [showItemModal, setShowItemModal] = useState(false);
  const handleAddNewItem = () => {
    setShowItemModal(true);
  };
  const handleItemModalSave = (newItem) => {
    setSelectedItems(prev => [...prev, newItem]);
  };

  // -------------------- Handler for Removing an Item --------------------
  const removeItem = (index) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
  };

  // -------------------- Create Activity Handler --------------------
  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (
      !activityTitle.trim() ||
      !activityDescription.trim() ||
      !actDifficulty ||
      !durationInMinutes ||
      selectedProgLangs.length === 0 ||
      !dateOpened ||
      !dateClosed ||
      selectedItems.length === 0
    ) {
      openAlert({
        message: "All fields are required, including at least one programming language, one item, and an activity duration.",
        autoCloseDelay: 2000,
      });
      return;
    }
    const sessionData = getSessionData();
    const classID = sessionData.selectedClassID;

    // Build final item objects from the dynamic list
    const finalItems = selectedItems.map(item => ({
      itemID: item.itemID,
      itemTypeID: selectedItemType,
      actItemPoints: item.itemPoints
    }));

    // Compute total points
    const computedPoints = finalItems.reduce((sum, it) => sum + (it.actItemPoints || 0), 0);

    // Convert minutes to HH:MM:SS
    const total = parseInt(durationInMinutes, 10);
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    const ss = "00";
    const finalDuration = `${hh}:${mm}:${ss}`;
    
    // Build new activity object
    const newActivity = {
      classID,
      actTitle: activityTitle,
      actDesc: activityDescription,
      actDifficulty,
      actDuration: finalDuration,
      openDate: dateOpened,
      closeDate: dateClosed,
      progLangIDs: selectedProgLangs,
      maxPoints: computedPoints,
      items: finalItems,
      actAttempts: parseInt(activityAttempts, 10),
      finalScorePolicy,
      checkCodeRestriction,
      maxCheckCodeRuns: checkCodeRestriction ? parseInt(maxCheckCodeRuns, 10) : null,
      checkCodeDeduction: checkCodeRestriction ? parseFloat(checkCodeDeduction) : null,
    };

    console.log("Sending Activity Data:", JSON.stringify(newActivity, null, 2));
    const response = await createActivity(newActivity);
    if (response.error) {
      openAlert({ message: "Failed to create activity: " + response.error, autoCloseDelay: 2000 });
    } else {
      openAlert({
        message: "Activity created successfully!",
        autoCloseDelay: 2000,
        onAfterClose: () => navigate(`/teacher/class/${classID}/activity`)
      });
    }
  };

  return (
    <div className="whole-container">
      <TeacherCMNavigationBarComponent />
      <div className="class-wrapper"></div>
      <div className='create-activity-content'>
        <div className='create-activity-container'>
          <h2>Create an Activity</h2>
          <Form className='create-activity-form' onSubmit={handleCreateActivity}>
            {/* Activity Title */}
            <Form.Control 
              className='create-activity-title'
              type='text' 
              placeholder='Title...' 
              value={activityTitle} 
              onChange={(e) => setActivityTitle(e.target.value)} 
              required
            />
            {/* Description */}
            <div className='description-section'>
              <Form.Control 
                as='textarea' 
                placeholder='Description...' 
                value={activityDescription} 
                onChange={(e) => setActivityDescription(e.target.value)} 
                required
              />
            </div>
            {/* Dynamic Item List */}
            <div className='question-section'>
              <h5>Set Items</h5>
              {selectedItems.length === 0 && <p>No items added yet.</p>}
              {selectedItems.map((item, index) => (
                <div key={index} style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}>
                  <Form.Control
                    type="text"
                    placeholder={`Item ${index + 1}`}
                    value={`${item.itemName} | ${item.itemDifficulty || "-"} | ${item.itemPoints || 0} pts`}
                    readOnly
                    style={{ flex: 1 }}
                  />
                  <Button variant="outline-danger" onClick={() => removeItem(index)}>Remove</Button>
                </div>
              ))}
              <Button variant="primary" onClick={handleAddNewItem}>
                + Add New Item
              </Button>
            </div>
            {/* Difficulty & Date/Time */}
            <div className='difficulty-section'>
              <Form.Select value={actDifficulty} onChange={(e) => setDifficulty(e.target.value)} required>
                <option value=''>Select Difficulty</option>
                <option value='Beginner'>Beginner</option>
                <option value='Intermediate'>Intermediate</option>
                <option value='Advanced'>Advanced</option>
              </Form.Select>
              <DateTimeItem icon="bi bi-calendar-check" label="Open Date and Time" date={dateOpened} setDate={setDateOpened} className="open-date" />
              <DateTimeItem icon="bi bi-calendar2-week" label="Due Date and Time" date={dateClosed} setDate={setDateClosed} className="due-date" />
            </div>
            {/* Duration */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Activity Duration (in minutes)</Form.Label>
              <Form.Control
                type="number"
                min="1"
                value={durationInMinutes}
                onChange={(e) => setDurationInMinutes(e.target.value)}
                placeholder="Enter total minutes"
                required
              />
              <Form.Text>e.g., 90 → 1 hour 30 minutes</Form.Text>
            </Form.Group>
            {/* Attempts */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Activity Attempts (0 for unlimited)</Form.Label>
              <Form.Control
                type="number"
                min="0"
                value={activityAttempts}
                onChange={(e) => setActivityAttempts(e.target.value)}
                placeholder="Enter maximum attempts"
                required
              />
              <Form.Text>Enter 0 for unlimited attempts; otherwise, a positive number.</Form.Text>
            </Form.Group>
            {/* Final Score Policy */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Final Score Policy</Form.Label>
              <Form.Select value={finalScorePolicy} onChange={(e) => setFinalScorePolicy(e.target.value)} required>
                <option value="last_attempt">Last Attempt</option>
                <option value="highest_score">Highest Score</option>
              </Form.Select>
              <Form.Text>Determine whether the final score is based on the last submission or the highest score.</Form.Text>
            </Form.Group>
            {/* Check Code Settings */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Enable Check Code Deduction</Form.Label>
              <Form.Check
                type="checkbox"
                label="Yes, enable check code deduction"
                checked={checkCodeRestriction}
                onChange={(e) => setCheckCodeRestriction(e.target.checked)}
              />
            </Form.Group>
            {checkCodeRestriction && (
              <>
                <Form.Group className="activity mt-3 me-3">
                  <Form.Label>Max Check Code Runs (per item)</Form.Label>
                  <Form.Control
                    type="number"
                    min="1"
                    value={maxCheckCodeRuns}
                    onChange={(e) => setMaxCheckCodeRuns(e.target.value)}
                    placeholder="Enter maximum runs"
                    required={checkCodeRestriction}
                  />
                </Form.Group>
                <Form.Group className="activity mt-3 me-3">
                  <Form.Label>Deduction Percentage per Extra Run</Form.Label>
                  <Form.Control
                    type="number"
                    min="0"
                    value={checkCodeDeduction}
                    onChange={(e) => setCheckCodeDeduction(e.target.value)}
                    placeholder="Enter deduction percentage"
                    required={checkCodeRestriction}
                  />
                  <Form.Text>e.g., 10 means each extra run deducts 10% of the item points.</Form.Text>
                </Form.Group>
              </>
            )}
            {/* Programming Languages */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Select all languages that can be used to solve this activity.</Form.Label>
              <div style={{ marginBottom: "0.5rem" }}>
                <Form.Check
                  type="checkbox"
                  label="Applicable to all"
                  checked={selectedProgLangs.length > 0 && selectedProgLangs.length === programmingLanguages.length}
                  onChange={(e) => handleSelectAllLangs(e.target.checked)}
                />
              </div>
              {programmingLanguages.map((lang) => (
                <Form.Check
                  key={lang.progLangID}
                  type="checkbox"
                  label={lang.progLangName}
                  checked={selectedProgLangs.includes(lang.progLangID)}
                  onChange={() => handleProgLangToggle(lang.progLangID)}
                />
              ))}
            </Form.Group>
            {/* Computed Total Points */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Total Points (automatically computed)</Form.Label>
              <Form.Control
                className='bg-light'
                type="number"
                value={selectedItems.reduce((sum, item) => sum + (item.itemPoints || 0), 0)}
                disabled
              />
            </Form.Group>
            <div className='d-flex justify-content-center align-items-center'>
              <Button className='create-activity-btn mt-3' type="submit">
                <i className="bi bi-pencil-square"></i> Create Activity
              </Button>
            </div>
          </Form>
        </div>
        {/* Instead of a modal for selecting existing items only, we now use the ItemCreationModal */}
        <Button variant="success" onClick={handleAddNewItem} style={{ marginTop: "20px" }}>
          + Create New Item
        </Button>
      </div>
      {/* Reusable Item Creation Modal */}
      <ItemCreationModal
        show={showItemModal}
        onHide={() => setShowItemModal(false)}
        onSave={handleItemModalSave}
        // Optionally, pass a flag (or determine based on selectedItemType) to indicate if this item is a Console App.
        isConsoleApp={true}
      />
    </div>
  );
};

// Helper component for date/time inputs
const DateTimeItem = ({ icon, label, date, setDate, className }) => (
  <div className={`date-time-item ${className}`}>
    <div className="label-with-icon">
      <i className={icon}></i>
      <label>{label}</label>
    </div>
    <input
      type="datetime-local"
      value={date}
      onChange={(e) => setDate(e.target.value)}
      required
    />
  </div>
);

export default TeacherCreateActivityComponent;