import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import '/src/style/student/bulletin.css';
import { Button, Row, Col, Card, Modal, Form } from 'react-bootstrap';
import StudentCMNavigationBarComponent from './StudentCMNavigationBarComponent';
import { 
  getBulletinPosts, 
  getConcerns, 
  createConcern, 
  deleteConcern,
  getClassInfo
} from '../api/API.js';

export const StudentBulletinComponent = () => {
  // Get classID from URL parameters.
  const { classID } = useParams();

  // Get the logged-in student's ID from sessionStorage.
  const storedUserID = sessionStorage.getItem("userID");
  const studentID = storedUserID ? parseInt(storedUserID) : 0;

  // Teacher details will be fetched from class info.
  const [teacherID, setTeacherID] = useState(null);
  const [teacherName, setTeacherName] = useState('Teacher');

  // States for bulletin posts.
  const [posts, setPosts] = useState([]);

  // States for concerns.
  const [concerns, setConcerns] = useState([]);
  
  // State for the concern modal and its text field.
  const [showPostConcern, setShowPostConcern] = useState(false);
  const [concernText, setConcernText] = useState('');

  // States for delete confirmation modal.
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedConcernId, setSelectedConcernId] = useState(null);

  // Fetch class info to get the teacher's details.
  useEffect(() => {
    const fetchClassInfo = async () => {
      if (!classID) return;
      const response = await getClassInfo(classID);
     // console.log("Class info response:", response); // Debug log
      if (response.error) {
        console.error("Error fetching class info:", response.error);
      } else if (response.teacher) {
        // Use teacher.teacherName directly.
        setTeacherName(response.teacher.teacherName);
        setTeacherID(response.teacher.teacherID);
      } else {
        console.warn("No teacher information found in class info response");
      }
    };
    fetchClassInfo();
  }, [classID]);

  // Fetch bulletin posts.
  useEffect(() => {
    const fetchPosts = async () => {
      if (!classID) {
        console.error("Class ID not found in URL parameters.");
        return;
      }
      const response = await getBulletinPosts(classID);
      if (response.error) {
        console.error("Error fetching bulletin posts:", response.error);
      } else {
        const fetchedPosts = response.map(post => ({
          id: post.id,
          title: post.title,
          message: post.message,
          dateCreated: new Date(post.created_at).toLocaleDateString(),
          timeCreated: new Date(post.created_at).toLocaleTimeString(),
         teacherName: (post.teacher && post.teacher.teacherName) || teacherName,
        }));
        setPosts(fetchedPosts);
      }
    };

    fetchPosts();
  }, [classID]);

  // Fetch concerns and filter only those that belong to the logged‑in student.
  useEffect(() => {
    const fetchConcerns = async () => {
      if (!classID) return;
      const response = await getConcerns(classID);
      //console.log("All concerns response:", response); // Debug log
      if (response.error) {
        console.error("Error fetching concerns:", response.error);
      } else {
        // Filter concerns by matching studentID.
        const filteredConcerns = response.filter(concern =>
          concern.student && String(concern.student.studentID) === String(studentID)
        );
        const mappedConcerns = filteredConcerns.map(concern => ({
          id: concern.id,
          name: concern.student
            ? `${concern.student.firstname} ${concern.student.lastname}`
            : "Unknown",
          dateCreated: new Date(concern.created_at).toLocaleDateString(),
          timeCreated: new Date(concern.created_at).toLocaleTimeString(),
          message: concern.concern,
          teacherReply: concern.reply
        }));
        setConcerns(mappedConcerns);
      }
    };

    fetchConcerns();
  }, [classID, studentID]);

  // Handler for posting a new concern.
  const handlePostConcern = async () => {
    if (!concernText.trim()) {
      console.error("Concern cannot be empty.");
      alert("Concern cannot be empty.");
      return;
    }

    const newConcern = {
      classID,
      studentID,
      concern: concernText,
      teacherID, 
      reply: null
    };

    try {
      const response = await createConcern(newConcern);
      if (response.error) {
        console.error("Error creating concern:", response.error);
        alert("Error creating concern: " + response.error);
      } else {
        setConcerns(prevConcerns => [
          ...prevConcerns,
          {
            id: response.concern ? response.concern.id : response.id,
            name: "You",
            dateCreated: new Date().toLocaleDateString(),
            timeCreated: new Date().toLocaleTimeString(),
            message: concernText,
            teacherReply: null
          }
        ]);
        setConcernText('');
        setShowPostConcern(false);
        alert("✅ Concern created successfully!");
      }
    } catch (error) {
      console.error("Error posting concern:", error);
      alert("Error posting concern: " + error.message);
    }
  };

  // Handler for confirming deletion of a concern.
  const handleConfirmDelete = async () => {
    try {
      const response = await deleteConcern(selectedConcernId);
      if (response.error) {
        console.error("Error deleting concern:", response.error);
        alert("Error deleting concern: " + response.error);
      } else {
        setConcerns(prevConcerns => prevConcerns.filter(c => c.id !== selectedConcernId));
        setShowDeleteModal(false);
        setSelectedConcernId(null);
        alert("✅ Concern deleted successfully!");
      }
    } catch (error) {
      console.error("Error during deletion:", error);
      alert("Error during deletion: " + error.message);
    }
  };



  return (
    <>
      <StudentCMNavigationBarComponent />
      <div className="class-wrapper"></div>
      <div className='bulletin-content'>
        <div className='container-fluid bulletin-header'>
          <div className='bulletin-search'>
            <input
              type="text"
              placeholder="Search your professor’s name, the title of the post, or subject..."
            />
            <i className='bi bi-search'></i>
          </div>
        </div>

        <Row className='announcement-container'>
          <Col xs={12} md={12} lg={9}>
            <div className='announcement'>
              <div className='announcement-header'>
                <h5>Teacher's Announcements</h5>
              </div>
              {posts.length > 0 ? (
                posts.map((post) =>
                  <Card className='post-card' style={{ borderRadius: "20px" }} key={post.id}>
                    <Card.Header>
                      <h2>{post.title}</h2>
                      <p>{teacherName}</p>
                      <p>{post.dateCreated} {post.timeCreated}</p>
                    </Card.Header>
                    <Card.Body>
                      <p>{post.message}</p>
                    </Card.Body>
                  </Card>
                )
              ) : (
                <p>No Announcement</p>
              )}
            </div>
          </Col>
          <Col xs={12} md={7} lg={3}>
            <div className='concern'>
              <div className='concern-header'>
                <h5>Your Concerns</h5>
              </div>
              <Button onClick={() => setShowPostConcern(true)}>Send a concern</Button>

              {/* Concern Modal */}
              <Modal
                className='post-concern'
                show={showPostConcern}
                onHide={() => setShowPostConcern(false)}
                backdrop='static'
                keyboard={false}
                size='md'
              >
                <Modal.Header closeButton>
                  <div className='modal-activity-header'>
                    <h4>Post Your Concern</h4>
                    <p>To professor {teacherName}</p>
                  </div>
                </Modal.Header>
                <Modal.Body>
                  <Form.Group controlId="concernTextArea">
                    <Form.Control
                      as="textarea"
                      rows={4}
                      value={concernText}
                      onChange={(e) => setConcernText(e.target.value)}
                      placeholder="Type your concern here..."
                    />
                  </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowPostConcern(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handlePostConcern}>
                    Post Concern
                  </Button>
                </Modal.Footer>
              </Modal>

              {/* Delete Confirmation Modal */}
              <Modal
                show={showDeleteModal}
                onHide={() => setShowDeleteModal(false)}
                size="md"
                centered
              >
                <Modal.Header closeButton>
                  <Modal.Title>Confirm Delete</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  <p>Are you sure you want to delete this concern?</p>
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
                    Cancel
                  </Button>
                  <Button variant="danger" onClick={handleConfirmDelete}>
                    Delete
                  </Button>
                </Modal.Footer>
              </Modal>

              {/* Render list of concerns */}
              <div className='concern-body'>
                {concerns.length > 0 ? (
                  concerns.map((concern) =>
                    <div className='concern-details' key={concern.id}>
                      <h6>{concern.name}</h6>
                      <p>Posted on {concern.dateCreated} {concern.timeCreated}</p>
                      <p className='concern-message'>{concern.message}</p>
                      <div className="teacher-reply-section">
                        <h6>Teacher's Reply:</h6>
                        {concern.teacherReply ? (
                          <p>{concern.teacherReply}</p>
                        ) : (
                          <p className="no-reply">No reply yet</p>
                        )}
                      </div>
                      <div className='concern-actions'>
                        <Button
                          variant="danger"
                          onClick={() => {
                            setSelectedConcernId(concern.id);
                            setShowDeleteModal(true);
                          }}
                        >
                          Delete <i className='bi bi-trash'/>
                        </Button>
                      </div>
                    </div>
                  )
                ) : (
                  <p>No concerns posted yet.</p>
                )}
              </div>
            </div>
          </Col>
        </Row>
      </div>
    </>
  );
};