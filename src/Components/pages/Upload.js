import React, { useState, useEffect } from "react";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import axios from "axios";

// Cloudinary configuration
const cloudinaryConfig = {
  cloudName: process.env.REACT_APP_CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.REACT_APP_CLOUDINARY_API_KEY,
  apiSecret: process.env.REACT_APP_CLOUDINARY_API_SECRET,
};

const Upload = () => {
  const [selectedPage, setSelectedPage] = useState("Events");
  const [formData, setFormData] = useState({
    id: null,
    name: "",
    description: "",
    date: "",
    images: [],
    title: "",
    category: "",
    content: "",
  });
  const [dataStore, setDataStore] = useState({
    events: [],
    news: [],
    blogs: [],
  });
  const [notification, setNotification] = useState(null);
  const [uploading, setUploading] = useState(false);

  const modules = {
    toolbar: [
      [{ header: "1" }, { header: "2" }, { font: [] }],
      [{ list: "ordered" }, { list: "bullet" }],
      ["bold", "italic", "underline"],
      [{ align: [] }],
      ["link", "image"],
      [{ color: [] }, { background: [] }],
      ["blockquote", "code-block"],
    ],
  };

  // Initialize Local Storage
  useEffect(() => {
    const storedEvents = JSON.parse(localStorage.getItem("events")) || [];
    const storedNews = JSON.parse(localStorage.getItem("news")) || [];
    const storedBlogs = JSON.parse(localStorage.getItem("blogs")) || [];
    setDataStore({ events: storedEvents, news: storedNews, blogs: storedBlogs });
  }, []);

  // Reset Form Data
  const resetFormData = () => {
    setFormData({
      id: null,
      name: "",
      description: "",
      date: "",
      images: [],
      title: "",
      category: "",
      content: "",
    });
  };

  // Handle Input Changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle Image Upload
  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(async (file) => {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("api_key", cloudinaryConfig.apiKey);
        formData.append("timestamp", Math.round(new Date().getTime() / 1000));
        
        // Generate signature
        const signature = await axios.post("/api/cloudinary-signature", {
          timestamp: Math.round(new Date().getTime() / 1000),
          apiKey: cloudinaryConfig.apiKey,
        });
        
        formData.append("signature", signature.data.signature);

        const response = await axios.post(
          `https://api.cloudinary.com/v1_1/${cloudinaryConfig.cloudName}/image/upload`,
          formData
        );

        return response.data.secure_url;
      });

      const imageUrls = await Promise.all(uploadPromises);
      setFormData((prev) => ({
        ...prev,
        images: [...prev.images, ...imageUrls],
      }));
    } catch (error) {
      console.error("Error uploading images:", error);
      setNotification({
        message: "Error uploading images. Please try again.",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
    } finally {
      setUploading(false);
    }
  };

  // Handle Image Removal
  const handleImageRemove = (index) => {
    setFormData((prev) => {
      const updatedImages = prev.images.filter((_, i) => i !== index);
      return { ...prev, images: updatedImages };
    });
  };

  // Form Submission Handler
  const handleSubmit = (e) => {
    e.preventDefault();
    const storeKey = selectedPage.toLowerCase();
    const requiredFields =
      storeKey === "events"
        ? ["name", "description", "date"]
        : ["title", "category", "content", "date"];

    // Validate Required Fields
    const isValid = requiredFields.every((field) => formData[field]);
    if (!isValid) {
      setNotification({
        message: "Please fill all required fields",
        type: "error",
      });
      setTimeout(() => setNotification(null), 3000);
      return;
    }

    // Prepare Data for Saving
    const parsedDate = new Date(formData.date).toISOString();
    const updatedFormData = { 
      ...formData, 
      date: parsedDate,
      images: formData.images || [] // Ensure images array exists
    };

    // Save Data
    const updatedData = formData.id
      ? dataStore[storeKey].map((item) =>
          item.id === formData.id ? { ...item, ...updatedFormData } : item
        )
      : [{ ...updatedFormData, id: Date.now() }, ...dataStore[storeKey]];

    // Update State and LocalStorage
    const newDataStore = { ...dataStore, [storeKey]: updatedData };
    setDataStore(newDataStore);
    localStorage.setItem(storeKey, JSON.stringify(updatedData));

    // Show Notification
    setNotification({
      message: formData.id
        ? `${selectedPage} updated successfully`
        : `${selectedPage} created successfully`,
      type: "success",
    });
    setTimeout(() => setNotification(null), 3000);

    resetFormData();
  };

  // Edit an Item
  const handleEdit = (id) => {
    const storeKey = selectedPage.toLowerCase();
    const selectedItem = dataStore[storeKey].find((item) => item.id === id);
    if (selectedItem) {
      setFormData({
        ...selectedItem,
        date: new Date(selectedItem.date).toISOString().split("T")[0],
      });
    }
  };

  // Delete an Item
  const handleDelete = (id) => {
    const storeKey = selectedPage.toLowerCase();
    const updatedData = dataStore[storeKey].filter((item) => item.id !== id);
    const newDataStore = { ...dataStore, [storeKey]: updatedData };
    setDataStore(newDataStore);
    localStorage.setItem(storeKey, JSON.stringify(updatedData));

    setNotification({
      message: `${selectedPage} deleted successfully`,
      type: "success",
    });
    setTimeout(() => setNotification(null), 3000);
  };

  // Format Date
  const formatDate = (dateString) => {
    if (!dateString) return "No date provided";
    const options = { year: "numeric", month: "long", day: "numeric" };
    const parsedDate = new Date(dateString);
    return isNaN(parsedDate)
      ? "Invalid date"
      : parsedDate.toLocaleDateString(undefined, options);
  };

  // Render List of Items
  const renderList = () => {
    const storeKey = selectedPage.toLowerCase();
    return (
      <ul className="space-y-4">
        {dataStore[storeKey].map((item) => (
          <li key={item.id} className="p-4 bg-white rounded-lg shadow">
            <h4 className="font-bold text-lg">{item.title || item.name}</h4>
            <p className="text-sm text-gray-500">{formatDate(item.date)}</p>
            {storeKey === "events" && item.images && item.images.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 my-4">
                {item.images.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`Event image ${index + 1}`}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
            )}
            <div
              className="text-sm mt-2"
              dangerouslySetInnerHTML={{
                __html: item.content || item.description,
              }}
            />
            <div className="flex space-x-2 mt-4">
              <button
                type="button"
                onClick={() => handleEdit(item.id)}
                className="px-4 py-2 bg-yellow-500 text-white rounded-lg"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(item.id)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    );
  };

  // Reset Form on Page Switch
  useEffect(() => {
    resetFormData();
  }, [selectedPage]);

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Dashboard</h2>
          <nav>
            {["Events", "News", "Blogs"].map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => setSelectedPage(page)}
                className={`block w-full p-3 rounded-lg ${
                  selectedPage === page ? "bg-blue-500 text-white" : ""
                }`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      </div>
      {/* Main Content */}
      <div className="flex-1 overflow-auto p-8">
        {notification && (
          <div
            className={`p-4 mb-4 rounded ${
              notification.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
            }`}
          >
            {notification.message}
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6 mb-8">
          {selectedPage === "Events" ? (
            <>
              {/* Event-Specific Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Event Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  rows="4"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Images
                </label>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageUpload}
                  className="w-full p-2 border rounded"
                  disabled={uploading}
                />
                {uploading && <p className="text-sm text-gray-500">Uploading images...</p>}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-4">
                  {formData.images.map((image, index) => (
                    <div key={index} className="relative">
                      <img
                        src={image}
                        alt={`Uploaded ${index + 1}`}
                        className="w-full h-32 object-cover rounded"
                      />
                      <button
                        type="button"
                        onClick={() => handleImageRemove(index)}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* News/Blog Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Content
                </label>
                <ReactQuill
                  value={formData.content}
                  onChange={(content) =>
                    setFormData((prev) => ({ ...prev, content }))
                  }
                  modules={modules}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full p-2 border rounded"
                  required
                />
              </div>
            </>
          )}
          <button
            type="submit"
            className="px-4 py-2 bg-blue-500 text-white rounded-lg"
          >
            {formData.id ? "Update" : "Create"}
          </button>
        </form>
        {renderList()}
      </div>
    </div>
  );
};

export default Upload;
