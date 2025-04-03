const crypto = require('crypto');

module.exports = (req, res) => {
  const { timestamp, apiKey } = req.body;
  const apiSecret = process.env.REACT_APP_CLOUDINARY_API_SECRET;

  // Generate signature
  const str = `timestamp=${timestamp}&api_key=${apiKey}${apiSecret}`;
  const signature = crypto
    .createHash('sha1')
    .update(str)
    .digest('hex');

  res.json({ signature });
}; 