// TeacherCreateActivityComponent.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Modal, Button, Form, Dropdown } from 'react-bootstrap';
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

// Import the new ItemCreationModal component
import ItemCreationModal from './ItemCreationModal';

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
  const [activityDuration, setActivityDuration] = useState('');
  const [activityAttempts, setActivityAttempts] = useState("1");
  const [finalScorePolicy, setFinalScorePolicy] = useState("last_attempt");

  // -------------------- Global Check Code Settings State --------------------
  const [checkCodeRestriction, setCheckCodeRestriction] = useState(false);
  const [maxCheckCodeRuns, setMaxCheckCodeRuns] = useState("");
  const [checkCodeDeduction, setCheckCodeDeduction] = useState("");

  // -------------------- Item Bank State --------------------
  const [selectedItems, setSelectedItems] = useState([null, null, null]);
  const [presetItems, setPresetItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemIndex, setSelectedItemIndex] = useState(null);
  const [itemBankScope, setItemBankScope] = useState("personal");

  // -------------------- Item Types & Programming Languages --------------------
  const [selectedProgLangs, setSelectedProgLangs] = useState([]);
  const [selectedItemType, setSelectedItemType] = useState(null);
  const [itemTypeName, setItemTypeName] = useState('');
  const [itemTypes, setItemTypes] = useState([]);

  // -------------------- Dates --------------------
  const [dateOpened, setDateOpened] = useState('');
  const [dateClosed, setDateClosed] = useState('');

  // -------------------- Modal State --------------------
  const [showItemModal, setShowItemModal] = useState(false);
  // New state for the item creation modal
  const [showItemCreationModal, setShowItemCreationModal] = useState(false);

  // -------------------- Programming Languages from Server --------------------
  const [programmingLanguages, setProgrammingLanguages] = useState([]);

  // For actDuration input in minutes
  const [durationInMinutes, setDurationInMinutes] = useState("0");

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
      setItemTypeName(response[0].itemTypeName);
    } else {
      console.error("❌ Failed to fetch item types:", response.error);
    }
  };

  const fetchProgrammingLanguages = async () => {
    const response = await getProgrammingLanguages();
    if (!response.error && Array.isArray(response)) {
      setProgrammingLanguages(response);
    } else {
      console.error("❌ Failed to fetch programming languages:", response.error);
    }
  };

  const fetchPresetItems = async () => {
    const sessionData = getSessionData();
    const teacherID = sessionData.userID;
    
    const response = await getItems(selectedItemType, { scope: itemBankScope, teacherID });
    if (!response.error) {
      setPresetItems(response);
    } else {
      console.error("❌ Failed to fetch preset items:", response.error);
    }
  };

  // -------------------- Modal Handlers --------------------
  const handleItemClick = (index) => {
    setSelectedItemIndex(index);
    setShowItemModal(true);
  };

  const handleCloseItemModal = () => {
    setShowItemModal(false);
  };

  const handleSelectItem = (item) => {
    setSelectedItem(item);
  };

  const handleSaveItem = () => {
    if (!selectedItem || selectedItemIndex === null) return;
    // Check duplicate selection
    const alreadyExists = selectedItems.some(
      (it, i) => i !== selectedItemIndex && it && it.itemID === selectedItem.itemID
    );
    if (alreadyExists) {
      openAlert({
        message: "❌ You already picked that item. Please choose a different one.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }
    const updated = [...selectedItems];
    updated[selectedItemIndex] = selectedItem;
    setSelectedItems(updated);
    setSelectedItem(null);
    setShowItemModal(false);
  };

  const handleItemTypeSelect = (type) => {
    setSelectedItemType(type.itemTypeID);
    setItemTypeName(type.itemTypeName);
  };

  // -------------------- Programming Languages Handlers --------------------
  const handleProgLangToggle = (langID) => {
    if (selectedProgLangs.includes(langID)) {
      setSelectedProgLangs(selectedProgLangs.filter(id => id !== langID));
    } else {
      setSelectedProgLangs([...selectedProgLangs, langID]);
    }
  };

  const handleSelectAllLangs = (checked) => {
    if (checked) {
      const allIDs = programmingLanguages.map(lang => lang.progLangID);
      setSelectedProgLangs(allIDs);
    } else {
      setSelectedProgLangs([]);
    }
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
      selectedItems.every(item => item === null)
    ) {
      openAlert({
        message: "⚠️ All fields are required, including at least one programming language, one item, and an activity duration.",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }

    const sessionData = getSessionData();
    const classID = sessionData.selectedClassID;

    const finalItems = selectedItems
      .filter(item => item !== null)
      .map(item => ({
        itemID: item.itemID,
        itemTypeID: selectedItemType,
        actItemPoints: item.itemPoints
      }));

    if (finalItems.length === 0) {
      openAlert({
        message: "⚠️ Please select at least one valid item",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
      return;
    }

    const computedPoints = finalItems.reduce((sum, it) => sum + (it.actItemPoints || 0), 0);

    const total = parseInt(durationInMinutes, 10);
    const hh = String(Math.floor(total / 60)).padStart(2, "0");
    const mm = String(total % 60).padStart(2, "0");
    const ss = "00";
    const finalDuration = `${hh}:${mm}:${ss}`;

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

    const response = await createActivity(newActivity);
    if (response.error) {
      openAlert({
        message: "❌ Failed to create activity: " + response.error,
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
      });
    } else {
      openAlert({
        message: "✅ Activity created successfully!!",
        imageUrl: "/src/assets/profile_default2.png",
        autoCloseDelay: 2000,
        onAfterClose: () => { navigate(`/teacher/class/${classID}/activity`); },
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

            {/* 3 Item Slots */}
            <div className='question-section'>
              <h5>Set Items (Maximum of 3)</h5>
              {selectedItems.map((item, index) => (
                <div 
                  key={index} 
                  style={{ display: "flex", alignItems: "center", marginBottom: "8px" }}
                  onClick={() => handleItemClick(index)}
                >
                  <Form.Control
                    type="text"
                    placeholder={`Item ${index + 1}`}
                    value={
                      item
                        ? `${item.itemName} | ${item.itemDifficulty || "-"} | ${item.itemPoints || 0} pts`
                        : ""
                    }
                    readOnly
                    required={index === 0}
                    style={{ flex: 1 }}
                  />
                  {item && (item.programming_languages || item.programmingLanguages) && (
                    <div style={{ marginLeft: "8px" }}>
                      {(item.programming_languages || item.programmingLanguages || []).map((langObj, idx) => {
                        const langName = langObj.progLangName;
                        const known = programmingLanguageMap[langName] || { name: langName, image: null };
                        return (
                          <span key={idx} style={{ marginRight: "8px" }}>
                            {known.image ? (
                              <>
                                <img 
                                  src={known.image}
                                  alt={`${known.name} icon`}
                                  style={{ width: "20px", marginRight: "4px" }}
                                />
                                {known.name}
                              </>
                            ) : (
                              known.name
                            )}
                            {idx < (item.programming_languages || item.programmingLanguages).length - 1 ? "," : ""}
                          </span>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
              {/* Button to create a new item directly */}
              <Button variant="outline-primary" onClick={() => setShowItemCreationModal(true)}>
                + Create New Item
              </Button>
            </div>

            {/* Difficulty + Date/Time */}
            <div className='difficulty-section'>
              <Form.Select 
                as='select' 
                value={actDifficulty} 
                onChange={(e) => setDifficulty(e.target.value)} 
                required
              >
                <option value=''>Select Difficulty</option>
                <option value='Beginner'>Beginner</option>
                <option value='Intermediate'>Intermediate</option>
                <option value='Advanced'>Advanced</option>
              </Form.Select>

              <DateTimeItem 
                icon="bi bi-calendar-check" 
                label="Open Date and Time" 
                date={dateOpened} 
                setDate={setDateOpened} 
                className="open-date" 
              />
              <DateTimeItem 
                icon="bi bi-calendar2-week" 
                label="Due Date and Time" 
                date={dateClosed} 
                setDate={setDateClosed} 
                className="due-date" 
              />
            </div>

            {/* Activity Duration Input (in minutes) */}
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

            {/* Activity Attempts */}
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
              <Form.Text>Enter 0 for unlimited attempts.</Form.Text>
            </Form.Group>

            {/* Final Score Policy */}
            <Form.Group className="activity mt-3 me-3">
              <Form.Label>Final Score Policy</Form.Label>
              <Form.Select
                as="select"
                value={finalScorePolicy}
                onChange={(e) => setFinalScorePolicy(e.target.value)}
                required
              >
                <option value="last_attempt">Last Attempt</option>
                <option value="highest_score">Highest Score</option>
              </Form.Select>
              <Form.Text>
                Choose whether the final score is determined by the student's last submission or their highest score.
              </Form.Text>
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
              <Form.Label>Select all languages that can be used to solve this item.</Form.Label>
              <div style={{ marginBottom: "0.5rem" }}>
                <Form.Check 
                  type="checkbox"
                  label="Applicable to all"
                  checked={
                    selectedProgLangs.length > 0 &&
                    selectedProgLangs.length === programmingLanguages.length
                  }
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
                value={
                  selectedItems
                    .filter(item => item !== null)
                    .reduce((sum, item) => sum + (item.itemPoints || 0), 0)
                }
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

        {/* Modal for selecting an existing item from the preset list */}
        <Modal
          show={showItemModal}
          onHide={handleCloseItemModal}
          dialogClassName="custom-modal"
          backdropClassName="custom-modal-backdrop"
        >
          <div className="custom-modal-content">
            <Modal.Header closeButton>
              <Modal.Title>Choose an Item</Modal.Title>
            </Modal.Header>
            <Modal.Body className='modal-design-body'>
              <div className="item-creator d-flex flex-column">
                <label>Item Type:</label>
                <select
                  value={selectedItemType}
                  onChange={(e) => handleItemTypeSelect(e.target.value)}
                >
                  {itemTypes.map((type) => (
                    <option key={type.itemTypeID} value={type.itemTypeID}>
                      {type.itemTypeName}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="item-creator d-flex flex-column">
                <label>Item Creator:</label>
                <select
                  value={itemBankScope}
                  onChange={(e) => {
                    setItemBankScope(e.target.value);
                    fetchPresetItems();
                  }}
                >
                  <option value="personal">Created by Me</option>
                  <option value="global">NEUDev</option>
                </select>
              </div>

              <div className='sort-section'>
                <span style={{ marginRight: "8px" }}>Sort by:</span>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemName")}>
                  Name {itemSortField === "itemName" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemDifficulty")}>
                  Difficulty {itemSortField === "itemDifficulty" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
                <Button variant="link" onClick={() => toggleItemSortOrder("itemPoints")}>
                  Points {itemSortField === "itemPoints" && (itemSortOrder === "asc" ? "↑" : "↓")}
                </Button>
              </div>

              {sortedPresetItems.length === 0 ? (
                <p>
                  There are no items yet. Please go to the <a href="/teacher/item">Item Bank</a> to create items.
                </p>
              ) : (
                sortedPresetItems.map((item, idx) => (
                  <Button
                    key={idx}
                    className={`question-item d-block ${selectedItem === item ? 'highlighted' : ''}`}
                    onClick={() => handleSelectItem(item)}
                    style={{ textAlign: "left", marginBottom: "8px" }}
                  >
                    <div>
                      <strong>{item.itemName}</strong> | {item.itemDifficulty} | {item.itemPoints} pts
                    </div>
                    <div style={{ marginTop: "5px", display: "flex", alignItems: "center"}}>
                      {(item.programming_languages || item.programmingLanguages || []).map((langObj, i) => {
                        const langName = langObj.progLangName;
                        const known = programmingLanguageMap[langName] || { name: langName, image: null };
                        return known.image ? (
                          <img
                            key={i}
                            src={known.image}
                            alt={known.name}
                            style={{ width: "20px", marginRight: "5px" }}
                          />
                        ) : (
                          <span key={i} style={{ marginRight: "5px", fontSize: "12px" }}>
                            {known.name}
                          </span>
                        );
                      })}
                    </div>
                  </Button>
                ))
              )}
            </Modal.Body>
            <Modal.Footer>
              <Button variant="secondary" onClick={() => setShowItemModal(false)}>Cancel</Button>
              <Button className='save-item' onClick={handleSaveItem}>Save Item</Button>
            </Modal.Footer>
          </div>
        </Modal>

        {/* New Item Creation Modal */}
        <ItemCreationModal
          show={showItemCreationModal}
          onClose={() => setShowItemCreationModal(false)}
          onItemCreated={(newItem) => {
            // When a new item is created, add it to the selected items
            // For example, add it in the first empty slot or append to the list
            const emptyIndex = selectedItems.findIndex(item => item === null);
            if (emptyIndex !== -1) {
              const updated = [...selectedItems];
              updated[emptyIndex] = newItem;
              setSelectedItems(updated);
            } else {
              // Optionally, append if all slots are filled
              setSelectedItems(prev => [...prev, newItem]);
            }
            // Optionally, refresh the preset items list
            fetchPresetItems();
          }}
        />
      </div>
    </div>
  );
};

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