import React, { useState } from 'react';
import axios from 'axios';
import './Upload.css';

// Determine the API URL based on the environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'
  : process.env.REACT_APP_API_URL || 'https://artihcusglobal-main.vercel.app';

const Upload = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an image');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMessage('');

      // First, upload the image
      const formData = new FormData();
      formData.append('file', selectedFile);

      console.log('Uploading image to:', `${API_URL}/api/upload`); // Debug log
      const uploadResponse = await axios.post(`${API_URL}/api/upload`, formData);
      console.log('Upload response:', uploadResponse.data); // Debug log

      // Then create the event with the image URL
      const eventData = {
        title,
        description,
        date,
        url: uploadResponse.data.url
      };

      console.log('Creating event with data:', eventData); // Debug log
      const eventResponse = await axios.post(`${API_URL}/api/events`, eventData);
      console.log('Event creation response:', eventResponse.data); // Debug log

      setMessage('Event created successfully!');
      setTitle('');
      setDescription('');
      setDate('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Error:', err);
      setError(err.response?.data?.error || 'Failed to create event. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="upload-container">
      <h2>Create New Event</h2>
      {error && <div className="error-message">{error}</div>}
      {message && <div className="success-message">{message}</div>}
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title:</label>
          <input
            type="text"
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="description">Description:</label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="date">Date:</label>
          <input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="image">Image:</label>
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleFileChange}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Creating Event...' : 'Create Event'}
        </button>
      </form>
    </div>
  );
};

export default Upload; 