import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Events.css';

// Determine the API URL based on the environment
const API_URL = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001'
  : process.env.REACT_APP_API_URL || 'https://artihcusglobal-main.vercel.app';

const EventCard = ({ event }) => {
  return (
    <div className="event-card">
      <img 
        src={event.url} 
        alt={event.title} 
        className="event-image"
        onError={(e) => {
          e.target.onerror = null; // Prevent infinite loop
          e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Available';
        }}
      />
      <div className="event-details">
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <p className="event-date">{new Date(event.date).toLocaleDateString()}</p>
      </div>
    </div>
  );
};

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log('Fetching events from:', API_URL); // Debug log
        const response = await axios.get(`${API_URL}/api/events`);
        console.log('Events response:', response.data); // Debug log
        setEvents(response.data);
      } catch (err) {
        console.error('Error fetching events:', err);
        setError(err.response?.data?.error || 'Failed to load events. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="events-loading">Loading events...</div>;
  }

  if (error) {
    return <div className="events-error">{error}</div>;
  }

  return (
    <div className="events-container">
      <h2>Our Events</h2>
      {events.length === 0 ? (
        <p className="no-events">No events available at the moment.</p>
      ) : (
        <div className="events-grid">
          {events.map((event) => (
            <EventCard key={event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Events; 