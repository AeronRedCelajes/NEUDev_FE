import React, { useState, useEffect } from 'react';
import '/src/style/teacher/cmBulletin.css';
import { Button, Row, Col, Card, Modal, Form, Dropdown } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { 
  faBold, faItalic, faUnderline, faSuperscript, 
  faAlignLeft, faAlignCenter, faAlignRight, faEllipsisH 
} from '@fortawesome/free-solid-svg-icons';
import TeacherCMNavigationBarComponent from './TeacherCMNavigationBarComponent';
import { createBulletinPost, getBulletinPosts, deleteBulletinPost, getConcerns, updateConcern } from '../api/API.js';
import { useParams } from 'react-router-dom';

export const TeacherClassManagementBulletinComponent = () => {
  // Get the classID from the URL parameters.
  const { classID } = useParams();

  // State to hold bulletin posts.
  const [posts, setPosts] = useState([]);

  // UPDATED: Replace static concerns with dynamic concerns state.
  const [concerns, setConcerns] = useState([]);
  // Additional states for concern reply logic.
  const [selectedConcernId, setSelectedConcernId] = useState(null);
  const [replyMessage, setReplyMessage] = useState('');

  const [showResponse, setShowResponse] = useState(false);
  const [showPostAnnouncement, setShowPostAnnouncement] = useState(false);
  // State for delete confirmation modal.
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // Holds the post id to be deleted.
  const [postToDelete, setPostToDelete] = useState(null);
  
  // States for new post title and message.
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostMessage, setNewPostMessage] = useState('');

  // Fetch existing posts on component mount or when classID changes.
  useEffect(() => {
    const fetchPosts = async () => {
      if (!classID) {
        console.error("Class ID not found in URL parameters.");
        return;
      }
      const response = await getBulletinPosts(classID);
      if (response.error) {
        console.error("Error fetching posts:", response.error);
      } else {
        // Map the API response to match our post object structure,
        // including the teacher's name.
        const fetchedPosts = response.map(post => ({
          id: post.id,
          title: post.title,
          message: post.message,
          dateCreated: new Date(post.created_at).toLocaleDateString(),
          timeCreated: new Date(post.created_at).toLocaleTimeString(),
          teacherName: post.teacher ? `${post.teacher.firstname} ${post.teacher.lastname}` : 'Unknown'
        }));
        setPosts(fetchedPosts);
      }
    };

    fetchPosts();
  }, [classID]);

  // UPDATED: Fetch concerns from the API instead of using static data.
  useEffect(() => {
    const fetchConcerns = async () => {
      if (!classID) return;
      const response = await getConcerns(classID);
      if (!response.error) {
        setConcerns(response.map(concern => ({
          id: concern.id,
          name: concern.student ? `${concern.student.firstname} ${concern.student.lastname}` : "Unknown",
          dateCreated: new Date(concern.created_at).toLocaleDateString(),
          timeCreated: new Date(concern.created_at).toLocaleTimeString(),
          message: concern.concern,
          reply: concern.reply
        })));
      }
    };
    fetchConcerns();
  }, [classID]);

  // Function to delete a post (calls the API and updates UI if successful).
  const handleDeletePost = async (id) => {
    // Call the API to delete the post from the backend.
    const response = await deleteBulletinPost(id);
    if (response.error) {
      console.error("Error deleting post:", response.error);
      alert("❌ Error deleting post. Please try again.");
    } else {
      setPosts(posts.filter(post => post.id !== id));
      alert("✅ Post deleted successfully!");
    }
    setShowDeleteModal(false);
  };

  // Handler to open delete confirmation modal.
  const confirmDelete = (id) => {
    setPostToDelete(id);
    setShowDeleteModal(true);
  };

  // Handler to create a new bulletin post.
  const handleCreatePost = async () => {
    if (!classID) {
      console.error("Class ID not found in URL parameters.");
      return;
    }
    
    // Call the API to create the bulletin post.
    const response = await createBulletinPost(classID, newPostTitle, newPostMessage);
    if (response.error) {
      console.error("Error creating post:", response.error);
      alert("❌ Error creating post. Please try again.");
      return;
    }

    // Create a new post object from the API response.
    const newPost = {
      id: response.id,
      title: response.title,
      message: response.message,
      dateCreated: new Date(response.created_at).toLocaleDateString(),
      timeCreated: new Date(response.created_at).toLocaleTimeString(),
      teacherName: response.teacher ? `${response.teacher.firstname} ${response.teacher.lastname}` : 'Unknown'
    };

    // Update posts state with the new post added at the beginning.
    setPosts([newPost, ...posts]);

    // Clear the modal fields, close the modal and show a success alert.
    setNewPostTitle('');
    setNewPostMessage('');
    setShowPostAnnouncement(false);
    alert("✅ Post created successfully!");
  };

  // UPDATED: Handler to reply to a concern.
  const handleReplyToConcern = async () => {
    if (!replyMessage.trim() || !selectedConcernId) return;
    const response = await updateConcern(selectedConcernId, { reply: replyMessage });
    if (!response.error) {
      setConcerns(concerns.map(concern => 
        concern.id === selectedConcernId ? { ...concern, reply: replyMessage } : concern
      ));
      setShowResponse(false);
      setReplyMessage('');
      alert("✅ Reply sent successfully!");
    }
  };

  return (
    <>
    <div className='class-post-container'>
      <TeacherCMNavigationBarComponent/>
      <div className="class-wrapper"></div>
        <div className='bulletin-content'>
          <div className="create-new-post-container">
            <button className="create-new-activity-button" onClick={() => setShowPostAnnouncement(true)}>
              + Create New Post
            </button>

            <Modal className='modal-post-announcement' show={showPostAnnouncement} onHide={() => setShowPostAnnouncement(false)} backdrop='static' keyboard={false} size='md'>
              <Modal.Header closeButton>
                <h4>Create a Post</h4>
              </Modal.Header>
              <Modal.Body>
                <Form className='create-activity-form'>
                  <Form.Control 
                    className='create-activity-title' 
                    type='text' 
                    placeholder='Title...' 
                    value={newPostTitle}
                    onChange={(e) => setNewPostTitle(e.target.value)}
                  />
                  <div className='description-section'>
                    <Form.Control 
                      as='textarea' 
                      placeholder='Description...' 
                      value={newPostMessage}
                      onChange={(e) => setNewPostMessage(e.target.value)}
                    />
                  </div>
                </Form>
              </Modal.Body>
              <Modal.Footer>
                <Button onClick={handleCreatePost}>Post</Button>
              </Modal.Footer>
            </Modal>
          </div>
          
          <Row className='announcement-container'>
            <Col xs={12} md={12} lg={9}>
              <div className='announcement'>
                <div className='announcement-header'>
                  <h5>Teachers Announcements</h5>
                </div>
                {posts.length > 0 ? (
                  posts.map((post) =>
                    <Card className='post-card' style={{ borderRadius: "20px" }} key={post.id}>
                      <Card.Header className="d-flex justify-content-between align-items-center">
                        <div>
                          <h2>{post.title}</h2>
                          <p>{post.teacherName}</p>
                          <p>{post.dateCreated} {post.timeCreated}</p>
                        </div>
                        <Dropdown>
                          <Dropdown.Toggle variant="link" id="dropdown-basic">
                            <FontAwesomeIcon icon={faEllipsisH} />
                          </Dropdown.Toggle>
                          <Dropdown.Menu>
                            <Dropdown.Item onClick={() => confirmDelete(post.id)}>Delete</Dropdown.Item>
                          </Dropdown.Menu>
                        </Dropdown>
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
                  <h5>Student Concerns</h5>
                </div>
                <div className='concern-body'>
                  {concerns.length > 0 ? concerns.map((concern) =>
                    <div className='concern-details' key={concern.id}>
                      <h6>{concern.name}</h6>
                      <p>Created on {concern.dateCreated} {concern.timeCreated}</p>
                      <p className='concern-message'>{concern.message}</p>
                      <div className='concern-actions'>
                        <p>

                          <h6>Your reply</h6>
                          {concern.reply ? (
                            <span className="concern-title">{concern.reply}</span>
                          ) : "You have no reply yet"}
                        </p>
                        <p>
                          Reply
                          <i className='bi bi-reply-fill'
                            onClick={() => { setSelectedConcernId(concern.id); setShowResponse(true); }}/>
                        </p>
                      </div>
                    </div>
                  ) : <p>No concerns posted yet.</p>}
                  <Modal className='post-concern' show={showResponse} onHide={() => setShowResponse(false)} backdrop='static' keyboard={false} size='md'>
                    <Modal.Header closeButton>
                      <div className='modal-activity-header'>
                        <h3>Send Your Response</h3>
                        <p>To student, {concerns.find(c => c.id === selectedConcernId)?.name || 'Student'}</p>
                      </div>
                    </Modal.Header>
                    <Modal.Body>
                      <Form.Control 
                        as='textarea' 
                        className='post-concern-textarea'
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                      />
                    </Modal.Body>
                    <Modal.Footer>
                      <Button onClick={handleReplyToConcern}>Send Response</Button>
                    </Modal.Footer>
                  </Modal>
                </div>
              </div>
            </Col>
          </Row>
        </div>

        {/* Delete Confirmation Modal */}
        <Modal 
          show={showDeleteModal} 
          onHide={() => setShowDeleteModal(false)} 
          backdrop='static' 
          keyboard={false} 
          size='sm'
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            Are you sure you want to delete this post?
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
              No
            </Button>
            <Button variant="danger" onClick={() => handleDeletePost(postToDelete)}>
              Yes
            </Button>
          </Modal.Footer>
        </Modal>
    </div>
      
    </>
  );
};